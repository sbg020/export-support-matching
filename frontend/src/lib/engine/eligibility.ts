/*
 * 신청 자격 판정 v2 (순수 함수, eligibility-0.2.1). REVISION_02 §6.6~6.10, 업종 사전은 revision_03 테스트 계정 §6.3
 *
 * - 규칙의 '기준에 회사가 해당하는지'를 필드별로 판정한 뒤, 필수 조건은 해당 → 충족,
 *   제외 조건은 해당 → '제외 대상 해당'(미충족)으로 바꾼다.
 * - 같은 그룹의 필수 조건은 OR, 다른 그룹은 AND. 특정 지원 항목에만 붙는 조건(scope)은 전체 판정에서 뺀다.
 * - '애매'하거나 예외 문구가 있는 규칙은 그 규칙만으로 '신청 불가'를 만들지 않는다(확인 필요로 낮춘다).
 * - 입력이 없으면 추측하지 않고 확인 필요(입력 없음)로 둔다. 오늘 날짜를 기준일로 쓰지 않는다.
 * - 직접 확인 답(공통 확인·공고별 확인)은 이 기기에만 저장된 값이며, 결과에 '직접 확인'으로 표시한다.
 * - 재무 수치는 입력받지 않는다. 공고의 재무 조건은 매출액(기존 입력)과 공통 확인으로만 다룬다.
 */
import type { IsoDate } from '@/types/common'
import type { CompanyProfile, CompanySize, CompanyType, ProfileStepId } from '@/types/profile'
import type { EligibilityRule, Program, ProgramRegion, RuleOp } from '@/types/program'
import type {
  ConditionGroupResult,
  ConditionResult,
  ConditionStatus,
  EligibilityResult,
  EligibilityStatus,
  NeedsCheckReason,
} from '@/types/results'
import type { RuleCheckEntry, SelfCheckAnswers } from '@/types/selfCheck'
import {
  CERTIFICATION_OPTIONS,
  COMMON_CHECK_KEY_LABEL,
  COMPANY_SIZE_OPTIONS,
  COMPANY_TYPE_OPTIONS,
  IP_OPTIONS,
  REGION_OPTIONS,
  optionLabel,
} from '@/constants/options'
import { formatCount, formatKrw, formatUsd, formatYearMonth } from '@/lib/display'

/** 0.2.1: 업종 설명 사전 추가 (revision_03 테스트 계정 §6.3, 판정 규칙은 0.2.0과 같다) */
export const ELIGIBILITY_ENGINE_VERSION = 'eligibility-0.2.1'

export interface EligibilityContext {
  /** 데이터 기준일 (기준 연도 계산용). 없으면 공고의 receptionStatusAsOf를 쓴다 */
  asOf: IsoDate | null
  /** 직접 확인 답. 없으면 null */
  selfChecks: SelfCheckAnswers | null
}

/** 공고별 직접 확인을 받을 수 있는 '확인 필요' 이유 (입력 없음은 입력 화면으로 보낸다) */
export const SELF_CHECKABLE_REASONS: NeedsCheckReason[] = ['not-automatable', 'period-mismatch', 'ambiguous', 'exception']

/** 규칙의 기준에 회사가 해당하는지 */
type Match =
  | { kind: 'yes' | 'no'; reason: string; companyValue: string | null }
  | {
      kind: 'unknown'
      code: NeedsCheckReason
      reason: string
      companyValue: string | null
      inputStep: ProfileStepId | null
      /** 기간이 달라 판정하지 않았을 때, 입력값 기준으로는 해당하는지 */
      hypothetical?: boolean
    }

const NO_LIMIT_REASON = "공고에 '제한 없음'이 명시되어 있습니다."

/** 두 ISO 날짜 사이의 만 연수 */
export function fullYearsBetween(from: string, to: string): number | null {
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(from)
  const b = /^(\d{4})-(\d{2})-(\d{2})/.exec(to)
  if (!a || !b) return null
  let years = Number(b[1]) - Number(a[1])
  const monthDiff = Number(b[2]) - Number(a[2])
  if (monthDiff < 0 || (monthDiff === 0 && Number(b[3]) < Number(a[3]))) years -= 1
  return years
}

function missingInput(fieldLabel: string, step: ProfileStepId): Match {
  return {
    kind: 'unknown',
    code: 'missing-input',
    reason: `기업정보에 ${fieldLabel}이(가) 입력되지 않아 확인이 필요합니다.`,
    companyValue: null,
    inputStep: step,
  }
}

function notAutomatable(reason: string, companyValue: string | null = null): Match {
  return { kind: 'unknown', code: 'not-automatable', reason, companyValue, inputStep: null }
}

function compact(text: string): string {
  return text.replace(/\s+/g, '')
}

function valueTokens(value: EligibilityRule['value']): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v))
  if (typeof value === 'string') return [value]
  return []
}

const OP_TEXT: Partial<Record<RuleOp, string>> = { '>=': '이상', '>': '초과', '<=': '이하', '<': '미만' }

function compare(op: RuleOp, actual: number, value: EligibilityRule['value']): boolean | null {
  if (op === 'between') {
    if (!Array.isArray(value) || value.length !== 2) return null
    const [lo, hi] = value.map(Number)
    if (lo === undefined || hi === undefined || Number.isNaN(lo) || Number.isNaN(hi)) return null
    return actual >= lo && actual <= hi
  }
  if (typeof value !== 'number') return null
  switch (op) {
    case '>=':
      return actual >= value
    case '>':
      return actual > value
    case '<=':
      return actual <= value
    case '<':
      return actual < value
    default:
      return null
  }
}

function thresholdText(rule: EligibilityRule, format: (n: number) => string): string {
  if (rule.op === 'between' && Array.isArray(rule.value)) {
    return `${format(Number(rule.value[0]))} ~ ${format(Number(rule.value[1]))}`
  }
  return typeof rule.value === 'number' ? `${format(rule.value)} ${OP_TEXT[rule.op] ?? ''}`.trim() : '-'
}

// ── 기업 유형 ──

const SIZE_TOKENS: Record<string, CompanySize[]> = {
  중소기업: ['small-business', 'sme'],
  소상공인: ['small-business'],
  중견기업: ['mid-sized'],
  대기업: ['large'],
}
const TYPE_TOKENS: Record<string, CompanyType> = {
  법인: 'corporation',
  법인사업자: 'corporation',
  개인사업자: 'sole-proprietor',
}

function evaluateCompanyType(rule: EligibilityRule, profile: CompanyProfile): Match {
  const tokens = valueTokens(rule.value).map(compact)
  const sizeTokens = tokens.filter((t) => t in SIZE_TOKENS)
  const typeTokens = tokens.filter((t) => t in TYPE_TOKENS)
  const unknownTokens = valueTokens(rule.value).filter((t) => !(compact(t) in SIZE_TOKENS) && !(compact(t) in TYPE_TOKENS))
  const size = profile.companySize === 'unknown' ? null : profile.companySize
  const companyValue =
    [optionLabel(COMPANY_SIZE_OPTIONS, profile.companySize), optionLabel(COMPANY_TYPE_OPTIONS, profile.companyType)]
      .filter(Boolean)
      .join(' · ') || null

  const hit =
    (size !== null && sizeTokens.some((t) => SIZE_TOKENS[t]?.includes(size))) ||
    (profile.companyType !== null && typeTokens.some((t) => TYPE_TOKENS[t] === profile.companyType))
  if (hit) return { kind: 'yes', reason: '기업 유형이 공고에 적힌 유형에 포함됩니다.', companyValue }
  // '농식품 제조업체'처럼 업종으로 정해지는 유형은 업종 사전으로 본다 (해당할 때만)
  const termHits = industryTermHits(unknownTokens, ksicDigits(profile.ksicCode))
  if (termHits.length > 0) {
    return {
      kind: 'yes',
      reason: `입력한 업종 코드(${profile.ksicCode})가 '${termHits.join(', ')}'에 해당합니다 (업종 사전).`,
      companyValue: [companyValue, profile.ksicCode].filter(Boolean).join(' · '),
    }
  }
  if ((sizeTokens.length > 0 && size === null) || (typeTokens.length > 0 && profile.companyType === null)) {
    return missingInput('기업 규모 구분·기업 형태', 1)
  }
  if (unknownTokens.length > 0) {
    return notAutomatable(
      `프로필로 알 수 없는 유형(${unknownTokens.join(', ')})이 포함되어 있어 직접 확인이 필요합니다.`,
      companyValue,
    )
  }
  return { kind: 'no', reason: '기업 유형이 공고에 적힌 유형에 포함되지 않습니다.', companyValue }
}

// ── 소재지 ──

const REGION_NAMES: Record<string, ProgramRegion[]> = {
  전국: ['nationwide'],
  서울: ['seoul'],
  서울특별시: ['seoul'],
  부산: ['busan'],
  부산광역시: ['busan'],
  대구: ['daegu'],
  대구광역시: ['daegu'],
  인천: ['incheon'],
  인천광역시: ['incheon'],
  광주: ['gwangju'],
  광주광역시: ['gwangju'],
  대전: ['daejeon'],
  대전광역시: ['daejeon'],
  울산: ['ulsan'],
  울산광역시: ['ulsan'],
  세종: ['sejong'],
  세종특별자치시: ['sejong'],
  경기: ['gyeonggi'],
  경기도: ['gyeonggi'],
  강원: ['gangwon'],
  강원도: ['gangwon'],
  강원특별자치도: ['gangwon'],
  충북: ['chungbuk'],
  충청북도: ['chungbuk'],
  충남: ['chungnam'],
  충청남도: ['chungnam'],
  전북: ['jeonbuk'],
  전라북도: ['jeonbuk'],
  전북특별자치도: ['jeonbuk'],
  전남: ['jeonnam'],
  전라남도: ['jeonnam'],
  경북: ['gyeongbuk'],
  경상북도: ['gyeongbuk'],
  경남: ['gyeongnam'],
  경상남도: ['gyeongnam'],
  제주: ['jeju'],
  제주도: ['jeju'],
  제주특별자치도: ['jeju'],
  // 공고 표기(통합특별시)와 기존 지역 코드를 함께 쓰기 위해 광주·전남 모두와 일치로 본다
  전남광주: ['gwangju', 'jeonnam'],
  전남광주통합특별시: ['gwangju', 'jeonnam'],
}

/** 시·군·구 비교용: 공백과 끝의 '특례시·시·군·구'를 뗀다 */
export function districtBase(district: string): string {
  return compact(district).replace(/(특례시|시|군|구)$/, '')
}

function evaluateRegion(rule: EligibilityRule, profile: CompanyProfile): Match {
  const factory = rule.field === 'factory_region'
  const label = factory ? '공장 소재지' : '본사 소재지'
  if (factory && profile.hasFactory === false) {
    return { kind: 'no', reason: '공장이 없다고 입력했습니다.', companyValue: '공장 없음' }
  }
  const region = factory ? profile.factoryRegion : profile.hqRegion
  const district = factory ? profile.factoryDistrict : profile.hqDistrict
  if (region === null) return missingInput(label, 1)
  const companyValue = [optionLabel(REGION_OPTIONS, region), district].filter(Boolean).join(' ')

  let needsDistrict = false
  let unknownName = false
  for (const token of valueTokens(rule.value)) {
    const words = token.trim().split(/\s+/)
    const codes = REGION_NAMES[words[0] ?? '']
    if (!codes) {
      unknownName = true
      continue
    }
    if (codes.includes('nationwide')) return { kind: 'yes', reason: '전국이 대상입니다.', companyValue }
    if (!codes.includes(region)) continue
    const ruleDistrict = words.slice(1).join(' ')
    if (!ruleDistrict) return { kind: 'yes', reason: `${label}가 공고 대상 지역에 포함됩니다.`, companyValue }
    if (!district) {
      needsDistrict = true
      continue
    }
    if (compact(district).startsWith(districtBase(ruleDistrict))) {
      return { kind: 'yes', reason: `${label}(시·군·구까지)가 공고 대상 지역에 포함됩니다.`, companyValue }
    }
  }
  if (needsDistrict) return missingInput(`${label}의 시·군·구`, 1)
  if (unknownName) return notAutomatable('지역 표현을 지역 코드로 바꾸지 못해 직접 확인이 필요합니다.', companyValue)
  return { kind: 'no', reason: `${label}가 공고 대상 지역이 아닙니다.`, companyValue }
}

// ── 업종 (KSIC) ──

interface KsicRange {
  lo: string
  hi: string
}

/** 값에서 KSIC 코드를 뽑는다. 영문 대분류가 붙은 코드(C24, C25~C29)와 'KSIC' 뒤의 숫자 코드만 읽는다 */
export function extractKsicCodes(text: string): KsicRange[] {
  const codes: KsicRange[] = []
  const add = (a: string, b?: string) => {
    const hi = b && b.length === a.length ? b : a
    codes.push(a <= hi ? { lo: a, hi } : { lo: hi, hi: a })
  }
  for (const m of text.matchAll(/(?<![A-Za-z])[A-Z](\d{2,5})(?:\s*~\s*[A-Z]?(\d{2,5}))?/g)) {
    if (m[1]) add(m[1], m[2])
  }
  const at = text.indexOf('KSIC')
  if (at >= 0) {
    for (const m of text.slice(at + 4).matchAll(/(?<![A-Za-z\d])(\d{2,5})(?:\s*~\s*(\d{2,5}))?(?!\d)/g)) {
      if (m[1]) add(m[1], m[2])
    }
  }
  return codes
}

function ksicDigits(code: string | null): string | null {
  if (!code) return null
  const match = /^[A-Za-z]?(\d{2,5})$/.exec(code.trim())
  return match?.[1] ?? null
}

function ksicMatch(digits: string, range: KsicRange): 'yes' | 'no' | 'partial' {
  const length = range.lo.length
  if (digits.length >= length) {
    const head = digits.slice(0, length)
    return head >= range.lo && head <= range.hi ? 'yes' : 'no'
  }
  // 입력 코드가 공고 코드보다 짧으면(넓으면) 같은 계열인지만 본다
  const lo = range.lo.slice(0, digits.length)
  const hi = range.hi.slice(0, digits.length)
  return digits >= lo && digits <= hi ? 'partial' : 'no'
}

/**
 * 업종 설명 사전 (revision_03 테스트 계정 §6.3). 공백을 뺀 업종 설명 → 그 설명에 속하는 KSIC 범위.
 * 한 방향으로만 쓴다: 입력한 KSIC가 범위에 들면 '해당', 들지 않으면 판정하지 않고 직접 확인으로 둔다
 * (예: '농·식품'에는 농업 등 다른 업종도 들어갈 수 있다). '제조업'(10~34)은 아래에서 따로 다룬다.
 */
const INDUSTRY_TERM_KSIC: Record<string, KsicRange[]> = {
  식품제조: [{ lo: '10', hi: '10' }],
  '농·식품': [{ lo: '10', hi: '10' }],
  농식품제조업체: [{ lo: '10', hi: '10' }],
}

/** 업종 설명 사전에 있는 설명 중 입력한 업종 코드가 속하는 것 */
function industryTermHits(tokens: string[], digits: string | null): string[] {
  if (!digits) return []
  return tokens.filter((t) => INDUSTRY_TERM_KSIC[compact(t)]?.some((range) => ksicMatch(digits, range) === 'yes'))
}

function evaluateIndustry(rule: EligibilityRule, profile: CompanyProfile): Match {
  const tokens = valueTokens(rule.value)
  const digits = ksicDigits(profile.ksicCode)
  const companyValue = [profile.ksicCode, profile.industryName].filter(Boolean).join(' · ') || null
  const describe = (why: string) =>
    notAutomatable(
      `${why} 입력한 업종: ${profile.industryName ?? profile.ksicCode ?? '-'} · 주력 제품: ${profile.productName ?? '-'}`,
      companyValue,
    )

  const codes = extractKsicCodes([...tokens, rule.valueNote ?? ''].join(' '))
  if (codes.length > 0) {
    if (!digits) return describe('업종 코드(KSIC)가 입력되지 않아 자동으로 판정할 수 없습니다.')
    const results = codes.map((range) => ksicMatch(digits, range))
    if (results.includes('yes')) {
      return { kind: 'yes', reason: `입력한 업종 코드(${profile.ksicCode})가 공고의 업종 코드에 포함됩니다.`, companyValue }
    }
    if (results.includes('partial')) return describe('입력한 업종 코드가 공고의 코드보다 넓어 정확히 비교할 수 없습니다.')
    return { kind: 'no', reason: `입력한 업종 코드(${profile.ksicCode})가 공고의 업종 코드에 포함되지 않습니다.`, companyValue }
  }

  const manufacturing = tokens.some((t) => compact(t) === '제조업')
  const others = tokens.filter((t) => compact(t) !== '제조업')
  if (manufacturing) {
    if (!digits) return describe('업종 코드(KSIC)가 입력되지 않아 제조업인지 자동으로 판정할 수 없습니다.')
    const division = digits.slice(0, 2)
    if (division >= '10' && division <= '34') {
      return { kind: 'yes', reason: `입력한 업종 코드(${profile.ksicCode})가 제조업(KSIC 10~34)입니다.`, companyValue }
    }
    if (others.length === 0) {
      return { kind: 'no', reason: `입력한 업종 코드(${profile.ksicCode})가 제조업(KSIC 10~34)이 아닙니다.`, companyValue }
    }
  }
  const termHits = industryTermHits(others, digits)
  if (termHits.length > 0) {
    return {
      kind: 'yes',
      reason: `입력한 업종 코드(${profile.ksicCode})가 '${termHits.join(', ')}'에 해당합니다 (업종 사전).`,
      companyValue,
    }
  }
  return describe('업종 설명으로 된 조건이라 직접 확인이 필요합니다.')
}

// ── 수출액·매출액 ──

function referenceYear(program: Program, asOf: IsoDate | null): number | null {
  const date = program.sourcePublishedAt ?? program.applyStart ?? program.applyEnd ?? asOf
  return date ? Number(date.slice(0, 4)) : null
}

/** 규칙 기준 시점이 하나의 연도이면 그 연도 (예: '2025년', '전년도'). 아니면 null */
export function basisYear(basis: string | null, program: Program, asOf: IsoDate | null): number | null {
  if (!basis) return null
  const single = /^\s*(\d{4})\s*년/.exec(basis)
  if (single && !basis.includes('~')) return Number(single[1])
  if (basis.includes('전년도') || basis.includes('직전')) {
    const year = referenceYear(program, asOf)
    return year === null ? null : year - 1
  }
  return null
}

function directExportNote(rule: EligibilityRule): string {
  const text = compact(`${rule.basis ?? ''} ${rule.source.quote}`)
  return text.includes('직수출') || text.includes('직접수출') ? ' 입력한 수출액이 직수출 기준인지 확인해 주세요.' : ''
}

function evaluateExport(rule: EligibilityRule, profile: CompanyProfile, program: Program, asOf: IsoDate | null): Match {
  const usd = profile.exportUsdLastYear
  if (rule.unit === 'KRW') return notAutomatable('원화로 적힌 수출액 기준은 환산하지 않고 직접 확인합니다.', formatUsd(usd))
  if (usd === null) return missingInput('최근 1년 수출액', 3)
  const companyValue = formatUsd(usd)
  const note = directExportNote(rule)

  // 수출 실적 있음(> 0)은 기간과 상관없이 판정한다
  if (rule.op === '>' && rule.value === 0) {
    return usd > 0
      ? { kind: 'yes', reason: `입력한 수출액이 0보다 큽니다(수출 실적 있음).${note}`, companyValue }
      : { kind: 'no', reason: `입력한 수출액이 0입니다(수출 실적 없음).${note}`, companyValue }
  }
  const hit = compare(rule.op, usd, rule.value)
  if (hit === null) return notAutomatable('공고 기준 금액을 읽을 수 없어 직접 확인이 필요합니다.', companyValue)
  const year = basisYear(rule.basis, program, asOf)
  const period =
    profile.exportPeriodStart && profile.exportPeriodEnd
      ? `${formatYearMonth(profile.exportPeriodStart)} ~ ${formatYearMonth(profile.exportPeriodEnd)}`
      : '측정 기간 미입력'
  if (year !== null && profile.exportPeriodStart === `${year}-01` && profile.exportPeriodEnd === `${year}-12`) {
    return {
      kind: hit ? 'yes' : 'no',
      reason: `${year}년 수출액을 공고 기준 ${thresholdText(rule, formatUsd)}과 비교했습니다.${note}`,
      companyValue,
    }
  }
  return {
    kind: 'unknown',
    code: 'period-mismatch',
    reason: `공고 기준 시점(${rule.basis ?? '표기 없음'})과 입력한 측정 기간(${period})이 같지 않아 판정하지 않았습니다. 공고 기준은 ${thresholdText(rule, formatUsd)}입니다.${note}`,
    companyValue: `${companyValue} (${period})`,
    inputStep: null,
    hypothetical: hit,
  }
}

function evaluateRevenue(rule: EligibilityRule, profile: CompanyProfile, program: Program, asOf: IsoDate | null): Match {
  const krw = profile.revenueKrw
  if (krw === null) return missingInput('최근 매출액', 2)
  const companyValue = `${formatKrw(krw)}${profile.revenueYear !== null ? ` (${profile.revenueYear}년)` : ''}`
  const hit = compare(rule.op, krw, rule.value)
  if (hit === null) return notAutomatable('공고 기준 금액을 읽을 수 없어 직접 확인이 필요합니다.', companyValue)
  const year = basisYear(rule.basis, program, asOf)
  if (year !== null && profile.revenueYear === year) {
    return { kind: hit ? 'yes' : 'no', reason: `${year}년 매출액을 공고 기준 ${thresholdText(rule, formatKrw)}과 비교했습니다.`, companyValue }
  }
  return {
    kind: 'unknown',
    code: 'period-mismatch',
    reason: `공고 기준 시점(${rule.basis ?? '표기 없음'})과 입력한 매출액 기준연도(${profile.revenueYear ?? '미입력'})가 같지 않아 판정하지 않았습니다. 공고 기준은 ${thresholdText(rule, formatKrw)}입니다.`,
    companyValue,
    inputStep: null,
    hypothetical: hit,
  }
}

// ── 업력·인원·인증·HS·의향 ──

function evaluateBusinessAge(rule: EligibilityRule, profile: CompanyProfile, program: Program): Match {
  if (profile.foundedAt === null) return missingInput('설립일', 1)
  const basis = rule.basis?.trim() ?? ''
  let reference: string | null
  let basisLabel: string
  if (basis === '' || basis.startsWith('공고일')) {
    reference = program.sourcePublishedAt
    basisLabel = '공고일'
  } else if (basis.includes('마감')) {
    reference = program.applyEnd
    basisLabel = '접수 마감일'
  } else {
    return notAutomatable(`업력 기준 시점(${basis})에 맞춰 계산할 수 없어 직접 확인이 필요합니다.`)
  }
  // 기준 날짜가 없으면 오늘 날짜로 대신하지 않는다
  if (!reference) return notAutomatable(`${basisLabel}이 확인되지 않아 업력을 계산하지 않았습니다.`)
  const years = fullYearsBetween(profile.foundedAt, reference)
  if (years === null) return missingInput('설립일', 1)
  const hit = compare(rule.op, years, rule.value)
  if (hit === null) return notAutomatable('공고 기준 연수를 읽을 수 없어 직접 확인이 필요합니다.', `업력 ${years}년`)
  return {
    kind: hit ? 'yes' : 'no',
    reason: `${basisLabel} 기준 업력 ${years}년을 공고 기준 ${thresholdText(rule, (n) => `${n}년`)}과 비교했습니다.`,
    companyValue: `업력 ${years}년`,
  }
}

function evaluateEmployees(rule: EligibilityRule, profile: CompanyProfile): Match {
  if (profile.employeeCount === null) return missingInput('종업원 수', 1)
  const hit = compare(rule.op, profile.employeeCount, rule.value)
  const companyValue = formatCount(profile.employeeCount, '명')
  if (hit === null) return notAutomatable('공고 기준 인원을 읽을 수 없어 직접 확인이 필요합니다.', companyValue)
  return {
    kind: hit ? 'yes' : 'no',
    reason: `종업원 수를 공고 기준 ${thresholdText(rule, (n) => `${n}명`)}과 비교했습니다.`,
    companyValue,
  }
}

const CERTIFICATION_WORDS: [string, string][] = [
  ['수출유망중소기업', 'export-promising'],
  ['기업부설연구소', 'research-institute'],
  ['이노비즈', 'innobiz'],
  ['메인비즈', 'mainbiz'],
  ['벤처', 'venture'],
  ['여성기업', 'women'],
  ['장애인기업', 'disabled'],
  ['사회적기업', 'social'],
]

function evaluateCertification(rule: EligibilityRule, profile: CompanyProfile): Match {
  if (profile.certificationStatus === null) return missingInput('기업 인증', 5)
  const companyValue =
    profile.certificationStatus === 'none'
      ? '보유하지 않음'
      : profile.certifications.map((c) => optionLabel(CERTIFICATION_OPTIONS, c) ?? c).join(', ') || null
  const known: string[] = []
  const unknown: string[] = []
  for (const token of valueTokens(rule.value)) {
    const code = CERTIFICATION_WORDS.find(([word]) => compact(token).includes(word))?.[1]
    if (code) known.push(code)
    else unknown.push(token)
  }
  const has = known.some((code) => profile.certifications.includes(code))
  if (has) return { kind: 'yes', reason: '공고에 적힌 인증을 보유하고 있습니다.', companyValue }
  if (unknown.length > 0) {
    return notAutomatable(`프로필로 확인할 수 없는 인증(${unknown.join(', ')})이라 직접 확인이 필요합니다.`, companyValue)
  }
  return { kind: 'no', reason: '공고에 적힌 인증을 보유하고 있지 않습니다.', companyValue }
}

function evaluateProductHs(rule: EligibilityRule, profile: CompanyProfile): Match {
  if (profile.hsCodeStatus === null || profile.hsCodeStatus === 'unknown' || !profile.hsCode) {
    return missingInput('주력 제품 HS 코드', 4)
  }
  const codes = [...valueTokens(rule.value).join(' ').matchAll(/(?<!\d)(\d{4})(?!\d)/g)].map((m) => m[1])
  const head = profile.hsCode.slice(0, 4)
  const hit = codes.includes(head)
  const companyValue = `${profile.hsCode}${profile.hsCodeStatus === 'provisional' ? ' (대략)' : ''}`
  if (profile.hsCodeStatus === 'provisional') {
    return {
      kind: 'unknown',
      code: 'ambiguous',
      reason: `입력한 HS 코드가 '대략 알고 있어요' 상태라 확인이 필요합니다. 입력값 기준으로는 ${hit ? '해당합니다' : '해당하지 않습니다'}.`,
      companyValue,
      inputStep: null,
    }
  }
  return {
    kind: hit ? 'yes' : 'no',
    reason: hit ? 'HS 코드 앞 4자리가 공고 품목에 포함됩니다.' : 'HS 코드 앞 4자리가 공고 품목에 포함되지 않습니다.',
    companyValue,
  }
}

function evaluateIntent(rule: EligibilityRule, profile: CompanyProfile): Match {
  const text = valueTokens(rule.value).join(' ')
  if (compact(text).includes('수출중') && profile.exportUsdLastYear !== null && profile.exportUsdLastYear > 0) {
    return { kind: 'yes', reason: '입력한 수출액이 있어 수출 중으로 봅니다.', companyValue: formatUsd(profile.exportUsdLastYear) }
  }
  return notAutomatable('수출 의향은 직접 확인하는 항목입니다.')
}

function fieldMatch(rule: EligibilityRule, profile: CompanyProfile, program: Program, asOf: IsoDate | null): Match {
  switch (rule.field) {
    case 'company_type':
      return evaluateCompanyType(rule, profile)
    case 'hq_region':
    case 'factory_region':
      return evaluateRegion(rule, profile)
    case 'industry':
      return evaluateIndustry(rule, profile)
    case 'export_usd':
      return evaluateExport(rule, profile, program, asOf)
    case 'revenue_krw':
      return evaluateRevenue(rule, profile, program, asOf)
    case 'business_age_years':
      return evaluateBusinessAge(rule, profile, program)
    case 'employees':
      return evaluateEmployees(rule, profile)
    case 'certification':
      return evaluateCertification(rule, profile)
    case 'product_hs':
      return evaluateProductHs(rule, profile)
    case 'intent':
      return evaluateIntent(rule, profile)
    case 'manual_check':
      return notAutomatable('기업 프로필로 판정할 수 없는 조건입니다. 공고 원문을 보고 직접 확인해 주세요.')
  }
}

function evaluateMatch(rule: EligibilityRule, profile: CompanyProfile, program: Program, asOf: IsoDate | null): Match {
  if (rule.op === 'no-limit') return { kind: 'yes', reason: NO_LIMIT_REASON, companyValue: null }
  const match = fieldMatch(rule, profile, program, asOf)
  // not_in·not_has는 '해당'의 뜻을 뒤집는다
  if ((rule.op === 'not_in' || rule.op === 'not_has') && match.kind !== 'unknown') {
    return { ...match, kind: match.kind === 'yes' ? 'no' : 'yes' }
  }
  return match
}

// ── 조건 결과 ──

function statusFromMatch(kind: 'yes' | 'no', ruleKind: EligibilityRule['kind']): ConditionStatus {
  if (ruleKind === 'required') return kind === 'yes' ? 'met' : 'unmet'
  return kind === 'yes' ? 'unmet' : 'met'
}

function outcomeText(status: ConditionStatus, ruleKind: EligibilityRule['kind']): string {
  if (ruleKind === 'exclusion') return status === 'unmet' ? '제외 대상 해당' : '해당 없음'
  return status === 'met' ? '충족' : '미충족'
}

function baseCondition(
  rule: EligibilityRule,
  profile: CompanyProfile,
  program: Program,
  asOf: IsoDate | null,
): ConditionResult {
  const match = evaluateMatch(rule, profile, program, asOf)
  const base = {
    ruleId: rule.id,
    label: rule.label,
    kind: rule.kind,
    group: rule.group,
    scope: rule.scope,
    certainty: rule.certainty,
    exceptionText: rule.exceptionText,
    selfChecked: false,
    selfCheckable: false,
    commonCheckKeys: rule.commonCheckKey,
    basis: rule.basis,
    source: rule.source,
    companyValue: match.companyValue,
  }
  if (match.kind === 'unknown') {
    let reason = match.reason
    if (match.hypothetical !== undefined) {
      reason += ` 입력값 기준으로는 ${outcomeText(statusFromMatch(match.hypothetical ? 'yes' : 'no', rule.kind), rule.kind)}입니다.`
    }
    return { ...base, status: 'needs-check', reasonCode: match.code, reason, inputStep: match.inputStep }
  }
  const status = statusFromMatch(match.kind, rule.kind)
  // 예외 문구가 있거나 해석이 애매한 규칙은 그 규칙만으로 '신청 불가'를 만들지 않는다
  if (status === 'unmet' && rule.exceptionText) {
    return {
      ...base,
      status: 'needs-check',
      reasonCode: 'exception',
      reason: `예외가 있습니다: ${rule.exceptionText}. ${match.reason}`,
      inputStep: null,
    }
  }
  if (status === 'unmet' && rule.certainty === 'ambiguous') {
    return {
      ...base,
      status: 'needs-check',
      reasonCode: 'ambiguous',
      reason: `해석이 애매한 조건이라 이 조건만으로 신청 불가로 판정하지 않습니다. ${match.reason}`,
      inputStep: null,
    }
  }
  return { ...base, status, reasonCode: null, reason: match.reason, inputStep: null }
}

function selfCheckedText(answer: RuleCheckEntry['answer'], ruleKind: EligibilityRule['kind']): string {
  if (ruleKind === 'exclusion') return answer === 'met' ? '해당 없음 (직접 확인)' : '해당함 (직접 확인)'
  return answer === 'met' ? '충족함 (직접 확인)' : '충족하지 않음 (직접 확인)'
}

/** 공통 확인 적용 규칙 2~6 (§6.9). 1번(공고별 답 우선)은 호출하는 쪽에서 먼저 처리한다 */
function applyCommonChecks(
  condition: ConditionResult,
  rule: EligibilityRule,
  common: SelfCheckAnswers['common'],
): ConditionResult {
  const keys = rule.commonCheckKey ?? []
  const answers = keys.map((key) => ({ key, answer: common[key] ?? null }))
  const yesKeys = answers.filter((a) => a.answer === 'yes').map((a) => a.key)

  const plainYes = yesKeys.filter((key) => key !== 'financial-health')
  if (plainYes.length > 0 && !rule.exceptionText) {
    const names = plainYes.map((key) => `'${COMMON_CHECK_KEY_LABEL[key]}'`).join(', ')
    return {
      ...condition,
      status: 'unmet',
      reasonCode: null,
      reason: `공통 확인에서 ${names}에 해당한다고 답했습니다.`,
      selfChecked: true,
    }
  }
  if (yesKeys.length > 0) {
    return rule.exceptionText
      ? {
          ...condition,
          status: 'needs-check',
          reasonCode: 'exception',
          reason: `예외가 있습니다: ${rule.exceptionText}. 공고 원문을 보고 직접 확인해 주세요.`,
        }
      : {
          ...condition,
          status: 'needs-check',
          reasonCode: 'not-automatable',
          reason: '공고마다 재무 기준이 달라 다시 확인이 필요합니다.',
        }
  }
  if (keys.length > 0 && answers.every((a) => a.answer === 'no')) {
    if (rule.commonCheckUncovered.length === 0) {
      return {
        ...condition,
        status: 'met',
        reasonCode: null,
        reason: "공통 확인에서 모두 '해당 없음'으로 답했습니다.",
        selfChecked: true,
      }
    }
    return {
      ...condition,
      status: 'needs-check',
      reasonCode: 'not-automatable',
      reason: `공통 확인으로 확인하지 못한 항목: ${rule.commonCheckUncovered.join(', ')}`,
    }
  }
  if (answers.some((a) => a.answer === 'unknown')) {
    return {
      ...condition,
      reason: "공통 확인에서 '모르겠음'으로 답했습니다. 공고 원문을 보고 직접 확인해 주세요.",
    }
  }
  return {
    ...condition,
    reason: '맞춤 추천의 공통 확인 사항에 답하면 반영됩니다. 공고 원문을 보고 직접 확인할 수도 있습니다.',
  }
}

function applySelfChecks(
  condition: ConditionResult,
  rule: EligibilityRule,
  programAnswers: Record<string, RuleCheckEntry> | undefined,
  common: SelfCheckAnswers['common'],
): ConditionResult {
  const selfCheckable =
    condition.status === 'needs-check' &&
    condition.reasonCode !== null &&
    SELF_CHECKABLE_REASONS.includes(condition.reasonCode)
  const withFlag = { ...condition, selfCheckable }
  if (!selfCheckable) return withFlag

  // 1. 공고별 확인 답이 있으면 그 답을 따른다 (공통 답보다 우선)
  const entry = programAnswers?.[rule.id]
  if (entry) {
    return {
      ...withFlag,
      status: entry.answer,
      reasonCode: null,
      reason: selfCheckedText(entry.answer, rule.kind),
      selfChecked: true,
    }
  }
  // 2~6. 공통 확인 키가 붙은 제외 조건 (공통 답으로 정해져도 공고별 답으로 다시 정할 수 있다)
  if (rule.kind === 'exclusion' && rule.commonCheckKey && condition.reasonCode === 'not-automatable') {
    return applyCommonChecks(withFlag, rule, common)
  }
  return withFlag
}

function groupStatus(conditions: ConditionResult[]): ConditionStatus {
  if (conditions.some((c) => c.status === 'met')) return 'met'
  if (conditions.every((c) => c.status === 'unmet')) return 'unmet'
  return 'needs-check'
}

export function evaluateEligibility(
  profile: CompanyProfile,
  program: Program,
  context: EligibilityContext = { asOf: null, selfChecks: null },
): EligibilityResult | null {
  const rules = program.eligibilityRules
  if (rules === null || rules.length === 0) return null
  // 데이터 상태가 없는 공고(근거·검수 정보가 없음)는 판정하지 않는다
  if (program.dataState === null) return null

  const asOf = context.asOf ?? program.receptionStatusAsOf
  const programAnswers = context.selfChecks?.programs[program.id]
  const common = context.selfChecks?.common ?? {}
  const all = rules.map((rule) =>
    applySelfChecks(baseCondition(rule, profile, program, asOf), rule, programAnswers, common),
  )
  const conditions = all.filter((c) => c.scope === null)
  const scopedConditions = all.filter((c) => c.scope !== null)

  // 필수 조건: 같은 그룹 OR, 다른 그룹 AND (그룹이 없으면 조건 하나가 한 그룹)
  const grouped = new Map<string, ConditionResult[]>()
  for (const condition of conditions.filter((c) => c.kind === 'required')) {
    const key = condition.group ?? `#${condition.ruleId}`
    grouped.set(key, [...(grouped.get(key) ?? []), condition])
  }
  const groups: ConditionGroupResult[] = Array.from(grouped, ([group, members]) => ({
    group,
    status: groupStatus(members),
    ruleIds: members.map((m) => m.ruleId),
  }))
  const exclusions = conditions.filter((c) => c.kind === 'exclusion')

  let status: EligibilityStatus = 'eligible'
  if (groups.some((g) => g.status === 'unmet') || exclusions.some((c) => c.status === 'unmet')) {
    status = 'ineligible'
  } else if (groups.some((g) => g.status === 'needs-check') || exclusions.some((c) => c.status === 'needs-check')) {
    status = 'needs-check'
  }

  // 이미 충족된 그룹 안의 '확인 필요'는 결과에 영향을 주지 않으므로 세지 않는다
  const metGroups = new Set(groups.filter((g) => g.status === 'met').flatMap((g) => g.ruleIds))
  const open = conditions.filter((c) => c.status !== 'met' && !metGroups.has(c.ruleId))
  return {
    programId: program.id,
    status,
    conditions,
    scopedConditions,
    groups,
    reasons: open.map((c) => `${c.label}: ${c.reason}`),
    needsCheckCount: open.filter((c) => c.status === 'needs-check').length,
    selfCheckedCount: conditions.filter((c) => c.selfChecked).length,
    dataState: program.dataState,
    basisDate: program.verifiedAt ?? asOf,
    sourceUrl: program.sourceUrl,
    engineVersion: ELIGIBILITY_ENGINE_VERSION,
  }
}

/** 프로필로 확인할 수 있는 인증·지식재산권 코드 */
export function profileHoldingCodes(profile: CompanyProfile): Set<string> {
  const codes = new Set<string>()
  if (profile.certificationStatus === 'has') profile.certifications.forEach((c) => codes.add(c))
  if (profile.ipStatus === 'has') profile.ipTypes.forEach((c) => codes.add(c))
  return codes
}

/** 표시용: 인증·지식재산권 코드 이름 */
export function holdingCodeLabel(code: string): string {
  return optionLabel(CERTIFICATION_OPTIONS, code) ?? optionLabel(IP_OPTIONS, code) ?? code
}

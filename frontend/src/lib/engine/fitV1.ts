/*
 * 적합도 v1 (REVISION_05 §6). 신청 가능 탭 공고에만 점수를 보여 준다.
 * 최종 점수 = Σ(비중 × 요소값) / (계산된 요소의 비중 합) × 100, 반올림. 계산된 요소가 2개 미만이면 null.
 * 공고가 사업 분류를 여러 개 가지면 각 매칭표에서 가장 높은 값을 쓴다.
 */
import type { IsoDate } from '@/types/common'
import type { CompanyProfile } from '@/types/profile'
import type { ExportStage, Program, SupportCategoryCode } from '@/types/program'
import type { ExportStageDiagnosis, FitFactorResult, FitScoreResult } from '@/types/results'
import {
  ARCHETYPE_CATEGORY,
  ARCHETYPE_REFERENCE,
  ARCHETYPE_VALUES,
  FIT_V1_LABEL,
  FIT_V1_MAPPING_VERSIONS,
  FIT_V1_MIN_FACTORS,
  FIT_V1_VERSION,
  FIT_V1_WEIGHTS,
  MARK_VALUE,
  STAGE_CATEGORY_MATRIX,
  type Archetype,
  type FitV1FactorKey,
} from '@/constants/fitV1'
import { INTEREST_CATEGORIES, categoryName } from '@/constants/categories'
import { EXPORT_STAGE_OPTIONS, optionLabel } from '@/constants/options'
import { industryTagsForKsic } from '@/constants/ksicIndustryTags'
import { financeSummary } from '@/lib/finance'
import { REGION_SHORT } from './engineProfile'

export const FIT_V1_ENGINE_VERSION = 'fit-1.0.0'

/** 공고에서 업종 언급을 찾는 태그 단어 (정답세트 값사전의 업종 태그) */
const INDUSTRY_WORDS: Record<string, string[]> = {
  식품: ['식품', '농식품', 'K-Food', 'K-푸드', '푸드'], 농수산물: ['농수산', '농산물', '수산물', '수산식품'],
  화장품: ['화장품', '뷰티'], 의료기기: ['의료기기'], '바이오·의약': ['바이오', '제약', '의약'], 'ICT·SW': ['ICT', '소프트웨어', 'SW'],
  콘텐츠: ['콘텐츠'], 자동차부품: ['자동차부품', '자동차 부품', '자동차전장'], 기계: ['기계'], 신발: ['신발'], 안경: ['안경'],
  승강기: ['승강기'], 해조류: ['해조류', '김 수출'], 인삼제품: ['인삼'],
}

export interface FitV1Context {
  diagnosis: ExportStageDiagnosis | null
  /** 업종 언급이 없는 공고의 글자 2-gram TF-IDF 코사인 유사도 (0~1). 계산할 수 없으면 없음 */
  textSimilarity: Map<string, number>
  asOf: IsoDate | null
}

/** 공고 본문으로 쓰는 글: 제목·지원 대상·쉬운 설명·근거 문장 */
export function noticeText(p: Program): string {
  return [p.title, p.subProgramName, p.targetDescription, p.summaryEasy, ...(p.conditions ?? []).map((c) => c.evidence)]
    .filter(Boolean)
    .join('\n')
}

/** 공고가 언급한 업종 태그 (판정 조건의 업종 값 + 제목·지원 대상의 업종 단어). 없으면 [] */
export function noticeIndustryTags(p: Program): string[] {
  const tags = new Set<string>()
  for (const c of p.conditions ?? []) {
    if (c.kind !== '필수') continue
    const expr = c.expr as { atom?: string; op?: string; value?: unknown }
    if (expr.atom === 'industry' && expr.op === 'in' && Array.isArray(expr.value)) {
      for (const v of expr.value) if (v !== '제조업') tags.add(String(v))
    }
  }
  const text = [p.title, p.targetDescription].filter(Boolean).join(' ')
  for (const [tag, words] of Object.entries(INDUSTRY_WORDS)) if (words.some((w) => text.includes(w))) tags.add(tag)
  return [...tags]
}

function factor(key: FitV1FactorKey, value: number | null, reason: string): FitFactorResult {
  const weight = FIT_V1_WEIGHTS[key]
  return { key, label: FIT_V1_LABEL[key], weight, value, contribution: value === null ? null : weight * value, reason }
}

function categoriesText(codes: SupportCategoryCode[]): string {
  return codes.map(categoryName).join(' · ')
}

/** 재무 원형 판정: 기준표의 평균·표준편차로 표준화 → 가장 가까운 군집의 원형 */
export function financeArchetype(p: CompanyProfile): { archetype: Archetype | null; reason: string } {
  const summary = financeSummary(p)
  if (summary.status !== 'complete') return { archetype: null, reason: '재무 미입력' }
  if (summary.capitalImpaired) return { archetype: null, reason: '자본잠식' }
  const table = ARCHETYPE_REFERENCE
  if (!table) return { archetype: null, reason: '기준 미등록' }
  const values = {
    growth: summary.revenueGrowth,
    opMargin: summary.operatingMargin,
    debtRatio: summary.debtRatio,
    netMargin: summary.netMargin,
  }
  if (Object.values(values).some((v) => v === null)) return { archetype: null, reason: '재무 비율 계산 불가' }
  const z = (k: keyof typeof values) => ((values[k] as number) - table.stats[k].mean) / (table.stats[k].sd || 1)
  let best: { archetype: Archetype; d: number } | null = null
  for (const cluster of table.clusters) {
    const d = (['growth', 'opMargin', 'debtRatio', 'netMargin'] as const).reduce(
      (sum, k) => sum + (z(k) - cluster.center[k]) ** 2,
      0,
    )
    if (!best || d < best.d) best = { archetype: cluster.archetype, d }
  }
  return best ? { archetype: best.archetype, reason: '' } : { archetype: null, reason: '기준 미등록' }
}

function bonusFactor(profile: CompanyProfile, program: Program): FitFactorResult {
  const items = program.bonusItems ?? []
  if (items.length === 0) return factor('bonus', null, '가점이 없는 공고라 제외')
  const owned = new Set([...profile.certifications, ...profile.ipTypes])
  const hqSido = profile.hqRegion ? REGION_SHORT[profile.hqRegion] : null
  let checkable = 0
  let met = 0
  for (const item of items) {
    const text = item.item ?? ''
    const keys = item.matchKeys ?? []
    if (keys.length > 0 && profile.certificationStatus !== null) {
      checkable += 1
      if (keys.some((k) => owned.has(k))) met += 1
      continue
    }
    if (/수출\s*실적/.test(text) && profile.exportUsdLastYear !== null) {
      checkable += 1
      if (profile.exportUsdLastYear > 0) met += 1
      continue
    }
    const sido = Object.values(REGION_SHORT).find((s) => text.includes(s))
    if (sido && hqSido) {
      checkable += 1
      if (sido === hqSido) met += 1
    }
  }
  if (checkable === 0) return factor('bonus', null, '기업 정보로 확인할 수 있는 가점 항목이 없어 제외')
  return factor('bonus', met / checkable, `가점 ${checkable}개 중 ${met}개를 기업 정보로 충족`)
}

export function evaluateFitV1(profile: CompanyProfile, program: Program, context: FitV1Context): FitScoreResult | null {
  const factors = computeFitV1Factors(profile, program, context)
  const used = factors.filter((f) => f.value !== null)
  if (used.length < FIT_V1_MIN_FACTORS) return null
  const weightSum = used.reduce((s, f) => s + f.weight, 0)
  const raw = used.reduce((s, f) => s + (f.contribution ?? 0), 0) / weightSum
  const score = Math.round(raw * 100)
  return {
    programId: program.id,
    score,
    baseScore: score,
    factors,
    bonusAdjustment: 0,
    bonusApplied: [],
    bonusToCheck: [],
    reasons: [...used].sort((a, b) => (b.contribution ?? 0) - (a.contribution ?? 0)).map((f) => `${f.label}: ${f.reason}`),
    basisDate: context.asOf,
    criteriaVersion: FIT_V1_VERSION,
    criteriaStatus: 'hypothesis',
    mappingVersions: FIT_V1_MAPPING_VERSIONS,
    engineVersion: FIT_V1_ENGINE_VERSION,
  }
}

export function computeFitV1Factors(profile: CompanyProfile, program: Program, context: FitV1Context): FitFactorResult[] {
  const cats = (program.supportCategories ?? []) as SupportCategoryCode[]
  const out: FitFactorResult[] = []

  // 1) 관심 분야 × 사업 분류
  if (profile.interestUnsure || profile.interestAreas.length === 0) {
    out.push(factor('interest', null, profile.interestUnsure ? "관심 분야 '잘 모르겠어요'로 제외" : '관심 분야를 고르지 않아 제외'))
  } else if (cats.length === 0) {
    out.push(factor('interest', null, '공고 사업 분류가 없어 제외'))
  } else {
    const wanted = new Set(profile.interestAreas.flatMap((a) => INTEREST_CATEGORIES[a]))
    const hit = cats.filter((c) => wanted.has(c))
    out.push(factor('interest', hit.length > 0 ? 1 : 0, hit.length > 0 ? `관심 분야와 겹치는 분류: ${categoriesText(hit)}` : '관심 분야와 겹치는 사업 분류 없음'))
  }

  // 2) 공고 내용 × KSIC 업종
  const companyTags = industryTagsForKsic(profile.ksicCode)
  const hasCompanyInput = Boolean(profile.ksicCode || profile.industryName || profile.productName)
  const mentioned = noticeIndustryTags(program)
  if (!hasCompanyInput) {
    out.push(factor('industry', null, 'KSIC·업종명·제품을 입력하지 않아 제외'))
  } else if (mentioned.length > 0 && companyTags) {
    const hit = mentioned.filter((t) => companyTags.includes(t))
    out.push(factor('industry', hit.length > 0 ? 1 : 0, hit.length > 0 ? `공고 업종(${mentioned.join('·')})과 일치` : `공고 업종(${mentioned.join('·')})과 다름`))
  } else {
    const sim = context.textSimilarity.get(program.id)
    if (sim === undefined) out.push(factor('industry', null, '업종명·제품 설명이 짧아 유사도를 계산하지 못해 제외'))
    else out.push(factor('industry', Math.round(sim * 1000) / 1000, `업종 언급이 없는 공고: 업종명·제품과 공고 본문의 글자 유사도 ${(sim * 100).toFixed(0)}%`))
  }

  // 3) 수출단계 × 사업 분류
  const stage: ExportStage | null = context.diagnosis?.stage ?? null
  if (stage === null) {
    out.push(factor('stage', null, '수출액을 입력하지 않아 제외'))
  } else if (cats.length === 0) {
    out.push(factor('stage', null, '공고 사업 분류가 없어 제외'))
  } else {
    let best = 0
    let bestCat = cats[0]!
    for (const c of cats) {
      const v = MARK_VALUE[STAGE_CATEGORY_MATRIX[c][stage]]
      if (v > best) {
        best = v
        bestCat = c
      }
    }
    out.push(factor('stage', best, `수출단계 ${optionLabel(EXPORT_STAGE_OPTIONS, stage)} × ${categoryName(bestCat)} = ${STAGE_CATEGORY_MATRIX[bestCat][stage]}`))
  }

  // 4) 재무 원형 × 사업 분류
  const { archetype, reason } = financeArchetype(profile)
  if (!archetype) {
    out.push(factor('finance', null, `${reason}으로 제외`))
  } else if (cats.length === 0) {
    out.push(factor('finance', null, '공고 사업 분류가 없어 제외'))
  } else {
    const map = ARCHETYPE_CATEGORY[archetype]
    const best = Math.max(...cats.map((c) => (map.core.includes(c) ? ARCHETYPE_VALUES.core : map.support.includes(c) ? ARCHETYPE_VALUES.support : ARCHETYPE_VALUES.other)))
    out.push(factor('finance', best, `재무 원형 ${archetype} × 사업 분류 (${best === 1 ? '핵심' : best === 0.6 ? '보조' : '그 밖'})`))
  }

  // 5) 가점 충족
  out.push(bonusFactor(profile, program))
  return out
}

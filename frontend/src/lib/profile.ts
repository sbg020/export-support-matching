/*
 * 기업 프로필: 빈 값 생성, 단계별 검증, 입력 상태 판정, 기기 저장용 직렬화.
 */
import type {
  CompanyProfile,
  ProfileAssessment,
  ProfileField,
  ProfileIssue,
  ProfileMeta,
  ProfileStepId,
} from '@/types/profile'
import {
  CERTIFICATION_OPTIONS,
  COMPANY_TYPE_OPTIONS,
  HOLDING_STATUS_OPTIONS,
  HS_STATUS_OPTIONS,
  INDUSTRY_MODE_OPTIONS,
  INTEREST_AREA_OPTIONS,
  IP_OPTIONS,
  REGION_OPTIONS,
} from '@/constants/options'

export const PROFILE_STEP_IDS: ProfileStepId[] = [1, 2, 3, 4, 5, 6]

export function createEmptyProfile(): CompanyProfile {
  return {
    companyName: null,
    businessNumber: null,
    companyType: null,
    foundedAt: null,
    hqRegion: null,
    hqDistrict: null,
    hasFactory: null,
    factoryRegion: null,
    factoryDistrict: null,
    employeeCount: null,
    industryInputMode: null,
    ksicCode: null,
    industryName: null,
    revenueKrw: null,
    revenueYear: null,
    exportUsdLastYear: null,
    exportPeriodStart: null,
    exportPeriodEnd: null,
    exportCountries: [],
    productName: null,
    hsCodeStatus: null,
    hsCode: null,
    certificationStatus: null,
    certifications: [],
    certificationOther: null,
    ipStatus: null,
    ipTypes: [],
    ipOther: null,
    interestAreas: [],
    interestUnsure: false,
  }
}

export function createEmptyMeta(): ProfileMeta {
  return { skippedSteps: [], lastSavedAt: null }
}

/** 필드가 속한 단계 */
export const FIELD_STEP: Record<ProfileField, ProfileStepId> = {
  companyName: 1,
  businessNumber: 1,
  companyType: 1,
  foundedAt: 1,
  hqRegion: 1,
  hqDistrict: 1,
  hasFactory: 1,
  factoryRegion: 1,
  factoryDistrict: 1,
  employeeCount: 1,
  industryInputMode: 2,
  ksicCode: 2,
  industryName: 2,
  revenueKrw: 2,
  revenueYear: 2,
  exportUsdLastYear: 3,
  exportPeriodStart: 3,
  exportPeriodEnd: 3,
  exportCountries: 3,
  productName: 4,
  hsCodeStatus: 4,
  hsCode: 4,
  certificationStatus: 5,
  certifications: 5,
  certificationOther: 5,
  ipStatus: 5,
  ipTypes: 5,
  ipOther: 5,
  interestAreas: 6,
  interestUnsure: 6,
}

export type FieldErrors = Partial<Record<ProfileField, string>>

export interface ValidateOptions {
  /**
   * 이 기기에 저장하지 않는 항목(사업자등록번호)까지 필수로 검사할지 여부.
   * 단계 이동·입력 완료 시에는 true, 저장된 프로필의 상태 판정에는 false.
   */
  requireSessionFields: boolean
}

const BUSINESS_NUMBER_PATTERN = /^\d{10}$/
const KSIC_PATTERN = /^([A-Za-z]|[A-Za-z]?\d{2,5})$/
const HS_CODE_PATTERN = /^\d{4,10}$/
const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export function normalizeBusinessNumber(value: string): string {
  return value.replace(/\D/g, '')
}

export function normalizeHsCode(value: string): string {
  return value.replace(/[\s.-]/g, '')
}

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

/** 입력 검증용 오늘 날짜(YYYY-MM-DD). 공고 기준일로는 사용하지 않는다. */
function todayForValidation(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function validateStep(
  step: ProfileStepId,
  p: CompanyProfile,
  options: ValidateOptions = { requireSessionFields: true },
): FieldErrors {
  const errors: FieldErrors = {}

  switch (step) {
    case 1: {
      if (p.companyName === null) errors.companyName = '기업명을 입력해 주세요.'
      if (p.businessNumber === null) {
        if (options.requireSessionFields) {
          errors.businessNumber = '사업자등록번호를 입력해 주세요.'
        }
      } else if (!BUSINESS_NUMBER_PATTERN.test(normalizeBusinessNumber(p.businessNumber))) {
        errors.businessNumber = '사업자등록번호는 숫자 10자리(000-00-00000 형식)로 입력해 주세요.'
      }
      if (p.companyType === null) errors.companyType = '기업 형태를 선택해 주세요.'
      if (p.foundedAt === null) {
        errors.foundedAt = '설립일을 입력해 주세요.'
      } else if (!isValidIsoDate(p.foundedAt)) {
        errors.foundedAt = '설립일을 올바른 날짜로 입력해 주세요.'
      } else if (p.foundedAt > todayForValidation()) {
        errors.foundedAt = '설립일은 오늘 이후 날짜일 수 없습니다.'
      }
      if (p.hqRegion === null) errors.hqRegion = '본사 소재지(시·도)를 선택해 주세요.'
      if (p.hasFactory === null) {
        errors.hasFactory = '공장이 있는지 선택해 주세요. 공장이 없으면 "없어요"를 선택하면 됩니다.'
      } else if (p.hasFactory && p.factoryRegion === null) {
        errors.factoryRegion = '공장 소재지(시·도)를 선택해 주세요.'
      }
      if (p.employeeCount !== null && (!Number.isInteger(p.employeeCount) || p.employeeCount < 0)) {
        errors.employeeCount = '종업원 수는 0 이상의 정수로 입력해 주세요.'
      }
      break
    }
    case 2: {
      if (p.industryInputMode === null) {
        errors.industryInputMode =
          '업종 입력 방법을 선택해 주세요. 코드를 모르면 "잘 모르겠어요"를 선택할 수 있습니다.'
      } else if (p.industryInputMode === 'ksic') {
        if (p.ksicCode === null) errors.ksicCode = 'KSIC 코드를 입력해 주세요.'
        else if (!KSIC_PATTERN.test(p.ksicCode.trim()))
          errors.ksicCode =
            'KSIC 코드는 영문 대분류 1자 또는 숫자 2~5자리(영문 1자를 앞에 붙여도 됩니다)로 입력해 주세요.'
      } else if (p.industryInputMode === 'name' && p.industryName === null) {
        errors.industryName = '업종명을 입력해 주세요.'
      }
      if (p.revenueKrw === null) {
        errors.revenueKrw = '최근 매출액을 입력해 주세요. 매출이 없으면 0을 입력하면 됩니다.'
      } else if (p.revenueKrw < 0) {
        errors.revenueKrw = '매출액은 0 이상으로 입력해 주세요.'
      }
      if (p.revenueYear === null) {
        errors.revenueYear = '매출액 기준연도를 선택해 주세요.'
      }
      break
    }
    case 3: {
      if (p.exportUsdLastYear === null) {
        errors.exportUsdLastYear =
          '최근 1년 수출액을 입력해 주세요. 수출 실적이 없으면 0을 입력하면 됩니다.'
      } else if (p.exportUsdLastYear < 0) {
        errors.exportUsdLastYear = '수출액은 0 이상으로 입력해 주세요.'
      }
      if (p.exportPeriodStart === null) {
        errors.exportPeriodStart = '측정 기간의 시작 연·월을 선택해 주세요.'
      } else if (!YEAR_MONTH_PATTERN.test(p.exportPeriodStart)) {
        errors.exportPeriodStart = '시작 연·월을 다시 선택해 주세요.'
      }
      if (p.exportPeriodEnd === null) {
        errors.exportPeriodEnd = '측정 기간의 종료 연·월을 선택해 주세요.'
      } else if (!YEAR_MONTH_PATTERN.test(p.exportPeriodEnd)) {
        errors.exportPeriodEnd = '종료 연·월을 다시 선택해 주세요.'
      }
      if (
        p.exportPeriodStart !== null &&
        p.exportPeriodEnd !== null &&
        !errors.exportPeriodStart &&
        !errors.exportPeriodEnd &&
        p.exportPeriodStart > p.exportPeriodEnd
      ) {
        errors.exportPeriodEnd = '종료 연·월이 시작 연·월보다 빠릅니다. 기간을 확인해 주세요.'
      }
      break
    }
    case 4: {
      if (p.productName === null) errors.productName = '주력 제품명을 입력해 주세요.'
      if (p.hsCodeStatus === null) {
        errors.hsCodeStatus =
          'HS 코드 입력 방법을 선택해 주세요. 모르면 "잘 모르겠어요"를 선택할 수 있습니다.'
      } else if (p.hsCodeStatus !== 'unknown') {
        if (p.hsCode === null) errors.hsCode = 'HS 코드를 입력해 주세요.'
        else if (!HS_CODE_PATTERN.test(normalizeHsCode(p.hsCode)))
          errors.hsCode = 'HS 코드는 숫자 4~10자리로 입력해 주세요. (점·하이픈은 빼도 됩니다)'
      }
      break
    }
    case 5: {
      if (
        p.certificationStatus === 'has' &&
        p.certifications.length === 0 &&
        p.certificationOther === null
      ) {
        errors.certifications = '보유한 인증을 하나 이상 선택하거나 직접 입력해 주세요.'
      }
      if (p.ipStatus === 'has' && p.ipTypes.length === 0 && p.ipOther === null) {
        errors.ipTypes = '보유한 지식재산권을 하나 이상 선택하거나 직접 입력해 주세요.'
      }
      break
    }
    case 6: {
      if (p.interestAreas.length === 0 && !p.interestUnsure) {
        errors.interestAreas = '관심 분야를 하나 이상 고르거나 "잘 모르겠어요"를 선택해 주세요.'
      }
      break
    }
  }

  return errors
}

export function validateAll(
  p: CompanyProfile,
  options: ValidateOptions = { requireSessionFields: true },
): Record<ProfileStepId, FieldErrors> {
  return {
    1: validateStep(1, p, options),
    2: validateStep(2, p, options),
    3: validateStep(3, p, options),
    4: validateStep(4, p, options),
    5: validateStep(5, p, options),
    6: validateStep(6, p, options),
  }
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}

/** 사용자가 어떤 값이라도 입력했는지 */
export function hasAnyInput(p: CompanyProfile): boolean {
  return (Object.keys(p) as ProfileField[]).some((key) => {
    const value = p[key]
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'boolean') return key === 'interestUnsure' ? value : true
    return value !== null
  })
}

/** 입력은 되었지만 나중에 확인이 필요한 항목 */
export function collectVerificationIssues(p: CompanyProfile): ProfileIssue[] {
  const issues: ProfileIssue[] = []
  if (p.industryInputMode === 'unknown') {
    issues.push({
      field: 'industryInputMode',
      step: 2,
      message: '업종(KSIC 코드)이 아직 확인되지 않았습니다.',
    })
  }
  if (p.hsCodeStatus === 'provisional') {
    issues.push({ field: 'hsCode', step: 4, message: 'HS 코드가 임시 입력 상태입니다. 확인이 필요합니다.' })
  }
  if (p.hsCodeStatus === 'unknown') {
    issues.push({ field: 'hsCodeStatus', step: 4, message: 'HS 코드가 아직 확인되지 않았습니다.' })
  }
  return issues
}

/**
 * 프로필 입력 상태 판정.
 * - empty: 아무것도 입력하지 않음
 * - complete: 필수 항목이 모두 입력되고 코드 미확정 항목이 없음
 * - in-progress: 그 외 (임시 저장·건너뛰기·코드 미확정 포함)
 *
 * 이 상태는 입력 진행도일 뿐, 신청 자격 판정이 아니다.
 */
export function assessProfile(p: CompanyProfile): ProfileAssessment {
  const byStep = validateAll(p, { requireSessionFields: false })
  const missing: ProfileIssue[] = []
  for (const step of PROFILE_STEP_IDS) {
    for (const [field, message] of Object.entries(byStep[step]) as [ProfileField, string][]) {
      missing.push({ field, step, message })
    }
  }
  const needsVerification = collectVerificationIssues(p)

  let status: ProfileAssessment['status']
  if (!hasAnyInput(p)) status = 'empty'
  else if (missing.length === 0 && needsVerification.length === 0) status = 'complete'
  else status = 'in-progress'

  return { status, missing, needsVerification }
}

export const PROFILE_STATUS_LABEL: Record<ProfileAssessment['status'], string> = {
  empty: '입력 전',
  'in-progress': '입력 중',
  complete: '입력 완료',
}

/* ───────── 기기 저장 (localStorage) ───────── */

export const PROFILE_STORAGE_KEY = 'export-support-matching:profile:v1'

export interface StoredProfile {
  version: 1
  /** 사업자등록번호는 저장하지 않는다 */
  profile: Omit<CompanyProfile, 'businessNumber'>
  meta: ProfileMeta
}

export function serializeProfile(p: CompanyProfile, meta: ProfileMeta): string {
  const { businessNumber: _omitted, ...rest } = p
  void _omitted
  const stored: StoredProfile = { version: 1, profile: rest, meta }
  return JSON.stringify(stored)
}

const OPTION_VALUES = {
  companyType: new Set<string>(COMPANY_TYPE_OPTIONS.map((o) => o.value)),
  region: new Set<string>(REGION_OPTIONS.map((o) => o.value)),
  industryMode: new Set<string>(INDUSTRY_MODE_OPTIONS.map((o) => o.value)),
  hsStatus: new Set<string>(HS_STATUS_OPTIONS.map((o) => o.value)),
  holding: new Set<string>(HOLDING_STATUS_OPTIONS.map((o) => o.value)),
  interest: new Set<string>(INTEREST_AREA_OPTIONS.map((o) => o.value)),
  certification: new Set<string>(CERTIFICATION_OPTIONS.map((o) => o.value)),
  ip: new Set<string>(IP_OPTIONS.map((o) => o.value)),
}

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function pickNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function pickEnum<T extends string>(value: unknown, allowed: Set<string>): T | null {
  return typeof value === 'string' && allowed.has(value) ? (value as T) : null
}

function pickStringArray(value: unknown, allowed?: Set<string>): string[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is string =>
      typeof item === 'string' && item.trim() !== '' && (!allowed || allowed.has(item)),
  )
}

/** 저장된 JSON을 읽는다. 형식이 맞지 않는 값은 버리고 null로 둔다. */
export function deserializeProfile(raw: string | null): { profile: CompanyProfile; meta: ProfileMeta } | null {
  if (raw === null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const record = parsed as { version?: unknown; profile?: Record<string, unknown>; meta?: Record<string, unknown> }
  if (record.version !== 1 || typeof record.profile !== 'object' || record.profile === null) return null

  const s = record.profile
  const profile: CompanyProfile = {
    companyName: pickString(s.companyName),
    businessNumber: null,
    companyType: pickEnum(s.companyType, OPTION_VALUES.companyType),
    foundedAt: pickString(s.foundedAt),
    hqRegion: pickEnum(s.hqRegion, OPTION_VALUES.region),
    hqDistrict: pickString(s.hqDistrict),
    hasFactory: typeof s.hasFactory === 'boolean' ? s.hasFactory : null,
    factoryRegion: pickEnum(s.factoryRegion, OPTION_VALUES.region),
    factoryDistrict: pickString(s.factoryDistrict),
    employeeCount: pickNumber(s.employeeCount),
    industryInputMode: pickEnum(s.industryInputMode, OPTION_VALUES.industryMode),
    ksicCode: pickString(s.ksicCode),
    industryName: pickString(s.industryName),
    revenueKrw: pickNumber(s.revenueKrw),
    revenueYear: pickNumber(s.revenueYear),
    exportUsdLastYear: pickNumber(s.exportUsdLastYear),
    exportPeriodStart: pickString(s.exportPeriodStart),
    exportPeriodEnd: pickString(s.exportPeriodEnd),
    exportCountries: pickStringArray(s.exportCountries),
    productName: pickString(s.productName),
    hsCodeStatus: pickEnum(s.hsCodeStatus, OPTION_VALUES.hsStatus),
    hsCode: pickString(s.hsCode),
    certificationStatus: pickEnum(s.certificationStatus, OPTION_VALUES.holding),
    certifications: pickStringArray(s.certifications, OPTION_VALUES.certification),
    certificationOther: pickString(s.certificationOther),
    ipStatus: pickEnum(s.ipStatus, OPTION_VALUES.holding),
    ipTypes: pickStringArray(s.ipTypes, OPTION_VALUES.ip),
    ipOther: pickString(s.ipOther),
    interestAreas: pickStringArray(s.interestAreas, OPTION_VALUES.interest) as CompanyProfile['interestAreas'],
    interestUnsure: s.interestUnsure === true,
  }

  const m = record.meta ?? {}
  const skipped = Array.isArray(m.skippedSteps)
    ? (m.skippedSteps.filter((n) => PROFILE_STEP_IDS.includes(n as ProfileStepId)) as ProfileStepId[])
    : []
  const meta: ProfileMeta = { skippedSteps: skipped, lastSavedAt: pickString(m.lastSavedAt) }
  return { profile, meta }
}

export function cloneProfile(p: CompanyProfile): CompanyProfile {
  return {
    ...p,
    exportCountries: [...p.exportCountries],
    certifications: [...p.certifications],
    ipTypes: [...p.ipTypes],
    interestAreas: [...p.interestAreas],
  }
}

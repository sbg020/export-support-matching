/*
 * 신청 자격 판정 (순수 함수).
 *
 * - 공고에 원문 근거가 있는 자격 규칙이 없으면 판정하지 않고 null을 반환한다.
 * - 원문 URL 또는 검증일이 없으면 판정하지 않는다.
 * - 기업 입력값이 없으면 해당 조건은 '확인 필요'로 둔다. 추측하지 않는다.
 * - 'manual' 규칙은 자동 판정하지 않고 항상 '확인 필요'로 둔다.
 */
import type { CompanyProfile } from '@/types/profile'
import type { EligibilityRule, Program } from '@/types/program'
import type { ConditionResult, EligibilityResult, EligibilityStatus } from '@/types/results'
import { COMPANY_TYPE_OPTIONS, REGION_OPTIONS, optionLabel } from '@/constants/options'
import { formatKrw, formatUsd } from '@/lib/display'

export const ELIGIBILITY_ENGINE_VERSION = 'eligibility-0.1.0'

type RuleOutcome = Pick<ConditionResult, 'status' | 'reason' | 'companyValue'>

function needsInput(fieldLabel: string): RuleOutcome {
  return {
    status: 'needs-check',
    reason: `기업정보에 ${fieldLabel}이(가) 입력되지 않아 확인이 필요합니다.`,
    companyValue: null,
  }
}

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

function evaluateRule(rule: EligibilityRule, profile: CompanyProfile, program: Program): RuleOutcome {
  switch (rule.kind) {
    case 'company-type-in': {
      if (profile.companyType === null) return needsInput('기업 형태')
      const ok = rule.values.includes(profile.companyType)
      return {
        status: ok ? 'met' : 'unmet',
        reason: ok ? '기업 형태가 공고 대상에 포함됩니다.' : '기업 형태가 공고 대상에 포함되지 않습니다.',
        companyValue: optionLabel(COMPANY_TYPE_OPTIONS, profile.companyType),
      }
    }
    case 'hq-region-in': {
      if (profile.hqRegion === null) return needsInput('본사 소재지')
      const ok = rule.values.includes(profile.hqRegion)
      return {
        status: ok ? 'met' : 'unmet',
        reason: ok ? '본사 소재지가 공고 대상 지역에 포함됩니다.' : '본사 소재지가 공고 대상 지역이 아닙니다.',
        companyValue: optionLabel(REGION_OPTIONS, profile.hqRegion),
      }
    }
    case 'revenue-krw-max':
    case 'revenue-krw-min': {
      if (profile.revenueKrw === null) return needsInput('최근 매출액')
      const ok =
        rule.kind === 'revenue-krw-max'
          ? profile.revenueKrw <= rule.valueKrw
          : profile.revenueKrw >= rule.valueKrw
      return {
        status: ok ? 'met' : 'unmet',
        reason: `공고 기준 ${formatKrw(rule.valueKrw)} ${rule.kind === 'revenue-krw-max' ? '이하' : '이상'}과 비교했습니다.`,
        companyValue: formatKrw(profile.revenueKrw),
      }
    }
    case 'export-usd-max':
    case 'export-usd-min': {
      if (profile.exportUsdLastYear === null) return needsInput('최근 1년 수출액')
      const ok =
        rule.kind === 'export-usd-max'
          ? profile.exportUsdLastYear <= rule.valueUsd
          : profile.exportUsdLastYear >= rule.valueUsd
      return {
        status: ok ? 'met' : 'unmet',
        reason: `공고 기준 ${formatUsd(rule.valueUsd)} ${rule.kind === 'export-usd-max' ? '이하' : '이상'}과 비교했습니다.`,
        companyValue: formatUsd(profile.exportUsdLastYear),
      }
    }
    case 'years-since-founded-max':
    case 'years-since-founded-min': {
      if (profile.foundedAt === null) return needsInput('설립일')
      // 업력 기준일은 공고일이다. 공고일이 없으면 오늘 날짜로 대신하지 않는다.
      if (program.sourcePublishedAt === null) {
        return {
          status: 'needs-check',
          reason: '공고일이 확인되지 않아 업력을 계산하지 않았습니다.',
          companyValue: null,
        }
      }
      const years = fullYearsBetween(profile.foundedAt, program.sourcePublishedAt)
      if (years === null) return needsInput('설립일')
      const ok = rule.kind === 'years-since-founded-max' ? years <= rule.years : years >= rule.years
      return {
        status: ok ? 'met' : 'unmet',
        reason: `공고일 기준 업력 ${years}년을 공고 기준 ${rule.years}년 ${rule.kind === 'years-since-founded-max' ? '이하' : '이상'}과 비교했습니다.`,
        companyValue: `업력 ${years}년`,
      }
    }
    case 'manual':
      return {
        status: 'needs-check',
        reason: '자동으로 판정할 수 없는 조건입니다. 공고 원문을 보고 직접 확인해 주세요.',
        companyValue: null,
      }
  }
}

export function evaluateEligibility(profile: CompanyProfile, program: Program): EligibilityResult | null {
  const rules = program.eligibilityRules
  if (rules === null || rules.length === 0) return null
  if (program.sourceUrl === null || program.verifiedAt === null) return null

  const conditions: ConditionResult[] = rules.map((rule) => ({
    ruleId: rule.id,
    label: rule.label,
    source: rule.source,
    ...evaluateRule(rule, profile, program),
  }))

  let status: EligibilityStatus = 'eligible'
  if (conditions.some((c) => c.status === 'unmet')) status = 'ineligible'
  else if (conditions.some((c) => c.status === 'needs-check')) status = 'needs-check'

  const reasons = conditions
    .filter((c) => c.status !== 'met')
    .map((c) => `${c.label}: ${c.reason}`)

  return {
    programId: program.id,
    status,
    conditions,
    reasons,
    basisDate: program.verifiedAt,
    sourceUrl: program.sourceUrl,
    engineVersion: ELIGIBILITY_ENGINE_VERSION,
  }
}

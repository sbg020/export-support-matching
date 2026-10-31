/*
 * 적합도 v0 (시험용, 순수 함수). 신청 자격과 별개로 계산한다. REVISION_02 §7
 *
 * - 항목: 관심분야 일치도 · 단계 일치도 · 내용 유사도(시험용). 재무 변수와 재무 군집은 쓰지 않는다
 *   (재무 상태가 비슷해도 수출 상황은 다를 수 있다. 공고의 재무 조건은 자격 판정에서만 다룬다).
 * - 계산할 수 있는 항목만으로 가중 평균하고, 2개 미만이면 결과를 만들지 않는다(null).
 * - 가점·감점은 프로필로 해당이 확인되고 점수가 정해진 항목만 보정한다.
 * - 기준은 검증 전 가설(hypothesis)이다. 화면에 '시험용 기준 v0 · 검증 전'을 항상 함께 표시한다.
 */
import type { IsoDate } from '@/types/common'
import type { CompanyProfile } from '@/types/profile'
import type { BonusItem, Program, SupportStage } from '@/types/program'
import type {
  ExportStageDiagnosis,
  FitBonusLine,
  FitFactorKey,
  FitFactorResult,
  FitScoreResult,
} from '@/types/results'
import {
  CATEGORY_PHASE_VERSION,
  INTEREST_CATEGORIES,
  STAGE_PHASE_VERSION,
  STAGE_PHASE_WEIGHTS,
  categoryName,
  deriveSupportPhases,
} from '@/constants/categories'
import { EXPORT_STAGE_OPTIONS, INTEREST_AREA_OPTIONS, STAGE_OPTIONS, optionLabel } from '@/constants/options'
import { profileHoldingCodes } from './eligibility'
import { normalizeText } from './textSimilarity'

export const FIT_ENGINE_VERSION = 'fit-0.2.0'

export interface FitCriteria {
  version: string
  /** hypothesis = 검증 전 가설, verified = 사람 평가로 확정 */
  status: 'hypothesis' | 'verified'
  verifiedAt: IsoDate | null
  weights: Record<FitFactorKey, number>
  /** 가점·감점 보정 상한 (±) */
  bonusCap: number
  note: string
}

/** 현재 적용 중인 적합도 기준 (fit-v0, 검증 전) */
export const ACTIVE_FIT_CRITERIA: FitCriteria = {
  version: 'fit-v0',
  status: 'hypothesis',
  verifiedAt: null,
  weights: { interest: 0.4, stage: 0.3, text: 0.3 },
  bonusCap: 10,
  note: '기업이 직접 밝힌 필요(관심 분야)가 가장 확실한 신호라 가장 크게 두고, 단계 일치도와 내용 유사도는 같은 비중으로 둔다.',
}

/** 비교용 기준. 화면에는 쓰지 않고 이후 Precision@5 비교에 쓴다 */
export const FIT_CRITERIA_CANDIDATES: FitCriteria[] = [
  ACTIVE_FIT_CRITERIA,
  {
    version: 'fit-v0-equal',
    status: 'hypothesis',
    verifiedAt: null,
    weights: { interest: 1 / 3, stage: 1 / 3, text: 1 / 3 },
    bonusCap: 10,
    note: '세 항목을 같은 비중으로 둔 비교용 기준',
  },
]

export const FIT_FACTOR_LABEL: Record<FitFactorKey, string> = {
  interest: '관심분야 일치도',
  stage: '단계 일치도',
  text: '내용 유사도 (시험용)',
}

export const FIT_UNAVAILABLE_REASON = '반영할 수 있는 항목이 부족합니다'

export interface FitContext {
  diagnosis: ExportStageDiagnosis | null
  /** 판정 대상(신청 불가 제외) 전체 안에서의 내용 유사도 백분위 (0~1). 계산할 수 없으면 null */
  textPercentile: number | null
  /** 판정 대상 공고 수 */
  textPopulation: number
  /** 기업 문장 */
  companyText: string
  /** 계산 기준일 */
  asOf: IsoDate | null
}

/** 기업 문장: 업종명 + 제품명 + 수출 대상 국가 + 고른 관심 분야 이름 */
export function companyTextOf(profile: CompanyProfile): string {
  const interests = profile.interestUnsure
    ? []
    : profile.interestAreas.map((area) => optionLabel(INTEREST_AREA_OPTIONS, area) ?? area)
  return [profile.industryName, profile.productName, ...profile.exportCountries, ...interests]
    .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
    .join(' ')
}

/** 공고 문장: 공고명 + 세부사업명 + 세부 분야 이름 + 분류 근거 문장 + 업종 조건 근거 문장 */
export function programTextOf(program: Program): string {
  const industryQuotes = (program.eligibilityRules ?? [])
    .filter((rule) => rule.field === 'industry')
    .map((rule) => rule.source.quote)
  return [
    program.title,
    program.subProgramName,
    ...(program.supportCategories ?? []).map(categoryName),
    program.categorySource?.quote ?? null,
    ...industryQuotes,
  ]
    .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
    .join(' ')
}

const WEIGHT_SYMBOL: Record<number, string> = { 1: '◎', 0.5: '○', 0.2: '·' }

function stageLabel(stage: SupportStage): string {
  return optionLabel(STAGE_OPTIONS, stage) ?? stage
}

function factor(key: FitFactorKey, weight: number, value: number | null, reason: string): FitFactorResult {
  return {
    key,
    label: FIT_FACTOR_LABEL[key],
    weight,
    value,
    contribution: value === null ? null : weight * value,
    reason,
  }
}

function interestFactor(profile: CompanyProfile, program: Program, weight: number): FitFactorResult {
  if (profile.interestUnsure || profile.interestAreas.length === 0) {
    return factor('interest', weight, null, "관심 분야를 입력하지 않았거나 '잘 모르겠어요'를 골라 반영하지 않았습니다.")
  }
  const categories = program.supportCategories
  if (categories === null) return factor('interest', weight, null, '공고의 세부 분야가 확인되지 않아 반영하지 않았습니다.')
  for (const area of profile.interestAreas) {
    const code = INTEREST_CATEGORIES[area].find((c) => categories.includes(c))
    if (code) {
      const areaLabel = optionLabel(INTEREST_AREA_OPTIONS, area) ?? area
      return factor('interest', weight, 1, `관심 분야 '${areaLabel}'와 공고 분야 '${code} ${categoryName(code)}'이 일치합니다.`)
    }
  }
  const interestPhases = deriveSupportPhases(profile.interestAreas.flatMap((area) => INTEREST_CATEGORIES[area])) ?? []
  const shared = (program.supportPhases ?? []).filter((phase) => interestPhases.includes(phase))
  if (shared.length > 0) {
    return factor(
      'interest',
      weight,
      0.5,
      `세부 분야는 다르지만 관심 분야와 같은 지원 단계(${shared.map(stageLabel).join(', ')})의 공고입니다.`,
    )
  }
  return factor(
    'interest',
    weight,
    0,
    categories.length === 0
      ? '공고가 15개 세부 분야 밖(현금 장려금 등)이라 관심 분야와 겹치지 않습니다.'
      : '관심 분야와 겹치는 세부 분야·지원 단계가 없습니다.',
  )
}

function stageFactor(context: FitContext, program: Program, weight: number): FitFactorResult {
  const diagnosis = context.diagnosis
  if (diagnosis === null) {
    return factor('stage', weight, null, '수출단계가 진단되지 않아 반영하지 않았습니다 (최근 1년 수출액 미입력).')
  }
  const companyStage = optionLabel(EXPORT_STAGE_OPTIONS, diagnosis.stage) ?? diagnosis.stage
  const targets = program.targetExportStages
  if (targets && targets.length > 0) {
    const labels = targets.map((s) => optionLabel(EXPORT_STAGE_OPTIONS, s) ?? s).join(', ')
    const hit = targets.includes(diagnosis.stage)
    return factor(
      'stage',
      weight,
      hit ? 1 : 0,
      `공고가 대상 수출단계를 '${labels}'로 명시했습니다 (우리 회사: ${companyStage}).`,
    )
  }
  const phases = program.supportPhases
  if (!phases || phases.length === 0) {
    return factor('stage', weight, null, '공고의 지원 단계가 확인되지 않아 반영하지 않았습니다.')
  }
  const weights = STAGE_PHASE_WEIGHTS[diagnosis.stage]
  const best = phases.reduce((a, b) => (weights[b] > weights[a] ? b : a))
  const value = weights[best]
  return factor(
    'stage',
    weight,
    value,
    `수출단계 '${companyStage}'와 공고 지원 단계 '${stageLabel(best)}'의 가중치 ${WEIGHT_SYMBOL[value] ?? ''} ${value}`,
  )
}

function textFactor(context: FitContext, weight: number): FitFactorResult {
  if (normalizeText(context.companyText).length < 2) {
    return factor('text', weight, null, '업종·제품·수출 국가·관심 분야 입력이 부족해 반영하지 않았습니다.')
  }
  if (context.textPercentile === null) {
    return factor('text', weight, null, '비교할 공고가 없어 반영하지 않았습니다.')
  }
  return factor(
    'text',
    weight,
    context.textPercentile,
    `판정 대상 공고 ${context.textPopulation}개 안에서 기업 문장과의 내용 유사도 백분위 ${Math.round(context.textPercentile * 100)}입니다 (글자 2-gram, 시험용).`,
  )
}

export function computeFitFactors(
  profile: CompanyProfile,
  program: Program,
  context: FitContext,
  criteria: FitCriteria = ACTIVE_FIT_CRITERIA,
): FitFactorResult[] {
  return [
    interestFactor(profile, program, criteria.weights.interest),
    stageFactor(context, program, criteria.weights.stage),
    textFactor(context, criteria.weights.text),
  ]
}

function bonusLine(item: BonusItem): FitBonusLine {
  return { id: item.id, item: item.item, effectText: item.effectText, points: item.points, source: item.source }
}

/**
 * 가점·감점 보정 = clamp(round(cap × 해당 항목 점수 합 ÷ 공고의 양수 점수 합), −cap, +cap).
 * 점수나 프로필 코드가 없는 항목은 점수에 넣지 않고 '확인 필요 가점'으로 나열한다.
 */
export function bonusAdjustment(
  profile: CompanyProfile,
  program: Program,
  cap: number,
): { adjustment: number; applied: FitBonusLine[]; toCheck: FitBonusLine[] } {
  const items = program.bonusItems ?? []
  const holdings = profileHoldingCodes(profile)
  const applied = items.filter(
    (b) => b.points !== null && b.matchKeys !== null && b.matchKeys.some((key) => holdings.has(key)),
  )
  const toCheck = items.filter((b) => b.points === null || b.matchKeys === null)
  const positive = items.reduce((sum, b) => sum + (b.points !== null && b.points > 0 ? b.points : 0), 0)
  const matched = applied.reduce((sum, b) => sum + (b.points ?? 0), 0)
  const adjustment =
    applied.length > 0 && positive > 0 ? Math.min(cap, Math.max(-cap, Math.round((cap * matched) / positive))) : 0
  return { adjustment: adjustment === 0 ? 0 : adjustment, applied: applied.map(bonusLine), toCheck: toCheck.map(bonusLine) }
}

export function evaluateFit(
  profile: CompanyProfile,
  program: Program,
  context: FitContext,
  criteria: FitCriteria = ACTIVE_FIT_CRITERIA,
): FitScoreResult | null {
  const factors = computeFitFactors(profile, program, context, criteria)
  const usable = factors.filter((f) => f.value !== null)
  // 계산할 수 있는 항목이 2개 미만이면 점수를 만들지 않는다
  if (usable.length < 2) return null
  const totalWeight = usable.reduce((sum, f) => sum + f.weight, 0)
  if (totalWeight <= 0) return null
  const baseScore = (100 * usable.reduce((sum, f) => sum + (f.contribution ?? 0), 0)) / totalWeight
  const bonus = bonusAdjustment(profile, program, criteria.bonusCap)
  const score = Math.min(100, Math.max(0, Math.round(baseScore + bonus.adjustment)))
  const reasons = [...usable]
    .sort((a, b) => (b.contribution ?? 0) - (a.contribution ?? 0))
    .map((f) => f.reason)
  return {
    programId: program.id,
    score,
    baseScore: Math.round(baseScore * 10) / 10,
    factors,
    bonusAdjustment: bonus.adjustment,
    bonusApplied: bonus.applied,
    bonusToCheck: bonus.toCheck,
    reasons,
    basisDate: context.asOf,
    criteriaVersion: criteria.version,
    criteriaStatus: criteria.status,
    mappingVersions: [CATEGORY_PHASE_VERSION, STAGE_PHASE_VERSION],
    engineVersion: FIT_ENGINE_VERSION,
  }
}

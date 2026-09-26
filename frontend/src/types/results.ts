import type { IsoDate, SourceReference } from './common'
import type { SupportStage } from './program'

/*
 * 판정·추천 결과 타입.
 * 근거 자료가 부족하면 결과 객체 자체가 null이며 화면에는 '-'로 표시한다.
 * 결과에는 항상 reasons[], 원문 근거, 계산 기준일, 엔진 버전을 포함한다.
 * 설명 우선순위: 실제 신청 자격 → 적합도 → 준비 부담/기회비용.
 */

export type EligibilityStatus = 'eligible' | 'needs-check' | 'ineligible'

export type ConditionStatus = 'met' | 'unmet' | 'needs-check'

export interface ConditionResult {
  ruleId: string
  label: string
  status: ConditionStatus
  /** 판정 이유 (한국어 문장) */
  reason: string
  /** 비교에 사용한 기업 입력값 (표시용). 미입력이면 null */
  companyValue: string | null
  source: SourceReference
}

export interface EligibilityResult {
  programId: string
  status: EligibilityStatus
  conditions: ConditionResult[]
  reasons: string[]
  /** 계산 기준일: 공고 검증일 */
  basisDate: IsoDate
  sourceUrl: string
  engineVersion: string
}

export interface FitFactorResult {
  key: string
  label: string
  weight: number
  /** 0~1 사이 충족 정도 */
  value: number
  reason: string
}

export interface FitScoreResult {
  programId: string
  /** 0~100. 기준이 검증되지 않았으면 결과 자체를 만들지 않는다. */
  score: number
  factors: FitFactorResult[]
  reasons: string[]
  basisDate: IsoDate
  criteriaVersion: string
  engineVersion: string
}

export interface ValueWithBasis<T> {
  value: T
  basis: string
}

export interface OpportunityCostResult {
  programId: string
  prepHours: ValueWithBasis<number> | null
  newDocumentCount: number | null
  selfPaymentRatioPercent: number | null
  obligations: string[] | null
  daysUntilDeadline: number | null
  reasons: string[]
  basisDate: IsoDate
  engineVersion: string
}

export interface ExportStageDiagnosis {
  stage: SupportStage
  reasons: string[]
  nextStageConditions: string[]
  source: SourceReference
  basisDate: IsoDate
  criteriaVersion: string
}

import type { IsoDate, SourceReference, YearMonth } from './common'
import type { ProfileStepId } from './profile'
import type {
  CommonCheckKey,
  DataState,
  ExportStage,
  RuleCertainty,
  SettlementInfo,
  SupportStage,
} from './program'

/*
 * 판정·추천 결과 타입.
 * 근거 자료가 부족하면 결과 객체 자체가 null이며 화면에는 '-'로 표시한다.
 * 결과에는 항상 reasons[], 원문 근거, 계산 기준일, 엔진 버전을 포함한다.
 * 설명 우선순위: 실제 신청 자격 → 적합도 → 준비 부담/기회비용.
 */

export type EligibilityStatus = 'eligible' | 'needs-check' | 'ineligible'

export type ConditionStatus = 'met' | 'unmet' | 'needs-check'

/** 확인 필요의 이유: 입력 없음 · 자동 판정 불가 · 기준 기간 다름 · 해석 애매 · 예외 있음 */
export type NeedsCheckReason =
  | 'missing-input'
  | 'not-automatable'
  | 'period-mismatch'
  | 'ambiguous'
  | 'exception'

export interface ConditionResult {
  ruleId: string
  label: string
  kind: 'required' | 'exclusion'
  group: string | null
  /** 일부 지원 항목에만 적용되는 조건이면 그 이름 */
  scope: string | null
  status: ConditionStatus
  /** status가 needs-check일 때의 이유 */
  reasonCode: NeedsCheckReason | null
  /** 판정 이유 (한국어 문장) */
  reason: string
  /** 비교에 사용한 기업 입력값 (표시용). 미입력이면 null */
  companyValue: string | null
  certainty: RuleCertainty
  exceptionText: string | null
  /** 직접 확인 답으로 상태가 정해졌는지 */
  selfChecked: boolean
  /** 공고별 직접 확인으로 답할 수 있는 조건인지 (자동 판정 불가·기간 다름·애매·예외) */
  selfCheckable: boolean
  /** 입력이 없어 판정하지 못했을 때 입력할 단계 */
  inputStep: ProfileStepId | null
  commonCheckKeys: CommonCheckKey[] | null
  /** 판정 기준 시점 원문 표현 */
  basis: string | null
  source: SourceReference
}

export interface ConditionGroupResult {
  group: string
  status: ConditionStatus
  ruleIds: string[]
}

export interface EligibilityResult {
  programId: string
  status: EligibilityStatus
  /** 전체 판정에 들어간 조건 */
  conditions: ConditionResult[]
  /** 일부 지원 항목에만 적용되는 조건 (전체 판정에서 뺀다) */
  scopedConditions: ConditionResult[]
  /** 필수 조건 그룹별 결과 (같은 그룹 OR, 다른 그룹 AND) */
  groups: ConditionGroupResult[]
  reasons: string[]
  /** 확인 필요로 남은 조건 수 */
  needsCheckCount: number
  /** 직접 확인으로 정해진 조건 수 */
  selfCheckedCount: number
  dataState: DataState
  /** 계산 기준일: 검증일, 없으면 데이터 기준일 */
  basisDate: IsoDate | null
  sourceUrl: string | null
  engineVersion: string
}

export type FitFactorKey = 'interest' | 'stage' | 'text'

export interface FitFactorResult {
  key: FitFactorKey
  label: string
  weight: number
  /** 0~1 반영값. 계산할 수 없으면 null (제외) */
  value: number | null
  /** 가중치 × 반영값. 제외된 항목은 null */
  contribution: number | null
  /** 근거 또는 제외 이유 */
  reason: string
}

export interface FitBonusLine {
  id: string
  item: string | null
  effectText: string | null
  points: number | null
  source: SourceReference | null
}

export interface FitScoreResult {
  programId: string
  /** 0~100 최종 적합도 */
  score: number
  /** 가점·감점 보정 전 점수 */
  baseScore: number
  factors: FitFactorResult[]
  /** 가점·감점 보정값 (−bonusCap ~ +bonusCap) */
  bonusAdjustment: number
  /** 프로필로 해당이 확인된 가점·감점 */
  bonusApplied: FitBonusLine[]
  /** 점수나 프로필 코드가 없어 반영하지 않은 가점·감점 (확인 필요 가점) */
  bonusToCheck: FitBonusLine[]
  /** 기여도 큰 순 */
  reasons: string[]
  basisDate: IsoDate | null
  criteriaVersion: string
  criteriaStatus: 'hypothesis' | 'verified'
  /** 단계 매핑 버전 (category-phase-v0, stage-phase-v0) */
  mappingVersions: string[]
  engineVersion: string
}

export interface ValueWithBasis<T> {
  value: T
  basis: string
}

export interface DocumentCounts {
  required: number
  conditional: number
  optional: number
  /** 그중 공고 전용 서식 */
  programForms: number
  /** 서류 목록의 원문 쪽 */
  locators: string[]
}

export interface OpportunityCostResult {
  programId: string
  prepHours: ValueWithBasis<number> | null
  newDocumentCount: number | null
  documentCounts: DocumentCounts | null
  selfPaymentRatioPercent: number | null
  selfPaymentNote: string | null
  /** 총사업비 한도 − 지원금 한도 (0보다 클 때만) */
  selfPaymentMaxKrw: ValueWithBasis<number> | null
  settlement: SettlementInfo | null
  maxAmountKrw: number | null
  totalBudgetMaxKrw: number | null
  amountNote: string | null
  obligations: string[] | null
  /** 마감일 − 기준일 (일). 지났으면 음수 */
  daysUntilDeadline: number | null
  reasons: string[]
  basisDate: IsoDate | null
  engineVersion: string
}

export interface ExportStageDiagnosis {
  stage: ExportStage
  /** 판단에 쓴 입력 수출액 (USD) */
  exportUsd: number
  /** 입력한 측정 기간 */
  periodStart: YearMonth | null
  periodEnd: YearMonth | null
  /** 기준 연도 (데이터 기준일 연도 − 1) */
  referenceYear: number
  /** 측정 기간이 기준 연도 1~12월과 다르면 안내 문구 */
  periodNote: string | null
  /** 기준 구간 (USD, 하한 포함·상한 미포함) */
  bandMin: number | null
  bandMax: number | null
  /** 권장 지원 단계: ◎ 우선, ○ 함께 보기 */
  primaryPhases: SupportStage[]
  secondaryPhases: SupportStage[]
  reasons: string[]
  nextStageConditions: string[]
  source: SourceReference
  /** 기준을 원문과 대조해 확인한 날짜 */
  basisDate: IsoDate
  criteriaVersion: string
}

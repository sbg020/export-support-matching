import type { IsoDateTime } from './common'
import type { CommonCheckKey } from './program'

/**
 * 직접 확인(자가 확인) 답. 이 기기(localStorage `esm.selfChecks.v1`)에만 저장하며 서버로 보내지 않는다.
 * 판정 결과에는 '직접 확인'으로 표시해 자동 판정과 구분한다.
 */

/** 공통 확인 답: 해당 없음 · 해당 있음 · 모르겠음 */
export type CommonCheckAnswer = 'no' | 'yes' | 'unknown'

/**
 * 공고별 확인 답 — 조건 상태 기준으로 저장한다.
 * 필수 조건: 충족함 → met, 충족하지 않음 → unmet / 제외 조건: 해당 없음 → met, 해당함 → unmet
 */
export type RuleCheckAnswer = 'met' | 'unmet'

export interface RuleCheckEntry {
  answer: RuleCheckAnswer
  answeredAt: IsoDateTime
}

export interface SelfCheckAnswers {
  common: Partial<Record<CommonCheckKey, CommonCheckAnswer>>
  /** programs[공고 ID][규칙 ID] */
  programs: Record<string, Record<string, RuleCheckEntry>>
}

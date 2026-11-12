/*
 * 정답세트(검수 완료 데이터) xlsx 검사 형식 (REVISION_04 §11.3).
 * 시트: programs · rules · bonuses · documents (1행 한글 머리글, 2행 영문 머리글, 3행부터 값),
 * 참조용 dictionary · inventory_150.
 */

export type AnswerSetCell = string | number | boolean | Date | null

/** 시트 이름 → 행 배열 (배열 0번이 1행) */
export type AnswerSetSheets = Record<string, AnswerSetCell[][]>

export interface AnswerSetIssue {
  /** error: 반영을 막음 / warning: 반영 가능 */
  level: 'error' | 'warning'
  sheet: string
  /** 행 ID (program_id, rule_key 등). 파일·시트 단위면 null */
  rowId: string | null
  message: string
  /** 공고별 표에 결과를 묶을 공고 ID */
  programId: string | null
}

export interface AnswerSetProgramRow {
  programId: string
  parentId: string
  title: string | null
  ruleCount: number
  /** 검수가 끝난 행 비율 (0~1). 셀 행이 없으면 null */
  reviewedRatio: number | null
  result: 'ok' | 'warning' | 'error'
}

export interface AnswerSetCheckResult {
  counts: {
    /** 원공고 수 */
    announcements: number
    /** 공고 행 수 (세부사업 포함) */
    programs: number
    rules: number
    bonuses: number
    documents: number
    errors: number
    warnings: number
    /** review_status '삭제'로 세지 않은 행 */
    excluded: number
    /** review_status가 '검수대기'로 남은 행 */
    pendingReview: number
    /** 평가용(inventory_150 제안 split에 test) 원공고 수. inventory_150이 없으면 null */
    testAnnouncements: number | null
  }
  /** programs 시트에 지원 내용 한 줄(support_summary) 열이 있는지 */
  hasSupportSummary: boolean
  programs: AnswerSetProgramRow[]
  issues: AnswerSetIssue[]
}

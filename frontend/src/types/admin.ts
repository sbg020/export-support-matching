/*
 * 관리자 영역 데이터 모델 (REVISION_04 §13.1).
 * 저장소(DB)는 다음 개정에서 연결한다. 지금은 EmptyAdminRepository가 수치 null, 목록 []를 돌려준다.
 * 필드 이름은 Program·EligibilityRule과 맞춘다.
 */
import type { IsoDate, IsoDateTime } from './common'
import type { CommonCheckKey, ExportStage, ReceptionStatus, RuleField, SupportCategoryCode } from './program'

export type AdminNoticeSource = 'bizinfo' | 'kotra' | 'answer-set'
export type AdminNoticeStatus = 'pending-review' | 'published' | 'suspended' | 'rejected' | 'merged'

export interface AdminNoticeSummary {
  id: string
  title: string | null
  source: AdminNoticeSource
  /** 기업마당 공고 ID, 업로드 ID 등 */
  sourceRef: string | null
  status: AdminNoticeStatus
  receptionStatus: ReceptionStatus | null
  applyEnd: IsoDateTime | null
  applyPeriodNote: string | null
  version: number
  collectedAt: IsoDateTime
  reviewedAt: IsoDateTime | null
  reviewedBy: string | null
}

export interface AdminDashboard {
  asOf: IsoDateTime | null
  todayCollected: { bizinfo: number; kotra: number } | null
  pendingReview: number | null
  oldestPendingCollectedAt: IsoDateTime | null
  closingSoon: number | null
  collectionErrors: number | null
  pipeline: { collected: number; stored: number; extracting: number; pendingReview: number; published: number } | null
}

export type CollectionSchedule = 'daily' | 'weekdays' | 'weekly-mon'
/** 한국 시간 */
export type CollectionTime = '06:00' | '09:00' | '18:00'

export interface CollectionSettings {
  schedule: CollectionSchedule
  time: CollectionTime
  refetchRevisions: boolean
  /** 기업마당 지원분야 코드 */
  categories: string[]
  keywords: string[]
  apiKeyStatus: 'missing' | 'registered' | 'invalid'
  apiKeyLast4: string | null
}

export interface CollectionRun {
  id: string
  trigger: 'schedule' | 'manual'
  startedAt: IsoDateTime
  finishedAt: IsoDateTime | null
  fetched: number
  exportMatched: number
  revised: number
  errors: { noticeRef: string | null; message: string; resolved: boolean }[]
}

export type UploadKind = 'kotra-csv' | 'answer-set'

export interface UploadRecord {
  id: string
  kind: UploadKind
  fileName: string
  uploadedAt: IsoDateTime
  uploadedBy: string
  appliedCount: number
  status: 'applied' | 'reverted'
}

export interface NoticeVersion {
  version: number
  publishedAt: IsoDate | null
  /** 최초 공고 / 수정공고 */
  note: string | null
  changes: { field: string; before: string | null; after: string | null }[]
}

/** 검수 화면의 자동 추출 항목 (기존 자격 규칙 필드에 맞춘다) */
export type ReviewFieldKey =
  | RuleField
  | 'deadline'
  | 'exclusion'
  | 'bonus'
  | 'amount'

export interface ReviewExtraction {
  key: ReviewFieldKey
  label: string
  value: string | null
  certainty: 'clear' | 'ambiguous'
  /** 근거 위치: 원문 쪽 번호와 문장 범위 */
  evidence: { page: number; start: number; end: number } | null
  commonCheckKey: CommonCheckKey | null
}

export interface ReviewItem {
  notice: AdminNoticeSummary
  ministry: string | null
  /** 확인할 점 한 줄 (예: 스캔 문서라 글자 인식 결과 확인) */
  checkPoint: string | null
  sourceUrl: string | null
  /** 원문 텍스트 (쪽별) */
  pages: { page: number; text: string }[]
  extractions: ReviewExtraction[]
  labels: {
    supportCategories: SupportCategoryCode[]
    targetExportStages: ExportStage[]
    /** 지원 내용 한 줄 → Program.summaryEasy */
    summaryEasy: string | null
  }
  memo: string | null
}

export interface DuplicateGroup {
  id: string
  /** 같다고 본 이유 (예: 공고명, 주관기관, 마감일이 같습니다.) */
  reason: string
  notices: AdminNoticeSummary[]
}

export interface CriteriaSettings {
  basisDateMode: 'fixed' | 'daily-kst'
  basisDate: IsoDate | null
  fitWeights: { interest: number; stage: number; text: number }
  updatedAt: IsoDateTime | null
  updatedBy: string | null
}

export interface AdminNoticeQuery {
  source: AdminNoticeSource | null
  /** 공고 상태 또는 접수 상태 '마감'(closed) */
  status: AdminNoticeStatus | 'closed' | null
  keyword: string | null
  page: number
}

export interface AdminNoticeList {
  items: AdminNoticeSummary[]
  /** 저장소가 없으면 null ('-') */
  total: number | null
}

export type RejectReason = 'not-export' | 'closed' | 'duplicate' | 'source-unavailable' | 'other'

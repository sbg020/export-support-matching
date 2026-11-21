/*
 * 관리자 영역 데이터 모델 (REVISION_04 §13.1).
 * 저장소(DB)는 다음 개정에서 연결한다. 지금은 EmptyAdminRepository가 수치 null, 목록 []를 돌려준다.
 * 필드 이름은 Program·EligibilityRule과 맞춘다.
 */
import type { IsoDate, IsoDateTime } from './common'
import type { CommonCheckKey, ExportStage, ReceptionStatus, RuleField, SupportCategoryCode } from './program'

/** 출처: 기업마당·KOTRA·KITA·정답세트·공고 폴더 적재 (REVISION_05) */
export type AdminNoticeSource = 'bizinfo' | 'kotra' | 'kita' | 'answer-set' | 'folder'
export type AdminNoticeStatus = 'pending-review' | 'published' | 'suspended' | 'rejected' | 'merged' | 'text-failed'

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
  /** 수정공고 수. 출처가 알려 주지 않으면 null ('-') */
  revised: number | null
  errors: { noticeRef: string | null; message: string; resolved: boolean }[]
}

export type UploadKind = 'kotra-csv' | 'kita-csv' | 'answer-set'

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

/**
 * 기업마당 지원사업정보 API에서 받은 공고 한 건 (src/data/published/bizinfo-collection.json).
 * API가 준 값만 옮겼다. 없는 값은 null. 첨부 다운로드 링크(만료 토큰 포함)는 옮기지 않고 파일 이름만 둔다.
 */
export interface BizinfoCollectedNotice {
  /** 기업마당 공고 ID (pblancId) */
  id: string
  title: string | null
  /** 기업마당 공고 상세 URL */
  sourceUrl: string | null
  /** 소관부처·지자체 */
  ministry: string | null
  /** 사업수행기관 */
  agency: string | null
  /** 지원 대상 (trgetNm) */
  target: string | null
  /** 지원분야 대분류·중분류 */
  category: string | null
  subcategory: string | null
  /** 신청기간 원문 표기 */
  applyPeriodText: string | null
  /** 원문이 'YYYY-MM-DD ~ YYYY-MM-DD'일 때만 */
  applyStart: string | null
  applyEnd: string | null
  applicationMethod: string | null
  applicationUrl: string | null
  contact: string | null
  /** 사업개요 (HTML 태그를 뺀 텍스트) */
  summaryText: string | null
  hashtags: string[] | null
  attachmentNames: string[] | null
  printFileName: string | null
  registeredAt: IsoDateTime | null
  updatedAt: IsoDateTime | null
  viewCount: number | null
}

export interface BizinfoCollection {
  meta: {
    source: 'bizinfo'
    endpoint: string
    /** 기업마당 지원분야 코드 (04 수출) */
    category: string
    categoryName: string
    /** 받은 시각 (ISO, UTC) */
    fetchedAt: IsoDateTime
    /** API가 알려 준 전체 건수 (totCnt) */
    reportedTotal: number | null
    /** API 응답 건수 */
    fetched: number
    /** ID 중복·형식 오류를 뺀 저장 건수 */
    stored: number
  }
  items: BizinfoCollectedNotice[]
}

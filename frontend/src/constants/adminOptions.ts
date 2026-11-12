/*
 * 관리자 화면 용어와 선택지 (REVISION_04 §6.4, §8, §10, §11).
 */
import type { Option } from '@/types/common'
import type {
  AdminNoticeSource,
  AdminNoticeStatus,
  CollectionSchedule,
  CollectionTime,
  RejectReason,
} from '@/types/admin'

export const ADMIN_SOURCE_OPTIONS: Option<AdminNoticeSource>[] = [
  { value: 'bizinfo', label: '기업마당' },
  { value: 'kotra', label: 'KOTRA' },
  { value: 'answer-set', label: '정답세트' },
]

export const ADMIN_STATUS_OPTIONS: Option<AdminNoticeStatus>[] = [
  { value: 'pending-review', label: '검수 대기' },
  { value: 'published', label: '게시 중' },
  { value: 'suspended', label: '게시 중지' },
  { value: 'rejected', label: '반려' },
  { value: 'merged', label: '병합됨' },
]

/** 공고 관리 상태 필터: 공고 상태 + 접수 상태 '마감'(closed) */
export type AdminStatusFilter = 'all' | 'published' | 'pending-review' | 'suspended' | 'rejected' | 'closed'
export const ADMIN_STATUS_FILTERS: { value: AdminStatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'published', label: '게시 중' },
  { value: 'pending-review', label: '검수 대기' },
  { value: 'suspended', label: '게시 중지' },
  { value: 'rejected', label: '반려' },
  { value: 'closed', label: '마감' },
]

export type AdminSourceFilter = 'all' | AdminNoticeSource
export const ADMIN_SOURCE_FILTERS: { value: AdminSourceFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  ...ADMIN_SOURCE_OPTIONS,
]

/** 공고 데이터 흐름 5단계. 관리자 검수 승인 단계를 강조한다 */
export const ADMIN_PIPELINE_STEPS = [
  { key: 'collected', label: '수집', description: '기업마당 API 자동, KOTRA CSV 수동', countLabel: '오늘 수집' },
  { key: 'stored', label: '원문 저장', description: '공고문과 첨부 파일 보관', countLabel: '누적 저장' },
  { key: 'extracting', label: '자동 추출·분류', description: '자격 조건, 지원 분야 읽기', countLabel: '처리 중' },
  { key: 'pendingReview', label: '관리자 검수 승인', description: '원문과 비교해 확인', countLabel: '검수 대기', highlight: true },
  { key: 'published', label: '사용자 반영', description: '맞춤 추천·전체 공고에 게시', countLabel: '게시 중' },
] as const

/** 기업마당 지원분야 (코드는 구현 전 기업마당 공식 안내로 다시 확인, REVISION_04 §13.3) */
export const BIZINFO_CATEGORY_OPTIONS: Option<string>[] = [
  { value: '01', label: '금융' },
  { value: '02', label: '기술' },
  { value: '03', label: '인력' },
  { value: '04', label: '수출' },
  { value: '05', label: '내수' },
  { value: '06', label: '창업' },
  { value: '07', label: '경영' },
  { value: '09', label: '기타' },
]
/** 처음에는 '수출'만 체크한다 */
export const BIZINFO_DEFAULT_CATEGORIES = ['04']

export const COLLECTION_SCHEDULE_OPTIONS: Option<CollectionSchedule>[] = [
  { value: 'daily', label: '매일' },
  { value: 'weekdays', label: '평일만' },
  { value: 'weekly-mon', label: '매주 월요일' },
]

export const COLLECTION_TIME_OPTIONS: Option<CollectionTime>[] = [
  { value: '06:00', label: '오전 6시' },
  { value: '09:00', label: '오전 9시' },
  { value: '18:00', label: '오후 6시' },
]

export const REJECT_REASON_OPTIONS: Option<RejectReason>[] = [
  { value: 'not-export', label: '수출 분야가 아님' },
  { value: 'closed', label: '마감된 공고' },
  { value: 'duplicate', label: '중복 공고' },
  { value: 'source-unavailable', label: '원문 확인 불가' },
  { value: 'other', label: '기타' },
]

/** 공고 검수의 자동 추출 항목 (기존 자격 규칙 필드에 맞춘다, REVISION_04 §10.2) */
export const REVIEW_EXTRACTION_FIELDS = [
  '본사 소재지',
  '공장 소재지',
  '기업 유형·규모',
  '업력',
  '매출액',
  '수출액',
  '업종',
  '인증',
  '마감일',
  '제외 조건 (공통 확인 5가지)',
  '우대 조건 (가점·감점)',
  '지원금',
]

/** 페이지당 공고 수 */
export const ADMIN_NOTICE_PAGE_SIZE = 20

export function adminSourceLabel(source: AdminNoticeSource): string {
  return ADMIN_SOURCE_OPTIONS.find((option) => option.value === source)?.label ?? source
}

export function adminStatusLabel(status: AdminNoticeStatus): string {
  return ADMIN_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}

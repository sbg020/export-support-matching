import type { IsoDate, IsoDateTime } from './common'

/*
 * 사용자 관리 기록(관심·준비·신청, 일정, 서류) 타입.
 * 모두 실제 공고와 연결될 때만 생성된다. 가상의 기록을 만들지 않는다.
 */

export type DocumentType =
  | 'business-registration'
  | 'financial-statements'
  | 'export-performance'
  | 'business-plan'
  | 'sme-confirmation'
  | 'tax-certificate'
  | 'certification-copy'
  | 'ip-evidence'
  | 'other'

export interface ChecklistItemState {
  requiredDocumentId: string
  checked: boolean
}

/**
 * 관심·준비·신청 관리 상태. 표시 문구와 탭 매핑은 constants/applicationStatus.ts 한 곳에서 정의한다.
 * '신청완료'(applied)와 '선정완료'(selected)는 서로 다른 상태다.
 */
export type ApplicationStatus =
  | 'interested'
  | 'preparing'
  | 'applied'
  | 'under_review'
  | 'selected'
  | 'not_selected'
  | 'in_progress'
  | 'completed'

export interface StatusChange {
  status: ApplicationStatus
  /** 사용자가 상태를 바꾼 실제 시각 (시스템 시각으로 기록) */
  changedAt: IsoDateTime
}

/** 공고 하나에 대한 관리 기록. 실제 공고와 연결될 때만 생성한다. */
export interface ApplicationRecord {
  programId: string
  status: ApplicationStatus
  /** 모든 상태 변경 이력 (오래된 순) */
  history: StatusChange[]
  memo: string | null
  /** 업무 날짜는 사용자가 입력한 값만 저장한다 */
  appliedOn: IsoDate | null
  resultOn: IsoDate | null
  checklist: ChecklistItemState[]
  businessPlanDocumentId: string | null
}

export type CalendarEventType = 'apply-start' | 'apply-end' | 'announcement' | 'agreement' | 'personal-goal'

export interface CalendarEvent {
  id: string
  type: CalendarEventType
  date: IsoDate
  title: string
  programId: string | null
}

export interface DocumentRecord {
  id: string
  type: DocumentType
  fileName: string
  uploadedAt: IsoDateTime
  expiresAt: IsoDate | null
  linkedProgramIds: string[]
}

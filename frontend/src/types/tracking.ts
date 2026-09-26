import type { IsoDate, IsoDateTime } from './common'

/*
 * 사용자 관리 기록(관심·준비·이력·일정·서류) 타입.
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

export interface SavedProgram {
  programId: string
  savedAt: IsoDateTime
}

export interface ChecklistItemState {
  requiredDocumentId: string
  checked: boolean
}

export interface PreparationItem {
  programId: string
  checklist: ChecklistItemState[]
  businessPlanDocumentId: string | null
  targetDate: IsoDate | null
}

export type HistoryStatus =
  | 'interested'
  | 'preparing'
  | 'applied'
  | 'reviewing'
  | 'selected'
  | 'rejected'
  | 'in-progress'
  | 'completed'

export interface HistoryRecord {
  id: string
  programId: string
  status: HistoryStatus
  recordedAt: IsoDate
  memo: string | null
}

export type CalendarEventType = 'apply-start' | 'apply-end' | 'personal-goal' | 'announcement'

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

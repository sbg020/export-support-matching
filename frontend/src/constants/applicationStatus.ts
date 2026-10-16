/*
 * 관심·준비 중·신청완료 관리 상태 — 표시 문구, 탭, 진행 순서를 한 곳에서 정의한다.
 */
import type { ApplicationStatus } from '@/types/tracking'

export type ApplicationTab = 'interested' | 'preparing' | 'applied'

export interface ApplicationStatusDefinition {
  value: ApplicationStatus
  /** 배지 문구 */
  label: string
  description: string
  tab: ApplicationTab
}

/** 진행 순서대로 나열한다. '선정완료'와 '미선정'은 같은 단계(결과)다. */
export const APPLICATION_STATUSES: ApplicationStatusDefinition[] = [
  { value: 'interested', label: '관심', description: '저장만 한 사업', tab: 'interested' },
  { value: 'preparing', label: '준비 중', description: '서류·계획서를 준비하는 중', tab: 'preparing' },
  { value: 'applied', label: '신청완료', description: '신청서를 제출하고 결과를 기다리는 상태', tab: 'applied' },
  { value: 'under_review', label: '심사중', description: '심사가 진행 중인 상태', tab: 'applied' },
  { value: 'selected', label: '선정완료', description: '선정 통보를 받은 상태', tab: 'applied' },
  { value: 'not_selected', label: '미선정', description: '선정되지 않은 상태', tab: 'applied' },
  { value: 'in_progress', label: '수행중', description: '선정 후 사업을 수행하는 중', tab: 'applied' },
  { value: 'completed', label: '완료', description: '사업 수행을 마친 상태', tab: 'applied' },
]

export const APPLICATION_TABS: { key: ApplicationTab; label: string }[] = [
  { key: 'interested', label: '관심' },
  { key: 'preparing', label: '준비 중' },
  { key: 'applied', label: '신청완료' },
]

/** 진행 정도. 같은 공고의 기록이 여러 개면 더 진행된 상태를 현재 상태로 본다. */
const PROGRESS: Record<ApplicationStatus, number> = {
  interested: 0,
  preparing: 1,
  applied: 2,
  under_review: 3,
  selected: 4,
  not_selected: 4,
  in_progress: 5,
  completed: 6,
}

export function statusProgress(status: ApplicationStatus): number {
  return PROGRESS[status]
}

export function statusDefinition(status: ApplicationStatus): ApplicationStatusDefinition {
  return APPLICATION_STATUSES.find((s) => s.value === status) ?? APPLICATION_STATUSES[0]!
}

export function statusLabel(status: ApplicationStatus): string {
  return statusDefinition(status).label
}

export function tabOfStatus(status: ApplicationStatus): ApplicationTab {
  return statusDefinition(status).tab
}

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && APPLICATION_STATUSES.some((s) => s.value === value)
}

export function isApplicationTab(value: unknown): value is ApplicationTab {
  return value === 'interested' || value === 'preparing' || value === 'applied'
}

/*
 * 관심·준비 중·신청완료 관리 기록.
 *
 * - 이 브라우저의 localStorage(esm.applicationRecords.v1)에만 저장한다. 서버 동기화는 없다.
 * - 이전 버전에는 관리 기록을 저장한 키가 없었으므로(메모리의 빈 목록) 옮겨 올 기존 데이터가 없다.
 *   이후 다른 형식에서 옮겨 올 때는 원본 키를 지우지 않고 복사·병합한다.
 * - 기록은 실제 공고와 연결될 때만 생긴다. 상태를 바꾼 시각만 시스템 시각으로 남기고,
 *   신청일·발표일 같은 업무 날짜는 사용자가 입력한 값만 저장한다.
 */
import { computed, reactive } from 'vue'
import type { ApplicationRecord, ApplicationStatus, StatusChange } from '@/types/tracking'
import {
  isApplicationStatus,
  statusProgress,
  tabOfStatus,
  type ApplicationTab,
} from '@/constants/applicationStatus'
import { getLocalStorage } from '@/lib/storage'

export const APPLICATION_STORAGE_KEY = 'esm.applicationRecords.v1'

interface StoredRecords {
  version: 1
  records: ApplicationRecord[]
}

const state = reactive<{ records: ApplicationRecord[]; loaded: boolean }>({ records: [], loaded: false })

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

function readRecord(value: unknown): ApplicationRecord | null {
  if (typeof value !== 'object' || value === null) return null
  const r = value as Record<string, unknown>
  const programId = pickString(r.programId)
  if (!programId || !isApplicationStatus(r.status)) return null
  const history = Array.isArray(r.history)
    ? r.history.filter(
        (h): h is StatusChange =>
          typeof h === 'object' &&
          h !== null &&
          isApplicationStatus((h as StatusChange).status) &&
          typeof (h as StatusChange).changedAt === 'string',
      )
    : []
  return {
    programId,
    status: r.status,
    history,
    memo: pickString(r.memo),
    appliedOn: pickString(r.appliedOn),
    resultOn: pickString(r.resultOn),
    checklist: Array.isArray(r.checklist) ? (r.checklist as ApplicationRecord['checklist']) : [],
    businessPlanDocumentId: pickString(r.businessPlanDocumentId),
  }
}

/**
 * 같은 공고의 기록을 하나로 합친다. 더 진행된 상태를 현재 상태로 두고,
 * 모든 상태 이력과 메모를 보존한다.
 */
export function mergeRecords(records: ApplicationRecord[]): ApplicationRecord[] {
  const byProgram = new Map<string, ApplicationRecord>()
  for (const record of records) {
    const existing = byProgram.get(record.programId)
    if (!existing) {
      byProgram.set(record.programId, { ...record, history: [...record.history] })
      continue
    }
    const history = [...existing.history, ...record.history].sort((a, b) => a.changedAt.localeCompare(b.changedAt))
    const memos = [existing.memo, record.memo].filter((m): m is string => m !== null)
    byProgram.set(record.programId, {
      ...existing,
      status: statusProgress(record.status) > statusProgress(existing.status) ? record.status : existing.status,
      history,
      memo: memos.length > 0 ? Array.from(new Set(memos)).join('\n') : null,
      appliedOn: existing.appliedOn ?? record.appliedOn,
      resultOn: existing.resultOn ?? record.resultOn,
      checklist: existing.checklist.length > 0 ? existing.checklist : record.checklist,
      businessPlanDocumentId: existing.businessPlanDocumentId ?? record.businessPlanDocumentId,
    })
  }
  return Array.from(byProgram.values())
}

function ensureLoaded() {
  if (state.loaded) return
  state.loaded = true
  try {
    const raw = getLocalStorage()?.getItem(APPLICATION_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Partial<StoredRecords>
    if (parsed.version !== 1 || !Array.isArray(parsed.records)) return
    state.records = mergeRecords(
      parsed.records.map(readRecord).filter((r): r is ApplicationRecord => r !== null),
    )
  } catch {
    state.records = []
  }
}

function persist(): boolean {
  const storage = getLocalStorage()
  if (!storage) return false
  try {
    const stored: StoredRecords = { version: 1, records: state.records }
    storage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(stored))
    return true
  } catch {
    return false
  }
}

function find(programId: string): ApplicationRecord | undefined {
  return state.records.find((r) => r.programId === programId)
}

/** 관심사업 저장: 기록이 없을 때만 '관심' 상태로 만든다. */
function saveInterested(programId: string): 'added' | 'exists' {
  if (find(programId)) return 'exists'
  state.records = [
    ...state.records,
    {
      programId,
      status: 'interested',
      history: [{ status: 'interested', changedAt: new Date().toISOString() }],
      memo: null,
      appliedOn: null,
      resultOn: null,
      checklist: [],
      businessPlanDocumentId: null,
    },
  ]
  persist()
  return 'added'
}

function changeStatus(programId: string, status: ApplicationStatus) {
  state.records = state.records.map((record) =>
    record.programId === programId && record.status !== status
      ? {
          ...record,
          status,
          history: [...record.history, { status, changedAt: new Date().toISOString() }],
        }
      : record,
  )
  persist()
}

function setMemo(programId: string, memo: string | null) {
  const value = memo && memo.trim() !== '' ? memo : null
  state.records = state.records.map((record) => (record.programId === programId ? { ...record, memo: value } : record))
  persist()
}

export function useApplicationStore() {
  ensureLoaded()
  return {
    records: computed(() => state.records),
    find,
    byTab: (tab: ApplicationTab) => state.records.filter((r) => tabOfStatus(r.status) === tab),
    saveInterested,
    changeStatus,
    setMemo,
  }
}

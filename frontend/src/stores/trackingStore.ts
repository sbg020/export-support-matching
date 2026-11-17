/*
 * 서류함 기록 (메타데이터만).
 *
 * - 파일 저장소가 연결되지 않아 원본 파일은 올리거나 보관하지 않는다(DOCUMENT_STORAGE_CONNECTED = false).
 * - 서류 기록(이름·유형·상태·발급일·유효기간·연결 사업)은 이 브라우저의 localStorage(esm.documents.v1)에만 둔다.
 *   테스트 계정은 계정 전용 키를 쓴다. 기기 공용 범위에는 기록을 만들지 않는다(빈 목록).
 * 관심·준비·신청 관리 기록은 stores/applicationStore.ts가 맡는다.
 */
import { computed, reactive } from 'vue'
import type { DocumentRecord, DocumentStatus, DocumentType } from '@/types/tracking'
import { getLocalStorage } from '@/lib/storage'
import { DEVICE_SCOPE, scopedStorageKey, type StorageScope } from '@/lib/storageScope'

export const DOCUMENT_STORAGE_KEY = 'esm.documents.v1'

/** 파일 저장소 연결 여부. 연결되기 전에는 업로드를 막는다. */
export const DOCUMENT_STORAGE_CONNECTED = false

const STATUSES: DocumentStatus[] = ['held', 'drafting', 'expiring', 'missing']

const state = reactive<{ documents: DocumentRecord[]; loaded: boolean; scope: StorageScope }>({
  documents: [],
  loaded: false,
  scope: DEVICE_SCOPE,
})

function storageKey(): string {
  return scopedStorageKey(DOCUMENT_STORAGE_KEY, state.scope)
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)

function readDocument(value: unknown): DocumentRecord | null {
  if (typeof value !== 'object' || value === null) return null
  const r = value as Record<string, unknown>
  const id = str(r.id)
  const title = str(r.title)
  const type = str(r.type) as DocumentType | null
  const status = STATUSES.find((s) => s === r.status)
  if (!id || !title || !type || !status) return null
  return {
    id,
    type,
    title,
    status,
    fileName: str(r.fileName),
    uploadedAt: str(r.uploadedAt),
    issuedOn: str(r.issuedOn),
    expiresAt: str(r.expiresAt),
    linkedProgramIds: Array.isArray(r.linkedProgramIds) ? r.linkedProgramIds.filter((x): x is string => typeof x === 'string') : [],
    note: str(r.note),
  }
}

function ensureLoaded() {
  if (state.loaded) return
  state.loaded = true
  state.documents = []
  try {
    const raw = getLocalStorage()?.getItem(storageKey())
    if (!raw) return
    const parsed = JSON.parse(raw) as { version?: number; documents?: unknown[] }
    if (parsed.version !== 1 || !Array.isArray(parsed.documents)) return
    state.documents = parsed.documents.map(readDocument).filter((d): d is DocumentRecord => d !== null)
  } catch {
    state.documents = []
  }
}

function persist() {
  try {
    getLocalStorage()?.setItem(storageKey(), JSON.stringify({ version: 1, documents: state.documents }))
  } catch {
    // 저장 공간이 없으면 화면에만 둔다
  }
}

function activateScope(scope: StorageScope): void {
  if (state.loaded && scopedStorageKey(DOCUMENT_STORAGE_KEY, scope) === storageKey()) return
  state.scope = scope
  state.loaded = false
  ensureLoaded()
}

function replaceAll(documents: DocumentRecord[]): void {
  state.documents = documents.map((d) => ({ ...d, linkedProgramIds: [...d.linkedProgramIds] }))
  persist()
}

export function useTrackingStore() {
  ensureLoaded()
  return {
    documents: computed(() => state.documents),
    activateScope,
    replaceAll,
  }
}

/*
 * 공고 비교 선택 (모든 화면 공통).
 *
 * - 순서를 유지하고 중복을 없애며 최대 4개까지 담는다.
 * - 이 탭의 sessionStorage(esm.compareSelection.v1)에 보관하고, 전체 공고 화면에서는
 *   URL 쿼리 compare=id1,id2 에도 히스토리를 쌓지 않는 방식(replace)으로 반영한다.
 * - 저장된 ID가 공고 저장소에서 조회되지 않아도 조용히 버리지 않는다. 비교 영역에서
 *   '찾을 수 없는 공고'로 보여 주고 사용자가 지운다.
 */
import { computed, reactive } from 'vue'
import type { LocationQueryValue, RouteLocationRaw } from 'vue-router'
import { getSessionStorage } from '@/lib/storage'

export const COMPARE_STORAGE_KEY = 'esm.compareSelection.v1'
export const MAX_COMPARE = 4
export const COMPARE_FULL_MESSAGE = '최대 4개까지 비교할 수 있습니다.'

const state = reactive<{ ids: string[]; loaded: boolean }>({ ids: [], loaded: false })

/** 순서 유지, 공백·빈 값 제거, 중복 제거, 최대 4개 */
export function normalizeCompareIds(values: readonly unknown[]): string[] {
  const result: string[] = []
  for (const value of values) {
    if (typeof value !== 'string') continue
    const id = value.trim()
    if (id === '' || result.includes(id)) continue
    result.push(id)
    if (result.length === MAX_COMPARE) break
  }
  return result
}

/** 쿼리 값 'a,b,c'를 ID 목록으로 */
export function parseCompareQuery(value: LocationQueryValue | LocationQueryValue[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(',') : value
  if (typeof raw !== 'string' || raw === '') return []
  return normalizeCompareIds(raw.split(','))
}

function persist() {
  try {
    getSessionStorage()?.setItem(COMPARE_STORAGE_KEY, JSON.stringify(state.ids))
  } catch {
    // 저장소를 쓸 수 없어도 화면 상태는 유지한다.
  }
}

function ensureLoaded() {
  if (state.loaded) return
  state.loaded = true
  try {
    const raw = getSessionStorage()?.getItem(COMPARE_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    state.ids = Array.isArray(parsed) ? normalizeCompareIds(parsed) : []
  } catch {
    state.ids = []
  }
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

export type AddResult = 'added' | 'exists' | 'full'

function add(id: string): AddResult {
  if (state.ids.includes(id)) return 'exists'
  if (state.ids.length >= MAX_COMPARE) return 'full'
  state.ids = [...state.ids, id]
  persist()
  return 'added'
}

function remove(id: string) {
  state.ids = state.ids.filter((item) => item !== id)
  persist()
}

function clear() {
  state.ids = []
  persist()
}

function setAll(ids: readonly unknown[]) {
  const next = normalizeCompareIds(ids)
  if (sameIds(next, state.ids)) return
  state.ids = next
  persist()
}

/** 전체 공고 하단 비교 영역으로 가는 주소 */
function compareLocation(): RouteLocationRaw {
  return {
    name: 'programs',
    query: state.ids.length > 0 ? { compare: state.ids.join(',') } : {},
    hash: '#compare',
  }
}

export function useCompareSelection() {
  ensureLoaded()
  return {
    ids: computed(() => state.ids),
    count: computed(() => state.ids.length),
    has: (id: string) => state.ids.includes(id),
    add,
    remove,
    clear,
    setAll,
    compareLocation,
  }
}

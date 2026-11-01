/*
 * 기업 프로필 상태.
 *
 * 계정·DB가 없으므로 사용자가 저장을 누르면 이 브라우저(localStorage)에만 보관한다.
 * 서버로 전송하지 않는다. 사업자등록번호는 기기에 저장하지 않고 현재 화면 세션에서만 유지한다.
 * 테스트 계정으로 로그인하면 그 계정 전용 키를 쓴다(accountScope.ts). 그 밖에는 기존 키(PROFILE_STORAGE_KEY)를 쓴다.
 */
import { computed, reactive } from 'vue'
import type { CompanyProfile, ProfileMeta, ProfileStepId } from '@/types/profile'
import {
  PROFILE_STORAGE_KEY,
  assessProfile,
  cloneProfile,
  createEmptyMeta,
  createEmptyProfile,
  deserializeProfile,
  serializeProfile,
} from '@/lib/profile'
import { getLocalStorage } from '@/lib/storage'
import { DEVICE_SCOPE, scopedStorageKey, type StorageScope } from '@/lib/storageScope'

interface ProfileState {
  profile: CompanyProfile
  meta: ProfileMeta
  /** 브라우저 저장소를 사용할 수 있는지 (사생활 보호 모드 등에서는 false) */
  storageAvailable: boolean
  loaded: boolean
  /** 지금 읽고 쓰는 저장 범위 (기기 공용 또는 테스트 계정) */
  scope: StorageScope
}

const state = reactive<ProfileState>({
  profile: createEmptyProfile(),
  meta: createEmptyMeta(),
  storageAvailable: true,
  loaded: false,
  scope: DEVICE_SCOPE,
})

function storageKey(): string {
  return scopedStorageKey(PROFILE_STORAGE_KEY, state.scope)
}

function load(): void {
  state.loaded = true
  state.profile = createEmptyProfile()
  state.meta = createEmptyMeta()
  const storage = getLocalStorage()
  state.storageAvailable = storage !== null
  if (!storage) return
  const restored = deserializeProfile(storage.getItem(storageKey()))
  if (restored) {
    state.profile = restored.profile
    state.meta = restored.meta
  }
}

function ensureLoaded(): void {
  if (!state.loaded) load()
}

const assessment = computed(() => assessProfile(state.profile))

function saveToDevice(): boolean {
  const storage = getLocalStorage()
  if (!storage) {
    state.storageAvailable = false
    return false
  }
  const savedAt = new Date().toISOString()
  try {
    storage.setItem(storageKey(), serializeProfile(state.profile, { ...state.meta, lastSavedAt: savedAt }))
    state.meta.lastSavedAt = savedAt
    return true
  } catch {
    return false
  }
}

/**
 * 저장 범위를 바꾸고 그 범위의 프로필을 읽는다. 같은 범위면 아무것도 하지 않는다.
 * seed가 있으면 그 범위에 저장된 프로필이 없을 때만 seed 값을 넣고 저장한다.
 */
function activateScope(scope: StorageScope, seed: (() => CompanyProfile) | null): void {
  const nextKey = scopedStorageKey(PROFILE_STORAGE_KEY, scope)
  if (state.loaded && nextKey === storageKey()) return
  state.scope = scope
  load()
  if (!seed) return
  let stored: string | null = null
  try {
    stored = getLocalStorage()?.getItem(nextKey) ?? null
  } catch {
    stored = null
  }
  if (stored === null) {
    state.profile = seed()
    state.meta = createEmptyMeta()
    saveToDevice()
  }
}

function replaceProfile(next: CompanyProfile): void {
  state.profile = cloneProfile(next)
}

/** 건너뛴 단계·저장 시각 기록을 비운다 (테스트 프로필 초기화용) */
function resetMeta(): void {
  state.meta = createEmptyMeta()
}

function markStepSkipped(step: ProfileStepId): void {
  if (!state.meta.skippedSteps.includes(step)) {
    state.meta.skippedSteps = [...state.meta.skippedSteps, step].sort()
  }
}

function clearStepSkipped(step: ProfileStepId): void {
  state.meta.skippedSteps = state.meta.skippedSteps.filter((s) => s !== step)
}

/** 이 기기에 저장된 프로필(지금 범위)과 현재 입력값을 모두 지운다. */
function clearAll(): void {
  const storage = getLocalStorage()
  try {
    storage?.removeItem(storageKey())
  } catch {
    // 저장소 접근 실패는 무시하고 화면 상태만 초기화한다.
  }
  state.profile = createEmptyProfile()
  state.meta = createEmptyMeta()
}

export function useProfileStore() {
  ensureLoaded()
  return {
    state,
    assessment,
    saveToDevice,
    replaceProfile,
    resetMeta,
    markStepSkipped,
    clearStepSkipped,
    clearAll,
    activateScope,
  }
}

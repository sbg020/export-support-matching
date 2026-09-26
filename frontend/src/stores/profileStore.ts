/*
 * 기업 프로필 상태.
 *
 * 계정·DB가 없으므로 사용자가 저장을 누르면 이 브라우저(localStorage)에만 보관한다.
 * 서버로 전송하지 않는다. 사업자등록번호는 기기에 저장하지 않고 현재 화면 세션에서만 유지한다.
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

interface ProfileState {
  profile: CompanyProfile
  meta: ProfileMeta
  /** 브라우저 저장소를 사용할 수 있는지 (사생활 보호 모드 등에서는 false) */
  storageAvailable: boolean
  loaded: boolean
}

const state = reactive<ProfileState>({
  profile: createEmptyProfile(),
  meta: createEmptyMeta(),
  storageAvailable: true,
  loaded: false,
})

function ensureLoaded(): void {
  if (state.loaded) return
  state.loaded = true
  const storage = getLocalStorage()
  state.storageAvailable = storage !== null
  if (!storage) return
  const restored = deserializeProfile(storage.getItem(PROFILE_STORAGE_KEY))
  if (restored) {
    state.profile = restored.profile
    state.meta = restored.meta
  }
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
    storage.setItem(PROFILE_STORAGE_KEY, serializeProfile(state.profile, { ...state.meta, lastSavedAt: savedAt }))
    state.meta.lastSavedAt = savedAt
    return true
  } catch {
    return false
  }
}

function replaceProfile(next: CompanyProfile): void {
  state.profile = cloneProfile(next)
}

function markStepSkipped(step: ProfileStepId): void {
  if (!state.meta.skippedSteps.includes(step)) {
    state.meta.skippedSteps = [...state.meta.skippedSteps, step].sort()
  }
}

function clearStepSkipped(step: ProfileStepId): void {
  state.meta.skippedSteps = state.meta.skippedSteps.filter((s) => s !== step)
}

/** 이 기기에 저장된 프로필과 현재 입력값을 모두 지운다. */
function clearAll(): void {
  const storage = getLocalStorage()
  try {
    storage?.removeItem(PROFILE_STORAGE_KEY)
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
    markStepSkipped,
    clearStepSkipped,
    clearAll,
  }
}

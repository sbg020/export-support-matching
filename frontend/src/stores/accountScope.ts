/*
 * 계정별 저장 범위 적용 (revision_03 테스트 계정).
 *
 * 서버 DB가 없어 기업 프로필과 직접 확인 답은 이 브라우저(localStorage)에만 저장한다.
 * - 테스트 계정(역할 test)으로 로그인하면 그 계정 전용 키를 쓴다. 그 키가 비어 있을 때만 테스트 프로필
 *   (src/data/testAccountProfile.ts)을 넣는다. 시연 중에 고친 값은 다시 로그인해도 덮어쓰지 않는다.
 * - 비로그인과 관리자 계정(그 밖의 계정 포함)은 기존 키를 그대로 쓴다. 테스트 계정은 기존 키를 읽거나 바꾸지 않는다.
 * - 초기화(resetTestAccountData)는 테스트 계정 키만 테스트 프로필 값으로 다시 덮어쓴다.
 */
import { createTestAccountCommonChecks, createTestAccountProfile } from '@/data/testAccountProfile'
import { createTestAccountDocuments, createTestAccountRecords } from '@/data/testAccountRecords'
import { getLocalStorage } from '@/lib/storage'
import { scopeOfUser, scopedStorageKey, type StorageScope } from '@/lib/storageScope'
import { useProfileStore } from './profileStore'
import { useSelfChecks } from './selfCheckStore'
import { useApplicationStore } from './applicationStore'
import { useTrackingStore } from './trackingStore'

/** 테스트 계정 임시 기록(나의 사업 관리·서류함)을 넣었는지 표시하는 키 */
export const TEST_SEED_FLAG_KEY = 'esm.testSeed.v1'

/**
 * 테스트 계정으로 처음 로그인할 때 한 번만 임시 기록을 넣는다.
 * 표시 키가 있으면(이미 넣었으면) 아무것도 하지 않는다. 사용자가 지우거나 바꾼 기록을 다시 살려내지 않는다.
 * 기록이 이미 있는 범위에는 넣지 않는다.
 */
function seedTestAccountRecordsOnce(scope: StorageScope): void {
  const storage = getLocalStorage()
  if (!storage) return
  const flagKey = scopedStorageKey(TEST_SEED_FLAG_KEY, scope)
  try {
    if (storage.getItem(flagKey) !== null) return
  } catch {
    return
  }
  const applications = useApplicationStore()
  const tracking = useTrackingStore()
  if (applications.records.value.length === 0) applications.replaceAll(createTestAccountRecords())
  if (tracking.documents.value.length === 0) tracking.replaceAll(createTestAccountDocuments())
  try {
    storage.setItem(flagKey, JSON.stringify({ records: true, documents: true }))
  } catch {
    // 표시를 못 남기면 다음 로그인에 다시 확인한다 (기록이 있으면 넣지 않는다)
  }
}

/** 로그인 상태가 바뀔 때마다 부른다. 같은 범위면 아무것도 하지 않는다 */
export function applyAccountScope(user: { id: string; role: string } | null): void {
  const scope = scopeOfUser(user)
  const isTest = scope.kind === 'test-account'
  useProfileStore().activateScope(scope, isTest ? createTestAccountProfile : null)
  useSelfChecks().activateScope(scope, isTest ? createTestAccountCommonChecks : null)
  useApplicationStore().activateScope(scope)
  useTrackingStore().activateScope(scope)
  if (isTest) seedTestAccountRecordsOnce(scope)
}

/** 테스트 계정의 기업 프로필과 직접 확인 답을 테스트 프로필 값으로 다시 덮어쓴다. 테스트 계정이 아니면 false */
export function resetTestAccountData(): boolean {
  const profile = useProfileStore()
  if (profile.state.scope.kind !== 'test-account') return false
  profile.replaceProfile(createTestAccountProfile())
  profile.resetMeta()
  profile.saveToDevice()
  useSelfChecks().replaceAll({ common: createTestAccountCommonChecks(), programs: {} })
  return true
}

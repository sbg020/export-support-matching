/*
 * 계정별 저장 범위 적용 (revision_03 테스트 계정).
 *
 * 서버 DB가 없어 기업 프로필과 직접 확인 답은 이 브라우저(localStorage)에만 저장한다.
 * - 테스트 계정(역할 test)으로 로그인하면 그 계정 전용 키를 쓴다. 그 키가 비어 있을 때만 테스트 프로필
 *   (src/data/testAccountProfile.ts)을 넣는다. 시연 중에 고친 값은 다시 로그인해도 덮어쓰지 않는다.
 * - 비로그인과 데모 계정은 기존 키를 그대로 쓴다. 테스트 계정은 기존 키를 읽거나 바꾸지 않는다.
 * - 초기화(resetTestAccountData)는 테스트 계정 키만 테스트 프로필 값으로 다시 덮어쓴다.
 */
import { createTestAccountCommonChecks, createTestAccountProfile } from '@/data/testAccountProfile'
import { scopeOfUser } from '@/lib/storageScope'
import { useProfileStore } from './profileStore'
import { useSelfChecks } from './selfCheckStore'

/** 로그인 상태가 바뀔 때마다 부른다. 같은 범위면 아무것도 하지 않는다 */
export function applyAccountScope(user: { id: string; role: string } | null): void {
  const scope = scopeOfUser(user)
  const isTest = scope.kind === 'test-account'
  useProfileStore().activateScope(scope, isTest ? createTestAccountProfile : null)
  useSelfChecks().activateScope(scope, isTest ? createTestAccountCommonChecks : null)
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

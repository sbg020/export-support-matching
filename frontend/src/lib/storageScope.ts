/*
 * 브라우저 저장 범위 (revision_03 테스트 계정).
 * 기기 공용 범위는 기존 키를 그대로 쓰고, 테스트 계정 범위는 기존 키 뒤에 계정을 붙인 키를 쓴다.
 */
export type StorageScope = { kind: 'device' } | { kind: 'test-account'; accountId: string }

export const DEVICE_SCOPE: StorageScope = { kind: 'device' }

/** 기존 키 뒤에 계정을 붙인 키. 기기 범위면 기존 키 그대로 */
export function scopedStorageKey(baseKey: string, scope: StorageScope): string {
  return scope.kind === 'device' ? baseKey : `${baseKey}:account:${encodeURIComponent(scope.accountId)}`
}

/** 테스트 계정(역할 test)만 계정 전용 범위를 쓴다. 비로그인·데모 계정은 기기 공용 범위 */
export function scopeOfUser(user: { id: string; role: string } | null): StorageScope {
  return user?.role === 'test' ? { kind: 'test-account', accountId: user.id } : DEVICE_SCOPE
}

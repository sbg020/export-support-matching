import type { Router } from 'vue-router'
import type { AuthRole } from '@/stores/authStore'

function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

/**
 * 로그인 후 이동할 주소 검사. 외부 주소로 보내지 않도록
 * `/`로 시작하고 `//`·`://`·역슬래시·제어 문자가 없으며, 등록된 라우트와 일치할 때만 허용한다.
 * 관리자 화면(meta.requiresAdmin)은 관리자 역할일 때만 허용한다 (REVISION_04 §5.2).
 * 허용되지 않으면 null을 반환한다 (호출하는 쪽에서 첫 화면으로 보낸다: afterLoginPath).
 */
export function safeRedirect(value: unknown, router: Router, role: AuthRole | null = null): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || raw === '') return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  if (raw.includes('://') || raw.includes('\\') || hasControlCharacter(raw)) return null
  const resolved = router.resolve(raw)
  if (resolved.matched.length === 0) return null
  if (resolved.name === 'not-found' || resolved.name === 'login') return null
  if (resolved.meta.requiresAdmin && role !== 'admin') return null
  return resolved.fullPath
}

/** redirect가 없거나 허용되지 않을 때 로그인 후 여는 첫 화면: 수출 로드맵 (REVISION_03 §4) */
export const AFTER_LOGIN_PATH = '/roadmap'
/** 관리자 계정의 첫 화면: 관리자 홈 (REVISION_04 §5.2) */
export const ADMIN_HOME_PATH = '/admin'

/** 로그인 후 이동할 주소: 안전한 redirect, 없으면 관리자는 관리자 홈, 그 밖의 계정은 수출 로드맵 */
export function afterLoginPath(value: unknown, router: Router, role: AuthRole | null = null): string {
  return safeRedirect(value, router, role) ?? (role === 'admin' ? ADMIN_HOME_PATH : AFTER_LOGIN_PATH)
}

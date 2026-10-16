import type { Router } from 'vue-router'

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
 * 허용되지 않으면 null을 반환한다 (호출하는 쪽에서 `/`로 보낸다).
 */
export function safeRedirect(value: unknown, router: Router): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' || raw === '') return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  if (raw.includes('://') || raw.includes('\\') || hasControlCharacter(raw)) return null
  const resolved = router.resolve(raw)
  if (resolved.matched.length === 0) return null
  if (resolved.name === 'not-found' || resolved.name === 'login') return null
  return resolved.fullPath
}

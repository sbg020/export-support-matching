/// <reference types="node" />
// Vercel이 함수를 빌드할 때 쓰는 tsconfig에는 Node 타입이 기본 포함되지 않아(TypeScript 6) 직접 참조한다.
/*
 * 데모 계정 인증 — 서버 전용 순수 함수.
 *
 * - 이 파일은 Vercel 서버 함수(api/)와 Vite 개발 서버 미들웨어에서만 쓴다. 브라우저 번들에 포함하지 않는다.
 * - 아이디·비밀번호·세션 키는 환경변수(DEMO_LOGIN_ID, DEMO_LOGIN_PASSWORD, AUTH_SESSION_SECRET)에서만 읽는다.
 *   값이 없으면 로그인을 막는다. 코드 안의 기본값으로 대신하지 않는다.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE_NAME = 'esm_session'
export const SESSION_TTL_SECONDS = 12 * 60 * 60
/** 세션 서명 키 최소 길이 (openssl rand -base64 32 결과는 44자) */
export const MIN_SECRET_LENGTH = 32

export type AuthEnv = Record<string, string | undefined>

export interface AuthConfig {
  loginId: string
  password: string
  secret: string
}

export interface SessionPayload {
  sub: string
  iat: number
  exp: number
}

export function readAuthConfig(env: AuthEnv): AuthConfig | null {
  const loginId = env.DEMO_LOGIN_ID ?? ''
  const password = env.DEMO_LOGIN_PASSWORD ?? ''
  const secret = env.AUTH_SESSION_SECRET ?? ''
  if (loginId === '' || password === '' || secret.length < MIN_SECRET_LENGTH) return null
  return { loginId, password, secret }
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

/** 길이와 관계없이 일정한 시간으로 비교한다 (두 값의 SHA-256을 비교). */
function constantTimeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b))
}

/** 아이디는 대소문자를 구분해 정확히 일치해야 한다. 두 값을 모두 비교한 뒤 판정한다. */
export function verifyCredentials(config: AuthConfig, loginId: string, password: string): boolean {
  const idMatches = constantTimeEqual(loginId, config.loginId)
  const passwordMatches = constantTimeEqual(password, config.password)
  return idMatches && passwordMatches
}

function signature(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url')
}

export function createSessionToken(
  sub: string,
  secret: string,
  nowSeconds: number,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): string {
  const payload: SessionPayload = { sub, iat: nowSeconds, exp: nowSeconds + ttlSeconds }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${body}.${signature(body, secret)}`
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.sub === 'string' &&
    typeof record.iat === 'number' &&
    typeof record.exp === 'number' &&
    Number.isFinite(record.iat) &&
    Number.isFinite(record.exp)
  )
}

/**
 * 서명·만료·주체를 확인한다. 하나라도 맞지 않으면 null(비로그인)이다.
 * 주체(sub)가 현재 설정된 데모 아이디와 다르면 무효로 본다.
 */
export function verifySessionToken(
  token: string | undefined,
  config: AuthConfig,
  nowSeconds: number,
): SessionPayload | null {
  if (!token) return null
  const parts = token.split('.')
  const body = parts[0]
  const sig = parts[1]
  if (parts.length !== 2 || !body || !sig) return null

  const expected = Buffer.from(signature(body, config.secret))
  const actual = Buffer.from(sig)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!isSessionPayload(payload)) return null
  if (payload.exp <= nowSeconds) return null
  if (payload.iat > nowSeconds + 60) return null
  if (payload.sub !== config.loginId) return null
  return payload
}

export interface CookieOptions {
  secure: boolean
}

export function serializeSessionCookie(token: string, options: CookieOptions): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ]
  if (options.secure) parts.push('Secure')
  return parts.join('; ')
}

export function serializeClearedSessionCookie(options: CookieOptions): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ]
  if (options.secure) parts.push('Secure')
  return parts.join('; ')
}

export function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!header) return cookies
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index <= 0) continue
    const name = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (name && !(name in cookies)) cookies[name] = value
  }
  return cookies
}

/** 배포(https) 환경에서는 Secure 쿠키를 쓴다. 로컬 http 개발 서버에서는 쓰지 않는다. */
export function shouldUseSecureCookie(request: Request, env: AuthEnv): boolean {
  if (env.VERCEL === '1') return true
  if (request.headers.get('x-forwarded-proto') === 'https') return true
  return new URL(request.url).protocol === 'https:'
}

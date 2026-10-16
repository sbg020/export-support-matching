// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  createSessionToken,
  parseCookies,
  readAuthConfig,
  serializeSessionCookie,
  SESSION_TTL_SECONDS,
  verifyCredentials,
  verifySessionToken,
} from '../auth/core.js'
import { AUTH_MESSAGES, handleAuthRequest } from '../auth/handlers.js'

/** 테스트 전용 값. 실제 데모 계정 값이 아니다. */
const ENV = {
  DEMO_LOGIN_ID: 'TESTUSER',
  DEMO_LOGIN_PASSWORD: 'test-only-password',
  AUTH_SESSION_SECRET: 'test-only-secret-test-only-secret-0123456789',
}
const NOW = 1_800_000_000
const config = readAuthConfig(ENV)!

function post(path: string, body: unknown, origin = 'http://localhost:5173'): Request {
  return new Request(`${origin}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('설정', () => {
  it('환경변수가 없거나 세션 키가 짧으면 설정 없음', () => {
    expect(readAuthConfig({})).toBeNull()
    expect(readAuthConfig({ ...ENV, AUTH_SESSION_SECRET: 'short' })).toBeNull()
    expect(readAuthConfig({ ...ENV, DEMO_LOGIN_PASSWORD: '' })).toBeNull()
  })
})

describe('자격 증명', () => {
  it('아이디는 대소문자를 구분한다', () => {
    expect(verifyCredentials(config, 'TESTUSER', 'test-only-password')).toBe(true)
    expect(verifyCredentials(config, 'testuser', 'test-only-password')).toBe(false)
    expect(verifyCredentials(config, 'TESTUSER', 'wrong')).toBe(false)
  })
})

describe('세션 토큰', () => {
  it('서명이 맞고 만료 전이면 유효', () => {
    const token = createSessionToken('TESTUSER', config.secret, NOW)
    expect(verifySessionToken(token, config, NOW + 60)?.sub).toBe('TESTUSER')
  })

  it('만료·위변조·다른 키·다른 주체는 무효', () => {
    const token = createSessionToken('TESTUSER', config.secret, NOW)
    expect(verifySessionToken(token, config, NOW + SESSION_TTL_SECONDS)).toBeNull()
    const [body, sig] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ sub: 'TESTUSER', iat: NOW, exp: NOW + 10 ** 9 })).toString(
      'base64url',
    )
    expect(verifySessionToken(`${forged}.${sig}`, config, NOW)).toBeNull()
    expect(verifySessionToken(`${body}.x${sig}`, config, NOW)).toBeNull()
    const otherKey = createSessionToken('TESTUSER', 'another-secret-another-secret-0123456789', NOW)
    expect(verifySessionToken(otherKey, config, NOW)).toBeNull()
    const otherSub = createSessionToken('SOMEONE', config.secret, NOW)
    expect(verifySessionToken(otherSub, config, NOW)).toBeNull()
    expect(verifySessionToken('garbage', config, NOW)).toBeNull()
  })
})

describe('쿠키', () => {
  it('HttpOnly · SameSite=Lax · Path=/ · 12시간, 배포에서만 Secure', () => {
    const local = serializeSessionCookie('t', { secure: false })
    expect(local).toContain('esm_session=t')
    expect(local).toContain('HttpOnly')
    expect(local).toContain('SameSite=Lax')
    expect(local).toContain('Path=/')
    expect(local).toContain('Max-Age=43200')
    expect(local).not.toContain('Secure')
    expect(serializeSessionCookie('t', { secure: true })).toContain('Secure')
    expect(parseCookies('a=1; esm_session=abc; b=2').esm_session).toBe('abc')
  })
})

describe('인증 API', () => {
  it('설정이 없으면 로그인 503', async () => {
    const res = await handleAuthRequest(post('/api/auth/login', { id: 'x', password: 'y' }), {}, NOW)
    expect(res.status).toBe(503)
    expect(((await res.json()) as { message: string }).message).toBe(AUTH_MESSAGES.notConfigured)
  })

  it('틀린 비밀번호와 소문자 아이디는 401, 어느 쪽이 틀렸는지 알리지 않는다', async () => {
    for (const body of [
      { id: 'TESTUSER', password: 'wrong' },
      { id: 'testuser', password: 'test-only-password' },
    ]) {
      const res = await handleAuthRequest(post('/api/auth/login', body), ENV, NOW)
      expect(res.status).toBe(401)
      expect(((await res.json()) as { message: string }).message).toBe(AUTH_MESSAGES.invalidCredentials)
      expect(res.headers.get('set-cookie')).toBeNull()
    }
  })

  it('로그인 → me 인증됨 → 로그아웃 시 쿠키 삭제', async () => {
    const login = await handleAuthRequest(
      post('/api/auth/login', { id: 'TESTUSER', password: 'test-only-password' }),
      ENV,
      NOW,
    )
    expect(login.status).toBe(200)
    const cookie = login.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('HttpOnly')
    const token = parseCookies(cookie.split(';')[0] ?? '').esm_session

    const me = await handleAuthRequest(
      new Request('http://localhost:5173/api/auth/me', { headers: { cookie: `esm_session=${token}` } }),
      ENV,
      NOW + 10,
    )
    expect(await me.json()).toEqual({ authenticated: true, user: { id: 'TESTUSER' } })

    const anonymous = await handleAuthRequest(new Request('http://localhost:5173/api/auth/me'), ENV, NOW)
    expect(await anonymous.json()).toEqual({ authenticated: false })

    const logout = await handleAuthRequest(post('/api/auth/logout', {}), ENV, NOW)
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it('https에서는 Secure 쿠키를 발급한다', async () => {
    const res = await handleAuthRequest(
      post('/api/auth/login', { id: 'TESTUSER', password: 'test-only-password' }, 'https://example.com'),
      ENV,
      NOW,
    )
    expect(res.headers.get('set-cookie')).toContain('Secure')
  })

  it('회원가입은 501, 잘못된 메서드는 405, 형식 오류는 400', async () => {
    expect((await handleAuthRequest(post('/api/auth/signup', {}), ENV, NOW)).status).toBe(501)
    expect((await handleAuthRequest(new Request('http://localhost/api/auth/login'), ENV, NOW)).status).toBe(405)
    const bad = new Request('http://localhost/api/auth/login', { method: 'POST', body: 'id=x' })
    expect((await handleAuthRequest(bad, ENV, NOW)).status).toBe(400)
    expect((await handleAuthRequest(new Request('http://localhost/api/auth/unknown'), ENV, NOW)).status).toBe(404)
  })
})

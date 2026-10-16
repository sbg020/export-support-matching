/*
 * 인증 API 핸들러 (Web 표준 Request → Response).
 * Vercel 서버 함수(api/auth/[action].ts)와 Vite 개발 서버 미들웨어가 같은 코드를 쓴다.
 *
 *   POST /api/auth/login    { id, password } → 로그인, 세션 쿠키 발급
 *   POST /api/auth/logout   → 세션 쿠키 삭제
 *   GET  /api/auth/me       → { authenticated, user? }
 *   POST /api/auth/signup   → 501 (회원 정보를 저장할 서버 DB가 없음)
 */
import {
  createSessionToken,
  parseCookies,
  readAuthConfig,
  serializeClearedSessionCookie,
  serializeSessionCookie,
  SESSION_COOKIE_NAME,
  shouldUseSecureCookie,
  verifyCredentials,
  verifySessionToken,
  type AuthEnv,
} from './core.js'

export const AUTH_MESSAGES = {
  invalidCredentials: '아이디 또는 비밀번호가 올바르지 않습니다.',
  notConfigured: '로그인 설정이 되어 있지 않습니다.',
  signupUnavailable:
    '회원 정보를 저장할 서버가 아직 연결되지 않아 회원가입은 준비 중입니다. 데모 계정으로 로그인해 확인할 수 있습니다.',
  badRequest: '요청 형식이 올바르지 않습니다.',
  methodNotAllowed: '허용되지 않은 요청 방식입니다.',
  notFound: '찾을 수 없는 요청입니다.',
} as const

const MAX_BODY_BYTES = 4096
const MAX_FIELD_LENGTH = 200

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

function methodNotAllowed(allow: string): Response {
  return json(405, { message: AUTH_MESSAGES.methodNotAllowed }, { Allow: allow })
}

export function actionFromPath(pathname: string): string {
  const segments = pathname.replace(/\/+$/, '').split('/')
  return segments[segments.length - 1] ?? ''
}

async function readCredentials(request: Request): Promise<{ id: string; password: string } | null> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) return null
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) return null
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const { id, password } = data as Record<string, unknown>
  if (typeof id !== 'string' || typeof password !== 'string') return null
  if (id.length > MAX_FIELD_LENGTH || password.length > MAX_FIELD_LENGTH) return null
  return { id, password }
}

async function login(request: Request, env: AuthEnv, nowSeconds: number): Promise<Response> {
  const config = readAuthConfig(env)
  if (!config) return json(503, { message: AUTH_MESSAGES.notConfigured })

  const credentials = await readCredentials(request)
  if (!credentials) return json(400, { message: AUTH_MESSAGES.badRequest })

  if (!verifyCredentials(config, credentials.id, credentials.password)) {
    return json(401, { message: AUTH_MESSAGES.invalidCredentials })
  }

  const token = createSessionToken(config.loginId, config.secret, nowSeconds)
  return json(
    200,
    { authenticated: true, user: { id: config.loginId } },
    { 'Set-Cookie': serializeSessionCookie(token, { secure: shouldUseSecureCookie(request, env) }) },
  )
}

function logout(request: Request, env: AuthEnv): Response {
  return json(
    200,
    { authenticated: false },
    { 'Set-Cookie': serializeClearedSessionCookie({ secure: shouldUseSecureCookie(request, env) }) },
  )
}

function me(request: Request, env: AuthEnv, nowSeconds: number): Response {
  const config = readAuthConfig(env)
  if (!config) return json(200, { authenticated: false })
  const token = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE_NAME]
  const session = verifySessionToken(token, config, nowSeconds)
  if (!session) return json(200, { authenticated: false })
  return json(200, { authenticated: true, user: { id: session.sub } })
}

export async function handleAuthRequest(
  request: Request,
  env: AuthEnv,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<Response> {
  const action = actionFromPath(new URL(request.url).pathname)
  switch (action) {
    case 'login':
      return request.method === 'POST' ? login(request, env, nowSeconds) : methodNotAllowed('POST')
    case 'logout':
      return request.method === 'POST' ? logout(request, env) : methodNotAllowed('POST')
    case 'me':
      return request.method === 'GET' ? me(request, env, nowSeconds) : methodNotAllowed('GET')
    case 'signup':
      return request.method === 'POST'
        ? json(501, { message: AUTH_MESSAGES.signupUnavailable })
        : methodNotAllowed('POST')
    default:
      return json(404, { message: AUTH_MESSAGES.notFound })
  }
}

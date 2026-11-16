/*
 * 세션 쿠키로 로그인한 계정을 찾는다 (챗봇 등 로그인 전용 서버 함수에서 쓴다).
 */
import {
  findAccount,
  parseCookies,
  readAuthConfig,
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type AuthAccount,
  type AuthEnv,
} from './core.js'

export function currentAccount(
  request: Request,
  env: AuthEnv,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): AuthAccount | null {
  const config = readAuthConfig(env)
  if (!config) return null
  const token = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE_NAME]
  const session = verifySessionToken(token, config, nowSeconds)
  return session ? findAccount(config, session.sub) : null
}

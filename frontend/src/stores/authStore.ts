/*
 * 로그인 상태. 서버(/api/auth/me)가 확인한 결과만 로그인 상태로 인정한다.
 * 브라우저 저장소에 '로그인됨' 같은 표시를 저장하지 않는다. 세션은 HttpOnly 쿠키로만 유지된다.
 */
import { reactive, readonly } from 'vue'

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

export interface AuthUser {
  id: string
}

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  /** 로그인 상태 확인 자체가 실패했을 때의 안내 */
  errorMessage: string | null
}

export const AUTH_CHECK_FAILED_MESSAGE = '로그인 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'

const state = reactive<AuthState>({ status: 'unknown', user: null, errorMessage: null })
let checking: Promise<void> | null = null

function readUser(data: unknown): AuthUser | null {
  if (typeof data !== 'object' || data === null) return null
  const record = data as { authenticated?: unknown; user?: { id?: unknown } }
  if (record.authenticated !== true || typeof record.user?.id !== 'string') return null
  return { id: record.user.id }
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) throw new Error('JSON 응답이 아닙니다.')
  return response.json()
}

function setAnonymous(errorMessage: string | null = null) {
  state.status = 'anonymous'
  state.user = null
  state.errorMessage = errorMessage
}

async function checkSession(): Promise<void> {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`상태 확인 실패 (${response.status})`)
    const user = readUser(await readJson(response))
    if (user) {
      state.status = 'authenticated'
      state.user = user
      state.errorMessage = null
    } else {
      setAnonymous()
    }
  } catch {
    // 확인할 수 없으면 비로그인으로 처리하고 로그인 화면에 안내한다.
    setAnonymous(AUTH_CHECK_FAILED_MESSAGE)
  }
}

/** 앱 시작 시 한 번만 서버에 로그인 상태를 묻는다. */
function ensureChecked(): Promise<void> {
  if (!checking) checking = checkSession()
  return checking
}

export type LoginResult = { ok: true } | { ok: false; message: string }

async function login(id: string, password: string): Promise<LoginResult> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id, password }),
    })
    const data = await readJson(response).catch(() => null)
    const user = response.ok ? readUser(data) : null
    if (user) {
      state.status = 'authenticated'
      state.user = user
      state.errorMessage = null
      checking = Promise.resolve()
      return { ok: true }
    }
    const message =
      typeof data === 'object' && data !== null && typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    return { ok: false, message }
  } catch {
    return { ok: false, message: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' }
  }
}

/** 서버 쿠키를 지운다. 이 기기에 저장한 기업정보와 관리 기록은 지우지 않는다. */
async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } catch {
    // 서버에 닿지 않아도 화면 상태는 비로그인으로 바꾼다.
  }
  setAnonymous()
  checking = Promise.resolve()
}

export function useAuth() {
  return { state: readonly(state), ensureChecked, login, logout }
}

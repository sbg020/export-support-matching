/*
 * Vite 개발·미리보기 서버에서 /api/auth/* 를 Vercel 서버 함수와 같은 핸들러로 처리한다.
 * npm run dev / npm run preview 에서도 실제 서버 검증 로그인이 동작하게 하기 위한 것이다.
 *
 * 서버 전용 변수는 loadEnv(…, '')로 읽어 이 미들웨어에서만 쓴다. Vite는 VITE_ 접두사 변수만
 * 브라우저 번들에 넣으므로 DEMO_LOGIN_* · AUTH_SESSION_SECRET 는 번들에 포함되지 않는다.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadEnv, type Plugin, type ResolvedConfig } from 'vite'
import type { AuthEnv } from './auth/core.js'
import { handleAuthRequest } from './auth/handlers.js'

const API_PREFIX = '/api/auth/'

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function toHeaders(req: IncomingMessage): Headers {
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item))
    else headers.set(name, value)
  }
  return headers
}

async function writeResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, name) => {
    if (name.toLowerCase() !== 'set-cookie') res.setHeader(name, value)
  })
  const cookies = response.headers.getSetCookie()
  if (cookies.length > 0) res.setHeader('Set-Cookie', cookies)
  res.end(Buffer.from(await response.arrayBuffer()))
}

function createMiddleware(getEnv: () => AuthEnv) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const url = req.url ?? ''
    if (!url.startsWith(API_PREFIX)) {
      next()
      return
    }
    void (async () => {
      try {
        const method = req.method ?? 'GET'
        const body = method === 'GET' || method === 'HEAD' ? undefined : new Uint8Array(await readBody(req))
        const request = new Request(`http://${req.headers.host ?? 'localhost'}${url}`, {
          method,
          headers: toHeaders(req),
          body,
        })
        await writeResponse(res, await handleAuthRequest(request, getEnv()))
      } catch {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ message: '로그인 처리 중 오류가 발생했습니다.' }))
      }
    })()
  }
}

function loadServerEnv(config: ResolvedConfig): AuthEnv {
  if (config.envDir === false) return { ...process.env }
  return loadEnv(config.mode, config.envDir || config.root, '')
}

export function devAuthPlugin(): Plugin {
  let env: AuthEnv = {}
  return {
    name: 'esm-dev-auth',
    configResolved(config) {
      env = loadServerEnv(config)
    },
    configureServer(server) {
      server.middlewares.use(createMiddleware(() => env))
    },
    configurePreviewServer(server) {
      server.middlewares.use(createMiddleware(() => env))
    },
  }
}

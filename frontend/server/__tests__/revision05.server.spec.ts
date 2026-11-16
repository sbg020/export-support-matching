// @vitest-environment node
/*
 * REVISION_05 서버 함수: 공고 도우미 챗봇(§8)과 공개 API(§9).
 * Claude API는 호출하지 않는다 (callModel을 바꿔 끼운다). 게시 공고 스냅샷은 실제 파일을 읽는다.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createSessionToken, readAuthConfig, SESSION_COOKIE_NAME } from '../auth/core.js'
import {
  ASSISTANT_MESSAGES,
  handleAssistantRequest,
  resetAssistantUsageForTest,
  SYSTEM_PROMPT,
  type ModelReply,
  type ModelRequest,
} from '../assistant/handlers.js'
import { handlePublicApiRequest, resetPublicApiRateForTest, resolveRoute } from '../public/handlers.js'
import { loadSnapshot } from '../published/snapshot.js'
import { buildIndex, searchNotices, tokenize } from '../published/search.js'

/** 응답 JSON (테스트에서만 느슨한 타입으로 읽는다) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readJson = async (res: Response): Promise<any> => res.json()

/** 테스트 전용 값 (실제 계정·키가 아니다) */
const ENV = {
  TEST_LOGIN_ID: 'TEST',
  TEST_LOGIN_PASSWORD: 'test-account-only-password',
  AUTH_SESSION_SECRET: 'test-only-secret-test-only-secret-0123456789',
  ANTHROPIC_API_KEY: 'test-only-key',
  ASSISTANT_DAILY_LIMIT: '2',
  PUBLIC_API_KEYS: 'public-test-key-0123456789',
}
const NOW_MS = 1_800_000_000_000
const config = readAuthConfig(ENV)!
const cookie = `${SESSION_COOKIE_NAME}=${createSessionToken('TEST', config.secret, NOW_MS / 1000)}`

const PROFILE = { size: '소기업', hq: '경기 성남시', industry: ['제조업'], export_usd: 0, business_number: '123-45-67890' }

function chatRequest(body: unknown, withCookie = true): Request {
  return new Request('http://localhost/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(withCookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  })
}

function reply(text: string, stopReason = 'end_turn'): ModelReply {
  return { stopReason, text, model: 'claude-sonnet-5-5', inputTokens: 100, outputTokens: 50 }
}

describe('게시 공고 검색 (TF-IDF)', () => {
  it('한국어는 2글자 단위로 나눈다', () => {
    expect(tokenize('물류바우처 HS 847130')).toEqual(['물류', '류바', '바우', '우처', 'hs', '847130'])
  })

  it('질문과 관련된 게시 공고를 최대 5개 찾는다', () => {
    const snapshot = loadSnapshot()
    const hits = searchNotices(buildIndex(snapshot.notices), '물류바우처 국제운송', 5)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.length).toBeLessThanOrEqual(5)
    const top = snapshot.notices.find((n) => n.id === hits[0]!.id)
    expect(top?.title ?? '').toMatch(/물류/)
  })
})

describe('공고 도우미 챗봇', () => {
  beforeEach(() => resetAssistantUsageForTest())

  it('키가 없으면 준비 중 (503), 상태는 configured=false', async () => {
    const env = { ...ENV, ANTHROPIC_API_KEY: '' }
    const res = await handleAssistantRequest(chatRequest({ question: '전시회', profile: PROFILE }), env, { nowMs: NOW_MS })
    expect(res.status).toBe(503)
    const status = await handleAssistantRequest(new Request('http://localhost/api/assistant/status'), env, { nowMs: NOW_MS })
    expect(await readJson(status)).toMatchObject({ configured: false, authenticated: false })
  })

  it('로그인하지 않으면 401', async () => {
    const res = await handleAssistantRequest(chatRequest({ question: '전시회', profile: PROFILE }, false), ENV, { nowMs: NOW_MS })
    expect(res.status).toBe(401)
    expect((await readJson(res)).message).toBe(ASSISTANT_MESSAGES.loginRequired)
  })

  it('사이트 데이터만 보내고, 답변의 탭·근거는 서버 판정 값으로 채운다', async () => {
    const seen: ModelRequest[] = []
    const callModel = async (req: ModelRequest) => {
      seen.push(req)
      const data = JSON.parse(req.user.slice(req.user.indexOf('{'), req.user.lastIndexOf('}') + 1)) as {
        notices: { program_id: string; 조건: { cond_id: string }[] }[]
      }
      const first = data.notices[0]!
      return reply(
        JSON.stringify({
          summary: '요약입니다.',
          related: [
            { program_id: first.program_id, cond_ids: first.조건.slice(0, 1).map((c) => c.cond_id), note: '설명' },
            { program_id: 'NOT-A-NOTICE', cond_ids: [], note: '지어낸 공고' },
          ],
          checks: ['확인할 것'],
          next_step: '다음 할 일',
        }),
      )
    }
    const res = await handleAssistantRequest(chatRequest({ question: '물류바우처 국제운송 지원', profile: PROFILE }), ENV, {
      nowMs: NOW_MS,
      callModel,
      log: () => {},
    })
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(seen).toHaveLength(1)
    expect(seen[0]!.system).toBe(SYSTEM_PROMPT)
    expect(seen[0]!.user).not.toContain('123-45-67890')
    expect(body.answer.related).toHaveLength(1) // 전달하지 않은 공고는 버린다
    expect(['신청 가능', '확인 필요', '신청 불가', '-']).toContain(body.answer.related[0].tabLabel)
    expect(body.answer.related[0].link).toMatch(/^\/programs\//)
    expect(body.meta).toMatchObject({ model: 'claude-sonnet-5-5', retrieval: 'tfidf', remaining: 1 })
    expect(body.meta.promptVersion).toMatch(/^assistant-prompt-v1/)
  })

  it('형식이 맞지 않으면 한 번 다시 요청하고, 그래도 실패하면 오류', async () => {
    let calls = 0
    const callModel = async () => {
      calls += 1
      return reply('형식이 아닌 답')
    }
    const res = await handleAssistantRequest(chatRequest({ question: '전시회 참가', profile: PROFILE }), ENV, {
      nowMs: NOW_MS,
      callModel,
      log: () => {},
    })
    expect(calls).toBe(2)
    expect(res.status).toBe(502)
  })

  it('거절(refusal)이면 안내 문구, 하루 호출 수를 넘으면 429', async () => {
    const callModel = async () => reply('', 'refusal')
    const opts = { nowMs: NOW_MS, callModel, log: () => {} }
    const first = await handleAssistantRequest(chatRequest({ question: '전시회', profile: PROFILE }), ENV, opts)
    expect(first.status).toBe(422)
    await handleAssistantRequest(chatRequest({ question: '전시회', profile: PROFILE }), ENV, opts)
    const third = await handleAssistantRequest(chatRequest({ question: '전시회', profile: PROFILE }), ENV, opts)
    expect(third.status).toBe(429)
    expect((await readJson(third)).message).toBe(ASSISTANT_MESSAGES.limitReached)
  })
})

describe('공개 API', () => {
  beforeEach(() => resetPublicApiRateForTest())
  const get = (path: string, key?: string) =>
    new Request(`http://localhost${path}`, { headers: key ? { 'X-API-Key': key } : {} })

  it('주소와 rewrite 쿼리 둘 다 같은 경로로 읽는다', () => {
    expect(resolveRoute(new URL('http://x/api/public/v1/notices/P001'))).toEqual({ name: 'notice', id: 'P001' })
    expect(resolveRoute(new URL('http://x/api/public?route=notice&id=P001'))).toEqual({ name: 'notice', id: 'P001' })
    expect(resolveRoute(new URL('http://x/api/public/v1/eligibility/check'))).toEqual({ name: 'check' })
  })

  it('키가 없거나 틀리면 401, 문서는 키 없이 열린다', async () => {
    expect((await handlePublicApiRequest(get('/api/public/v1/notices'), ENV)).status).toBe(401)
    expect((await handlePublicApiRequest(get('/api/public/v1/notices', 'wrong-key-0123456789'), ENV)).status).toBe(401)
    expect((await handlePublicApiRequest(get('/api/public/openapi.json'), ENV)).status).toBe(200)
    const docs = await handlePublicApiRequest(get('/api/public/docs'), ENV)
    expect(docs.status).toBe(200)
    expect(await docs.text()).toContain('swagger-ui')
  })

  it('목록·상세에 source·source_url이 있고 사용자 정보는 없다', async () => {
    const list = await handlePublicApiRequest(get('/api/public/v1/notices?page_size=5', ENV.PUBLIC_API_KEYS), ENV)
    expect(list.status).toBe(200)
    const body = await readJson(list)
    expect(body.items).toHaveLength(5)
    expect(body.items[0]).toHaveProperty('source')
    expect(body.items[0]).toHaveProperty('source_url')
    const detail = await handlePublicApiRequest(get(`/api/public/v1/notices/${body.items[0].id}`, ENV.PUBLIC_API_KEYS), ENV)
    const d = await readJson(detail)
    expect(d.notice.conditions.length).toBeGreaterThan(0)
    expect(d.notice.conditions[0]).toHaveProperty('evidence')
    expect(JSON.stringify(d)).not.toMatch(/business_number|profile/)
    expect((await handlePublicApiRequest(get('/api/public/v1/notices/NOPE', ENV.PUBLIC_API_KEYS), ENV)).status).toBe(404)
  })

  it('자격 확인은 공고별 3탭과 확인할 조건을 돌려주고 프로필을 저장하지 않는다', async () => {
    const res = await handlePublicApiRequest(
      new Request('http://localhost/api/public/v1/eligibility/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': ENV.PUBLIC_API_KEYS },
        body: JSON.stringify({ profile: PROFILE }),
      }),
      ENV,
    )
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.meta.profile_stored).toBe(false)
    const total = body.meta.counts.eligible + body.meta.counts['needs-check'] + body.meta.counts.ineligible
    expect(total).toBe(body.results.length)
    // 자격 조건이 없는 공고까지 모든 게시 공고가 3탭 중 하나 (조건 없음 → 확인 필요)
    expect(body.results.length).toBe(loadSnapshot().notices.length)
    for (const r of body.results.filter((x: { no_conditions: boolean }) => x.no_conditions)) expect(r.tab).toBe('needs-check')
    expect(['eligible', 'needs-check', 'ineligible']).toContain(body.results[0].tab)
  })
})

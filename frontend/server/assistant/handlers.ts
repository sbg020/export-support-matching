/// <reference types="node" />
/*
 * 공고 도우미 챗봇 (REVISION_05 §8). Web 표준 Request → Response.
 * Vercel 서버 함수(api/assistant/[action].ts)와 Vite 개발 서버 미들웨어가 같은 코드를 쓴다.
 *
 *   GET  /api/assistant/status → { configured, authenticated, dailyLimit, remaining }
 *   POST /api/assistant/chat   { question, profile, answers?, fit? } → { answer, meta }
 *
 * 1. 질문과 관련된 게시 공고를 TF-IDF로 최대 5개 찾는다 (server/published/search.ts).
 * 2. 그 공고에 대해 판정 엔진(classifyTabs)으로 이 기업의 3탭 분류·확인할 조건·근거 문장·쪽·제출 서류를 모은다.
 *    적합도는 브라우저가 계산한 값(fit)을 '신청 가능' 공고에만 붙인다.
 * 3. 1과 2만 Claude API에 보낸다. 기업 정보는 판정에 쓰는 항목만 (사업자등록번호·대표자명·연락처 없음).
 * 답변 JSON의 공고명·탭·적합도·근거 문장·쪽은 서버가 2의 값으로 다시 채운다 (모델이 바꿔 쓰지 못한다).
 *
 * 환경변수 (서버 전용): ANTHROPIC_API_KEY, ASSISTANT_MODEL(기본 claude-sonnet-5-5), ASSISTANT_DAILY_LIMIT(기본 20)
 * 대화 내용은 저장하지 않는다. 호출 수 집계용 기록(사용자, 시각, 토큰 수, 모델, 프롬프트 버전)만 서버 로그에 남긴다.
 * 하루 호출 수는 서버 메모리로 센다. 서버 DB가 없어 인스턴스가 바뀌면 다시 센다 (docs/revisions/revision_05_inventory.md).
 */
import Anthropic from '@anthropic-ai/sdk'
import type { AuthEnv } from '../auth/core.js'
import { currentAccount } from '../auth/session.js'
import { classifyTabs, type ConditionAnswer, type EngineProfile, type TabKey } from '../../src/lib/engine/eligibilityV3.js'
import { loadSnapshot, CATEGORY_NAMES, type PublishedNotice, type PublishedSnapshot } from '../published/snapshot.js'
import { buildIndex, searchNotices, type SearchIndex } from '../published/search.js'
import { sanitizeAnswers, sanitizeEngineProfile } from '../published/engineInput.js'

export const ASSISTANT_PROMPT_VERSION = 'assistant-prompt-v1 (2026-11-16)'
export const DEFAULT_ASSISTANT_MODEL = 'claude-sonnet-5-5'
export const DEFAULT_DAILY_LIMIT = 20
const MAX_NOTICES = 5
const MAX_QUESTION = 500
const MAX_BODY_BYTES = 64 * 1024
const MAX_CONDITIONS_PER_NOTICE = 12

export const ASSISTANT_MESSAGES = {
  notConfigured: '공고 도우미는 준비 중입니다.',
  loginRequired: '로그인한 뒤 사용할 수 있습니다.',
  limitReached: '오늘 질문할 수 있는 횟수를 모두 썼습니다. 내일 다시 이용해 주세요.',
  badRequest: '질문을 1자 이상 500자 이하로 입력해 주세요.',
  badProfile: '기업 정보를 읽을 수 없습니다. 기업 프로필을 확인해 주세요.',
  refusal: '이 질문에는 답변할 수 없습니다. 등록된 공고와 신청 준비에 관한 질문을 해 주세요.',
  failed: '답변을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  snapshotMissing: '게시 공고 데이터를 읽지 못했습니다.',
  methodNotAllowed: '허용되지 않은 요청 방식입니다.',
  notFound: '찾을 수 없는 요청입니다.',
} as const

const TAB_LABEL: Record<TabKey, string> = { eligible: '신청 가능', 'needs-check': '확인 필요', ineligible: '신청 불가' }
const STATE_LABEL = { met: '충족', unmet: '미충족', unknown: '모름' } as const
const RECEPTION_LABEL: Record<string, string> = { open: '접수중', upcoming: '접수 예정', closed: '마감' }

/* ───────── 응답 형식 ───────── */

export const ANSWER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'related', 'checks', 'next_step'],
  properties: {
    summary: { type: 'string', description: '요약 2~3문장' },
    related: {
      type: 'array',
      description: '답변에 쓴 공고 (전달된 notices 중에서만)',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['program_id', 'cond_ids', 'note'],
        properties: {
          program_id: { type: 'string', description: '전달된 공고의 program_id' },
          cond_ids: { type: 'array', items: { type: 'string' }, description: '근거로 쓴 조건의 cond_id (전달된 것만)' },
          note: { type: 'string', description: '이 공고에 대한 한두 문장 설명' },
        },
      },
    },
    checks: { type: 'array', items: { type: 'string' }, description: '확인 필요 항목' },
    next_step: { type: 'string', description: '다음 할 일 한두 문장' },
  },
} as const

interface ModelAnswer {
  summary: string
  related: { program_id: string; cond_ids: string[]; note: string }[]
  checks: string[]
  next_step: string
}

export interface AssistantRelated {
  programId: string
  title: string | null
  tab: TabKey | null
  tabLabel: string
  fit: number | null
  note: string
  evidence: { condId: string; text: string; page: number | null }[]
  link: string
}

export interface AssistantAnswer {
  summary: string
  related: AssistantRelated[]
  checks: string[]
  nextStep: string
}

function parseModelAnswer(text: string): ModelAnswer | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const d = data as Record<string, unknown>
  if (typeof d.summary !== 'string' || typeof d.next_step !== 'string') return null
  if (!Array.isArray(d.related) || !Array.isArray(d.checks)) return null
  const related: ModelAnswer['related'] = []
  for (const r of d.related) {
    if (typeof r !== 'object' || r === null) return null
    const item = r as Record<string, unknown>
    if (typeof item.program_id !== 'string' || typeof item.note !== 'string' || !Array.isArray(item.cond_ids)) return null
    related.push({ program_id: item.program_id, note: item.note, cond_ids: item.cond_ids.filter((c): c is string => typeof c === 'string') })
  }
  return {
    summary: d.summary,
    related,
    checks: d.checks.filter((c): c is string => typeof c === 'string'),
    next_step: d.next_step,
  }
}

/* ───────── 모델 호출 (테스트에서 바꿔 끼울 수 있다) ───────── */

export interface ModelRequest {
  apiKey: string
  model: string
  system: string
  user: string
}

export interface ModelReply {
  stopReason: string | null
  text: string
  model: string
  inputTokens: number | null
  outputTokens: number | null
}

export type ModelCaller = (req: ModelRequest) => Promise<ModelReply>

export const callClaude: ModelCaller = async (req) => {
  const client = new Anthropic({ apiKey: req.apiKey, maxRetries: 1, timeout: 50_000 })
  const response = await client.beta.messages.create({
    model: req.model,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: req.system,
    messages: [{ role: 'user', content: req.user }],
    output_config: { format: { type: 'json_schema', schema: ANSWER_SCHEMA as unknown as Record<string, unknown> } },
  })
  const text = response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('')
  return {
    stopReason: response.stop_reason,
    text,
    model: response.model,
    inputTokens: response.usage.input_tokens ?? null,
    outputTokens: response.usage.output_tokens ?? null,
  }
}

/* ───────── 하루 호출 수 ───────── */

const usage = new Map<string, number>()

/** 한국 시간 기준 날짜 (호출 수 집계용. 공고 기준일과는 관계없다) */
function kstDay(nowMs: number): string {
  return new Date(nowMs + 9 * 3600_000).toISOString().slice(0, 10)
}

export function dailyLimit(env: AuthEnv): number {
  const n = Number.parseInt(env.ASSISTANT_DAILY_LIMIT ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT
}

function usedToday(userId: string, nowMs: number): number {
  return usage.get(`${kstDay(nowMs)}|${userId}`) ?? 0
}

function countCall(userId: string, nowMs: number): void {
  const key = `${kstDay(nowMs)}|${userId}`
  if (usage.size > 5000) usage.clear()
  usage.set(key, (usage.get(key) ?? 0) + 1)
}

export function resetAssistantUsageForTest(): void {
  usage.clear()
}

/* ───────── 문맥 만들기 ───────── */

let indexCache: { snapshot: PublishedSnapshot; index: SearchIndex } | null = null
function searchIndex(snapshot: PublishedSnapshot): SearchIndex {
  if (indexCache?.snapshot !== snapshot) indexCache = { snapshot, index: buildIndex(snapshot.notices) }
  return indexCache.index
}

interface NoticeContext {
  notice: PublishedNotice
  tab: TabKey | null
  fit: number | null
  /** 자격 조건이 없는 공고 */
  noConditions?: boolean
  conditions: { condId: string; kind: string; type: string; state: string; importance: string; evidence: string | null; page: number | null }[]
}

function period(n: PublishedNotice): string | null {
  if (n.applyStart || n.applyEnd) return `${n.applyStart ?? '-'} ~ ${n.applyEnd ?? '-'}${n.applyPeriodNote ? ` (${n.applyPeriodNote})` : ''}`
  return n.applyPeriodNote
}

function buildNoticeContext(
  notice: PublishedNotice,
  profile: EngineProfile,
  answers: Record<string, ConditionAnswer>,
  fit: number | null,
  typeNames: Map<string, string>,
): NoticeContext {
  // 자격 조건을 찾지 못한 공고는 '확인 필요' (원문 확인, 화면과 같은 규칙)
  if (notice.conditions.length === 0) return { notice, tab: 'needs-check', fit: null, conditions: [], noConditions: true }
  const result = classifyTabs(notice.conditions, profile, notice.id, notice.parentId, answers)
  const priority = new Set([...result.fails, ...result.majorUnknown, ...result.checklist])
  const ordered = [...result.outcomes].sort(
    (a, b) => Number(priority.has(b.condition.condId)) - Number(priority.has(a.condition.condId)),
  )
  return {
    notice,
    tab: result.tab,
    fit: result.tab === 'eligible' ? fit : null,
    conditions: ordered.slice(0, MAX_CONDITIONS_PER_NOTICE).map((o) => ({
      condId: o.condition.condId,
      kind: o.condition.kind,
      type: typeNames.get(o.condition.condType) ?? o.condition.condType,
      state: STATE_LABEL[o.state],
      importance: o.importance,
      evidence: o.condition.evidence,
      page: o.condition.page,
    })),
  }
}

function companyContext(p: EngineProfile): Record<string, unknown> {
  return {
    기업규모: p.size,
    본사지역: p.hq,
    업종: p.industry,
    HS코드: p.product_hs,
    최근1년수출액_USD: p.export_usd,
    최근매출액_KRW: p.revenue_krw,
    업력_년: p.age,
    종업원수: p.employees,
    인증: p.certs,
  }
}

function noticePayload(c: NoticeContext): Record<string, unknown> {
  const n = c.notice
  return {
    program_id: n.id,
    공고명: n.title,
    주관: [n.ministry, n.agency].filter(Boolean).join(' / ') || null,
    접수상태: n.receptionStatus ? RECEPTION_LABEL[n.receptionStatus] ?? null : null,
    접수기간: period(n),
    사업분류: (n.supportCategories ?? []).map((code) => CATEGORY_NAMES[code] ?? code),
    지원규모: n.amountNote,
    판정_탭: c.tab ? TAB_LABEL[c.tab] : '-',
    ...(c.noConditions ? { 자격조건: '자동 추출에서 자격 조건을 찾지 못함. 공고 원문에서 확인 필요' } : {}),
    적합도: c.fit,
    조건: c.conditions.map((x) => ({
      cond_id: x.condId,
      구분: x.kind,
      유형: x.type,
      상태: x.state,
      중요도: x.importance,
      근거문장: x.evidence,
      쪽: x.page,
    })),
    제출서류: (n.requiredDocs ?? []).slice(0, 10).map((d) => d.name),
  }
}

export const SYSTEM_PROMPT = `당신은 수출지원사업 매칭 사이트 'Export Compass'의 공고 도우미입니다.
사용자는 중소·중견기업 담당자이며, 사이트에 게시된 수출지원사업 공고에 대해 묻습니다.

규칙:
- 답변에는 user 메시지의 <site_data> 안에 있는 값만 사용합니다. 일반 지식이나 다른 사업 정보로 보충하지 않습니다.
- 신청 자격(판정_탭)과 적합도는 전달된 값을 그대로 씁니다. 다르게 추측하거나 새로 판정하지 않습니다. 적합도가 null이면 점수를 말하지 않습니다.
- 전달된 데이터에 없는 내용은 "등록된 공고에서 확인할 수 없습니다"라고 답합니다.
- 지원 금액, 날짜, 선정 가능성을 지어내지 않습니다. 금액·기간은 전달된 문구를 그대로 옮길 때만 씁니다.
- related에는 답변에 실제로 쓴 공고만 넣고, program_id와 cond_id는 전달된 값만 씁니다.
- checks에는 '확인 필요' 또는 '모름' 상태 조건 가운데 사용자가 확인해야 할 것을 쉬운 말로 적습니다.
- 한국어 존댓말로, 쉬운 말로 씁니다. summary는 2~3문장입니다.`

function userMessage(question: string, profile: EngineProfile, contexts: NoticeContext[], mode: string, asOf: string): string {
  const data = {
    데이터_기준일: asOf,
    공고_찾은_방법: mode === 'tfidf' ? '질문과 관련된 게시 공고 (TF-IDF)' : '질문과 맞는 공고가 없어 이 기업의 신청 가능 공고를 적합도 순으로',
    기업: companyContext(profile),
    notices: contexts.map(noticePayload),
  }
  return `<site_data>\n${JSON.stringify(data)}\n</site_data>\n\n<question>\n${question}\n</question>`
}

function toAnswer(model: ModelAnswer, contexts: NoticeContext[]): AssistantAnswer {
  const byId = new Map(contexts.map((c) => [c.notice.id, c]))
  const seen = new Set<string>()
  const related: AssistantRelated[] = []
  for (const r of model.related) {
    const c = byId.get(r.program_id)
    if (!c || seen.has(r.program_id)) continue
    seen.add(r.program_id)
    const conds = new Map(c.conditions.map((x) => [x.condId, x]))
    related.push({
      programId: c.notice.id,
      title: c.notice.title,
      tab: c.tab,
      tabLabel: c.tab ? TAB_LABEL[c.tab] : '-',
      fit: c.fit,
      note: r.note,
      evidence: r.cond_ids
        .map((id) => conds.get(id))
        .filter((x): x is NonNullable<typeof x> => Boolean(x && x.evidence))
        .slice(0, 4)
        .map((x) => ({ condId: x.condId, text: x.evidence ?? '', page: x.page })),
      link: `/programs/${encodeURIComponent(c.notice.id)}`,
    })
  }
  return { summary: model.summary, related, checks: model.checks.slice(0, 8), nextStep: model.next_step }
}

/* ───────── 핸들러 ───────── */

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

export interface AssistantDeps {
  callModel?: ModelCaller
  nowMs?: number
  log?: (entry: Record<string, unknown>) => void
}

const defaultLog = (entry: Record<string, unknown>) => console.info(JSON.stringify(entry))

function status(request: Request, env: AuthEnv, nowMs: number): Response {
  const configured = (env.ANTHROPIC_API_KEY ?? '').trim() !== ''
  const account = currentAccount(request, env, Math.floor(nowMs / 1000))
  const limit = dailyLimit(env)
  return json(200, {
    configured,
    authenticated: account !== null,
    dailyLimit: limit,
    remaining: account ? Math.max(0, limit - usedToday(account.loginId, nowMs)) : null,
  })
}

async function readBody(request: Request): Promise<unknown> {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) return null
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function chat(request: Request, env: AuthEnv, deps: AssistantDeps): Promise<Response> {
  const nowMs = deps.nowMs ?? Date.now()
  const apiKey = (env.ANTHROPIC_API_KEY ?? '').trim()
  if (apiKey === '') return json(503, { message: ASSISTANT_MESSAGES.notConfigured })
  const account = currentAccount(request, env, Math.floor(nowMs / 1000))
  if (!account) return json(401, { message: ASSISTANT_MESSAGES.loginRequired })
  const limit = dailyLimit(env)
  if (usedToday(account.loginId, nowMs) >= limit) {
    return json(429, { message: ASSISTANT_MESSAGES.limitReached, remaining: 0 })
  }

  const body = (await readBody(request)) as Record<string, unknown> | null
  const question = typeof body?.question === 'string' ? body.question.trim() : ''
  if (!body || question === '' || question.length > MAX_QUESTION) return json(400, { message: ASSISTANT_MESSAGES.badRequest })
  const profile = sanitizeEngineProfile(body.profile)
  if (!profile) return json(400, { message: ASSISTANT_MESSAGES.badProfile })
  const answersRaw = (typeof body.answers === 'object' && body.answers !== null ? body.answers : {}) as Record<string, unknown>
  const fitRaw = (typeof body.fit === 'object' && body.fit !== null ? body.fit : {}) as Record<string, unknown>
  const fitOf = (id: string): number | null => {
    const v = fitRaw[id]
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? Math.round(v) : null
  }

  let snapshot: PublishedSnapshot
  try {
    snapshot = loadSnapshot()
  } catch {
    return json(503, { message: ASSISTANT_MESSAGES.snapshotMissing })
  }
  const typeNames = new Map(snapshot.conditionTypes.map((t) => [t.code, t.name]))
  const byId = new Map(snapshot.notices.map((n) => [n.id, n]))
  const ctx = (n: PublishedNotice) => buildNoticeContext(n, profile, sanitizeAnswers(answersRaw[n.id]), fitOf(n.id), typeNames)

  let mode: 'tfidf' | 'fit' = 'tfidf'
  let contexts = searchNotices(searchIndex(snapshot), question, MAX_NOTICES)
    .map((hit) => byId.get(hit.id))
    .filter((n): n is PublishedNotice => Boolean(n))
    .map(ctx)
  if (contexts.length === 0) {
    mode = 'fit'
    contexts = snapshot.notices
      .filter((n) => n.receptionStatus !== 'closed')
      .map(ctx)
      .filter((c) => c.tab === 'eligible')
      .sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1))
      .slice(0, MAX_NOTICES)
  }

  const model = (env.ASSISTANT_MODEL ?? '').trim() || DEFAULT_ASSISTANT_MODEL
  const call = deps.callModel ?? callClaude
  const log = deps.log ?? defaultLog
  const req: ModelRequest = { apiKey, model, system: SYSTEM_PROMPT, user: userMessage(question, profile, contexts, mode, snapshot.meta.asOf) }

  countCall(account.loginId, nowMs)
  let parsed: ModelAnswer | null = null
  let lastReply: ModelReply | null = null
  for (let attempt = 1; attempt <= 2 && !parsed; attempt += 1) {
    let reply: ModelReply
    try {
      reply = await call(req)
    } catch (error) {
      const statusCode = error instanceof Anthropic.APIError ? error.status : null
      log({ event: 'assistant_call', user: account.loginId, at: new Date(nowMs).toISOString(), model, promptVersion: ASSISTANT_PROMPT_VERSION, error: statusCode ?? 'network' })
      return json(502, { message: ASSISTANT_MESSAGES.failed })
    }
    lastReply = reply
    log({
      event: 'assistant_call',
      user: account.loginId,
      at: new Date(nowMs).toISOString(),
      model: reply.model,
      promptVersion: ASSISTANT_PROMPT_VERSION,
      inputTokens: reply.inputTokens,
      outputTokens: reply.outputTokens,
      attempt,
    })
    if (reply.stopReason === 'refusal') return json(422, { message: ASSISTANT_MESSAGES.refusal })
    parsed = parseModelAnswer(reply.text)
  }
  if (!parsed || !lastReply) return json(502, { message: ASSISTANT_MESSAGES.failed })

  return json(200, {
    answer: toAnswer(parsed, contexts),
    meta: {
      model: lastReply.model,
      promptVersion: ASSISTANT_PROMPT_VERSION,
      dataVersion: snapshot.meta.dataVersion,
      asOf: snapshot.meta.asOf,
      retrieval: mode,
      noticeCount: contexts.length,
      remaining: Math.max(0, limit - usedToday(account.loginId, nowMs)),
    },
  })
}

export async function handleAssistantRequest(request: Request, env: AuthEnv, deps: AssistantDeps = {}): Promise<Response> {
  const action = new URL(request.url).pathname.replace(/\/+$/, '').split('/').pop() ?? ''
  if (action === 'status') {
    return request.method === 'GET'
      ? status(request, env, deps.nowMs ?? Date.now())
      : json(405, { message: ASSISTANT_MESSAGES.methodNotAllowed }, { Allow: 'GET' })
  }
  if (action === 'chat') {
    return request.method === 'POST'
      ? chat(request, env, deps)
      : json(405, { message: ASSISTANT_MESSAGES.methodNotAllowed }, { Allow: 'POST' })
  }
  return json(404, { message: ASSISTANT_MESSAGES.notFound })
}

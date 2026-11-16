/// <reference types="node" />
/*
 * 공개 API (REVISION_05 §9). 읽기 전용. Web 표준 Request → Response.
 *
 *   GET  /api/public/v1/notices                 게시 공고 목록 (category, region, status, source, page, page_size)
 *   GET  /api/public/v1/notices/{id}            공고 상세 (자격 조건 판정식·근거 문장·쪽, source_url 포함)
 *   POST /api/public/v1/eligibility/check       프로필 JSON → 공고별 3탭 분류와 확인할 조건 (프로필은 저장하지 않음)
 *   GET  /api/public/openapi.json               OpenAPI 3.1 문서 (키 없이 열람)
 *   GET  /api/public/docs                       Swagger UI (키 없이 열람)
 *
 * 인증: X-API-Key 헤더. 키는 서버 환경변수 PUBLIC_API_KEYS(쉼표로 여러 개)에서 읽는다.
 * 제한: 키별 분당 호출 수 PUBLIC_API_RATE_PER_MINUTE(기본 60). 서버 메모리로 세므로 인스턴스별 근사 제한이다.
 * 응답에 사용자 계정·기업 프로필·지원 이력은 넣지 않는다.
 *
 * 배포(Vercel)에서는 vercel.json rewrites가 /api/public/... 를 /api/public?route=... 로 바꿔 이 핸들러 하나로 보낸다.
 */
import { createHash, timingSafeEqual } from 'node:crypto'
import type { AuthEnv } from '../auth/core.js'
import { classifyTabs, type TabKey } from '../../src/lib/engine/eligibilityV3.js'
import { CATEGORY_NAMES, loadSnapshot, type PublishedNotice, type PublishedSnapshot } from '../published/snapshot.js'
import { sanitizeAnswers, sanitizeEngineProfile } from '../published/engineInput.js'
import { OPENAPI_DOCUMENT, swaggerHtml } from './openapi.js'

export const PUBLIC_API_VERSION = 'v1'
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const MAX_BODY_BYTES = 64 * 1024
const TAB_LABEL: Record<TabKey, string> = { eligible: '신청 가능', 'needs-check': '확인 필요', ineligible: '신청 불가' }

export const PUBLIC_API_MESSAGES = {
  unauthorized: 'X-API-Key 헤더에 발급받은 키를 넣어 주세요.',
  rateLimited: '호출 횟수 제한을 넘었습니다. 1분 뒤 다시 시도해 주세요.',
  notFound: '찾을 수 없는 요청입니다.',
  noticeNotFound: '해당 공고를 찾을 수 없습니다.',
  methodNotAllowed: '허용되지 않은 요청 방식입니다.',
  badRequest: '요청 본문은 { "profile": { … } } 형식의 JSON이어야 합니다.',
  snapshotMissing: '게시 공고 데이터를 읽지 못했습니다.',
} as const

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      ...headers,
    },
  })
}

/* ───────── 인증·제한 ───────── */

function digest(v: string): Buffer {
  return createHash('sha256').update(v).digest()
}

export function configuredKeys(env: AuthEnv): string[] {
  return (env.PUBLIC_API_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length >= 16)
}

function matchKey(env: AuthEnv, given: string | null): string | null {
  if (!given) return null
  const g = digest(given)
  for (const key of configuredKeys(env)) if (timingSafeEqual(digest(key), g)) return key
  return null
}

const calls = new Map<string, { minute: number; count: number }>()
function rateLimited(key: string, env: AuthEnv, nowMs: number): boolean {
  const limit = Number.parseInt(env.PUBLIC_API_RATE_PER_MINUTE ?? '', 10)
  const max = Number.isFinite(limit) && limit > 0 ? limit : 60
  const id = digest(key).toString('hex').slice(0, 16)
  const minute = Math.floor(nowMs / 60_000)
  const entry = calls.get(id)
  if (!entry || entry.minute !== minute) {
    calls.set(id, { minute, count: 1 })
    return false
  }
  entry.count += 1
  return entry.count > max
}

export function resetPublicApiRateForTest(): void {
  calls.clear()
}

/* ───────── 응답 모양 ───────── */

function noticeSummary(n: PublishedNotice): Record<string, unknown> {
  return {
    id: n.id,
    parent_id: n.parentId,
    title: n.title,
    ministry: n.ministry,
    agency: n.agency,
    reception_status: n.receptionStatus,
    reception_status_as_of: n.receptionStatusAsOf,
    apply_start: n.applyStart,
    apply_end: n.applyEnd,
    apply_period_note: n.applyPeriodNote,
    regions: n.regions,
    support_categories: (n.supportCategories ?? []).map((code) => ({ code, name: CATEGORY_NAMES[code] ?? null })),
    support_types: n.supportTypes,
    max_amount_krw: n.maxAmountKrw,
    amount_note: n.amountNote,
    source: n.publishSource,
    source_label: n.publishSourceLabel,
    source_url: n.sourceUrl,
    source_file: n.sourceFile,
    source_published_at: n.sourcePublishedAt,
    auto_extracted: n.autoExtracted,
  }
}

function noticeDetail(n: PublishedNotice, typeNames: Map<string, string>): Record<string, unknown> {
  return {
    ...noticeSummary(n),
    source_title: n.sourceTitle,
    summary_easy: n.summaryEasy,
    target_description: n.targetDescription,
    required_docs: (n.requiredDocs ?? []).map((d) => ({ id: d.id, name: d.name, requirement: d.requirement ?? null, note: d.note ?? null })),
    conditions: n.conditions.map((c) => ({
      cond_id: c.condId,
      program_id: c.programId,
      kind: c.kind,
      group: c.group,
      cond_type: c.condType,
      cond_type_name: typeNames.get(c.condType) ?? null,
      affects_verdict: c.affectsVerdict,
      importance: c.importance,
      expr: c.expr,
      expr_text: c.exprText,
      evidence: c.evidence,
      page: c.page,
      certainty: c.certainty,
    })),
  }
}

function meta(snapshot: PublishedSnapshot): Record<string, unknown> {
  return { api_version: PUBLIC_API_VERSION, data_version: snapshot.meta.dataVersion, as_of: snapshot.meta.asOf }
}

/* ───────── 라우팅 ───────── */

type Route =
  | { name: 'notices' }
  | { name: 'notice'; id: string }
  | { name: 'check' }
  | { name: 'openapi' }
  | { name: 'docs' }
  | null

export function resolveRoute(url: URL): Route {
  const r = url.searchParams.get('route')
  if (r === 'notices') return { name: 'notices' }
  if (r === 'notice') {
    const id = url.searchParams.get('id')
    return id ? { name: 'notice', id } : null
  }
  if (r === 'check') return { name: 'check' }
  if (r === 'openapi') return { name: 'openapi' }
  if (r === 'docs') return { name: 'docs' }
  const path = url.pathname.replace(/\/+$/, '')
  if (path === '/api/public/v1/notices') return { name: 'notices' }
  const m = /^\/api\/public\/v1\/notices\/([^/]+)$/.exec(path)
  if (m?.[1]) return { name: 'notice', id: decodeURIComponent(m[1]) }
  if (path === '/api/public/v1/eligibility/check') return { name: 'check' }
  if (path === '/api/public/openapi.json') return { name: 'openapi' }
  if (path === '/api/public/docs') return { name: 'docs' }
  return null
}

function listNotices(url: URL, snapshot: PublishedSnapshot): Response {
  const q = url.searchParams
  const category = q.get('category')
  const region = q.get('region')
  const status = q.get('status')
  const source = q.get('source')
  let items = snapshot.notices
  if (category) items = items.filter((n) => (n.supportCategories ?? []).includes(category))
  if (region) items = items.filter((n) => (n.regions ?? []).includes(region) || (n.regions ?? []).includes('nationwide'))
  if (status) items = items.filter((n) => n.receptionStatus === status)
  if (source) items = items.filter((n) => n.publishSource === source)
  const page = Math.max(1, Number.parseInt(q.get('page') ?? '1', 10) || 1)
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(q.get('page_size') ?? '', 10) || DEFAULT_PAGE_SIZE))
  const start = (page - 1) * size
  return json(200, {
    meta: { ...meta(snapshot), total: items.length, page, page_size: size },
    items: items.slice(start, start + size).map(noticeSummary),
  })
}

async function checkEligibility(request: Request, snapshot: PublishedSnapshot): Promise<Response> {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    return json(400, { message: PUBLIC_API_MESSAGES.badRequest })
  }
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return json(413, { message: PUBLIC_API_MESSAGES.badRequest })
  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return json(400, { message: PUBLIC_API_MESSAGES.badRequest })
  }
  const profile = sanitizeEngineProfile(body?.profile)
  if (!profile) return json(400, { message: PUBLIC_API_MESSAGES.badRequest })
  const answers = (typeof body.answers === 'object' && body.answers !== null ? body.answers : {}) as Record<string, unknown>
  const ids = Array.isArray(body.notice_ids) ? new Set(body.notice_ids.filter((v): v is string => typeof v === 'string')) : null
  const notices = snapshot.notices.filter((n) => n.conditions.length > 0 && (!ids || ids.has(n.id)))
  const results = notices.map((n) => {
    const r = classifyTabs(n.conditions, profile, n.id, n.parentId, sanitizeAnswers(answers[n.id]))
    const byId = new Map(r.outcomes.map((o) => [o.condition.condId, o]))
    const cond = (id: string) => {
      const o = byId.get(id)
      return {
        cond_id: id,
        kind: o?.condition.kind ?? null,
        cond_type: o?.condition.condType ?? null,
        importance: o?.importance ?? null,
        evidence: o?.condition.evidence ?? null,
        page: o?.condition.page ?? null,
      }
    }
    return {
      notice_id: n.id,
      title: n.title,
      tab: r.tab,
      tab_label: TAB_LABEL[r.tab],
      strict_verdict: r.strict,
      unmet: r.fails.map(cond),
      major_unknown: r.majorUnknown.map(cond),
      checklist: r.checklist.map(cond),
      source_url: n.sourceUrl,
    }
  })
  const counts = { eligible: 0, 'needs-check': 0, ineligible: 0 }
  for (const r of results) counts[r.tab] += 1
  return json(200, { meta: { ...meta(snapshot), counts, profile_stored: false }, results })
}

export interface PublicApiDeps {
  nowMs?: number
}

export async function handlePublicApiRequest(request: Request, env: AuthEnv, deps: PublicApiDeps = {}): Promise<Response> {
  const url = new URL(request.url)
  const route = resolveRoute(url)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      },
    })
  }
  if (!route) return json(404, { message: PUBLIC_API_MESSAGES.notFound })
  if (route.name === 'openapi') return json(200, OPENAPI_DOCUMENT, { 'Cache-Control': 'public, max-age=300' })
  if (route.name === 'docs') {
    return new Response(swaggerHtml('/api/public/openapi.json'), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    })
  }

  const expectedMethod = route.name === 'check' ? 'POST' : 'GET'
  if (request.method !== expectedMethod) return json(405, { message: PUBLIC_API_MESSAGES.methodNotAllowed }, { Allow: expectedMethod })
  const key = matchKey(env, request.headers.get('x-api-key'))
  if (!key) return json(401, { message: PUBLIC_API_MESSAGES.unauthorized }, { 'WWW-Authenticate': 'ApiKey header="X-API-Key"' })
  if (rateLimited(key, env, deps.nowMs ?? Date.now())) return json(429, { message: PUBLIC_API_MESSAGES.rateLimited }, { 'Retry-After': '60' })

  let snapshot: PublishedSnapshot
  try {
    snapshot = loadSnapshot()
  } catch {
    return json(503, { message: PUBLIC_API_MESSAGES.snapshotMissing })
  }
  if (route.name === 'notices') return listNotices(url, snapshot)
  if (route.name === 'notice') {
    const n = snapshot.notices.find((x) => x.id === route.id)
    if (!n) return json(404, { message: PUBLIC_API_MESSAGES.noticeNotFound })
    const typeNames = new Map(snapshot.conditionTypes.map((t) => [t.code, t.name]))
    return json(200, { meta: meta(snapshot), notice: noticeDetail(n, typeNames) })
  }
  return checkEligibility(request, snapshot)
}

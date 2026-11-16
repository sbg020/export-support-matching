/*
 * 판정 엔진 입력 정리 (챗봇·공개 API 공통). 받은 JSON에서 판정에 쓰는 항목만 꺼내고, 없는 값은 모름(null)으로 둔다.
 * 사업자등록번호·대표자명·연락처처럼 판정에 쓰지 않는 값은 읽지 않는다.
 */
import type { ConditionAnswer, EngineProfile } from '../../src/lib/engine/eligibilityV3.js'

const MAX_LIST = 50
const MAX_TEXT = 100

function text(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim().slice(0, MAX_TEXT) : null
}
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
function bool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null
}
function list(v: unknown): string[] {
  return Array.isArray(v) ? v.map(text).filter((s): s is string => s !== null).slice(0, MAX_LIST) : []
}
/** null·없음 = 모름, 배열 = 입력함 (빈 배열 = 해당 없음) */
function listOrNull(v: unknown): string[] | null {
  return Array.isArray(v) ? list(v) : null
}

export function sanitizeEngineProfile(raw: unknown): EngineProfile | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  return {
    size: text(r.size),
    attrs: list(r.attrs),
    hq: text(r.hq),
    sites: list(r.sites),
    industry: listOrNull(r.industry),
    product_hs: listOrNull(r.product_hs),
    export_usd: num(r.export_usd),
    revenue_krw: num(r.revenue_krw),
    age: num(r.age),
    employees: num(r.employees),
    certs: listOrNull(r.certs),
    debt_ratio: num(r.debt_ratio),
    model: text(r.model),
    issues: list(r.issues),
    // 외부 입력은 답한 결격 코드만 답한 것으로 본다 (없으면 결격 조건은 모두 모름)
    answered_flags: Array.isArray(r.answered_flags) ? list(r.answered_flags) : [],
    intent_export: bool(r.intent_export),
    intent_commit: bool(r.intent_commit),
  }
}

/** { condId: 'met' | 'unmet' } 만 남긴다 */
export function sanitizeAnswers(raw: unknown): Record<string, ConditionAnswer> {
  const out: Record<string, ConditionAnswer> = {}
  if (typeof raw !== 'object' || raw === null) return out
  let n = 0
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (n >= 500) break
    if ((v === 'met' || v === 'unmet') && /^[A-Za-z0-9_-]{1,40}$/.test(k)) {
      out[k] = v
      n += 1
    }
  }
  return out
}

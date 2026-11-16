/*
 * 신청 자격 판정 v3 (REVISION_05 §2.3·§2.4). backend/eligibility/engine.py 와 같은 규칙이다.
 *
 * - strictVerdict(): 정답세트 reference_eval.py 와 같은 3단계 결과 (회귀 테스트로 불일치 0건 확인).
 * - classifyTabs(): strict 결과 위에 조건 중요도(주요/체크리스트)와 기업 체크 답을 얹어 3탭으로 나눈다.
 *   미충족 있음 → 신청 불가 / 주요 조건 모름 → 확인 필요 / 그 밖(체크리스트만 모름) → 신청 가능 + 체크리스트.
 * 판정은 규칙(판정식)으로만 한다. 값이 없는 프로필 항목은 모름(null)이다.
 */
// 서버 함수(api/)도 이 파일을 쓰므로 별칭(@/) 대신 상대 경로로 가져온다
import type { ConditionExpr, NoticeCondition } from '../../types/program.js'

export type Tri = boolean | null

/** reference_eval.py 의 프로필 형식 */
export interface EngineProfile {
  size: string | null
  attrs: string[]
  hq: string | null
  sites: string[]
  /** null = 업종 모름 */
  industry: string[] | null
  product_hs: string[] | null
  export_usd: number | null
  revenue_krw: number | null
  age: number | null
  employees: number | null
  /** null = 인증 입력 안 함 */
  certs: string[] | null
  debt_ratio: number | null
  model: string | null
  issues: string[]
  /** 답한 결격 코드. null이면 모든 코드에 답한 것으로 본다 (정답세트 가상 프로필) */
  answered_flags?: string[] | null
  intent_export: boolean | null
  intent_commit: boolean | null
}

const SIZE_EXPAND: Record<string, string[]> = {
  소상공인: ['소상공인', '소기업', '중소기업'],
  소기업: ['소기업', '중소기업'],
  중기업: ['중기업', '중소기업'],
  중견기업: ['중견기업'],
  대기업: ['대기업'],
  '대기업(기업집단 소속)': ['대기업', '대기업(기업집단 소속)'],
  중소기업: ['중소기업'],
}
const SME_DETAIL = new Set(['소기업', '중기업', '소상공인'])
const TRACKED = new Set([
  '중소기업', '소기업', '중기업', '소상공인', '중견기업', '대기업', '대기업(기업집단 소속)', '대기업 출자회사', '상장기업',
  '공공기관', '지자체 출자기업', '비영리·단체', '간이과세자', '개인사업자', '법인사업자', '창업기업', '벤처기업', '농어업 생산자',
])
const REGION_ALIAS: Record<string, string[]> = { 전남광주: ['전남', '광주'] }

function companyTypes(p: EngineProfile): Set<string> | null {
  if (p.size === null) return null
  const s = new Set([...(SIZE_EXPAND[p.size] ?? [p.size]), ...p.attrs])
  if (p.age !== null && p.age < 7) s.add('창업기업')
  if ((p.certs ?? []).includes('벤처기업')) s.add('벤처기업')
  return s
}

function regionMatch(loc: string, v: string): boolean {
  if (v === '전국') return true
  return (REGION_ALIAS[v] ?? [v]).some((vv) => loc === vv || loc.startsWith(`${vv} `))
}

function numberField(p: EngineProfile, field: string): number | null | undefined {
  const map: Record<string, number | null> = {
    export_usd: p.export_usd,
    revenue_krw: p.revenue_krw,
    business_age_years: p.age,
    employees: p.employees,
    debt_ratio: p.debt_ratio,
  }
  return field in map ? map[field] : undefined
}

const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [String(v)])

/** 판정식 1개를 3값 논리로 계산한다 */
export function evaluateExpr(e: ConditionExpr, p: EngineProfile): Tri {
  if ('true' in e) return true
  if ('check' in e) return null
  if ('flag' in e) {
    const answered = p.answered_flags
    if (answered && !answered.includes(e.flag) && !p.issues.includes(e.flag)) return null
    return p.issues.includes(e.flag)
  }
  if ('intent' in e) return e.intent === 'export' ? p.intent_export : p.intent_commit
  if ('distributor' in e) return p.model === '제조' ? false : null
  if ('not' in e) {
    const x = evaluateExpr(e.not, p)
    return x === null ? null : !x
  }
  if ('all' in e) {
    const xs = e.all.map((x) => evaluateExpr(x, p))
    return xs.includes(false) ? false : xs.includes(null) ? null : true
  }
  if ('any' in e) {
    const xs = e.any.map((x) => evaluateExpr(x, p))
    return xs.includes(true) ? true : xs.includes(null) ? null : false
  }
  const { atom: f, op } = e
  const v = e.value
  if (f === 'company_type') {
    const have = companyTypes(p)
    const vals = new Set(asList(v))
    if (have === null) return null
    if ([...have].some((t) => vals.has(t))) return op === 'in'
    if (p.size === '중소기업' && [...vals].some((t) => SME_DETAIL.has(t))) return null
    return [...vals].every((t) => TRACKED.has(t)) ? op !== 'in' : null
  }
  if (f === 'hq_region') {
    if (!p.hq) return null
    const m = asList(v).some((x) => regionMatch(p.hq as string, x))
    return op === 'in' ? m : !m
  }
  if (f === 'site_region') {
    const locs = [...p.sites.filter(Boolean), ...(p.hq ? [p.hq] : [])]
    if (locs.length === 0) return null
    const m = locs.some((s) => asList(v).some((x) => regionMatch(s, x)))
    return op === 'in' ? m : !m
  }
  if (f === 'industry') {
    if (p.industry === null) return null
    const vals = new Set(asList(v))
    const m = p.industry.some((t) => vals.has(t))
    return op === 'in' ? m : !m
  }
  if (f === 'product_hs') {
    if (p.product_hs === null) return null
    const vals = new Set(asList(v))
    return p.product_hs.some((h) => vals.has(h))
  }
  if (f === 'certification') {
    if (p.certs === null) return null
    const certs = p.certs
    return asList(v).some((x) =>
      certs.some((c) => x.includes(c.split('(')[0]!.trim()) || c.includes(x.split('(')[0]!.trim())),
    )
  }
  const num = numberField(p, f)
  if (num === null || num === undefined) return null
  const target = Number(v)
  switch (op) {
    case '>':
      return num > target
    case '>=':
      return num >= target
    case '<':
      return num < target
    case '<=':
      return num <= target
    default:
      return null
  }
}

export type StrictVerdict = '신청 가능' | '확인 필요' | '신청 불가'

function applies(c: NoticeCondition, programId: string, parentId: string): boolean {
  return (c.programId === programId || c.programId === parentId) && c.affectsVerdict
}

/** reference_eval.judge 와 같은 결과 */
export function strictVerdict(
  conds: readonly NoticeCondition[],
  p: EngineProfile,
  programId: string,
  parentId: string | null = null,
): { verdict: StrictVerdict; fails: string[]; unknown: string[] } {
  const parent = parentId ?? programId
  const groups = new Map<string, [string, Tri][]>()
  const fails: string[] = []
  const unknown: string[] = []
  for (const c of conds) {
    if (!applies(c, programId, parent)) continue
    const val = evaluateExpr(c.expr, p)
    if (c.kind === '제외') {
      if (val === true) fails.push(c.condId)
      else if (val === null) unknown.push(c.condId)
    } else {
      const key = c.group ?? ''
      groups.set(key, [...(groups.get(key) ?? []), [c.condId, val]])
    }
  }
  for (const list of groups.values()) {
    const vals = list.map(([, v]) => v)
    if (vals.includes(true)) continue
    if (vals.every((v) => v === false)) fails.push(...list.map(([k]) => k))
    else unknown.push(...list.filter(([, v]) => v === null).map(([k]) => k))
  }
  const verdict: StrictVerdict = fails.length > 0 ? '신청 불가' : unknown.length > 0 ? '확인 필요' : '신청 가능'
  return { verdict, fails, unknown }
}

/* ───────── 3탭 분류 ───────── */

const MAJOR_TYPES = new Set([
  'A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'C01', 'C05', 'C09',
])
const A_FIELDS: Record<string, (keyof EngineProfile)[]> = {
  A01: ['size'], A02: ['hq'], A03: ['hq'], A04: ['industry'], A05: ['product_hs'], A06: ['export_usd'],
  A07: ['revenue_krw'], A08: ['age'], A09: ['employees'], A10: ['certs'], A11: ['debt_ratio'],
}

export function defaultImportance(condType: string): '주요' | '체크리스트' {
  return MAJOR_TYPES.has(condType) ? '주요' : '체크리스트'
}

/** 조건 중요도. A 유형이 기업 미입력으로 모름이면 주요로 본다 */
export function importanceOf(c: NoticeCondition, p: EngineProfile): '주요' | '체크리스트' {
  const imp = c.importance ?? defaultImportance(c.condType)
  if (c.condType.startsWith('A') && imp !== '주요') {
    if ((A_FIELDS[c.condType] ?? []).some((field) => p[field] === null)) return '주요'
  }
  return imp
}

export type TabKey = 'eligible' | 'needs-check' | 'ineligible'
/** 기업 체크: 충족함·해당 없음 = met, 충족하지 않음·해당함 = unmet */
export type ConditionAnswer = 'met' | 'unmet'

export interface ConditionOutcome {
  condition: NoticeCondition
  /** 조건 값: 필수 = 충족 여부, 제외 = 해당 여부 */
  value: Tri
  /** 화면 표시 상태: met(충족·해당 없음) · unmet(미충족·해당) · unknown(모름) */
  state: 'met' | 'unmet' | 'unknown'
  importance: '주요' | '체크리스트'
  /** 기업 체크로 정해졌는지 */
  userDecided: boolean
}

export interface TabResult {
  tab: TabKey
  strict: StrictVerdict
  fails: string[]
  majorUnknown: string[]
  checklist: string[]
  userDecided: string[]
  /** 판정에 쓴 조건 (그룹 OR 포함) */
  outcomes: ConditionOutcome[]
  /** 판정에 쓰지 않는 안내 조건 (affects_verdict = N) */
  notices: NoticeCondition[]
  /** 자격 조건이 하나도 없는 공고 (자동 추출에서 조건을 찾지 못함) → 확인 필요, 원문에서 직접 확인 */
  noConditions?: boolean
}

/** 자격 조건이 없는 공고: 판정할 근거가 없으므로 '확인 필요'로 둔다 (신청 가능·불가로 단정하지 않는다) */
export function noConditionsTab(): TabResult {
  return {
    tab: 'needs-check',
    strict: '확인 필요',
    fails: [],
    majorUnknown: [],
    checklist: [],
    userDecided: [],
    outcomes: [],
    notices: [],
    noConditions: true,
  }
}

export function classifyTabs(
  conds: readonly NoticeCondition[],
  p: EngineProfile,
  programId: string,
  parentId: string | null = null,
  answers: Record<string, ConditionAnswer> = {},
): TabResult {
  const parent = parentId ?? programId
  const relevant = conds.filter((c) => c.programId === programId || c.programId === parent)
  const applicable = relevant.filter((c) => c.affectsVerdict)
  const outcomes: ConditionOutcome[] = []
  const groups = new Map<string, ConditionOutcome[]>()
  const fails: string[] = []
  const unknown: ConditionOutcome[] = []
  const decided: string[] = []
  for (const c of applicable) {
    const ans = answers[c.condId]
    let value: Tri
    const userDecided = ans === 'met' || ans === 'unmet'
    if (userDecided) {
      decided.push(c.condId)
      value = c.kind === '제외' ? ans === 'unmet' : ans === 'met'
    } else {
      value = evaluateExpr(c.expr, p)
    }
    const satisfied = value === null ? null : c.kind === '제외' ? !value : value
    const outcome: ConditionOutcome = {
      condition: c,
      value,
      state: satisfied === null ? 'unknown' : satisfied ? 'met' : 'unmet',
      importance: importanceOf(c, p),
      userDecided,
    }
    outcomes.push(outcome)
    if (c.kind === '제외') {
      if (value === true) fails.push(c.condId)
      else if (value === null) unknown.push(outcome)
    } else {
      const key = c.group ?? ''
      groups.set(key, [...(groups.get(key) ?? []), outcome])
    }
  }
  for (const list of groups.values()) {
    const vals = list.map((o) => o.value)
    if (vals.includes(true)) continue
    if (vals.every((v) => v === false)) fails.push(...list.map((o) => o.condition.condId))
    else unknown.push(...list.filter((o) => o.value === null))
  }
  const major = unknown.filter((o) => o.importance === '주요').map((o) => o.condition.condId)
  const checklist = unknown.filter((o) => o.importance !== '주요').map((o) => o.condition.condId)
  const strict: StrictVerdict = fails.length > 0 ? '신청 불가' : unknown.length > 0 ? '확인 필요' : '신청 가능'
  const tab: TabKey = fails.length > 0 ? 'ineligible' : major.length > 0 ? 'needs-check' : 'eligible'
  return {
    tab,
    strict,
    fails,
    majorUnknown: major,
    checklist,
    userDecided: decided,
    outcomes,
    notices: relevant.filter((c) => !c.affectsVerdict),
  }
}

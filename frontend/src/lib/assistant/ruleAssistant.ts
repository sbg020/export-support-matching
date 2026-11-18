/*
 * '까치에게 물어보기' 규칙 답변 (외부 AI API를 쓰지 않는다).
 *
 * 질문에서 의도(추천·마감·서류·자격·금액·도움말)와 주제(사업 분류)를 규칙으로 찾고,
 * 사이트에 게시된 공고 데이터와 이 기업의 판정 결과(3탭·적합도·조건)만으로 문장을 만든다.
 * - 데이터에 없는 내용은 '등록된 공고에서 확인할 수 없습니다'라고 답한다.
 * - 지원 금액·날짜는 공고에 적힌 값만 옮기고, 선정 가능성은 말하지 않는다.
 * 순수 함수다. 화면(AssistantWidget)이 공고 목록과 판정 결과를 넘겨준다.
 */
import type { IsoDate } from '@/types/common'
import type { Program, SupportCategoryCode } from '@/types/program'
import type { ProgramEvaluation } from '@/lib/engine/evaluateAll'
import type { ConditionOutcome, TabKey } from '@/lib/engine/eligibilityV3'
import { CONDITION_TYPE_NAME } from '@/constants/conditionTypes'
import { SUPPORT_CATEGORIES } from '@/constants/categories'
import { daysBetween } from '@/lib/engine/opportunityCost'
import { formatDateCompact } from '@/lib/display'
import { programTitleText } from '@/lib/programDisplay'

export type AssistantIntent = 'help' | 'recommend' | 'deadline' | 'documents' | 'eligibility' | 'amount' | 'search'

export interface RuleRelated {
  programId: string
  title: string | null
  tab: TabKey | null
  tabLabel: string
  fit: number | null
  note: string
  evidence: { condId: string; text: string; page: number | null }[]
  link: string
}

export interface RuleAnswer {
  intent: AssistantIntent
  summary: string
  related: RuleRelated[]
  checks: string[]
  nextStep: string
}

export interface RuleContext {
  programs: readonly Program[]
  evaluations: ReadonlyMap<string, ProgramEvaluation>
  asOf: IsoDate | null
  /** 기업 프로필을 하나도 입력하지 않았는지 */
  profileEmpty: boolean
}

export const NOT_FOUND = '등록된 공고에서 확인할 수 없습니다.'
const MAX_ITEMS = 5
const TAB_LABEL: Record<TabKey, string> = { eligible: '신청 가능', 'needs-check': '확인 필요', ineligible: '신청 불가' }

export const EXAMPLE_QUESTIONS = [
  '우리 회사가 신청할 수 있는 공고 추천해 줘',
  '이번 주에 마감되는 공고 알려 줘',
  '해외 전시회 지원 공고 있어?',
  '수출 패키지 지원 제출 서류는 뭐야?',
  '해외규격인증 지원사업 신청 자격 알려 줘',
]

/* ───────── 의도·주제 찾기 ───────── */

const INTENT_RULES: [AssistantIntent, RegExp][] = [
  ['help', /^(안녕|도움|도와|사용법|뭐\s*할\s*수|무엇을\s*할\s*수|어떻게\s*써)/],
  ['documents', /서류|제출|준비물|구비|첨부/],
  ['amount', /금액|지원금|얼마|자부담|한도|예산|비용/],
  ['eligibility', /자격|조건|왜\s*(안|불가)|불가|안\s*돼|안\s*되|해당\s*되|가능한지|신청할\s*수\s*있(나|어|는지|을까)/],
  ['deadline', /마감|임박|언제까지|기한|이번\s*주|이번\s*달|곧\s*끝/],
  ['recommend', /추천|맞는|어울리|신청\s*가능|할\s*만한|괜찮은|좋은\s*공고|어떤\s*공고/],
]

/** 주제 단어 → 사업 분류 */
const TOPIC_RULES: [RegExp, SupportCategoryCode[]][] = [
  [/전시회|박람회|상담회|바이어|해외\s*영업|사절단/, ['C01']],
  [/시장\s*조사|컨설팅/, ['C02']],
  [/법무|세무|회계/, ['C03']],
  [/특허|지재권|지식재산/, ['C04']],
  [/인증|규격/, ['C05']],
  [/홍보|광고|마케팅/, ['C06']],
  [/브랜드/, ['C07']],
  [/디자인|패키지\s*디자인/, ['C08']],
  [/영상|동영상/, ['C09']],
  [/서류\s*대행|현지\s*등록/, ['C10']],
  [/교육|역량/, ['C11']],
  [/통역|번역|통번역/, ['C12']],
  [/물류|운송|배송|국제\s*운송/, ['C13']],
  [/보험|보증|무역\s*보험/, ['C14']],
  [/관세|FTA|원산지/i, ['C15']],
]

export function detectIntent(question: string): AssistantIntent {
  const q = question.trim()
  for (const [intent, pattern] of INTENT_RULES) if (pattern.test(q)) return intent
  return 'search'
}

export function detectTopics(question: string): SupportCategoryCode[] {
  return Array.from(new Set(TOPIC_RULES.filter(([p]) => p.test(question)).flatMap(([, codes]) => codes)))
}

/* ───────── 공고 찾기 (글자 2-gram) ───────── */

const STOP = /(공고|사업|지원|알려|줘|주세요|있어|있나요|뭐야|무엇|어떤|우리|회사|신청|자격|조건|제출|서류|마감|금액|지원금|얼마|추천|대한|관련|정보|이번|에서|으로|하는|해줘|궁금|참가|모집|기업)/g

function bigrams(text: string): Set<string> {
  const words = text.toLowerCase().replace(STOP, ' ').match(/[가-힣]+|[a-z0-9]+/g) ?? []
  const out = new Set<string>()
  for (const w of words) {
    if (/^[a-z0-9]+$/.test(w)) {
      if (w.length >= 2) out.add(w)
      continue
    }
    for (let i = 0; i < w.length - 1; i += 1) out.add(w.slice(i, i + 2))
  }
  return out
}

function programText(p: Program): string {
  const categories = (p.supportCategories ?? []).map((c) => SUPPORT_CATEGORIES.find((x) => x.code === c)?.name ?? '')
  return [p.title, p.sourceTitle, p.agency, p.ministry, ...categories].filter(Boolean).join(' ')
}

function overlap(q: Set<string>, text: string): number {
  const t = bigrams(text)
  let hit = 0
  for (const g of q) if (t.has(g)) hit += 1
  return hit / q.size
}

/** 검수한 정답세트 공고를 자동 추출 공고보다 먼저 */
function reviewedFirst(a: Program, b: Program): number {
  return Number(Boolean(a.autoExtracted)) - Number(Boolean(b.autoExtracted))
}

/** 검수한 공고를 먼저, 그다음 제목이 짧은(더 딱 맞는) 공고를 먼저 (이름으로 찾을 때) */
function preferReviewed(a: Program, b: Program): number {
  return Number(Boolean(a.autoExtracted)) - Number(Boolean(b.autoExtracted)) || (a.title ?? '').length - (b.title ?? '').length
}

/**
 * 질문과 겹치는 정도로 공고를 고른다 (점수 0~1).
 * 제목에서 겹치는 정도를 먼저 보고, 기관·분야 이름까지 넣은 겹침은 조금 낮게 친다.
 */
export function matchPrograms(question: string, programs: readonly Program[]): { program: Program; score: number }[] {
  const idMatch = question.toUpperCase().match(/\b[NP]\d{3}(?:-\d{2})?\b/)
  if (idMatch) {
    const found = programs.find((p) => p.id === idMatch[0])
    if (found) return [{ program: found, score: 1 }]
  }
  const q = bigrams(question)
  if (q.size === 0) return []
  return programs
    .map((program) => {
      const title = overlap(q, [program.title, program.sourceTitle].filter(Boolean).join(' '))
      const all = overlap(q, programText(program)) * 0.8
      return { program, score: Math.max(title, all) }
    })
    .filter((x) => x.score >= 0.34)
    .sort((a, b) => b.score - a.score || preferReviewed(a.program, b.program) || a.program.id.localeCompare(b.program.id))
}

/* ───────── 문장 재료 ───────── */

function isOpen(p: Program, asOf: IsoDate | null): boolean {
  if (p.receptionStatus === 'closed') return false
  if (asOf && p.applyEnd) return p.applyEnd.slice(0, 10) >= asOf
  return true
}

function deadlineText(p: Program, asOf: IsoDate | null): string {
  if (!p.applyEnd) {
    const note = p.applyPeriodNote?.trim() ?? ''
    // 자동 추출 공고의 접수 문구는 정리되지 않은 경우가 많아 짧고 읽을 수 있을 때만 옮긴다
    return note && note.length <= 40 && /[0-9가-힣]/.test(note.charAt(0)) ? `접수 ${note}` : '마감일은 공고 원문 확인'
  }
  const left = asOf ? daysBetween(asOf, p.applyEnd) : null
  const dday = left === null ? '' : left > 0 ? ` (D-${left})` : left === 0 ? ' (오늘 마감)' : ' (마감)'
  return `마감 ${formatDateCompact(p.applyEnd)}${dday}`
}

function conditionLabel(o: ConditionOutcome): string {
  const name = CONDITION_TYPE_NAME[o.condition.condType] ?? o.condition.condType
  return o.condition.valueRaw ? `${name}: ${o.condition.valueRaw}` : name
}

function related(p: Program, ctx: RuleContext, note: string, evidence: RuleRelated['evidence'] = []): RuleRelated {
  const ev = ctx.evaluations.get(p.id)
  const tab = ev?.tab?.tab ?? null
  return {
    programId: p.id,
    title: programTitleText(p),
    tab,
    tabLabel: tab ? TAB_LABEL[tab] : '-',
    fit: tab === 'eligible' && ev?.fit ? Math.round(ev.fit.score) : null,
    note,
    evidence,
    link: `/programs/${encodeURIComponent(p.id)}`,
  }
}

function filterByTopics(programs: readonly Program[], topics: SupportCategoryCode[]): Program[] {
  if (topics.length === 0) return [...programs]
  return programs.filter((p) => (p.supportCategories ?? []).some((c) => topics.includes(c)))
}

function topicText(topics: SupportCategoryCode[]): string {
  return topics.map((c) => SUPPORT_CATEGORIES.find((x) => x.code === c)?.name ?? c).join(', ')
}

const unique = (items: string[]) => Array.from(new Set(items))

const PROFILE_NEXT = '기업 프로필을 입력하면 공고마다 신청 자격과 적합도를 계산해 더 정확히 답해 드립니다.'

/* ───────── 의도별 답변 ───────── */

function help(): RuleAnswer {
  return {
    intent: 'help',
    summary:
      '안녕하세요, 까치예요. 사이트에 등록된 공고와 우리 회사 판정 결과로 답해 드려요. 신청할 수 있는 공고, 마감이 가까운 공고, 제출 서류, 신청 자격, 지원 금액을 물어보세요.',
    related: [],
    checks: EXAMPLE_QUESTIONS.map((q) => `예: "${q}"`),
    nextStep: '궁금한 공고 이름이나 분야(전시회, 인증, 물류 등)를 함께 적으면 더 정확히 찾아 드려요.',
  }
}

function recommend(ctx: RuleContext, topics: SupportCategoryCode[]): RuleAnswer {
  const pool = filterByTopics(ctx.programs, topics).filter((p) => isOpen(p, ctx.asOf))
  const scoreOf = (p: Program) => ctx.evaluations.get(p.id)?.fit?.score ?? -1
  const majorOf = (p: Program) => ctx.evaluations.get(p.id)?.tab?.majorUnknown.length ?? 99
  const eligible = pool
    .filter((p) => ctx.evaluations.get(p.id)?.tab?.tab === 'eligible')
    .sort((a, b) => reviewedFirst(a, b) || scoreOf(b) - scoreOf(a) || preferReviewed(a, b))
  const needsCheck = pool
    .filter((p) => ctx.evaluations.get(p.id)?.tab?.tab === 'needs-check')
    .sort((a, b) => reviewedFirst(a, b) || majorOf(a) - majorOf(b) || preferReviewed(a, b))
  const topic = topics.length > 0 ? `${topicText(topics)} 분야에서 ` : ''
  if (ctx.profileEmpty) {
    const items = [...pool].sort(preferReviewed).slice(0, MAX_ITEMS)
    return {
      intent: 'recommend',
      summary: items.length > 0 ? `${topic}접수 중인 공고 ${pool.length}건 가운데 ${items.length}건을 보여 드려요. 아직 기업 프로필이 없어 신청 자격은 판정하지 않았어요.` : `${topic}${NOT_FOUND}`,
      related: items.map((p) => related(p, ctx, deadlineText(p, ctx.asOf))),
      checks: [],
      nextStep: PROFILE_NEXT,
    }
  }
  const items = [...eligible, ...needsCheck].slice(0, MAX_ITEMS)
  if (items.length === 0) {
    return {
      intent: 'recommend',
      summary: `${topic}지금 접수 중이면서 신청 가능하거나 확인이 필요한 공고는 ${NOT_FOUND.replace('.', '')}어요.`,
      related: [],
      checks: [],
      nextStep: '맞춤 공고 화면의 \'마감 공고 포함\'을 켜거나, 다른 분야로 다시 물어보세요.',
    }
  }
  return {
    intent: 'recommend',
    summary: `${topic}접수 중인 공고 가운데 신청 가능 ${eligible.length}건, 확인 필요 ${needsCheck.length}건이 있어요. 검수한 공고를 먼저, 적합도가 높은 순으로 ${items.length}건을 골랐어요.`,
    related: items.map((p) => {
      const ev = ctx.evaluations.get(p.id)
      const major = ev?.tab?.majorUnknown.length ?? 0
      const extra = ev?.tab?.tab === 'needs-check' ? ` · 확인할 자격 ${major}개` : ''
      return related(p, ctx, `${deadlineText(p, ctx.asOf)}${extra}`)
    }),
    checks: needsCheck.length > 0 ? ['확인 필요 공고는 상세 화면에서 남은 자격 조건을 체크하면 신청 가능 여부가 정해져요.'] : [],
    nextStep: '관심 있는 공고는 상세 화면에서 관심사업으로 저장하고, 제출 서류를 확인하세요.',
  }
}

function deadline(ctx: RuleContext, topics: SupportCategoryCode[], question: string): RuleAnswer {
  const window = /이번\s*주/.test(question) ? 7 : /이번\s*달/.test(question) ? 31 : 14
  const pool = filterByTopics(ctx.programs, topics)
    .filter((p) => p.applyEnd && isOpen(p, ctx.asOf))
    .filter((p) => {
      const left = ctx.asOf && p.applyEnd ? daysBetween(ctx.asOf, p.applyEnd) : null
      return left !== null && left >= 0 && left <= window
    })
    .sort((a, b) => (a.applyEnd ?? '').localeCompare(b.applyEnd ?? ''))
  const topic = topics.length > 0 ? `${topicText(topics)} 분야 ` : ''
  if (pool.length === 0) {
    return {
      intent: 'deadline',
      summary: `기준일(${ctx.asOf ?? '-'})부터 ${window}일 안에 마감되는 ${topic}공고는 ${NOT_FOUND.replace('.', '')}어요.`,
      related: [],
      checks: [],
      nextStep: '공고 달력에서 달별 접수 시작·마감 일정을 확인할 수 있어요.',
    }
  }
  const items = pool.slice(0, MAX_ITEMS)
  return {
    intent: 'deadline',
    summary: `기준일(${ctx.asOf})부터 ${window}일 안에 마감되는 ${topic}공고는 ${pool.length}건이에요. 마감이 빠른 순으로 ${items.length}건을 보여 드려요.`,
    related: items.map((p) => related(p, ctx, deadlineText(p, ctx.asOf))),
    checks: ['마감 시각(예: 18:00)과 접수 방법은 공고 원문에서 꼭 확인하세요.'],
    nextStep: '공고 달력에서 날짜를 누르면 그날 마감되는 공고를 모아 볼 수 있어요.',
  }
}

function focusAnswer(intent: 'documents' | 'eligibility' | 'amount', p: Program, ctx: RuleContext): RuleAnswer {
  const ev = ctx.evaluations.get(p.id)
  const title = programTitleText(p) ?? p.id
  if (intent === 'documents') {
    const docs = p.requiredDocs ?? []
    if (docs.length === 0) {
      return { intent, summary: `'${title}'의 제출 서류는 ${NOT_FOUND}`, related: [related(p, ctx, deadlineText(p, ctx.asOf))], checks: [], nextStep: '공고 원문의 제출 서류 항목을 확인하세요.' }
    }
    const required = docs.filter((d) => d.requirement === 'required')
    return {
      intent,
      summary: `'${title}'의 제출 서류는 ${docs.length}가지예요(필수 ${required.length}가지). 공고 전용 서식은 공고 첨부파일을 내려받아 작성해야 해요.`,
      related: [related(p, ctx, deadlineText(p, ctx.asOf))],
      checks: unique(
        docs.map((d) => `${d.name}${d.requirement === 'required' ? ' (필수)' : d.requirement === 'conditional' ? ' (해당 시)' : ''}${d.isProgramForm ? ' · 공고 서식' : ''}`),
      ).slice(0, 12),
      nextStep: '관심사업으로 저장하면 상세 화면에서 서류를 하나씩 체크하며 준비할 수 있어요. 서류함에 있는 서류는 \'서류함에 있음\'으로 표시돼요.',
    }
  }
  if (intent === 'amount') {
    const parts = [p.amountNote, p.supportTypesNote, p.selfPayment?.note].filter((v): v is string => Boolean(v))
    return {
      intent,
      summary: parts.length > 0 ? `'${title}'의 지원 내용은 공고에 이렇게 적혀 있어요: ${parts.join(' / ')}` : `'${title}'의 지원 금액은 ${NOT_FOUND}`,
      related: [related(p, ctx, deadlineText(p, ctx.asOf))],
      checks: ['부가세·자부담 선납 여부와 정산 방식은 공고 원문에서 확인하세요.'],
      nextStep: '실제 지원 금액은 선정 결과와 사업 계획에 따라 달라질 수 있어요.',
    }
  }
  // eligibility
  const tab = ev?.tab ?? null
  if (!tab) {
    return { intent, summary: `'${title}'의 신청 자격은 ${ctx.profileEmpty ? '기업 프로필이 없어 판정하지 않았어요.' : NOT_FOUND}`, related: [related(p, ctx, deadlineText(p, ctx.asOf))], checks: [], nextStep: ctx.profileEmpty ? PROFILE_NEXT : '공고 원문의 지원 대상을 확인하세요.' }
  }
  const byId = new Map(tab.outcomes.map((o) => [o.condition.condId, o]))
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((o): o is ConditionOutcome => Boolean(o))
  const fails = pick(tab.fails)
  const major = pick(tab.majorUnknown)
  const checklist = pick(tab.checklist)
  const evidenceOf = (list: ConditionOutcome[]) =>
    list.filter((o) => o.condition.evidence).slice(0, 3).map((o) => ({ condId: o.condition.condId, text: o.condition.evidence ?? '', page: o.condition.page }))
  if (tab.noConditions) {
    return { intent, summary: `'${title}'은(는) 공고에서 신청 자격 조건을 찾지 못해 '확인 필요'로 분류했어요.`, related: [related(p, ctx, deadlineText(p, ctx.asOf))], checks: ['공고 원문의 지원 대상과 제외 대상을 직접 확인하세요.'], nextStep: '주관기관 문의처로 확인하는 것도 방법이에요.' }
  }
  if (tab.tab === 'ineligible') {
    return {
      intent,
      summary: `'${title}'은(는) 우리 회사 정보로 보면 '신청 불가'예요. 충족하지 못한 조건이 ${fails.length}개 있어요.`,
      related: [related(p, ctx, deadlineText(p, ctx.asOf), evidenceOf(fails))],
      checks: unique(fails.map((o) => `미충족: ${conditionLabel(o)}`)),
      nextStep: '기업 정보가 틀렸다면 기업 프로필을 고친 뒤 다시 확인하세요.',
    }
  }
  if (tab.tab === 'needs-check') {
    return {
      intent,
      summary: `'${title}'은(는) '확인 필요'예요. 우리 회사 정보만으로 정할 수 없는 주요 조건이 ${major.length}개 있어요.`,
      related: [related(p, ctx, deadlineText(p, ctx.asOf), evidenceOf(major))],
      checks: unique(major.map((o) => `확인: ${conditionLabel(o)}`)),
      nextStep: '공고 상세에서 각 조건을 \'충족함\'으로 체크하면 신청 가능으로 바뀌어요.',
    }
  }
  return {
    intent,
    summary: `'${title}'은(는) 우리 회사 정보로 보면 '신청 가능'이에요${ev?.fit ? ` (적합도 ${Math.round(ev.fit.score)}점, 검증 전 시험값)` : ''}.`,
    related: [related(p, ctx, deadlineText(p, ctx.asOf))],
    checks: unique(checklist.map((o) => `신청 전 확인: ${conditionLabel(o)}`)).slice(0, 6),
    nextStep: '제출 서류를 확인하고 마감 전에 신청하세요.',
  }
}

function search(question: string, ctx: RuleContext, topics: SupportCategoryCode[]): RuleAnswer {
  const matched = matchPrograms(question, ctx.programs).map((m) => m.program)
  const byTopic = topics.length > 0 ? filterByTopics(ctx.programs, topics).filter((p) => isOpen(p, ctx.asOf)) : []
  const items = (matched.length > 0 ? matched : byTopic).slice(0, MAX_ITEMS)
  if (items.length === 0) {
    return {
      intent: 'search',
      summary: `질문과 맞는 공고를 찾지 못했어요. ${NOT_FOUND}`,
      related: [],
      checks: EXAMPLE_QUESTIONS.slice(0, 3).map((q) => `예: "${q}"`),
      nextStep: '공고 이름의 일부나 분야(전시회, 인증, 물류 등)로 다시 물어보세요.',
    }
  }
  const label = matched.length > 0 ? '질문과 관련된 공고' : `${topicText(topics)} 분야의 접수 중인 공고`
  return {
    intent: 'search',
    summary: `${label}를 ${items.length}건 찾았어요.`,
    related: items.map((p) => related(p, ctx, deadlineText(p, ctx.asOf))),
    checks: [],
    nextStep: '공고 이름을 넣어 "제출 서류", "신청 자격", "지원 금액"을 물어보면 자세히 알려 드려요.',
  }
}

/** 질문 하나에 대한 규칙 답변 */
export function answerQuestion(question: string, ctx: RuleContext): RuleAnswer {
  const intent = detectIntent(question)
  const topics = detectTopics(question)
  if (intent === 'help') return help()
  if (intent === 'documents' || intent === 'eligibility' || intent === 'amount') {
    const matches = matchPrograms(question, ctx.programs)
    const top = matches[0]
    // 공고 하나가 뚜렷하게 맞으면 그 공고로 답한다
    // 비슷하게 맞는 공고가 여럿이면 하나로 정하지 않고 목록으로 보여 준다.
    // 다만 그중 검수한 공고가 하나뿐이면 그 공고로 답한다
    if (top) {
      const ties = matches.filter((m) => m.score >= top.score - 0.15)
      const reviewed = ties.filter((m) => !m.program.autoExtracted)
      if (ties.length === 1) return focusAnswer(intent, top.program, ctx)
      if (reviewed.length === 1) return focusAnswer(intent, reviewed[0]!.program, ctx)
    }
    if (intent === 'eligibility' && matches.length === 0) return recommend(ctx, topics)
    if (matches.length > 1) {
      return {
        intent,
        summary: `어느 공고를 말씀하시는지 정하기 어려워요. 비슷한 공고가 ${matches.length}건 있어요. 공고 이름을 조금 더 정확히 적어 주세요.`,
        related: matches.slice(0, MAX_ITEMS).map((m) => related(m.program, ctx, deadlineText(m.program, ctx.asOf))),
        checks: [],
        nextStep: '예: "수출 패키지 지원 제출 서류는 뭐야?"',
      }
    }
    return search(question, ctx, topics)
  }
  if (intent === 'recommend') return recommend(ctx, topics)
  if (intent === 'deadline') return deadline(ctx, topics, question)
  // "해외 전시회 지원 공고 있어?"처럼 분야가 보이면 그 분야의 접수 중 공고를 자격·적합도 순으로
  if (topics.length > 0) return recommend(ctx, topics)
  return search(question, ctx, topics)
}

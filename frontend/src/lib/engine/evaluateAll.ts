/*
 * 공고 전체에 대한 자격·적합도·기회비용 계산 (순수 함수). REVISION_05부터:
 * - 신청 자격은 v3(정답세트 판정식) 3탭 분류: 신청 가능 / 확인 필요 / 신청 불가 (eligibilityV3.ts)
 * - 적합도는 v1(5요소)이며 신청 가능 탭 공고에만 계산한다 (fitV1.ts)
 * - v2 자격 판정(eligibility.ts)과 v0 적합도(fit.ts) 함수는 지우지 않고 비교용으로 남긴다.
 * 판정 조건(v3)이 없는 공고는 자격 결과가 null이다(어느 탭에도 넣지 않는다).
 */
import type { IsoDate } from '@/types/common'
import type { CompanyProfile } from '@/types/profile'
import type { Program, SupportStage } from '@/types/program'
import type {
  ConditionResult,
  EligibilityResult,
  ExportStageDiagnosis,
  FitFactorResult,
  FitScoreResult,
  OpportunityCostResult,
} from '@/types/results'
import type { SelfCheckAnswers } from '@/types/selfCheck'
import { CONDITION_TYPE_NAME, CONDITION_TYPE_STEP, PER_NOTICE_TYPES } from '@/constants/conditionTypes'
import { diagnoseExportStage } from './diagnosis'
import { classifyTabs, noConditionsTab, type ConditionAnswer, type ConditionOutcome, type EngineProfile, type TabResult } from './eligibilityV3'
import { toEngineProfile } from './engineProfile'
import { computeFitV1Factors, evaluateFitV1, noticeIndustryTags, noticeText } from './fitV1'
import { evaluateOpportunityCost } from './opportunityCost'
import { normalizeText, similarity } from './textSimilarity'

export const ELIGIBILITY_V3_VERSION = 'eligibility-3.0.0'

export interface ProgramEvaluation {
  eligibility: EligibilityResult | null
  /** 3탭 분류 상세 (조건별 값·중요도·기업 확인 여부). 조건이 없으면 null */
  tab: TabResult | null
  /** 신청 가능 탭 공고에만 계산한다 */
  fit: FitScoreResult | null
  /** 계산 근거 표용 요소별 결과. 신청 가능이 아니면 [] */
  fitFactors: FitFactorResult[]
  opportunity: OpportunityCostResult | null
}

export interface EvaluationContext {
  /** 데이터 기준일 */
  asOf: IsoDate | null
  selfChecks: SelfCheckAnswers | null
}

export interface EvaluationSet {
  diagnosis: ExportStageDiagnosis | null
  engineProfile: EngineProfile
  byId: Map<string, ProgramEvaluation>
}

function companyValueOf(o: ConditionOutcome, p: EngineProfile): string | null {
  const field = o.condition.field ?? ''
  const v: unknown = {
    company_type: [p.size, ...p.attrs].filter(Boolean).join(', ') || null,
    hq_region: p.hq,
    site_region: [...p.sites, p.hq].filter(Boolean).join(', ') || null,
    industry: p.industry?.join(', ') ?? null,
    product_hs: p.product_hs?.[0] ?? null,
    export_usd: p.export_usd === null ? null : `${p.export_usd.toLocaleString('ko-KR')} USD`,
    revenue_krw: p.revenue_krw === null ? null : `${p.revenue_krw.toLocaleString('ko-KR')}원`,
    business_age_years: p.age === null ? null : `${p.age}년`,
    employees: p.employees === null ? null : `${p.employees}명`,
    certification: p.certs === null ? null : p.certs.join(', ') || '없음',
    debt_ratio: p.debt_ratio === null ? null : `${Math.round(p.debt_ratio)}%`,
  }[field]
  return typeof v === 'string' ? v : null
}

function toConditionResult(o: ConditionOutcome, p: EngineProfile, sourceUrl: string | null): ConditionResult {
  const c = o.condition
  const typeName = CONDITION_TYPE_NAME[c.condType] ?? c.condType
  const step = CONDITION_TYPE_STEP[c.condType] ?? null
  // 기업 프로필에 입력할 곳이 있는 항목만 '기업 정보에 없는 항목'(입력 링크). 입력 단계가 없는 항목(인증 등)은 공고에서 직접 확인
  const missingInput = o.state === 'unknown' && c.condType.startsWith('A') && companyValueOf(o, p) === null && step !== null
  const reason =
    o.state === 'unknown'
      ? missingInput
        ? '기업 정보에 없는 항목입니다'
        : PER_NOTICE_TYPES.has(c.condType)
          ? '공고마다 기준이 달라 직접 확인이 필요합니다'
          : '원문을 보고 직접 확인해야 하는 조건입니다'
      : o.userDecided
        ? '기업 확인으로 판정'
        : c.kind === '제외'
          ? o.state === 'met'
            ? '제외 대상에 해당하지 않음'
            : '제외 대상에 해당함'
          : o.state === 'met'
            ? '충족'
            : '충족하지 않음'
  return {
    ruleId: c.condId,
    label: `${typeName}${c.valueRaw ? `: ${c.valueRaw}` : ''}`,
    kind: c.kind === '제외' ? 'exclusion' : 'required',
    group: c.group,
    scope: c.scope,
    status: o.state === 'unknown' ? 'needs-check' : o.state,
    reasonCode: o.state === 'unknown' ? (missingInput ? 'missing-input' : 'not-automatable') : null,
    reason,
    companyValue: companyValueOf(o, p),
    certainty: c.certainty === '애매' ? 'ambiguous' : 'clear',
    exceptionText: null,
    selfChecked: o.userDecided,
    selfCheckable: o.state === 'unknown' ? !missingInput : o.userDecided,
    inputStep: missingInput ? step : null,
    commonCheckKeys: null,
    basis: null,
    source: { quote: c.evidence ?? '', url: sourceUrl, locator: c.page !== null ? `${c.page}쪽` : null },
  }
}

function toEligibilityResult(program: Program, tab: TabResult, p: EngineProfile, asOf: IsoDate | null): EligibilityResult {
  const conditions = tab.outcomes.map((o) => toConditionResult(o, p, program.sourceUrl))
  return {
    programId: program.id,
    status: tab.tab,
    conditions,
    scopedConditions: [],
    groups: [],
    reasons: conditions.filter((c) => c.status !== 'met').map((c) => `${c.label} — ${c.reason}`),
    needsCheckCount: tab.majorUnknown.length + tab.checklist.length,
    selfCheckedCount: tab.userDecided.length,
    dataState: program.dataState ?? 'reviewed',
    basisDate: asOf,
    sourceUrl: program.sourceUrl,
    engineVersion: ELIGIBILITY_V3_VERSION,
  }
}

export function evaluateAll(
  programs: readonly Program[],
  profile: CompanyProfile,
  context: EvaluationContext,
): EvaluationSet {
  const diagnosis = diagnoseExportStage(profile, { asOf: context.asOf })
  const engineProfile = toEngineProfile(profile, context.asOf, context.selfChecks?.common ?? {})
  const tabs = new Map<string, TabResult | null>()
  for (const program of programs) {
    if (!program.conditions || program.conditions.length === 0) {
      // 조건을 찾지 못한 공고도 3탭 중 하나에 넣는다: 원문 확인이 필요한 '확인 필요'
      tabs.set(program.id, noConditionsTab())
      continue
    }
    const stored = context.selfChecks?.programs[program.id] ?? {}
    const answers: Record<string, ConditionAnswer> = {}
    for (const [condId, entry] of Object.entries(stored)) answers[condId] = entry.answer
    tabs.set(program.id, classifyTabs(program.conditions, engineProfile, program.id, program.parentId, answers))
  }

  // 업종 언급이 없는 신청 가능 공고: 기업 업종명·제품 설명과 공고 본문의 글자 유사도 (0~1)
  const companyText = [profile.industryName, profile.productName].filter(Boolean).join(' ')
  const textTargets = programs.filter((p) => tabs.get(p.id)?.tab === 'eligible' && noticeIndustryTags(p).length === 0)
  const textSimilarity = new Map<string, number>()
  if (normalizeText(companyText).length >= 2 && textTargets.length > 0) {
    const sims = similarity(companyText, textTargets.map(noticeText))
    textTargets.forEach((p, i) => textSimilarity.set(p.id, Math.max(0, Math.min(1, sims[i] ?? 0))))
  }
  const fitContext = { diagnosis, textSimilarity, asOf: context.asOf }

  const byId = new Map<string, ProgramEvaluation>()
  for (const program of programs) {
    const tab = tabs.get(program.id) ?? null
    const eligibility = tab ? toEligibilityResult(program, tab, engineProfile, context.asOf) : null
    const opportunity = evaluateOpportunityCost(program, { ownedDocumentTypes: null, today: context.asOf })
    const eligible = tab?.tab === 'eligible'
    byId.set(program.id, {
      eligibility,
      tab,
      fit: eligible ? evaluateFitV1(profile, program, fitContext) : null,
      fitFactors: eligible ? computeFitV1Factors(profile, program, fitContext) : [],
      opportunity,
    })
  }
  return { diagnosis, engineProfile, byId }
}

/** 지원 단계별 공고 수 (신청 불가 제외). 한 공고가 여러 단계에 걸치면 단계마다 센다 */
export function countByPhase(
  programs: readonly Program[],
  evaluations: Map<string, ProgramEvaluation>,
): Record<SupportStage, number> {
  const counts: Record<SupportStage, number> = { preparation: 0, 'market-entry': 0, execution: 0, localization: 0 }
  for (const program of programs) {
    if (evaluations.get(program.id)?.eligibility?.status === 'ineligible') continue
    for (const phase of program.supportPhases ?? []) counts[phase] += 1
  }
  return counts
}

const STATUS_RANK = { eligible: 0, 'needs-check': 1, ineligible: 2 } as const

function deadlineOrder(a: Program, b: Program): number {
  const da = a.applyEnd ? a.applyEnd.slice(0, 10) : null
  const db = b.applyEnd ? b.applyEnd.slice(0, 10) : null
  if (da === db) return 0
  if (da === null) return 1
  if (db === null) return -1
  return da < db ? -1 : 1
}

/**
 * 맞춤 추천 정렬 (REVISION_05 §5.1)
 * - 신청 가능: 적합도 높은 순(없음은 뒤) → 마감 빠른 순
 * - 확인 필요: 확인할 주요 조건이 적은 순 → 마감 빠른 순
 * - 신청 불가: 마감 빠른 순
 * 상태가 다르면 신청 가능 → 확인 필요 → 신청 불가 → (판정 없음). 마지막은 ID 순.
 */
export function compareRecommended(
  a: Program,
  b: Program,
  evaluations: Map<string, ProgramEvaluation>,
  compareIds: (x: string, y: string) => number,
): number {
  const ea = evaluations.get(a.id)
  const eb = evaluations.get(b.id)
  const ra = ea?.eligibility ? STATUS_RANK[ea.eligibility.status] : 3
  const rb = eb?.eligibility ? STATUS_RANK[eb.eligibility.status] : 3
  if (ra !== rb) return ra - rb
  if (ra === 0) {
    const fa = ea?.fit?.score ?? null
    const fb = eb?.fit?.score ?? null
    if (fa !== fb) {
      if (fa === null) return 1
      if (fb === null) return -1
      return fb - fa
    }
  } else if (ra === 1) {
    // 자격 조건이 없는 공고(원문 확인)는 확인 필요 탭의 맨 뒤
    const ma = ea?.tab?.noConditions ? Number.POSITIVE_INFINITY : (ea?.tab?.majorUnknown.length ?? 0)
    const mb = eb?.tab?.noConditions ? Number.POSITIVE_INFINITY : (eb?.tab?.majorUnknown.length ?? 0)
    if (ma !== mb) return ma - mb
  }
  return deadlineOrder(a, b) || compareIds(a.id, b.id)
}

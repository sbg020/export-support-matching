/*
 * 공고 전체에 대한 자격·적합도·기회비용 계산 (순수 함수).
 *
 * 내용 유사도 백분위는 화면 필터와 상관없이 판정 대상(신청 불가 제외) 전체로 계산한다.
 * 그래서 필터를 바꿔도 같은 공고의 적합도는 바뀌지 않는다 (REVISION_02 §7.2).
 */
import type { IsoDate } from '@/types/common'
import type { CompanyProfile } from '@/types/profile'
import type { Program, SupportStage } from '@/types/program'
import type {
  EligibilityResult,
  ExportStageDiagnosis,
  FitFactorResult,
  FitScoreResult,
  OpportunityCostResult,
} from '@/types/results'
import type { SelfCheckAnswers } from '@/types/selfCheck'
import { diagnoseExportStage } from './diagnosis'
import { evaluateEligibility } from './eligibility'
import { companyTextOf, computeFitFactors, evaluateFit, programTextOf, type FitContext } from './fit'
import { evaluateOpportunityCost } from './opportunityCost'
import { normalizeText, percentileRanks, similarity } from './textSimilarity'

export interface ProgramEvaluation {
  eligibility: EligibilityResult | null
  /** 신청 불가 공고는 적합도를 계산하지 않는다 */
  fit: FitScoreResult | null
  /** 계산 근거 표용 항목별 결과 (점수가 없어도 항목별 이유를 보여 준다). 신청 불가면 [] */
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
  byId: Map<string, ProgramEvaluation>
}

export function evaluateAll(
  programs: readonly Program[],
  profile: CompanyProfile,
  context: EvaluationContext,
): EvaluationSet {
  const diagnosis = diagnoseExportStage(profile, { asOf: context.asOf })
  const eligibilities = new Map(
    programs.map((program) => [
      program.id,
      evaluateEligibility(profile, program, { asOf: context.asOf, selfChecks: context.selfChecks }),
    ]),
  )

  const targets = programs.filter((program) => eligibilities.get(program.id)?.status !== 'ineligible')
  const companyText = companyTextOf(profile)
  const percentiles = new Map<string, number>()
  if (normalizeText(companyText).length >= 2 && targets.length > 0) {
    const ranks = percentileRanks(similarity(companyText, targets.map(programTextOf)))
    targets.forEach((program, index) => percentiles.set(program.id, ranks[index] ?? 0))
  }

  const byId = new Map<string, ProgramEvaluation>()
  for (const program of programs) {
    const eligibility = eligibilities.get(program.id) ?? null
    const opportunity = evaluateOpportunityCost(program, { ownedDocumentTypes: null, today: context.asOf })
    if (eligibility?.status === 'ineligible') {
      byId.set(program.id, { eligibility, fit: null, fitFactors: [], opportunity })
      continue
    }
    const fitContext: FitContext = {
      diagnosis,
      textPercentile: percentiles.get(program.id) ?? null,
      textPopulation: targets.length,
      companyText,
      asOf: context.asOf,
    }
    byId.set(program.id, {
      eligibility,
      fit: evaluateFit(profile, program, fitContext),
      fitFactors: computeFitFactors(profile, program, fitContext),
      opportunity,
    })
  }
  return { diagnosis, byId }
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

/**
 * 맞춤 추천 정렬 (§7.1): 신청 가능 → 확인 필요 → 신청 불가 → (판정 없음),
 * 같은 상태 안에서 적합도 높은 순(없음은 뒤) → 마감일 빠른 순(없음은 뒤) → ID
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
  const fa = ea?.fit?.score ?? null
  const fb = eb?.fit?.score ?? null
  if (fa !== fb) {
    if (fa === null) return 1
    if (fb === null) return -1
    return fb - fa
  }
  const da = a.applyEnd ? a.applyEnd.slice(0, 10) : null
  const db = b.applyEnd ? b.applyEnd.slice(0, 10) : null
  if (da !== db) {
    if (da === null) return 1
    if (db === null) return -1
    return da < db ? -1 : 1
  }
  return compareIds(a.id, b.id)
}

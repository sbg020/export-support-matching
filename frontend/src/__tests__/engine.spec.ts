import { describe, expect, it } from 'vitest'
import { evaluateEligibility, fullYearsBetween } from '@/lib/engine/eligibility'
import { ACTIVE_FIT_CRITERIA, FIT_CRITERIA_CANDIDATES, bonusAdjustment, evaluateFit, type FitContext } from '@/lib/engine/fit'
import { evaluateOpportunityCost, selfPaymentMax } from '@/lib/engine/opportunityCost'
import { ACTIVE_EXPORT_STAGE_CRITERIA, diagnoseExportStage } from '@/lib/engine/diagnosis'
import { compareRecommended, countByPhase, evaluateAll } from '@/lib/engine/evaluateAll'
import { charBigrams, normalizeText, percentileRanks, similarity } from '@/lib/engine/textSimilarity'
import { deriveSupportPhases, deriveSupportAreas, recommendedPhases } from '@/constants/categories'
import { compareProgramIds } from '@/repositories/staticProgramRepository'
import { createEmptyProfile } from '@/lib/profile'
import type { CompanyProfile } from '@/types/profile'
import type { BonusItem } from '@/types/program'
import { blankProgram, draftProgram, rule } from './fixtures'

const profileWith = (overrides: Partial<CompanyProfile>): CompanyProfile => ({ ...createEmptyProfile(), ...overrides })

describe('신청 자격 판정 v2', () => {
  it('자격 규칙이 없으면 판정하지 않는다 (null)', () => {
    expect(evaluateEligibility(createEmptyProfile(), draftProgram())).toBeNull()
    expect(evaluateEligibility(createEmptyProfile(), draftProgram({ eligibilityRules: [] }))).toBeNull()
  })

  it('데이터 상태가 없으면 판정하지 않고, 초안이면 결과에 초안·기준일을 남긴다', () => {
    const rules = [rule({ op: 'no-limit' })]
    expect(evaluateEligibility(createEmptyProfile(), blankProgram({ eligibilityRules: rules }))).toBeNull()
    const result = evaluateEligibility(createEmptyProfile(), draftProgram({ eligibilityRules: rules }))
    expect(result?.dataState).toBe('draft')
    expect(result?.basisDate).toBe('2030-06-30')
    expect(result?.sourceUrl).toBeNull()
  })

  it('이미 충족된 그룹 안의 확인 필요는 세지 않는다', () => {
    const program = draftProgram({
      eligibilityRules: [
        rule({ id: 'a', group: 'A', field: 'manual_check' }),
        rule({ id: 'b', group: 'A', op: 'no-limit' }),
      ],
    })
    const result = evaluateEligibility(createEmptyProfile(), program)
    expect(result?.status).toBe('eligible')
    expect(result?.needsCheckCount).toBe(0)
  })

  it('입력이 없는 조건은 입력할 단계를 알려 주고 직접 확인 대상이 아니다', () => {
    const program = draftProgram({ eligibilityRules: [rule({ field: 'export_usd', op: '<=', value: 1000, basis: '2029년' })] })
    const condition = evaluateEligibility(createEmptyProfile(), program)?.conditions[0]
    expect(condition?.reasonCode).toBe('missing-input')
    expect(condition?.inputStep).toBe(3)
    expect(condition?.selfCheckable).toBe(false)
  })

  it('기간이 달라 판정하지 않은 조건에 입력값 기준 결과를 함께 적는다', () => {
    const program = draftProgram({ eligibilityRules: [rule({ field: 'export_usd', op: '<=', value: 1000, basis: '2029년' })] })
    const result = evaluateEligibility(
      profileWith({ exportUsdLastYear: 5000, exportPeriodStart: '2029-02', exportPeriodEnd: '2030-01' }),
      program,
    )
    expect(result?.conditions[0]?.reason).toContain('입력값 기준으로는 미충족')
  })

  it('원화 수출액 기준은 환산하지 않는다', () => {
    const program = draftProgram({ eligibilityRules: [rule({ field: 'export_usd', op: '<=', value: 1000, unit: 'KRW' })] })
    expect(evaluateEligibility(profileWith({ exportUsdLastYear: 10 }), program)?.conditions[0]?.reasonCode).toBe(
      'not-automatable',
    )
  })

  it('업력은 만 연수로 센다', () => {
    expect(fullYearsBetween('2015-06-02', '2022-06-01')).toBe(6)
    expect(fullYearsBetween('2015-06-01', '2022-06-01')).toBe(7)
  })
})

describe('수출단계 진단 v1', () => {
  const stageOf = (usd: number | null) => diagnoseExportStage(profileWith({ exportUsdLastYear: usd }))?.stage ?? null

  it('기준은 통합공고 원문 문구·쪽·확인일과 함께 등록되어 있다', () => {
    expect(ACTIVE_EXPORT_STAGE_CRITERIA.version).toBe('export-stage-v1')
    expect(ACTIVE_EXPORT_STAGE_CRITERIA.source.locator).toBe('3쪽')
    expect(ACTIVE_EXPORT_STAGE_CRITERIA.source.quote).toContain('수출초보 전년도 수출액 ‘1,000불~10만불 미만’')
    expect(ACTIVE_EXPORT_STAGE_CRITERIA.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('수출액이 없으면 진단하지 않는다', () => {
    expect(stageOf(null)).toBeNull()
  })

  it('경계값 직전·일치·직후', () => {
    expect(stageOf(0)).toBe('domestic')
    expect(stageOf(999)).toBe('domestic')
    expect(stageOf(1_000)).toBe('beginner')
    expect(stageOf(50_000)).toBe('beginner')
    expect(stageOf(99_999)).toBe('beginner')
    expect(stageOf(100_000)).toBe('promising')
    expect(stageOf(100_001)).toBe('promising')
    expect(stageOf(999_999)).toBe('promising')
    expect(stageOf(1_000_000)).toBe('growth')
    expect(stageOf(4_999_999)).toBe('growth')
    expect(stageOf(5_000_000)).toBe('strong')
  })

  it('다음 단계 조건과 권장 지원 단계를 기준표에서 만든다', () => {
    const beginner = diagnoseExportStage(profileWith({ exportUsdLastYear: 50_000 }))
    expect(beginner?.nextStageConditions).toEqual(['직전 연도 수출액 10만 달러 이상이면 유망 단계입니다.'])
    expect(beginner?.primaryPhases).toEqual(['market-entry'])
    expect(beginner?.secondaryPhases).toEqual(['preparation', 'execution'])
    expect(diagnoseExportStage(profileWith({ exportUsdLastYear: 9_000_000 }))?.nextStageConditions).toEqual([
      '최상위 단계입니다.',
    ])
  })

  it('측정 기간이 직전 연도 1~12월이 아니면 참고용 안내를 붙인다', () => {
    const exact = diagnoseExportStage(
      profileWith({ exportUsdLastYear: 10, exportPeriodStart: '2025-01', exportPeriodEnd: '2025-12' }),
      { asOf: '2026-10-30' },
    )
    expect(exact?.periodNote).toBeNull()
    const other = diagnoseExportStage(
      profileWith({ exportUsdLastYear: 10, exportPeriodStart: '2025-07', exportPeriodEnd: '2026-06' }),
      { asOf: '2026-10-30' },
    )
    expect(other?.periodNote).toBe('측정 기간이 직전 연도(1~12월)와 달라 참고용입니다.')
  })
})

describe('지원 분야 체계', () => {
  it('세부 분야에서 지원 단계를 여러 개로 파생한다', () => {
    expect(deriveSupportPhases(null)).toBeNull()
    expect(deriveSupportPhases([])).toBeNull()
    expect(deriveSupportPhases(['C13'])).toEqual(['market-entry', 'execution'])
    expect(deriveSupportPhases(['C12'])).toEqual(['preparation', 'market-entry', 'execution'])
    expect(deriveSupportAreas(['C15'])).toEqual(['logistics', 'customs-fta'])
  })

  it('권장 지원 단계는 ◎와 ○를 읽는다', () => {
    expect(recommendedPhases('domestic')).toEqual({ primary: ['preparation'], secondary: ['market-entry'] })
    expect(recommendedPhases('promising').primary).toEqual(['market-entry', 'execution'])
  })
})

describe('적합도 v0', () => {
  const baseContext: FitContext = {
    diagnosis: null,
    textPercentile: null,
    textPopulation: 0,
    companyText: '',
    asOf: '2030-06-30',
  }

  it('시험용 기준(가설)이며 비교용 후보가 있다', () => {
    expect(ACTIVE_FIT_CRITERIA.status).toBe('hypothesis')
    expect(ACTIVE_FIT_CRITERIA.weights).toEqual({ interest: 0.4, stage: 0.3, text: 0.3 })
    expect(FIT_CRITERIA_CANDIDATES.map((c) => c.version)).toContain('fit-v0-equal')
  })

  it('반영할 항목이 2개 미만이면 점수를 만들지 않는다', () => {
    const program = draftProgram({ supportCategories: ['C01'], supportPhases: ['market-entry', 'execution'] })
    expect(evaluateFit(profileWith({ interestAreas: ['exhibition'] }), program, baseContext)).toBeNull()
  })

  it('관심 분야 일치와 단계 가중치로 계산하고, 이유는 기여도 큰 순이다', () => {
    const program = draftProgram({ supportCategories: ['C01'], supportPhases: ['market-entry', 'execution'] })
    const profile = profileWith({ interestAreas: ['exhibition'], exportUsdLastYear: 0 })
    const diagnosis = diagnoseExportStage(profile)
    const fit = evaluateFit(profile, program, { ...baseContext, diagnosis })
    // 내수: 시장진출 ○ 0.5 → (0.4×1 + 0.3×0.5) / 0.7 × 100 = 78.57
    expect(fit?.score).toBe(79)
    expect(fit?.reasons[0]).toContain("관심 분야 '해외 전시회'")
    expect(fit?.factors.find((f) => f.key === 'text')?.value).toBeNull()
    expect(fit?.criteriaStatus).toBe('hypothesis')
  })

  it('공고가 대상 수출단계를 명시하면 그 단계에 있을 때만 1이다', () => {
    const program = draftProgram({ supportCategories: ['C02'], targetExportStages: ['beginner'] })
    const profile = profileWith({ interestAreas: ['market-research'], exportUsdLastYear: 0 })
    const fit = evaluateFit(profile, program, { ...baseContext, diagnosis: diagnoseExportStage(profile) })
    expect(fit?.factors.find((f) => f.key === 'stage')?.value).toBe(0)
  })

  it('가점·감점은 점수와 프로필 코드가 있는 항목만 보정한다', () => {
    const bonus = (id: string, points: number | null, matchKeys: string[] | null): BonusItem => ({
      id,
      item: id,
      effectText: null,
      certainty: 'clear',
      points,
      matchKeys,
      source: null,
    })
    const program = draftProgram({
      bonusItems: [bonus('b1', 2, ['venture']), bonus('b2', 3, ['innobiz']), bonus('b3', null, null)],
    })
    const result = bonusAdjustment(profileWith({ certificationStatus: 'has', certifications: ['venture'] }), program, 10)
    expect(result.adjustment).toBe(4)
    expect(result.applied.map((b) => b.id)).toEqual(['b1'])
    expect(result.toCheck.map((b) => b.id)).toEqual(['b3'])
  })
})

describe('공고 전체 계산과 추천 정렬', () => {
  const eligibleRule = [rule({ op: 'no-limit' })]
  const programs = [
    draftProgram({ id: 'X3', eligibilityRules: [rule({ field: 'company_type', op: 'in', value: ['중소기업'] })] }),
    draftProgram({ id: 'X1', eligibilityRules: eligibleRule, supportCategories: ['C01'], supportPhases: ['market-entry'] }),
    draftProgram({ id: 'X2', eligibilityRules: [rule({ field: 'manual_check' })], supportCategories: ['C01'] }),
  ]
  const profile = profileWith({ companySize: 'large', interestAreas: ['exhibition'], exportUsdLastYear: 0 })
  const set = evaluateAll(programs, profile, { asOf: '2030-06-30', selfChecks: null })

  it('신청 불가 공고는 적합도를 계산하지 않는다', () => {
    expect(set.byId.get('X3')?.eligibility?.status).toBe('ineligible')
    expect(set.byId.get('X3')?.fit).toBeNull()
    expect(set.byId.get('X3')?.fitFactors).toEqual([])
  })

  it('신청 가능 → 확인 필요 → 신청 불가 순서로 정렬한다', () => {
    const sorted = [...programs].sort((a, b) => compareRecommended(a, b, set.byId, compareProgramIds))
    expect(sorted.map((p) => p.id)).toEqual(['X1', 'X2', 'X3'])
  })

  it('지원 단계별 공고 수는 신청 불가를 빼고 센다', () => {
    expect(countByPhase(programs, set.byId)['market-entry']).toBe(1)
  })
})

describe('기회비용', () => {
  it('근거가 없는 공고는 결과 객체 자체가 null', () => {
    const context = { ownedDocumentTypes: null, today: null }
    expect(evaluateOpportunityCost(blankProgram(), context)).toBeNull()
    expect(evaluateOpportunityCost(draftProgram(), context)).toBeNull()
  })

  it('최대 자기부담은 총사업비 한도 − 지원금 한도가 0보다 클 때만 계산한다', () => {
    expect(selfPaymentMax(blankProgram({ totalBudgetMaxKrw: 10_000_000, maxAmountKrw: 7_000_000 }))?.value).toBe(3_000_000)
    expect(selfPaymentMax(blankProgram({ totalBudgetMaxKrw: 7_000_000, maxAmountKrw: 7_000_000 }))).toBeNull()
    expect(selfPaymentMax(blankProgram({ totalBudgetMaxKrw: null, maxAmountKrw: 7_000_000 }))).toBeNull()
  })

  it('마감 여유는 넘겨받은 기준일 대비이며, 정산 방식은 원문 근거 그대로다', () => {
    const settlement = { type: 'reimbursement' as const, source: { quote: '사후 정산', url: null, locator: null } }
    const result = evaluateOpportunityCost(draftProgram({ applyEnd: '2030-07-10', settlement }), {
      ownedDocumentTypes: null,
      today: '2030-06-30',
    })
    expect(result?.daysUntilDeadline).toBe(10)
    expect(result?.basisDate).toBe('2030-06-30')
    expect(result?.settlement?.type).toBe('reimbursement')
    expect(result?.prepHours).toBeNull()
    expect(result?.newDocumentCount).toBeNull()
  })
})

describe('내용 유사도 (시험용)', () => {
  it('정규화와 글자 2-gram', () => {
    expect(normalizeText('Ａ 전시-회!')).toBe('a전시회')
    expect(charBigrams('전시회')).toEqual(['전시', '시회'])
  })

  it('비슷한 문장이 더 높고, 백분위는 같은 점수에 같은 값을 준다', () => {
    const scores = similarity('화장품 해외 전시회', ['해외 전시회 참가 지원', '국제운송 물류비 지원'])
    expect(scores[0]).toBeGreaterThan(scores[1] ?? 0)
    expect(percentileRanks([0.2, 0.2, 0.9])).toEqual([0.25, 0.25, 1])
    expect(percentileRanks([0.3])).toEqual([0.5])
  })
})

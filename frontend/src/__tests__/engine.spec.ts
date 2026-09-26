import { describe, expect, it } from 'vitest'
import { evaluateEligibility, fullYearsBetween } from '@/lib/engine/eligibility'
import { ACTIVE_FIT_CRITERIA, evaluateFit } from '@/lib/engine/fit'
import { evaluateOpportunityCost } from '@/lib/engine/opportunityCost'
import { ACTIVE_EXPORT_STAGE_CRITERIA, diagnoseExportStage } from '@/lib/engine/diagnosis'
import { createEmptyProfile } from '@/lib/profile'
import type { Program } from '@/types/program'

/**
 * 테스트 전용 공고 틀. 모든 값이 null인 '빈 공고'에서 시작해,
 * 각 테스트에 필요한 규칙만 채운다. 실제 공고 데이터가 아니며 화면에 쓰지 않는다.
 */
function blankProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'test-only',
    title: null,
    sourceUrl: null,
    sourceTitle: null,
    sourcePublishedAt: null,
    verifiedAt: null,
    applyStart: null,
    applyEnd: null,
    receptionStatus: null,
    announcementDate: null,
    agreementDate: null,
    ministry: null,
    agency: null,
    agencyType: null,
    regions: null,
    stage: null,
    supportAreas: null,
    supportTypes: null,
    maxAmountKrw: null,
    selfPayment: null,
    summaryEasy: null,
    targetDescription: null,
    useExamples: null,
    eligibilityRules: null,
    requiredDocs: null,
    obligations: null,
    duplicateSupportNotes: null,
    relatedProgramIds: null,
    prepEstimate: null,
    ...overrides,
  }
}

const source = { quote: '테스트 근거 문구', url: null, locator: null }

describe('신청 자격 판정', () => {
  it('자격 규칙이 없으면 판정하지 않는다 (null)', () => {
    expect(evaluateEligibility(createEmptyProfile(), blankProgram())).toBeNull()
    expect(evaluateEligibility(createEmptyProfile(), blankProgram({ eligibilityRules: [] }))).toBeNull()
  })

  it('원문 URL이나 검증일이 없으면 판정하지 않는다', () => {
    const rules = [{ id: 'r1', label: '수출액', kind: 'export-usd-min' as const, valueUsd: 1, source }]
    expect(evaluateEligibility(createEmptyProfile(), blankProgram({ eligibilityRules: rules }))).toBeNull()
  })

  it('입력값이 없으면 확인 필요, 수동 규칙도 확인 필요', () => {
    const program = blankProgram({
      sourceUrl: 'test://source',
      verifiedAt: '2000-01-01',
      eligibilityRules: [
        { id: 'r1', label: '수출액', kind: 'export-usd-max', valueUsd: 100, source },
        { id: 'r2', label: '기타 조건', kind: 'manual', source },
      ],
    })
    const result = evaluateEligibility(createEmptyProfile(), program)
    expect(result?.status).toBe('needs-check')
    expect(result?.conditions.every((c) => c.status === 'needs-check')).toBe(true)
    expect(result?.basisDate).toBe('2000-01-01')
  })

  it('미충족 조건이 하나라도 있으면 신청 불가', () => {
    const program = blankProgram({
      sourceUrl: 'test://source',
      verifiedAt: '2000-01-01',
      eligibilityRules: [{ id: 'r1', label: '수출액 상한', kind: 'export-usd-max', valueUsd: 100, source }],
    })
    const withZero = evaluateEligibility({ ...createEmptyProfile(), exportUsdLastYear: 0 }, program)
    expect(withZero?.status).toBe('eligible')
    const over = evaluateEligibility({ ...createEmptyProfile(), exportUsdLastYear: 1000 }, program)
    expect(over?.status).toBe('ineligible')
    expect(over?.reasons.length).toBe(1)
  })

  it('업력은 공고일 기준이며 공고일이 없으면 오늘 날짜로 대신하지 않는다', () => {
    const program = blankProgram({
      sourceUrl: 'test://source',
      verifiedAt: '2000-01-01',
      eligibilityRules: [{ id: 'r1', label: '업력', kind: 'years-since-founded-max', years: 7, source }],
    })
    const result = evaluateEligibility({ ...createEmptyProfile(), foundedAt: '1990-01-01' }, program)
    expect(result?.conditions[0]?.status).toBe('needs-check')
    expect(fullYearsBetween('2015-06-02', '2022-06-01')).toBe(6)
  })
})

describe('적합도·기회비용·진단', () => {
  it('검증된 적합도 기준이 없으면 계산하지 않는다', () => {
    expect(ACTIVE_FIT_CRITERIA).toBeNull()
    expect(evaluateFit(createEmptyProfile(), blankProgram({ verifiedAt: '2000-01-01' }))).toBeNull()
  })

  it('근거가 없는 기회비용은 결과 객체 자체가 null', () => {
    const context = { ownedDocumentTypes: null, today: null }
    expect(evaluateOpportunityCost(blankProgram(), context)).toBeNull()
    expect(evaluateOpportunityCost(blankProgram({ verifiedAt: '2000-01-01' }), context)).toBeNull()
  })

  it('검증된 진단 기준이 없으면 수출단계를 판정하지 않는다', () => {
    expect(ACTIVE_EXPORT_STAGE_CRITERIA).toBeNull()
    expect(diagnoseExportStage({ ...createEmptyProfile(), exportUsdLastYear: 0 })).toBeNull()
  })
})

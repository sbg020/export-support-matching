/*
 * 재무제표 금액 입력: ② 기업 규모의 선택 항목, 미입력이면 적합도 재무 요소 0점
 */
import { describe, expect, it } from 'vitest'
import { computeFitV1Factors } from '@/lib/engine/fitV1'
import { financeSummary } from '@/lib/finance'
import { FIELD_STEP, validateStep } from '@/lib/profile'
import { createTestAccountProfile } from '@/data/testAccountProfile'
import { diagnoseExportStage } from '@/lib/engine/diagnosis'
import { draftProgram } from '@/__tests__/fixtures'
import type { CompanyProfile } from '@/types/profile'

const FINANCE_FIELDS = ['revenuePrevKrw', 'operatingIncomeKrw', 'netIncomeKrw', 'totalLiabilitiesKrw', 'totalEquityKrw'] as const

function financeFactor(profile: CompanyProfile) {
  const program = draftProgram({ id: 'F1', supportCategories: ['C13'] })
  const factors = computeFitV1Factors(profile, program, {
    diagnosis: diagnoseExportStage(profile),
    textSimilarity: new Map(),
    asOf: '2026-10-20',
  })
  return factors.find((f) => f.key === 'finance')!
}

describe('재무제표 금액 입력', () => {
  it('5개 금액은 ② 기업 규모 단계의 선택 항목이다 (비워도 오류 없음)', () => {
    for (const field of FINANCE_FIELDS) expect(FIELD_STEP[field]).toBe(2)
    const profile = { ...createTestAccountProfile(), ...Object.fromEntries(FINANCE_FIELDS.map((f) => [f, null])) } as CompanyProfile
    const errors = validateStep(2, profile)
    for (const field of FINANCE_FIELDS) expect(errors[field]).toBeUndefined()
  })

  it('TEST 계정은 6개 금액이 모두 있다', () => {
    expect(financeSummary(createTestAccountProfile()).status).toBe('complete')
  })

  it('입력하면 재무 원형으로 계산하고, 하나라도 빠지면 재무 요소 0점', () => {
    const full = financeFactor(createTestAccountProfile())
    expect(full.value).toBe(1) // 확장형 × C13 국제운송 = 핵심
    expect(full.reason).toContain('재무 원형 확장형')
    const missing = financeFactor({ ...createTestAccountProfile(), netIncomeKrw: null })
    expect(missing.value).toBe(0)
    expect(missing.contribution).toBe(0)
    expect(missing.reason).toContain('0점')
  })
})

describe('적합도 요소 (가점 삭제)', () => {
  it('4개 요소가 각각 25%이고 가점 요소는 계산하지 않는다', async () => {
    const { FIT_V1_WEIGHTS } = await import('@/constants/fitV1')
    expect(FIT_V1_WEIGHTS).toEqual({ interest: 0.25, industry: 0.25, stage: 0.25, finance: 0.25 })
    const program = draftProgram({ id: 'F2', supportCategories: ['C13'], bonusItems: [] })
    const profile = createTestAccountProfile()
    const keys = computeFitV1Factors(profile, program, { diagnosis: diagnoseExportStage(profile), textSimilarity: new Map(), asOf: '2026-10-20' }).map((f) => f.key)
    expect(keys).toEqual(['interest', 'industry', 'stage', 'finance'])
  })
})

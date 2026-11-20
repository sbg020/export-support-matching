/*
 * 재무 원형 기준표 v4 (REVISION_06_FINANCE_REFERENCE §5)
 */
import { describe, expect, it } from 'vitest'
import {
  ARCHETYPE_REFERENCE,
  assignCluster,
  industryGroupId,
  normalizeKsic,
  percentileOf,
  type FinanceVariable,
} from '@/lib/engine/archetypeReference'
import { financeArchetype, financeArchetypeText } from '@/lib/engine/fitV1'
import { createTestAccountProfile } from '@/data/testAccountProfile'
import type { CompanyProfile } from '@/types/profile'

const values = (c: Partial<Record<FinanceVariable, number | null>>): Record<FinanceVariable, number | null> => ({
  growth: c.growth ?? null,
  opMargin: c.opMargin ?? null,
  debtRatio: c.debtRatio ?? null,
  nonOpBalance: c.nonOpBalance ?? null,
})

/** TEST 프로필에서 재무 금액만 바꾼 테스트 전용 프로필 */
const profileWith = (patch: Partial<CompanyProfile>): CompanyProfile => ({ ...createTestAccountProfile(), ...patch })

describe('기준표', () => {
  it('버전·상태·단계별 군집 수', () => {
    expect(ARCHETYPE_REFERENCE.version).toBe('fin-archetype-v4-2025')
    expect(ARCHETYPE_REFERENCE.status).toBe('검증 전 시험값')
    const k = Object.fromEntries(Object.entries(ARCHETYPE_REFERENCE.stages).map(([s, t]) => [s, t.clusters.length]))
    expect(k).toEqual({ domestic: 4, beginner: 4, promising: 4, growth: 4, strong: 3 })
  })

  it('검증 표본 39건이 모두 기대 군집으로 배정된다', () => {
    const cases = ARCHETYPE_REFERENCE.verificationCases
    expect(cases).toHaveLength(39)
    const mismatches = cases
      .map((c) => ({ c, got: assignCluster(values(c), c.stage, c.ksicMid)?.cluster.id }))
      .filter(({ c, got }) => got !== c.expectedCluster)
      .map(({ c, got }) => `${c.stage} ${c.ksicMid}: 기대 ${c.expectedCluster} / 결과 ${got}`)
    expect(mismatches).toEqual([])
  })
})

describe('TEST 계정', () => {
  it('C10 · 내수 · 증가율 18.0% · 영업이익률 4.0% · 부채비율 135% · 영업외수지 −1.0%p → 1_내수-C3 확장형', () => {
    const result = financeArchetype(createTestAccountProfile(), 'domestic')
    expect(result.clusterId).toBe('1_내수-C3')
    expect(result.archetype).toBe('확장형')
    expect(result.industryGroupLabel).toContain('식료품')
    expect(financeArchetypeText(result)).toBe(
      `재무 원형 확장형 (${result.clusterName}, 비교 업종: ${result.industryGroupLabel})`,
    )
  })
})

describe('사전분리 규칙 (원형 없음 + 사유)', () => {
  const cases: [string, Partial<CompanyProfile>, string][] = [
    ['재무 값이 모자라면', { revenuePrevKrw: null }, '재무 미입력'],
    ['당기 매출 0', { revenueKrw: 0 }, '매출소멸'],
    ['자본총계 ≤ 0', { totalEquityKrw: -10_000_000 }, '자본잠식'],
    ['매출 1억 원 미만', { revenueKrw: 90_000_000, revenuePrevKrw: 85_000_000, operatingIncomeKrw: 3_000_000, netIncomeKrw: 2_000_000 }, '매출 1억 원 미만'],
    ['부채비율 1,000% 초과', { totalLiabilitiesKrw: 1_300_000_000 }, '부채비율 1,000% 초과'],
    ['영업이익률 −100% 미만', { operatingIncomeKrw: -500_000_000 }, '영업이익률 -100% 미만'],
    ['매출액증가율 300% 초과', { revenuePrevKrw: 80_000_000 }, '매출액증가율 300% 초과'],
  ]
  it.each(cases)('%s', (_name, patch, reason) => {
    const result = financeArchetype(profileWith(patch), 'domestic')
    expect(result.archetype).toBeNull()
    expect(result.reason).toBe(reason)
  })

  it('앞 규칙이 먼저: 자본잠식이면서 매출 1억 미만 → 자본잠식', () => {
    const result = financeArchetype(
      profileWith({ revenueKrw: 50_000_000, revenuePrevKrw: 45_000_000, totalEquityKrw: -5_000_000 }),
      'domestic',
    )
    expect(result.reason).toBe('자본잠식')
  })

  it('수출단계가 없으면 원형 없음', () => {
    expect(financeArchetype(createTestAccountProfile(), null)).toMatchObject({ archetype: null, reason: '수출단계 미확정' })
  })
})

describe('업종 그룹과 KSIC 정규화', () => {
  it('저장 형식이 달라도 같은 중분류', () => {
    for (const code of ['C10', '10', 'C10111', '10111', 'c10']) expect(normalizeKsic(code)).toEqual({ mid: 'C10', big: 'C' })
    expect(normalizeKsic('46')).toEqual({ mid: 'G46', big: 'G' })
    expect(normalizeKsic('모름')).toBeNull()
  })

  it('표에 있는 중분류 / 대분류 대체 / 표에 없는 중분류 → BIG / 코드 없음 → ALL', () => {
    expect(industryGroupId('C10')).toBe('C10')
    expect(industryGroupId('C34')).toBe('C')
    expect(industryGroupId('E36')).toBe('BIG:E')
    expect(industryGroupId('O84')).toBe('ALL')
    expect(industryGroupId(null)).toBe('ALL')
  })
})

describe('백분위·변수', () => {
  it('선형 보간, 같은 값이 여러 칸이면 가운데, 범위 밖은 0·1', () => {
    const q = Array.from({ length: 101 }, (_, i) => i)
    expect(percentileOf(50.5, q)).toBeCloseTo(0.505)
    expect(percentileOf(-1, q)).toBe(0)
    expect(percentileOf(101, q)).toBe(1)
    const flat = [...Array(10).fill(0), ...Array.from({ length: 91 }, (_, i) => i + 1)]
    expect(percentileOf(0, flat)).toBeCloseTo(4.5 / 100)
  })

  it('growth가 없으면 3개 변수로 배정된다', () => {
    const result = assignCluster(values({ opMargin: 4, debtRatio: 135, nonOpBalance: -1 }), 'domestic', 'C10')
    expect(result?.usedVariables).toEqual(['opMargin', 'debtRatio', 'nonOpBalance'])
    expect(result?.cluster.id).toBeTruthy()
  })

  it('전년 매출이 0이면 growth 없이 판정한다', () => {
    const result = financeArchetype(profileWith({ revenuePrevKrw: 0 }), 'domestic')
    expect(result.archetype).not.toBeNull()
  })

  it("안정성이 '낮음(해석 주의)'인 단계는 근거 끝에 참고용 문구", () => {
    const low = Object.entries(ARCHETYPE_REFERENCE.stages).find(([, t]) => t.stability === '낮음(해석 주의)')
    expect(low).toBeTruthy()
    const stage = low![0] as 'beginner' | 'promising'
    const result = financeArchetype(createTestAccountProfile(), stage)
    expect(financeArchetypeText(result)).toMatch(/\(이 단계의 재무 유형은 참고용\)$/)
  })
})

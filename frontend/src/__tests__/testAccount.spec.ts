/*
 * revision_03 테스트 계정(TEST): 테스트 프로필 · 계정별 저장 · 기대 결과(§6) · 업종 사전(§6.3)
 *
 * - 판정·적합도는 현재 엔진이 실제 테스트 데이터셋(정답 세트 초안)으로 계산한 값이다. 결과를 저장해 두지 않는다.
 * - §6 기대값과 다른 공고는 docs/revisions/revision_03_test_account_inventory.md §5에 원인과 함께 적었다.
 * - 비밀번호는 다루지 않는다(서버 테스트 server/__tests__/auth.spec.ts가 테스트 전용 값으로 확인한다).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { StaticProgramRepository } from '@/repositories/staticProgramRepository'
import { createEmptyQuery } from '@/repositories'
import { evaluateAll, type EvaluationSet } from '@/lib/engine/evaluateAll'
import { evaluateEligibility } from '@/lib/engine/eligibility'
import { PROFILE_STORAGE_KEY, assessProfile, createEmptyProfile, serializeProfile, createEmptyMeta } from '@/lib/profile'
import { createTestAccountCommonChecks, createTestAccountProfile } from '@/data/testAccountProfile'
import { applyAccountScope, resetTestAccountData } from '@/stores/accountScope'
import { useProfileStore } from '@/stores/profileStore'
import { SELF_CHECK_STORAGE_KEY, useSelfChecks } from '@/stores/selfCheckStore'
import { useAuth } from '@/stores/authStore'
import datasetMeta from '@/data/test-dataset.meta.json'
import type { DatasetMeta, TestDatasetFile } from '@/types/dataset'
import type { Program } from '@/types/program'
import { draftProgram, rule } from './fixtures'

const TEST_USER = { id: 'TEST', role: 'test' } as const
const TEST_PROFILE_KEY = `${PROFILE_STORAGE_KEY}:account:TEST`
const TEST_SELF_CHECK_KEY = `${SELF_CHECK_STORAGE_KEY}:account:TEST`

/** 저장소와 스토어를 빈 기기 상태로 되돌린다 */
function resetStores() {
  localStorage.clear()
  applyAccountScope({ id: '__reset__', role: 'test' })
  applyAccountScope(null)
  localStorage.clear()
}

describe('테스트 프로필 (§4)', () => {
  it('기존 필드만으로 입력 완료 상태이고, 사업자등록번호는 비워 둔다', () => {
    const profile = createTestAccountProfile()
    expect(assessProfile(profile).status).toBe('complete')
    expect(profile.businessNumber).toBeNull()
    expect(profile.companyName).toContain('테스트')
    expect(Object.keys(profile).sort()).toEqual(Object.keys(createEmptyProfile()).sort())
    expect(profile.exportUsdLastYear).toBe(0)
  })

  it('부를 때마다 새 객체를 돌려준다 (고쳐도 원본이 바뀌지 않는다)', () => {
    const a = createTestAccountProfile()
    a.interestAreas.push('exhibition')
    expect(createTestAccountProfile().interestAreas).toEqual(['market-research', 'certification', 'marketing', 'logistics'])
  })
})

describe('테스트 계정 기대 결과 (§6, 기준일 2026-10-15)', () => {
  let programs: Program[] = []
  let set: EvaluationSet
  const status = (id: string) => set.byId.get(id)?.eligibility?.status
  const condition = (id: string, ruleId: string) =>
    set.byId.get(id)?.eligibility?.conditions.find((c) => c.ruleId === ruleId)

  beforeAll(async () => {
    const file = JSON.parse(readFileSync(resolve(process.cwd(), 'src/data/test-dataset.json'), 'utf8')) as TestDatasetFile
    const repository = new StaticProgramRepository(datasetMeta as DatasetMeta, async () => file)
    programs = (await repository.list(createEmptyQuery())).items
    set = evaluateAll(programs, createTestAccountProfile(), {
      asOf: datasetMeta.asOf,
      selfChecks: { common: createTestAccountCommonChecks(), programs: {} },
    })
  })

  it('데이터 기준일은 2026-10-15이다', () => {
    expect(datasetMeta.asOf).toBe('2026-10-15')
  })

  it('수출단계는 내수: 2025년 수출액 0달러 < 1,000달러', () => {
    expect(set.diagnosis?.stage).toBe('domestic')
    expect(set.diagnosis?.referenceYear).toBe(2025)
    expect(set.diagnosis?.reasons[0]).toContain('0 USD(2025년 1월 ~ 2025년 12월)')
    expect(set.diagnosis?.reasons[0]).toContain('1,000달러 미만')
    expect(set.diagnosis?.nextStageConditions.length).toBeGreaterThan(0)
  })

  const RECOMMENDED = ['P001', 'P005', 'P006', 'P022-02', 'P025', 'P034', 'P037', 'P038', 'P122']
  const INTEREST_MATCH = ['P001', 'P005', 'P006', 'P022-02', 'P034', 'P037', 'P122']

  it('§6.1 9개는 모두 확인 필요이고 기준일에 접수 중이다', () => {
    for (const id of RECOMMENDED) {
      expect({ id, status: status(id) }).toEqual({ id, status: 'needs-check' })
      expect({ id, recv: programs.find((p) => p.id === id)?.receptionStatus }).toEqual({ id, recv: 'open' })
    }
    expect(programs.filter((p) => status(p.id) === 'eligible')).toHaveLength(0)
  })

  it('관심 분야가 맞는 7개의 적합도가 맞지 않는 2개(P025·P038)보다 높다', () => {
    const score = (id: string) => set.byId.get(id)?.fit?.score ?? null
    const interest = (id: string) => set.byId.get(id)?.fitFactors.find((f) => f.key === 'interest')?.value
    for (const id of INTEREST_MATCH) expect({ id, interest: interest(id) }).toEqual({ id, interest: 1 })
    for (const id of ['P025', 'P038']) expect({ id, interest: interest(id) }).toEqual({ id, interest: 0.5 })
    const lowestMatched = Math.min(...INTEREST_MATCH.map((id) => score(id)!))
    const highestUnmatched = Math.max(score('P025')!, score('P038')!)
    expect(lowestMatched).toBeGreaterThan(highestUnmatched)
  })

  it('P025·P122의 미확인 사유: 입주기업 조건은 직접 확인', () => {
    expect(condition('P025', 'P025-R01')).toMatchObject({ label: '성남글로벌융합센터 입주기업', reasonCode: 'not-automatable' })
    const p122 = set.byId.get('P122')?.eligibility?.groups.find((g) => g.ruleIds.includes('P122-R02'))
    expect(p122?.ruleIds).toEqual(['P122-R02', 'P122-R03', 'P122-R04'])
    expect(condition('P122', 'P122-R02')?.reasonCode).toBe('not-automatable')
  })

  it('§6.2 중 14개는 신청 불가 (지역·수출 실적)', () => {
    const ineligible = ['P010', 'P011', 'P015', 'P028-01', 'P028-02', 'P046', 'P057-02', 'P062', 'P073', 'P093', 'P104', 'P127-01', 'P127-02', 'P132']
    for (const id of ineligible) expect({ id, status: status(id) }).toEqual({ id, status: 'ineligible' })
  })

  it('§6.2 중 12개는 확인 필요: 해석 애매 규칙·업종 설명·유형·인증 조건은 그것만으로 불가로 만들지 않는다', () => {
    const needsCheck = ['P004-01', 'P004-02', 'P009', 'P022-01', 'P049', 'P050', 'P057-01', 'P070', 'P082', 'P099', 'P101', 'P105']
    for (const id of needsCheck) expect({ id, status: status(id) }).toEqual({ id, status: 'needs-check' })
    // 지역 불일치가 '해석 애매' 규칙이라 확인 필요로 낮아진 예 (사유에 불일치가 함께 보인다)
    expect(condition('P099', 'P099-R02')).toMatchObject({ status: 'needs-check', reasonCode: 'ambiguous' })
    expect(condition('P099', 'P099-R02')?.reason).toContain('공고 대상 지역이 아닙니다')
    // 본사는 불일치(명확)지만 같은 그룹의 공장 조건이 애매 → 그룹이 확인 필요
    expect(condition('P101', 'P101-R02')?.status).toBe('unmet')
    expect(condition('P101', 'P101-R03')?.reasonCode).toBe('ambiguous')
    // 업종·유형·인증 설명 조건
    expect(condition('P004-01', 'P004-R01')?.reasonCode).toBe('not-automatable')
    expect(condition('P022-01', 'P022-R01')?.reasonCode).toBe('not-automatable')
    expect(condition('P057-01', 'P057-R01')?.reasonCode).toBe('not-automatable')
  })

  it('업종 사전(§6.3): 식료품 제조업(C10)은 농·식품, 식품 제조, 농식품 제조업체에 해당한다', () => {
    expect(condition('P022-02', 'P022-R06')?.status).toBe('met')
    expect(condition('P122', 'P122-R05')?.status).toBe('met')
    expect(condition('P105', 'P105-R01')?.status).toBe('met')
    // 기존 '제조업' 판정은 그대로
    for (const [id, ruleId] of [['P011', 'P011-R02'], ['P034', 'P034-R02'], ['P046', 'P046-R03'], ['P070', 'P070-R01']] as const) {
      expect({ ruleId, status: condition(id, ruleId)?.status }).toEqual({ ruleId, status: 'met' })
    }
  })
})

describe('업종 사전은 한 방향으로만 쓴다 (테스트 전용 공고)', () => {
  const program = (field: 'industry' | 'company_type', value: string[]) =>
    draftProgram({ eligibilityRules: [rule({ id: 'R1', field, op: 'in', value })] })
  const result = (ksicCode: string | null, field: 'industry' | 'company_type', value: string[]) =>
    evaluateEligibility({ ...createEmptyProfile(), ksicCode, companySize: 'sme', companyType: 'corporation' }, program(field, value), {
      asOf: '2030-06-30',
      selfChecks: null,
    })?.conditions[0]

  it('C10이면 해당, 다른 업종은 미충족으로 만들지 않고 직접 확인으로 둔다', () => {
    expect(result('C10', 'industry', ['농·식품'])?.status).toBe('met')
    expect(result('C1012', 'industry', ['식품 제조'])?.status).toBe('met')
    expect(result('C20', 'industry', ['농·식품'])).toMatchObject({ status: 'needs-check', reasonCode: 'not-automatable' })
    expect(result(null, 'industry', ['식품 제조'])).toMatchObject({ status: 'needs-check', reasonCode: 'not-automatable' })
    expect(result('C10', 'industry', ['수산식품'])).toMatchObject({ status: 'needs-check', reasonCode: 'not-automatable' })
    expect(result('C10', 'company_type', ['농가(작목반)', '농식품 제조업체'])?.status).toBe('met')
    expect(result('C20', 'company_type', ['농가(작목반)', '농식품 제조업체'])).toMatchObject({
      status: 'needs-check',
      reasonCode: 'not-automatable',
    })
  })
})

describe('계정별 저장 (테스트 계정만 전용 키)', () => {
  beforeEach(() => resetStores())

  it('테스트 계정은 비어 있을 때만 테스트 프로필을 넣고, 기존 키는 건드리지 않는다', () => {
    const deviceProfile = { ...createEmptyProfile(), companyName: '기기 공용 프로필' }
    const deviceRaw = serializeProfile(deviceProfile, createEmptyMeta())
    localStorage.setItem(PROFILE_STORAGE_KEY, deviceRaw)
    localStorage.setItem(SELF_CHECK_STORAGE_KEY, JSON.stringify({ version: 1, common: { closure: 'yes' }, programs: {} }))
    applyAccountScope({ id: '__other__', role: 'test' })
    applyAccountScope(null)
    const store = useProfileStore()
    expect(store.state.profile.companyName).toBe('기기 공용 프로필')

    applyAccountScope(TEST_USER)
    expect(store.state.scope).toEqual({ kind: 'test-account', accountId: 'TEST' })
    expect(store.state.profile.companyName).toBe('EC 테스트식품(주)')
    expect(useSelfChecks().answers.value.common).toEqual(createTestAccountCommonChecks())
    expect(localStorage.getItem(TEST_PROFILE_KEY)).not.toBeNull()
    expect(localStorage.getItem(TEST_SELF_CHECK_KEY)).not.toBeNull()
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBe(deviceRaw)
    expect(JSON.parse(localStorage.getItem(SELF_CHECK_STORAGE_KEY)!).common).toEqual({ closure: 'yes' })

    applyAccountScope(null)
    expect(store.state.profile.companyName).toBe('기기 공용 프로필')
    expect(useSelfChecks().answers.value.common).toEqual({ closure: 'yes' })
  })

  it('고친 테스트 프로필은 다시 로그인해도 덮어쓰지 않고, 초기화할 때만 처음 값으로 돌아간다', () => {
    const store = useProfileStore()
    applyAccountScope(TEST_USER)
    store.state.profile.companyName = 'EC 테스트식품(주) 시연 수정'
    store.saveToDevice()
    useSelfChecks().setCommon('closure', 'unknown')

    applyAccountScope(null)
    applyAccountScope(TEST_USER)
    applyAccountScope(TEST_USER)
    expect(store.state.profile.companyName).toBe('EC 테스트식품(주) 시연 수정')
    expect(useSelfChecks().answers.value.common.closure).toBe('unknown')
    const accountKeys = Object.keys(localStorage).filter((k) => k.includes(':account:TEST'))
    expect(accountKeys.sort()).toEqual([TEST_PROFILE_KEY, TEST_SELF_CHECK_KEY].sort())

    expect(resetTestAccountData()).toBe(true)
    expect(store.state.profile).toEqual(createTestAccountProfile())
    expect(useSelfChecks().answers.value).toEqual({ common: createTestAccountCommonChecks(), programs: {} })
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull()
  })

  it('데모 계정과 비로그인은 기존 키를 쓰고, 테스트 계정이 아니면 초기화하지 않는다', () => {
    applyAccountScope({ id: 'ADMIN', role: 'demo' })
    expect(useProfileStore().state.scope).toEqual({ kind: 'device' })
    expect(resetTestAccountData()).toBe(false)
    expect(Object.keys(localStorage)).toEqual([])
  })
})

describe('로그인 응답의 역할', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetStores()
  })

  it('역할 test로 로그인하면 테스트 계정 프로필로 바뀌고, 로그아웃하면 기기 공용 프로필로 돌아간다', async () => {
    resetStores()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const body = String(input).endsWith('/api/auth/login')
          ? { authenticated: true, user: { id: 'TEST', role: 'test' } }
          : { authenticated: false }
        return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
      }),
    )
    const auth = useAuth()
    expect(await auth.login('TEST', 'test-only')).toEqual({ ok: true })
    expect(auth.state.user).toEqual({ id: 'TEST', role: 'test' })
    expect(useProfileStore().state.profile.companyName).toBe('EC 테스트식품(주)')
    await auth.logout()
    expect(useProfileStore().state.scope).toEqual({ kind: 'device' })
    expect(useProfileStore().state.profile.companyName).toBeNull()
  })
})

/*
 * revision_03 테스트 계정(TEST): 테스트 프로필 · 계정별 저장 · 기대 결과(§6) · 업종 사전(§6.3)
 *
 * - REVISION_04에서 공고 데이터(테스트 데이터셋)를 지웠다. §6 기대 결과(추천 9건) 검증은 테스트 전용 공고로 대신한다.
 * - 비밀번호는 다루지 않는다(서버 테스트 server/__tests__/auth.spec.ts가 테스트 전용 값으로 확인한다).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { evaluateAll } from '@/lib/engine/evaluateAll'
import { evaluateEligibility } from '@/lib/engine/eligibility'
import { PROFILE_STORAGE_KEY, assessProfile, createEmptyProfile, serializeProfile, createEmptyMeta } from '@/lib/profile'
import { createTestAccountCommonChecks, createTestAccountProfile } from '@/data/testAccountProfile'
import { applyAccountScope, resetTestAccountData } from '@/stores/accountScope'
import { useProfileStore } from '@/stores/profileStore'
import { SELF_CHECK_STORAGE_KEY, useSelfChecks } from '@/stores/selfCheckStore'
import { useAuth } from '@/stores/authStore'
import { useApplicationStore } from '@/stores/applicationStore'
import { useTrackingStore } from '@/stores/trackingStore'
import { deriveSupportAreas, deriveSupportPhases } from '@/constants/categories'
import type { SupportCategoryCode } from '@/types/program'
import { condition, draftProgram, rule } from './fixtures'

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

describe('테스트 계정 — 공고 데이터 삭제 후 (REVISION_04 §3.3)', () => {
  const selfChecks = { common: createTestAccountCommonChecks(), programs: {} }
  /** 테스트 전용 공고: 늘 충족하는 조건 하나(신청 가능 — REVISION_05 적합도는 신청 가능 공고만)와 세부 분야 */
  const program = (id: string, categories: SupportCategoryCode[]) =>
    draftProgram({
      id,
      supportCategories: categories,
      supportPhases: deriveSupportPhases(categories),
      supportAreas: deriveSupportAreas(categories),
      conditions: [condition(id)],
    })

  it('공고가 없어도 수출단계는 내수: 기준일이 없으면 기준표 연도의 직전 연도(2025년)로 진단한다', () => {
    const set = evaluateAll([], createTestAccountProfile(), { asOf: null, selfChecks })
    expect(set.diagnosis?.stage).toBe('domestic')
    expect(set.diagnosis?.referenceYear).toBe(2025)
    expect(set.diagnosis?.reasons[0]).toContain('0 USD(2025년 1월 ~ 2025년 12월)')
    expect(set.diagnosis?.reasons[0]).toContain('1,000달러 미만')
    expect(set.byId.size).toBe(0)
  })

  it('관심 분야가 맞는 공고의 적합도가 맞지 않는 공고보다 높다 (§6 추천 9건 검증을 대신하는 테스트 전용 공고)', () => {
    // C13 국제운송은 관심 분야(국제물류)와 맞고, C14 무역보험·보증은 맞지 않는다
    const set = evaluateAll([program('MATCH', ['C13']), program('OTHER', ['C14'])], createTestAccountProfile(), {
      asOf: '2030-06-30',
      selfChecks,
    })
    const interest = (id: string) => set.byId.get(id)?.fitFactors.find((f) => f.key === 'interest')?.value
    const score = (id: string) => set.byId.get(id)?.fit?.score ?? null
    expect(set.byId.get('MATCH')?.tab?.tab).toBe('eligible')
    expect(interest('MATCH')).toBe(1)
    expect(interest('OTHER')).toBeLessThan(1)
    expect(score('MATCH')).not.toBeNull()
    expect(score('OTHER')).not.toBeNull()
    expect(score('MATCH')!).toBeGreaterThan(score('OTHER')!)
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
    // 테스트 계정 전용 키: 프로필 · 직접 확인 · 나의 사업 관리 · 서류함 · 임시 기록 넣음 표시
    expect(accountKeys.sort()).toEqual(
      [TEST_PROFILE_KEY, TEST_SELF_CHECK_KEY, ...['esm.applicationRecords.v1', 'esm.documents.v1', 'esm.testSeed.v1'].map((k) => `${k}:account:TEST`)].sort(),
    )

    expect(resetTestAccountData()).toBe(true)
    expect(store.state.profile).toEqual(createTestAccountProfile())
    expect(useSelfChecks().answers.value).toEqual({ common: createTestAccountCommonChecks(), programs: {} })
    expect(localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull()
  })

  it('처음 로그인할 때만 나의 사업 관리 8건·서류함 7건을 넣고, 지운 기록은 다시 넣지 않는다', () => {
    applyAccountScope(TEST_USER)
    const applications = useApplicationStore()
    const tracking = useTrackingStore()
    expect(applications.records.value).toHaveLength(8)
    expect(tracking.documents.value).toHaveLength(7)
    expect(applications.byTab('interested')).toHaveLength(3)
    expect(applications.records.value.filter((r) => r.status === 'preparing')).toHaveLength(2)
    // 사용자가 기록을 지운 뒤 다시 로그인해도 살려내지 않는다
    applications.replaceAll([])
    tracking.replaceAll([])
    applyAccountScope(null)
    expect(applications.records.value).toEqual([])
    applyAccountScope(TEST_USER)
    expect(applications.records.value).toEqual([])
    expect(tracking.documents.value).toEqual([])
  })

  it('관리자 계정과 비로그인은 기존 키를 쓰고, 테스트 계정이 아니면 초기화하지 않는다', () => {
    applyAccountScope({ id: 'ADMIN', role: 'admin' })
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

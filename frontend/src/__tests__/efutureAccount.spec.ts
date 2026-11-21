/*
 * 시연용 기업 계정 '이퓨쳐'(아이디 USER, 역할 test): 프로필 값 · 재무 비율 · 수출단계 · 재무 원형 · 계정별 저장
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { assessProfile, createEmptyProfile, PROFILE_STORAGE_KEY } from '@/lib/profile'
import { financeSummary } from '@/lib/finance'
import { diagnoseExportStage } from '@/lib/engine/diagnosis'
import { financeArchetype, financeArchetypeText } from '@/lib/engine/fitV1'
import { evaluateAll } from '@/lib/engine/evaluateAll'
import { industryTagsForKsic } from '@/constants/ksicIndustryTags'
import { SITE_TODAY } from '@/lib/siteClock'
import { createEfutureCommonChecks, createEfutureProfile, EFUTURE_EXPORT_KRW } from '@/data/efutureAccountProfile'
import { applyAccountScope, resetTestAccountData } from '@/stores/accountScope'
import { useProfileStore } from '@/stores/profileStore'
import { useApplicationStore } from '@/stores/applicationStore'
import { useTrackingStore } from '@/stores/trackingStore'
import { loadPublishedSnapshot } from '@/repositories/publishedProgramRepository'
import { normalizeProgram } from '@/lib/programQuery'

const EFUTURE_USER = { id: 'USER', role: 'test', profile: 'efuture' } as const

function resetStores() {
  localStorage.clear()
  applyAccountScope({ id: '__reset__', role: 'test' })
  applyAccountScope(null)
  localStorage.clear()
}

/** 소수 둘째 자리까지 (%) */
const pct2 = (v: number | null) => (v === null ? null : Math.round(v * 10000) / 100)

describe('이퓨쳐 프로필', () => {
  it('기존 필드만 쓰고 입력 완료 상태이며, 사용자가 준 값이 그대로 들어 있다', () => {
    const p = createEfutureProfile()
    expect(Object.keys(p).sort()).toEqual(Object.keys(createEmptyProfile()).sort())
    expect(assessProfile(p).status).toBe('complete')
    expect(p.businessNumber).toBeNull()
    expect(p.companyName).toBe('이퓨쳐')
    expect(p.ksicCode).toBe('P85')
    expect(p.exportCountries).toEqual(['캄보디아'])
    expect(p.exportUsdLastYear).toBe(9_176_436)
    expect(EFUTURE_EXPORT_KRW).toBe(10_686_877_000)
    expect([p.revenueKrw, p.revenuePrevKrw, p.operatingIncomeKrw, p.netIncomeKrw, p.totalLiabilitiesKrw, p.totalEquityKrw]).toEqual([
      10_686_877_389, 9_828_717_883, 954_977_950, 1_713_287_847, 4_728_869_575, 18_390_639_112,
    ])
    expect([p.finBaseYear, p.revenueYear]).toEqual([2019, 2019])
    expect(createEfutureCommonChecks()).toEqual({ closure: 'no', 'tax-arrears': 'no', credit: 'no', sanction: 'no' })
  })

  it('KSIC 85 교육 서비스업은 콘텐츠·서비스업 태그다', () => {
    expect(industryTagsForKsic('P85')).toEqual(['콘텐츠', '서비스업'])
  })
})

describe('이퓨쳐 재무 비율·수출단계·재무 원형', () => {
  const p = createEfutureProfile()

  it('매출액증가율 8.73% · 영업이익률 8.94% · 순이익률 16.03% · 영업외수지 +7.10%p · 부채비율 25.71%', () => {
    const s = financeSummary(p)
    expect(s.status).toBe('complete')
    expect(pct2(s.revenueGrowth)).toBe(8.73)
    expect(pct2(s.operatingMargin)).toBe(8.94)
    expect(pct2(s.netMargin)).toBe(16.03)
    expect(pct2(s.netMargin! - s.operatingMargin!)).toBe(7.1)
    expect(pct2(s.debtRatio)).toBe(25.71)
  })

  it('앱의 수출단계 진단: 9,176,436 USD → 수출강소(500만 불 이상)', () => {
    const d = diagnoseExportStage(p, { asOf: SITE_TODAY })
    expect(d?.stage).toBe('strong')
  })

  it('재무 원형: 강소 단계 → 강소 저부채 보수형', () => {
    const r = financeArchetype(p, 'strong')
    expect(r.clusterName).toBe('강소 저부채 보수형')
    expect(financeArchetypeText(r)).toContain('강소 저부채 보수형')
  })

  it('(참고) 성장 단계로 보면 → 성장 고성장·고수익 스타형', () => {
    expect(financeArchetype(p, 'growth').clusterName).toBe('성장 고성장·고수익 스타형')
  })

  it('게시 공고 325건에 대해 판정·적합도를 계산한다 (재무 요소 포함)', async () => {
    const programs = (await loadPublishedSnapshot()).notices.map((raw) => normalizeProgram(raw))
    const set = evaluateAll(programs, p, { asOf: SITE_TODAY, selfChecks: { common: createEfutureCommonChecks(), programs: {} } })
    const counts = { eligible: 0, 'needs-check': 0, ineligible: 0 }
    for (const e of set.byId.values()) if (e.eligibility) counts[e.eligibility.status] += 1
    const withFinance = [...set.byId.values()].filter((e) => e.fitFactors.some((f) => f.key === 'finance' && f.value !== null))
    // 2026-10-20 게시 공고 325건 기준 (2026-11-21 KOTRA 4건 원문 보정·추가 후): 신청 가능 32 · 확인 필요 106 · 신청 불가 187
    expect(counts).toEqual({ eligible: 32, 'needs-check': 106, ineligible: 187 })
    expect(withFinance.length).toBe(counts.eligible)
    console.info('[이퓨쳐] 탭별 공고 수', counts)
  })
})

describe('이퓨쳐 계정별 저장', () => {
  beforeEach(resetStores)

  it('처음 로그인하면 이퓨쳐 프로필이 USER 전용 키에 들어가고, TEST 임시 기록은 넣지 않는다', () => {
    applyAccountScope(EFUTURE_USER)
    expect(useProfileStore().state.profile.companyName).toBe('이퓨쳐')
    expect(localStorage.getItem(`${PROFILE_STORAGE_KEY}:account:USER`)).not.toBeNull()
    expect(useApplicationStore().records.value).toEqual([])
    expect(useTrackingStore().documents.value).toEqual([])
  })

  it('TEST 계정과 저장이 섞이지 않고, 초기화는 이퓨쳐 값으로 되돌린다', () => {
    applyAccountScope(EFUTURE_USER)
    const store = useProfileStore()
    store.state.profile.companyName = '바꾼 이름'
    store.saveToDevice()
    applyAccountScope({ id: 'TEST', role: 'test' })
    expect(store.state.profile.companyName).toContain('테스트')
    applyAccountScope(EFUTURE_USER)
    expect(store.state.profile.companyName).toBe('바꾼 이름')
    expect(resetTestAccountData()).toBe(true)
    expect(store.state.profile.companyName).toBe('이퓨쳐')
  })
})

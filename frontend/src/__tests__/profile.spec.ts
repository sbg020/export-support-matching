import { describe, expect, it } from 'vitest'
import {
  assessProfile,
  createEmptyMeta,
  createEmptyProfile,
  deserializeProfile,
  hasAnyInput,
  serializeProfile,
  validateAll,
  validateStep,
} from '@/lib/profile'
import type { CompanyProfile } from '@/types/profile'

/** 테스트 전용 입력값 (화면에는 사용하지 않는다) */
function filledProfile(): CompanyProfile {
  return {
    ...createEmptyProfile(),
    companyName: '테스트 입력',
    businessNumber: '000-00-00000',
    companyType: 'corporation',
    foundedAt: '2015-06-01',
    hqRegion: 'seoul',
    hasFactory: false,
    industryInputMode: 'name',
    industryName: '테스트 업종',
    revenueKrw: 0,
    revenueYear: 2024,
    exportUsdLastYear: 0,
    exportPeriodStart: '2024-01',
    exportPeriodEnd: '2024-12',
    productName: '테스트 제품',
    hsCodeStatus: 'confirmed',
    hsCode: '8471.30',
    interestAreas: ['market-research'],
  }
}

describe('빈 프로필', () => {
  it('최초 프로필에는 아무 값도 없다', () => {
    const empty = createEmptyProfile()
    expect(hasAnyInput(empty)).toBe(false)
    expect(assessProfile(empty).status).toBe('empty')
    expect(empty.revenueYear).toBeNull()
    expect(empty.exportUsdLastYear).toBeNull()
  })
})

describe('단계별 검증', () => {
  it('필수 항목이 비어 있으면 구체적인 오류를 알려 준다', () => {
    const errors = validateStep(1, createEmptyProfile())
    expect(errors.companyName).toBe('기업명을 입력해 주세요.')
    expect(errors.businessNumber).toBeDefined()
    expect(errors.hasFactory).toBeDefined()
    expect(errors.employeeCount).toBeUndefined()
  })

  it('공장이 없는 기업도 통과한다', () => {
    const p = filledProfile()
    expect(validateStep(1, p)).toEqual({})
  })

  it('사업자등록번호는 형식만 확인한다', () => {
    const p = { ...filledProfile(), businessNumber: '12345' }
    expect(validateStep(1, p).businessNumber).toContain('10자리')
  })

  it('수출액 0은 유효한 입력이다', () => {
    const p = filledProfile()
    expect(validateStep(3, p).exportUsdLastYear).toBeUndefined()
    expect(validateStep(3, { ...p, exportUsdLastYear: null }).exportUsdLastYear).toBeDefined()
  })

  it('측정 기간이 뒤바뀌면 알려 준다', () => {
    const p = { ...filledProfile(), exportPeriodStart: '2024-12', exportPeriodEnd: '2024-01' }
    expect(validateStep(3, p).exportPeriodEnd).toBeDefined()
  })

  it('매출액 기준연도를 자동으로 채우지 않는다', () => {
    const p = { ...filledProfile(), revenueYear: null }
    expect(validateStep(2, p).revenueYear).toBeDefined()
    expect(p.revenueYear).toBeNull()
  })

  it('가점 요소는 선택 입력이며 "보유"를 고르면 항목이 필요하다', () => {
    const p = filledProfile()
    expect(validateStep(5, p)).toEqual({})
    expect(validateStep(5, { ...p, certificationStatus: 'has' }).certifications).toBeDefined()
    expect(validateStep(5, { ...p, certificationStatus: 'none' })).toEqual({})
  })

  it('관심 분야는 "잘 모르겠어요"로도 통과한다', () => {
    const p = { ...filledProfile(), interestAreas: [], interestUnsure: true }
    expect(validateStep(6, p)).toEqual({})
  })
})

describe('입력 상태 판정', () => {
  it('필수 항목을 모두 입력하면 입력 완료', () => {
    expect(assessProfile(filledProfile()).status).toBe('complete')
  })

  it('HS 코드가 미확정이면 입력 중으로 남는다', () => {
    const p = { ...filledProfile(), hsCodeStatus: 'unknown' as const, hsCode: null }
    const result = assessProfile(p)
    expect(result.status).toBe('in-progress')
    expect(result.needsVerification.map((i) => i.field)).toContain('hsCodeStatus')
  })

  it('업종을 모르면 입력 중으로 남는다', () => {
    const p = { ...filledProfile(), industryInputMode: 'unknown' as const, industryName: null }
    expect(assessProfile(p).status).toBe('in-progress')
  })

  it('사업자등록번호는 기기에 저장하지 않으므로 상태 판정에서 제외한다', () => {
    const p = { ...filledProfile(), businessNumber: null }
    expect(assessProfile(p).status).toBe('complete')
    expect(validateAll(p)[1].businessNumber).toBeDefined()
  })
})

describe('기기 저장', () => {
  it('사업자등록번호는 저장하지 않는다', () => {
    const raw = serializeProfile(filledProfile(), createEmptyMeta())
    expect(raw).not.toContain('000-00-00000')
    expect(raw).not.toContain('businessNumber')
    const restored = deserializeProfile(raw)
    expect(restored?.profile.businessNumber).toBeNull()
    expect(restored?.profile.exportUsdLastYear).toBe(0)
    expect(restored?.profile.companyName).toBe('테스트 입력')
  })

  it('형식이 맞지 않는 저장값은 버린다', () => {
    expect(deserializeProfile('not json')).toBeNull()
    expect(deserializeProfile(JSON.stringify({ version: 99 }))).toBeNull()
    const restored = deserializeProfile(
      JSON.stringify({ version: 1, profile: { companyType: 'unknown-type', revenueKrw: '100' }, meta: {} }),
    )
    expect(restored?.profile.companyType).toBeNull()
    expect(restored?.profile.revenueKrw).toBeNull()
  })
})

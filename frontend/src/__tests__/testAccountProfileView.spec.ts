/*
 * 기업 프로필 화면: TEST 계정에서는 저장 안내 카드와 테스트 계정 안내 카드를 보여 주지 않는다 (초기화 버튼은 남김)
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { applyAccountScope } from '@/stores/accountScope'
import DiagnoseInputView from '@/views/diagnose/DiagnoseInputView.vue'

beforeEach(() => {
  localStorage.clear()
  applyAccountScope({ id: '__reset__', role: 'test' })
  applyAccountScope(null)
  localStorage.clear()
})

async function mountProfile() {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/profile')
  await router.isReady()
  const wrapper = mount(DiagnoseInputView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('기업 프로필 안내 카드', () => {
  it('TEST 계정: 두 안내 카드가 없고 테스트 프로필 초기화 버튼은 있다', async () => {
    applyAccountScope({ id: 'TEST', role: 'test' })
    const wrapper = await mountProfile()
    expect(wrapper.text()).not.toContain('입력 정보는 이 기기에만 저장됩니다')
    expect(wrapper.text()).not.toContain('테스트 계정(TEST)의 기업 프로필입니다')
    expect(wrapper.text()).toContain('테스트 프로필 초기화')
    wrapper.unmount()
  })

  it('비로그인: 저장 안내 카드는 그대로 보인다', async () => {
    const wrapper = await mountProfile()
    expect(wrapper.text()).toContain('입력 정보는 이 기기에만 저장됩니다')
    expect(wrapper.text()).not.toContain('테스트 프로필 초기화')
    wrapper.unmount()
  })
})

describe('재무제표 금액 위치', () => {
  it('② 기업 규모에 5개 선택 항목과 출처가 있고, ⑦은 신청 전 확인만 남는다', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/profile?step=2')
    await router.isReady()
    const step2 = mount(DiagnoseInputView, { global: { plugins: [router] } })
    await flushPromises()
    for (const label of ['전기 매출액', '영업이익', '당기순이익', '부채총계', '자본총계', '재무제표 금액 (선택 입력)']) {
      expect(step2.text()).toContain(label)
    }
    expect(step2.text()).toContain('출처: 손익계산서')
    expect(step2.text()).toContain('출처: 재무상태표')
    step2.unmount()

    await router.push('/profile?step=7')
    const step7 = mount(DiagnoseInputView, { global: { plugins: [router] } })
    await flushPromises()
    expect(step7.text()).toContain('신청 전 확인')
    expect(step7.text()).not.toContain('재무제표 금액 (선택 입력)')
    step7.unmount()
  })
})

describe('가점 요소 단계 삭제', () => {
  it('단계는 6개이고 가점 요소가 없으며, 예전 ⑤ 주소는 관심 분야로 연다', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/profile?step=5')
    await router.isReady()
    const wrapper = mount(DiagnoseInputView, { global: { plugins: [router] } })
    await flushPromises()
    const steps = wrapper.findAll('.step-progress__list li')
    expect(steps).toHaveLength(6)
    expect(wrapper.text()).not.toContain('가점 요소')
    expect(wrapper.get('.step-progress__title').text()).toBe('관심 분야')
    expect(wrapper.get('.step-progress__current').text()).toBe('5')
    wrapper.unmount()
  })
})

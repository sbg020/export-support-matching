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

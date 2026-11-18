/*
 * '까치에게 물어보기' 화면: 로그인한 사용자에게 버튼이 보이고, 예시 질문을 누르면 규칙 답변을 보여 준다 (외부 API 없음)
 */
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { reactive } from 'vue'
import { routes } from '@/router'

vi.mock('@/stores/authStore', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/stores/authStore')>()
  const state = reactive({ status: 'authenticated', user: { id: 'TEST', role: 'test' }, errorMessage: null })
  return { ...original, useAuth: () => ({ ...original.useAuth(), state }) }
})

const fetchSpy = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchSpy)

describe('까치에게 물어보기', () => {
  it('버튼 이름·로고, 예시 질문을 누르면 사이트 데이터로 답하고 서버를 부르지 않는다', async () => {
    const { default: AssistantWidget } = await import('@/components/assistant/AssistantWidget.vue')
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/programs')
    await router.isReady()
    const wrapper = mount(AssistantWidget, { global: { plugins: [router] }, attachTo: document.body })
    await flushPromises()
    const fab = wrapper.get('.assistant__fab')
    expect(fab.text()).toContain('까치에게 물어보기')
    expect(fab.find('img').attributes('src')).toBe('/brand/assistant-magpie-96.png')
    expect(fab.attributes('disabled')).toBeUndefined()

    await fab.trigger('click')
    await flushPromises()
    expect(wrapper.get('#assistant-title').text()).toBe('까치에게 물어보기')
    const examples = wrapper.findAll('.assistant__example')
    expect(examples.length).toBeGreaterThan(0)
    await examples[0]!.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('.assistant__answer').exists()).toBe(true))
    expect(wrapper.text()).toContain('사이트 데이터로 만든 답변')
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/api/assistant'))).toBe(false)
    wrapper.unmount()
  })
})

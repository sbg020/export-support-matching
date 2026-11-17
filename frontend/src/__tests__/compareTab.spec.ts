/*
 * 공고 비교: 기업 맞춤 지원사업의 하위 탭(/programs/compare). 전체 공고 하단에서는 삭제.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { useCompareSelection } from '@/composables/useCompareSelection'
import ProgramCompareView from '@/views/programs/ProgramCompareView.vue'
import ProgramListView from '@/views/programs/ProgramListView.vue'

beforeAll(() => {
  window.matchMedia = vi.fn<(query: string) => unknown>(() => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
})

async function mountAt(path: string, component: typeof ProgramCompareView) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, { global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper }
}

describe('공고 비교 탭', () => {
  it("담은 공고가 없으면 빈 상태와 '맞춤 공고 보러 가기', 접기·펼치기 버튼은 없다", async () => {
    useCompareSelection().clear()
    const { router, wrapper } = await mountAt('/programs/compare', ProgramCompareView)
    expect(router.currentRoute.value.meta.section).toBe('find')
    expect(wrapper.text()).toContain('비교할 공고를 담아 주세요')
    const links = wrapper.findAll('a').filter((a) => a.text().includes('맞춤 공고 보러 가기'))
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]!.attributes('href')).toBe('/programs/recommended')
    expect(wrapper.text()).not.toContain('비교 내용 펼치기')
    expect(wrapper.text()).not.toContain('비교 내용 접기')
    expect(wrapper.find('.compare-table, table').exists()).toBe(false)
    wrapper.unmount()
  })

  it('전체 공고 화면에는 비교 영역이 없다', async () => {
    const { wrapper } = await mountAt('/programs', ProgramListView)
    expect(wrapper.find('#compare').exists()).toBe(false)
    wrapper.unmount()
  })
})

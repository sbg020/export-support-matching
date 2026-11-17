/*
 * 둘러보기 이동: 새로 올라온 공고 → 메인 화면 공고 미리보기(2건), 많이 본 공고 → 전체 지원사업 정렬 '조회순'
 */
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { SORT_OPTIONS } from '@/constants/options'
import { sortPrograms } from '@/lib/programQuery'
import { selectNewPrograms } from '@/lib/programHighlights'
import { viewEventSink } from '@/repositories/viewEventSink'
import ProgramListView from '@/views/programs/ProgramListView.vue'
import { draftProgram } from './fixtures'

describe('새로 올라온 공고 (메인 화면 미리보기)', () => {
  it('최근 게시 순으로 2건만 고른다', () => {
    const programs = Array.from({ length: 5 }, (_, i) =>
      draftProgram({ id: `N${i + 1}`, sourcePublishedAt: `2030-06-${String(20 + i).padStart(2, '0')}`, receptionStatus: 'open' }),
    )
    expect(selectNewPrograms(programs, '2030-06-30', 2).items.map((l) => l.program.id)).toEqual(['N5', 'N4'])
  })
})

describe("전체 지원사업 정렬 '조회순'", () => {
  it('정렬 메뉴에 조회순이 있다', () => {
    expect(SORT_OPTIONS.map((o) => o.label)).toContain('조회순')
  })

  it('조회 수가 있으면 많이 본 순, 없으면(집계 전) 공고 번호 순', () => {
    const programs = ['A1', 'A2', 'A3'].map((id) => draftProgram({ id }))
    const counts = new Map([
      ['A2', 30],
      ['A3', 12],
    ])
    expect(sortPrograms(programs, 'views', counts).map((p) => p.id)).toEqual(['A2', 'A3', 'A1'])
    expect(sortPrograms(programs, 'views', null).map((p) => p.id)).toEqual(['A1', 'A2', 'A3'])
    // 조회 수를 모을 서버 저장소가 없으므로 지어낸 순위를 만들지 않는다
    expect(viewEventSink.viewCounts()).toBeNull()
  })
})

describe('전체 공고 화면', () => {
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

  it('둘러보기(새로 올라온 공고·많이 본 공고) 영역이 없다', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/programs')
    await router.isReady()
    const wrapper = mount(ProgramListView, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('둘러보기')
    expect(wrapper.text()).not.toContain('새로 올라온 공고')
    expect(wrapper.find('.highlights').exists()).toBe(false)
    wrapper.unmount()
  })
})

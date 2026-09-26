import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { programRepository } from '@/repositories'
import { EmptyProgramRepository } from '@/repositories/emptyProgramRepository'
import DataValue from '@/components/common/DataValue.vue'
import ProgramBrowser from '@/components/programs/ProgramBrowser.vue'

const PATHS = [
  '/',
  '/diagnose/input',
  '/diagnose/result',
  '/programs',
  '/programs/recommended',
  '/programs/compare',
  '/programs/any-id',
  '/roadmap',
  '/mypage',
  '/mypage/profile',
  '/mypage/saved',
  '/mypage/preparation',
  '/mypage/calendar',
  '/mypage/history',
  '/mypage/documents',
]

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
}

describe('경로', () => {
  it('CLAUDE.md의 모든 경로가 이름 있는 페이지로 연결된다', () => {
    const router = makeRouter()
    for (const path of PATHS) {
      const resolved = router.resolve(path)
      expect({ path, name: resolved.name }).not.toEqual({ path, name: 'not-found' })
      expect(resolved.meta.title).toBeTruthy()
    }
    expect(router.resolve('/programs/compare').name).toBe('programs-compare')
    expect(router.resolve('/programs/recommended').name).toBe('programs-recommended')
    expect(router.resolve('/없는-주소').name).toBe('not-found')
  })
})

describe('빈 공고 저장소', () => {
  it('기본 저장소는 공고 데이터 미연결 상태다', () => {
    expect(programRepository.source.kind).toBe('not-connected')
  })

  it('빈 배열과 null 건수를 반환한다 (샘플 공고 없음)', async () => {
    const repo = new EmptyProgramRepository()
    const result = await repo.list()
    expect(result.items).toEqual([])
    expect(result.total).toBeNull()
    expect(await repo.getById()).toBeNull()
    expect(await repo.getByIds()).toEqual([])
  })
})

describe('화면 표시', () => {
  it('DataValue는 null을 "-"로, 0을 0으로 표시한다', () => {
    const missing = mount(DataValue, { props: { value: null } })
    expect(missing.text()).toContain('-')
    const zero = mount(DataValue, { props: { value: 0, format: (n: unknown) => `${String(n)} USD` } })
    expect(zero.text()).toBe('0 USD')
  })

  it('공고 목록은 가짜 카드 없이 빈 상태와 비활성 이유를 보여 준다', async () => {
    const router = makeRouter()
    await router.push('/programs')
    await router.isReady()
    const wrapper = mount(ProgramBrowser, {
      props: { mode: 'all' },
      global: { plugins: [router] },
      attachTo: document.body,
    })
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('현재 등록된 지원사업 공고가 없습니다.')
    expect(text).toContain('정렬할 공고가 없어 정렬을 사용할 수 없습니다.')
    expect(text).not.toContain('0건')
    expect(wrapper.findAll('article')).toHaveLength(0)
    expect(wrapper.find('select[disabled]').exists()).toBe(true)
    wrapper.unmount()
  })
})

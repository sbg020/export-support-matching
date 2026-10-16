import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { programRepository } from '@/repositories'
import { EmptyProgramRepository } from '@/repositories/emptyProgramRepository'
import DataValue from '@/components/common/DataValue.vue'
import ProgramBrowser from '@/components/programs/ProgramBrowser.vue'

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
}

describe('경로', () => {
  it('새 정보 구조의 모든 경로가 이름 있는 페이지로 연결된다', () => {
    const router = makeRouter()
    const expected: Record<string, string> = {
      '/': 'home',
      '/login': 'login',
      '/diagnose/input': 'diagnose-input',
      '/diagnose/result': 'diagnose-result',
      '/programs/recommended': 'programs-recommended',
      '/programs': 'programs',
      '/programs/calendar': 'programs-calendar',
      '/programs/any-id': 'program-detail',
      '/roadmap': 'roadmap',
      '/mypage/profile': 'mypage-profile',
      '/mypage/programs': 'mypage-programs',
      '/mypage/documents': 'mypage-documents',
    }
    for (const [path, name] of Object.entries(expected)) {
      const resolved = router.resolve(path)
      expect({ path, name: resolved.name }).toEqual({ path, name })
      expect(resolved.meta.title).toBeTruthy()
    }
    expect(router.resolve('/없는-주소').name).toBe('not-found')
  })

  it('마이페이지만 로그인이 필요하다', () => {
    const router = makeRouter()
    for (const path of ['/mypage/profile', '/mypage/programs', '/mypage/documents']) {
      expect(router.resolve(path).meta.requiresAuth).toBe(true)
    }
    for (const path of ['/', '/diagnose/input', '/programs', '/programs/calendar', '/roadmap']) {
      expect(router.resolve(path).meta.requiresAuth).toBeFalsy()
    }
  })

  it('사이드바 섹션 값이 화면마다 정해져 있다', () => {
    const router = makeRouter()
    expect(router.resolve('/').meta.section).toBeUndefined()
    expect(router.resolve('/programs/recommended').meta.section).toBe('find')
    expect(router.resolve('/programs/calendar').meta.section).toBe('programs')
    expect(router.resolve('/programs/abc').meta.section).toBe('programs')
    expect(router.resolve('/mypage/programs').meta.section).toBe('mypage')
  })
})

describe('기존 주소 리다이렉트 (쿼리·해시 유지)', () => {
  async function landing(path: string) {
    const router = makeRouter()
    await router.push(path)
    return router.currentRoute.value
  }

  it('공고 비교 → 전체 공고 하단 비교 영역', async () => {
    const route = await landing('/programs/compare?ids=a,b&q=x')
    expect(route.name).toBe('programs')
    expect(route.query).toEqual({ q: 'x', compare: 'a,b' })
    expect(route.hash).toBe('#compare')
  })

  it('일정 → 공고 달력', async () => {
    const route = await landing('/mypage/calendar?month=2026-10#top')
    expect(route.name).toBe('programs-calendar')
    expect(route.query).toEqual({ month: '2026-10' })
    expect(route.hash).toBe('#top')
  })

  it('마이페이지 홈·관심·준비·이력 → 새 위치', async () => {
    expect((await landing('/mypage')).name).toBe('mypage-profile')
    expect((await landing('/mypage/saved')).query).toEqual({ tab: 'interested' })
    expect((await landing('/mypage/preparation')).query).toEqual({ tab: 'preparing' })
    const history = await landing('/mypage/history?x=1')
    expect(history.name).toBe('mypage-programs')
    expect(history.query).toEqual({ x: '1', tab: 'applied' })
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

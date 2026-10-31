/*
 * REVISION_03: 상단 메뉴 · 로그인 후 첫 화면 · 프로필 팝업 · 기업 프로필 · 지원사업 관리 (§10)
 * 서버 인증 API는 테스트 안에서만 흉내 낸다. 저장소 값은 테스트 전용 값이다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { authNavigationTarget, routes } from '@/router'
import { AFTER_LOGIN_PATH, afterLoginPath } from '@/lib/redirect'
import { PROFILE_STORAGE_KEY, createEmptyProfile } from '@/lib/profile'
import { APPLICATION_STORAGE_KEY } from '@/stores/applicationStore'
import { SELF_CHECK_STORAGE_KEY } from '@/stores/selfCheckStore'
import { COMPARE_STORAGE_KEY } from '@/composables/useCompareSelection'
import { useAuth } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import AppHeader from '@/components/layout/AppHeader.vue'
import LoginView from '@/views/LoginView.vue'
import DiagnoseResultView from '@/views/diagnose/DiagnoseResultView.vue'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** 서버 인증 API 흉내: 로그인은 항상 성공, 로그아웃은 세션만 끝낸다 */
function stubAuthApi() {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async (input) => {
    const url = String(input)
    if (url.endsWith('/api/auth/login')) return jsonResponse({ authenticated: true, user: { id: 'ADMIN' } })
    return jsonResponse({ authenticated: false })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function makeRouter(): Router {
  return createRouter({ history: createMemoryHistory(), routes })
}

/** 실제 앱과 같은 로그인 규칙(authNavigationTarget)을 건 테스트용 라우터 */
function makeGuardedRouter(isAuthenticated: () => boolean = () => useAuth().state.status === 'authenticated'): Router {
  const router = makeRouter()
  router.beforeEach((to) => authNavigationTarget(to, isAuthenticated(), router))
  return router
}

async function at(router: Router, path: string) {
  await router.push(path)
  await router.isReady()
  return router.currentRoute.value
}

/** 4개 저장 키에 테스트 전용 값을 넣는다 */
const STORED: [Storage, string, string][] = [
  [localStorage, PROFILE_STORAGE_KEY, '{"version":1,"profile":{"companyName":"보존 확인용"},"meta":{}}'],
  [localStorage, APPLICATION_STORAGE_KEY, '{"version":1,"records":[]}'],
  [localStorage, SELF_CHECK_STORAGE_KEY, '{"version":1,"common":{"closure":"no"},"programs":{}}'],
  [sessionStorage, COMPARE_STORAGE_KEY, '["P001","P004-01"]'],
]

function seedStorage() {
  for (const [storage, key, value] of STORED) storage.setItem(key, value)
}

function expectStorageUnchanged() {
  for (const [storage, key, value] of STORED) expect(storage.getItem(key)).toBe(value)
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  localStorage.clear()
  sessionStorage.clear()
})

describe('로그인 후 첫 화면과 로그인 필요 화면', () => {
  it('redirect가 없거나 허용되지 않으면 수출 로드맵, 안전한 redirect면 그 화면', () => {
    const router = makeRouter()
    expect(AFTER_LOGIN_PATH).toBe('/roadmap')
    expect(afterLoginPath(undefined, router)).toBe('/roadmap')
    expect(afterLoginPath('/manage/programs', router)).toBe('/manage/programs')
    expect(afterLoginPath('https://example.com', router)).toBe('/roadmap')
    expect(afterLoginPath('/login', router)).toBe('/roadmap')
  })

  it('비로그인으로 지원사업 관리(기존 주소 포함)를 열면 로그인 화면으로 가고 돌아올 주소를 남긴다', async () => {
    const router = makeGuardedRouter(() => false)
    const route = await at(router, '/manage/programs')
    expect(route.name).toBe('login')
    expect(route.query.redirect).toBe('/manage/programs')
    const old = await at(router, '/mypage/programs?tab=applied')
    expect(old.query.redirect).toBe('/manage/programs?tab=applied')
    // 로그인이 필요 없는 화면은 그대로 열린다
    expect((await at(router, '/profile')).name).toBe('company-profile')
    expect((await at(router, '/')).name).toBe('home')
  })

  it('로그인 상태: 홈 → 수출 로드맵, 로그인 화면 → redirect 또는 수출 로드맵', async () => {
    const router = makeGuardedRouter(() => true)
    expect((await at(router, '/')).fullPath).toBe('/roadmap')
    expect((await at(router, '/login')).fullPath).toBe('/roadmap')
    expect((await at(router, '/login?redirect=/manage/programs')).fullPath).toBe('/manage/programs')
    expect((await at(router, '/login?redirect=https://example.com')).fullPath).toBe('/roadmap')
  })

  describe('로그인 화면', () => {
    let wrapper: VueWrapper | null = null
    beforeEach(async () => {
      stubAuthApi()
      await useAuth().logout()
    })
    afterEach(() => wrapper?.unmount())

    async function loginFrom(path: string) {
      const router = makeGuardedRouter()
      await at(router, path)
      wrapper = mount(LoginView, { global: { plugins: [router] } })
      await wrapper.get('#login-id').setValue('ADMIN')
      await wrapper.get('#login-password').setValue('test-only')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      return router.currentRoute.value
    }

    it('redirect 없이 로그인하면 수출 로드맵으로 간다', async () => {
      expect((await loginFrom('/login')).fullPath).toBe('/roadmap')
    })

    it('로그인이 필요한 화면에서 넘어왔으면 그 화면으로 돌아간다', async () => {
      expect((await loginFrom('/login?redirect=/manage/programs')).fullPath).toBe('/manage/programs')
    })
  })
})

describe('상단 주 메뉴와 하위 메뉴 패널', () => {
  let wrapper: VueWrapper

  beforeEach(async () => {
    const router = makeRouter()
    await at(router, '/programs/calendar')
    wrapper = mount(AppHeader, { props: { menuOpen: false }, global: { plugins: [router] }, attachTo: document.body })
  })
  afterEach(() => wrapper.unmount())

  const subLists = () => wrapper.findAll('.top-nav__sub')
  const allHidden = () => subLists().every((ul) => ul.attributes('hidden') !== undefined)
  const noneHidden = () => subLists().every((ul) => ul.attributes('hidden') === undefined)

  it('주 메뉴 5개가 순서·이름대로 있고 아이콘이 없으며, 첫 하위 화면으로 연결된다', () => {
    const links = wrapper.findAll('.top-nav__link')
    expect(links.map((a) => a.text())).toEqual(['수출 로드맵', '기업 맞춤 지원사업', '전체 지원사업', '지원사업 관리', '커뮤니티'])
    expect(links.map((a) => a.attributes('href'))).toEqual([
      '/roadmap',
      '/diagnose/result',
      '/programs',
      '/manage/programs',
      '/community/reviews',
    ])
    expect(wrapper.get('nav.top-nav').findAll('svg')).toHaveLength(0)
    // 로고(아이콘 + 서비스 이름)는 그대로 있다
    expect(wrapper.get('.brand-link').text()).toContain('수출지원사업 매칭')
  })

  it('마우스를 올리면 하위 항목 9개가 보이고 Esc로 다시 숨는다', async () => {
    expect(allHidden()).toBe(true)
    await wrapper.get('.top-nav__list').trigger('mouseenter')
    expect(noneHidden()).toBe(true)
    expect(wrapper.findAll('.top-nav__sublink').map((a) => a.text())).toEqual([
      '수출 로드맵',
      '기업 진단',
      '맞춤 추천',
      '전체 공고',
      '공고 달력',
      '관심·준비 중·신청완료 사업',
      '서류함',
      '지원사업 후기',
      '지원사업 정보방',
    ])
    await wrapper.get('nav.top-nav').trigger('keydown', { key: 'Escape' })
    expect(allHidden()).toBe(true)
  })

  it('키보드 포커스가 주 메뉴에 들어오면 펼치고, Esc는 포커스를 그 주 메뉴 링크로 옮긴다', async () => {
    const programsLink = wrapper.findAll('.top-nav__link')[2]!
    ;(programsLink.element as HTMLElement).focus()
    await wrapper.get('.top-nav__list').trigger('focusin')
    expect(noneHidden()).toBe(true)
    const sub = wrapper.findAll('.top-nav__sublink').find((a) => a.text() === '공고 달력')!
    ;(sub.element as HTMLElement).focus()
    await wrapper.get('nav.top-nav').trigger('keydown', { key: 'Escape' })
    expect(allHidden()).toBe(true)
    expect(document.activeElement).toBe(programsLink.element)
  })

  it('헤더와 패널을 벗어나고 150ms가 지나면 닫힌다 (그 전에 돌아오면 유지)', async () => {
    vi.useFakeTimers()
    await wrapper.get('.top-nav__list').trigger('mouseenter')
    await wrapper.get('header').trigger('mouseleave')
    vi.advanceTimersByTime(100)
    await wrapper.get('header').trigger('mouseenter')
    vi.advanceTimersByTime(200)
    await flushPromises()
    expect(noneHidden()).toBe(true)
    await wrapper.get('header').trigger('mouseleave')
    vi.advanceTimersByTime(149)
    await flushPromises()
    expect(noneHidden()).toBe(true)
    vi.advanceTimersByTime(1)
    await flushPromises()
    expect(allHidden()).toBe(true)
  })

  it('현재 섹션과 현재 화면 항목에 aria-current="page"가 있다', async () => {
    await wrapper.get('.top-nav__list').trigger('mouseenter')
    const current = wrapper.findAll('[aria-current="page"]').map((el) => el.text())
    expect(current).toEqual(['전체 지원사업', '공고 달력'])
  })
})

describe('프로필 팝업과 로그아웃', () => {
  let fetchMock: ReturnType<typeof stubAuthApi>
  let router: Router
  let wrapper: VueWrapper

  beforeEach(async () => {
    fetchMock = stubAuthApi()
    await useAuth().login('ADMIN', 'test-only')
    router = makeGuardedRouter()
    await at(router, '/roadmap')
    wrapper = mount(AppHeader, { props: { menuOpen: false }, global: { plugins: [router] }, attachTo: document.body })
  })
  afterEach(() => wrapper.unmount())

  const button = () => wrapper.get('button[aria-label="계정 메뉴 (ADMIN 계정)"]')
  const popup = () => wrapper.get(`#${button().attributes('aria-controls')}`)

  /** 마우스 클릭은 detail 1, 키보드(Enter·Space)로 누른 클릭은 detail 0 */
  async function clickButton(detail: 0 | 1) {
    button().element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }))
    await flushPromises()
  }

  it('누르면 기업 프로필·로그아웃 2개만 보이고, Esc로 닫히며 포커스가 버튼으로 돌아온다', async () => {
    expect(button().attributes('aria-expanded')).toBe('false')
    await clickButton(1)
    expect(button().attributes('aria-expanded')).toBe('true')
    const items = popup().findAll('a, button')
    expect(items.map((item) => item.text())).toEqual(['기업 프로필', '로그아웃'])
    expect(items[0]!.attributes('href')).toBe('/profile')
    await popup().trigger('keydown', { key: 'Escape' })
    expect(button().attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button().element)
  })

  it('키보드로 열면 첫 항목에 포커스를 두고, 하위 메뉴 패널이 열리면 닫힌다', async () => {
    await clickButton(0)
    await flushPromises()
    expect(document.activeElement?.textContent?.trim()).toBe('기업 프로필')
    await wrapper.get('.top-nav__list').trigger('mouseenter')
    expect(button().attributes('aria-expanded')).toBe('false')
  })

  it('로그아웃은 서버 세션만 끝내고 홈으로 가며, 이 기기의 저장 값을 지우지 않는다', async () => {
    seedStorage()
    await clickButton(1)
    const logout = popup().findAll('button').find((b) => b.text() === '로그아웃')!
    await logout.trigger('click')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
    expect(useAuth().state.status).toBe('anonymous')
    expect(router.currentRoute.value.fullPath).toBe('/')
    expectStorageUnchanged()
    // 비로그인 헤더의 로그인 버튼은 redirect 없이 로그인 화면으로 간다
    expect(wrapper.get('a.btn-primary').text()).toBe('로그인')
    expect(wrapper.get('a.btn-primary').attributes('href')).toBe('/login')
  })
})

describe('데이터 보존', () => {
  it('기존 주소 리다이렉트와 화면 이동이 저장 값을 바꾸지 않는다', async () => {
    seedStorage()
    const router = makeGuardedRouter(() => false)
    const landed: (string | symbol | null | undefined)[] = []
    for (const path of ['/mypage/profile', '/mypage', '/diagnose/input?step=2', '/mypage/history', '/manage', '/roadmap', '/']) {
      landed.push((await at(router, path)).name)
    }
    // 비로그인이므로 지원사업 관리 주소는 로그인 화면에서 멈춘다
    expect(landed).toEqual(['company-profile', 'company-profile', 'company-profile', 'login', 'login', 'roadmap', 'home'])
    expectStorageUnchanged()
  })
})

describe('기업 진단 → 기업 프로필 연결', () => {
  let wrapper: VueWrapper
  const store = useProfileStore()

  beforeEach(async () => {
    store.replaceProfile({ ...createEmptyProfile(), companyName: '테스트 전용 기업' })
    const router = makeRouter()
    await at(router, '/diagnose/result')
    wrapper = mount(DiagnoseResultView, { global: { plugins: [router] } })
    await flushPromises()
  })
  afterEach(() => {
    wrapper.unmount()
    store.replaceProfile(createEmptyProfile())
  })

  it('기업정보 수정하기·기업 프로필에서 수정은 /profile을 가리킨다', () => {
    const href = (text: string) => wrapper.findAll('a').find((a) => a.text().includes(text))?.attributes('href')
    expect(href('기업정보 수정하기')).toBe('/profile')
    expect(href('기업 프로필에서 수정')).toBe('/profile')
  })

  it('요약의 단계별 수정은 그 단계(/profile?step=n)를 연다', async () => {
    await wrapper.get('button[aria-label="수출 현황 수정"]').trigger('click')
    await flushPromises()
    const router = wrapper.vm.$router
    expect(router.currentRoute.value.fullPath).toBe('/profile?step=3')
  })
})

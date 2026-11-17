/*
 * REVISION_04: 공통 표시 정리 · 공고 데이터 삭제 · 기업 진단 삭제 · 역할과 이동 규칙 · 관리자 영역 (§14.2)
 * 맞춤 추천 목록은 revision04.recommend.spec.ts, CSV·xlsx·설정 검사는 revision04.adminFiles.spec.ts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { authNavigationTarget, documentTitle, isAdminDenied, routes, type NavigationAuth } from '@/router'
import { ADMIN_HOME_PATH, AFTER_LOGIN_PATH, afterLoginPath, safeRedirect } from '@/lib/redirect'
import { programRepository } from '@/repositories'
import { adminRepository, EmptyAdminRepository, NOT_CONNECTED_ERROR, type AdminRepository } from '@/repositories/admin'
import { NAV_SECTIONS, firstRouteName, sectionByKey } from '@/constants/navigation'
import { ADMIN_NAV_ITEMS, ADMIN_ONLY_MESSAGE } from '@/constants/adminNavigation'
import { recommendationDeadlineText, supportContentLine } from '@/lib/programDisplay'
import { createTestAccountProfile } from '@/data/testAccountProfile'
import { createEmptyProfile } from '@/lib/profile'
import { useAuth } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { useToast } from '@/stores/toastStore'
import App from '@/App.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AdminHeader from '@/components/layout/AdminHeader.vue'
import ProgramRecommendedView from '@/views/programs/ProgramRecommendedView.vue'
import DiagnoseInputView from '@/views/diagnose/DiagnoseInputView.vue'
import { blankProgram } from './fixtures'

function makeRouter(): Router {
  return createRouter({ history: createMemoryHistory(), routes })
}

async function at(router: Router, path: string) {
  await router.push(path)
  await router.isReady()
  return router.currentRoute.value
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

/** 서버 인증 API 흉내: 로그인하면 주어진 역할 */
function stubLogin(role: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/api/auth/login')
        ? jsonResponse({ authenticated: true, user: { id: 'ANYONE', role } })
        : jsonResponse({ authenticated: false }),
    ),
  )
}

// jsdom에는 matchMedia가 없다 (전체 공고의 비교 영역이 화면 폭을 읽는다)
beforeEach(() => {
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

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const USER_PATHS = [
  '/',
  '/login',
  '/profile',
  '/programs',
  '/programs/recommended',
  '/programs/calendar',
  '/programs/P001',
  '/manage/programs',
  '/manage/documents',
  '/community/reviews',
  '/community/info',
  '/community/reviews/write',
  '/community/reviews/p1',
]
// REVISION_05 §7.4: KITA 업로드 추가 (KOTRA와 같은 화면)
const ADMIN_PATHS = ['/admin', '/admin/bizinfo', '/admin/kotra', '/admin/kita', '/admin/review', '/admin/notices', '/admin/settings']
const FORBIDDEN = ['테스트 데이터', 'PoC 데이터 기준', '초안 기준', '샘플 데이터']
/** 참고 화면의 예시 값 (§1 제약 2) */
const REFERENCE_EXAMPLES = ['샘플', '김샘플', '이샘플', '214', 'samplekey', 'kotra_notices_1106', 'B2C 해외쇼핑몰']

async function mountApp(path: string): Promise<VueWrapper> {
  const router = makeRouter()
  await at(router, path)
  const wrapper = mount(App, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return wrapper
}

describe('공통 표시 정리 (§3.1·§3.2, §14.2)', () => {
  it.each([...USER_PATHS, ...ADMIN_PATHS])('%s 화면에 테스트 데이터·초안 기준·샘플 데이터 표시가 없다', async (path) => {
    const wrapper = await mountApp(path)
    const text = wrapper.text()
    for (const word of FORBIDDEN) expect({ path, word, found: text.includes(word) }).toEqual({ path, word, found: false })
    wrapper.unmount()
  })

  it.each(ADMIN_PATHS)('%s 관리자 화면에 참고 화면의 예시 값이 없다', async (path) => {
    const wrapper = await mountApp(path)
    const text = wrapper.text()
    for (const word of REFERENCE_EXAMPLES) expect({ path, word, found: text.includes(word) }).toEqual({ path, word, found: false })
    wrapper.unmount()
  })
})

describe('공고 데이터 삭제 (§3.3)', () => {
  it('기본 저장소는 빈 저장소이고 테스트 데이터셋 분기가 없다', async () => {
    expect(programRepository.source.kind).toBe('not-connected')
    expect(await programRepository.list({} as never)).toEqual({ items: [], total: null })
    expect(await programRepository.getById('P001')).toBeNull()
  })

  it('앱 소스 어디에도 테스트 데이터셋 파일·분기·환경변수가 없다', () => {
    const root = resolve(process.cwd(), 'src')
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) {
          if (name !== '__tests__') walk(full)
        } else if (/\.(ts|vue|json)$/.test(name)) files.push(full)
      }
    }
    walk(root)
    const hits = files.filter((file) => /test-dataset|VITE_DATA_SOURCE|StaticProgramRepository/.test(readFileSync(file, 'utf8')))
    expect(hits).toEqual([])
    expect(files.some((file) => file.endsWith('test-dataset.json'))).toBe(false)
  })

  it('예전 공고 주소는 공고 없음 안내를 보여 준다 (크래시 없음)', async () => {
    const wrapper = await mountApp('/programs/P001')
    expect(wrapper.text()).toContain('해당 공고를 찾을 수 없습니다.')
    wrapper.unmount()
  })
})

describe('기업 진단 삭제·수출 로드맵 (§4.1~§4.3)', () => {
  it('/diagnose/result는 맞춤 추천으로 간다 (쿼리·해시 유지, REVISION_05에서 로드맵 삭제)', async () => {
    const route = await at(makeRouter(), '/diagnose/result?x=1#top')
    expect(route.name).toBe('programs-recommended')
    expect(route.query).toEqual({ x: '1' })
    expect(route.hash).toBe('#top')
    expect(makeRouter().hasRoute('diagnose-result')).toBe(false)
  })

  it('기업 맞춤 지원사업의 하위 메뉴는 [맞춤 공고] [공고 비교]이고, 주 메뉴는 맞춤 공고를 연다', async () => {
    const find = sectionByKey('find')!
    expect(find.items.map((item) => item.label)).toEqual(['맞춤 공고', '공고 비교'])
    expect(firstRouteName(find)).toBe('programs-recommended')
    const router = makeRouter()
    await at(router, '/programs')
    const header = mount(AppHeader, { props: { menuOpen: false }, global: { plugins: [router] } })
    const link = header.findAll('.top-nav__link').find((a) => a.text() === '기업 맞춤 지원사업')
    expect(link?.attributes('href')).toBe('/programs/recommended')
    expect(header.text()).not.toContain('기업 진단')
    header.unmount()
  })

  it('수출 로드맵 화면은 없고(REVISION_05), 예전 주소는 맞춤 추천으로 간다', async () => {
    const router = makeRouter()
    expect(router.hasRoute('roadmap')).toBe(false)
    const route = await at(router, '/roadmap?tab=x#h')
    expect(route.name).toBe('programs-recommended')
    expect(route.query).toEqual({ tab: 'x' })
    expect(route.hash).toBe('#h')
  })

  describe('기업 프로필의 이동', () => {
    const store = useProfileStore()
    afterEach(() => store.replaceProfile(createEmptyProfile()))

    async function mountInput(path: string) {
      const router = makeRouter()
      await at(router, path)
      const wrapper = mount(DiagnoseInputView, { global: { plugins: [router] }, attachTo: document.body })
      await flushPromises()
      return { router, wrapper }
    }

    it("입력 완료 후 맞춤 추천으로 간다", async () => {
      // 사업자등록번호는 저장하지 않는 세션 입력이라 테스트 전용 형식 값을 넣는다
      store.replaceProfile({ ...createTestAccountProfile(), businessNumber: '000-00-00000' })
      const { router, wrapper } = await mountInput('/profile?step=7')
      await wrapper.get('form').trigger('submit')
      await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('programs-recommended'))
      wrapper.unmount()
    })

    it("빠진 항목이 있으면 '입력 중' 상태로 맞춤 추천 보기 버튼이 맞춤 추천을 연다", async () => {
      // 마지막 단계는 ⑦ 재무·신청 전 확인 (REVISION_05 §3). 관심 분야는 채우고 다른 필수 항목은 비워 둔다
      store.replaceProfile({ ...createEmptyProfile(), companyName: '테스트 전용 기업', interestAreas: ['logistics'] })
      const { router, wrapper } = await mountInput('/profile?step=7')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(wrapper.text()).toContain('지금 맞춤 추천을 보면')
      const button = wrapper.findAll('button').find((b) => b.text().includes("'입력 중' 상태로 맞춤 추천 보기"))
      expect(button).toBeTruthy()
      await button!.trigger('click')
      await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('programs-recommended'))
      wrapper.unmount()
    })
  })
})

describe('맞춤 추천 화면 (§4.4, 데이터 없음)', () => {
  it('검색창·필터·정렬·추천 결과·전체 탭이 없고 상태 탭 3개의 건수는 -다', async () => {
    const router = makeRouter()
    await at(router, '/programs/recommended?q=old&status=open&sort=deadline')
    const wrapper = mount(ProgramRecommendedView, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.find('[role="search"]').exists()).toBe(false)
    expect(wrapper.find('select').exists()).toBe(false)
    const text = wrapper.text()
    for (const word of ['추천 결과', '필터', '정렬']) expect({ word, found: text.includes(word) }).toEqual({ word, found: false })
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((tab) => tab.text().split('-')[0]!.trim())).toEqual(['신청 가능', '확인 필요', '신청 불가'])
    // 건수는 0이 아니라 '-' (화면낭독기에는 '정보 없음')
    expect(tabs.map((tab) => tab.get('.tab-nav__count').text())).toEqual(['-정보 없음', '-정보 없음', '-정보 없음'])
    expect(tabs[0]!.attributes('aria-selected')).toBe('true')
    expect(text).toContain('현재 등록된 지원사업 공고가 없습니다.')
    expect(text).toContain('기업정보 확인하기')
    expect(text).toContain('모든 판정에는 기준일과 판정 기준 버전을 함께 표시합니다.')
    expect(text).toContain('입력한 기업정보를 기준으로 공고를 신청 가능 여부와 적합도 순으로 보여 드립니다.')
    wrapper.unmount()
  })
})

describe('카드 표시 도우미 (§4.4.3·§4.4.4)', () => {
  it('지원 내용: 쉬운 설명 → 세부 분야 이름(2개 + 외 n개) → null', () => {
    expect(supportContentLine(blankProgram({ summaryEasy: '  해외 인증 비용 지원  ', supportCategories: ['C05'] }))).toBe('해외 인증 비용 지원')
    expect(supportContentLine(blankProgram({ summaryEasy: '   ', supportCategories: ['C05', 'C06', 'C13'] }))).toBe(
      '해외규격인증 · 홍보/광고 외 1개',
    )
    expect(supportContentLine(blankProgram({ supportCategories: ['C13'] }))).toBe('국제운송')
    expect(supportContentLine(blankProgram({ summaryEasy: null, supportCategories: null }))).toBeNull()
    expect(supportContentLine(null)).toBeNull()
  })

  it('신청 마감: 남은 일수는 데이터 기준일로만 계산하고, 기준일이 없으면 붙이지 않는다', () => {
    const end = (applyEnd: string | null, applyPeriodNote: string | null = null) => blankProgram({ applyEnd, applyPeriodNote })
    expect(recommendationDeadlineText(end('2030-12-18'), '2030-11-06')).toBe('12월 18일 (42일 남음)')
    expect(recommendationDeadlineText(end('2030-11-06'), '2030-11-06')).toBe('11월 6일 (오늘 마감)')
    expect(recommendationDeadlineText(end('2030-11-01'), '2030-11-06')).toBe('11월 1일 (마감)')
    expect(recommendationDeadlineText(end('2031-01-05'), '2030-11-06')).toBe('2031년 1월 5일 (60일 남음)')
    expect(recommendationDeadlineText(end('2030-12-18'), null)).toBe('2030년 12월 18일')
    expect(recommendationDeadlineText(end(null, '예산 소진 시까지'), '2030-11-06')).toBe('예산 소진 시까지')
    expect(recommendationDeadlineText(end(null), null)).toBeNull()
  })
})

describe('역할 (§5.1)', () => {
  afterEach(async () => {
    await useAuth().logout()
  })

  it.each([
    ['admin', 'admin', true],
    ['test', 'test', false],
    ['demo', 'member', false],
    [undefined, 'member', false],
    ['ADMIN', 'member', false],
  ])('서버 역할 %s → 화면 역할 %s (관리자 %s)', async (serverRole, role, admin) => {
    stubLogin(serverRole)
    const auth = useAuth()
    expect(await auth.login('ANYONE', 'test-only')).toEqual({ ok: true })
    expect(auth.state.user?.role).toBe(role)
    expect(auth.isAdmin.value).toBe(admin)
  })
})

describe('이동 규칙 (§5.2)', () => {
  const ANON: NavigationAuth = { authenticated: false, role: null }
  const ADMIN: NavigationAuth = { authenticated: true, role: 'admin' }
  const TEST: NavigationAuth = { authenticated: true, role: 'test' }
  const MEMBER: NavigationAuth = { authenticated: true, role: 'member' }

  function guarded(auth: NavigationAuth): Router {
    const router = makeRouter()
    router.beforeEach((to) => authNavigationTarget(to, auth, router))
    return router
  }

  it('비로그인으로 관리자 화면 → 로그인 화면 (돌아올 주소 포함)', async () => {
    const route = await at(guarded(ANON), '/admin/review?id=x')
    expect(route.name).toBe('login')
    expect(route.query.redirect).toBe('/admin/review?id=x')
  })

  it('관리자가 아닌 계정으로 관리자 화면 → 맞춤 추천 (안내 대상, REVISION_05)', async () => {
    for (const auth of [TEST, MEMBER]) {
      const router = guarded(auth)
      expect((await at(router, '/admin/settings')).fullPath).toBe('/programs/recommended')
      expect(isAdminDenied(router.resolve('/admin/settings'), auth)).toBe(true)
    }
    expect(isAdminDenied(makeRouter().resolve('/admin'), ADMIN)).toBe(false)
    expect(isAdminDenied(makeRouter().resolve('/admin'), ANON)).toBe(false)
    expect(ADMIN_ONLY_MESSAGE).toBe('관리자 계정만 볼 수 있는 화면입니다.')
  })

  it('관리자: 홈 → 관리자 홈, 로그인 화면 → redirect 또는 관리자 홈, 사용자 화면도 열 수 있다', async () => {
    const router = guarded(ADMIN)
    expect((await at(router, '/')).fullPath).toBe('/admin')
    expect((await at(router, '/programs')).fullPath).toBe('/programs')
    expect((await at(router, '/login')).fullPath).toBe('/admin')
    expect((await at(router, '/login?redirect=/admin/review')).fullPath).toBe('/admin/review')
    expect((await at(router, '/login?redirect=/programs/recommended')).fullPath).toBe('/programs/recommended')
    expect((await at(router, '/login?redirect=https://example.com')).fullPath).toBe('/admin')
  })

  it('그 밖의 계정: 홈은 서비스 소개, 로그인 → 맞춤 추천, 관리자 redirect는 거부 (REVISION_05)', async () => {
    const router = guarded(TEST)
    expect((await at(router, '/')).fullPath).toBe('/')
    expect((await at(router, '/login')).fullPath).toBe('/programs/recommended')
    expect((await at(router, '/login?redirect=/admin/review')).fullPath).toBe('/programs/recommended')
    expect((await at(router, '/login?redirect=/manage/programs')).fullPath).toBe('/manage/programs')
  })

  it('로그인 후 이동 주소 (afterLoginPath · safeRedirect)', () => {
    const router = makeRouter()
    expect(afterLoginPath(undefined, router, 'admin')).toBe(ADMIN_HOME_PATH)
    expect(afterLoginPath('/admin/kotra', router, 'admin')).toBe('/admin/kotra')
    expect(afterLoginPath('/programs', router, 'admin')).toBe('/programs')
    expect(afterLoginPath('/admin/kotra', router, 'test')).toBe(AFTER_LOGIN_PATH)
    expect(afterLoginPath('/admin/kotra', router)).toBe(AFTER_LOGIN_PATH)
    expect(safeRedirect('/admin', router, 'member')).toBeNull()
    expect(safeRedirect('/admin', router, 'admin')).toBe('/admin')
  })

  it('없는 관리자 주소는 페이지를 찾을 수 없음', async () => {
    const route = await at(guarded(ADMIN), '/admin/없는-경로')
    expect(route.name).toBe('not-found')
  })

  it('관리자 화면의 탭 제목은 "<제목> | 관리자 | 서비스 이름"', () => {
    const router = makeRouter()
    expect(documentTitle(router.resolve('/admin/kotra'))).toBe('KOTRA CSV 업로드 | 관리자 | Export Compass')
    expect(documentTitle(router.resolve('/programs'))).toBe('전체 공고 | Export Compass')
  })
})

describe('관리자 영역 (§5.3·§6~§12)', () => {
  it('관리자 경로 7개가 관리자 레이아웃·메뉴·관리자 전용으로 등록되어 있다', () => {
    const router = makeRouter()
    expect(ADMIN_PATHS.map((path) => router.resolve(path).name)).toEqual(ADMIN_NAV_ITEMS.map((item) => item.routeName))
    for (const path of ADMIN_PATHS) {
      expect(router.resolve(path).meta).toMatchObject({ layout: 'admin', requiresAdmin: true })
      expect(router.resolve(path).meta.section).toBeUndefined()
    }
  })

  it('사용자 메뉴(주 메뉴·하위 메뉴·서랍)에는 관리자 항목이 없다', async () => {
    const adminRoutes = new Set(ADMIN_NAV_ITEMS.map((item) => item.routeName))
    expect(NAV_SECTIONS.flatMap((s) => s.items).some((item) => adminRoutes.has(item.routeName))).toBe(false)
    const router = makeRouter()
    await at(router, '/programs')
    const header = mount(AppHeader, { props: { menuOpen: false }, global: { plugins: [router] } })
    expect(header.findAll('a').some((a) => (a.attributes('href') ?? '').startsWith('/admin'))).toBe(false)
    header.unmount()
  })

  it('관리자 헤더: 메뉴 7개 (REVISION_05: KITA 업로드 추가), 현재 화면 aria-current, 사용자 화면 보기', async () => {
    const router = makeRouter()
    await at(router, '/admin/notices')
    const header = mount(AdminHeader, { props: { menuOpen: false }, global: { plugins: [router] } })
    const links = header.findAll('.admin-nav__link')
    expect(links.map((a) => a.text())).toEqual(['관리자 홈', '기업마당 수집', 'KOTRA 업로드', 'KITA 업로드', '공고 검수', '공고 관리', '기준·설정'])
    expect(header.findAll('[aria-current="page"]').map((a) => a.text())).toEqual(['공고 관리'])
    const userView = header.findAll('a').find((a) => a.text() === '사용자 화면 보기')
    expect(userView?.attributes('href')).toBe('/programs/recommended')
    expect(header.get('.brand-link').attributes('href')).toBe('/admin')
    header.unmount()
  })

  it.each(ADMIN_PATHS)('%s: 저장소 안내가 있고, 저장이 필요한 버튼은 모두 비활성이며 이유가 연결된다', async (path) => {
    const wrapper = await mountApp(path)
    expect(wrapper.text()).toContain('공고 저장소가 연결되지 않았습니다')
    const disabled = wrapper.findAll('main [aria-disabled="true"]')
    for (const button of disabled) {
      const id = button.attributes('aria-describedby')
      expect({ label: button.text(), linked: Boolean(id && document.getElementById(id)?.textContent?.trim()) }).toEqual({
        label: button.text(),
        linked: true,
      })
    }
    wrapper.unmount()
  })

  it('비활성 버튼을 눌러도 저장소 쓰기 메서드를 부르지 않는다', async () => {
    const writes = [
      'runCollection',
      'saveCollectionSettings',
      'applyUpload',
      'revertUpload',
      'approve',
      'reject',
      'suspend',
      'republish',
      'merge',
      'keepSeparate',
      'saveCriteriaSettings',
    ] as const
    const spies = writes.map((name) => vi.spyOn(adminRepository, name))
    for (const path of ADMIN_PATHS) {
      const wrapper = await mountApp(path)
      for (const button of wrapper.findAll('main [aria-disabled="true"]')) await button.trigger('click')
      wrapper.unmount()
    }
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })

  it('EmptyAdminRepository: 쓰기 불가, 읽기는 수치 null·목록 [], 쓰기를 부르면 오류 (성공을 흉내 내지 않음)', async () => {
    const repository: AdminRepository = new EmptyAdminRepository()
    expect(repository.canWrite).toBe(false)
    expect(await repository.getDashboard()).toMatchObject({ pendingReview: null, todayCollected: null, pipeline: null })
    expect(await repository.listNotices({ source: null, status: null, keyword: null, page: 1 })).toEqual({ items: [], total: null })
    expect(await repository.listReviewQueue()).toEqual([])
    await expect(repository.approve('x', { labels: { supportCategories: [], targetExportStages: [], summaryEasy: null }, memo: null })).rejects.toThrow(
      NOT_CONNECTED_ERROR,
    )
  })

  it('공고 관리 필터는 주소 쿼리와 맞물린다', async () => {
    const wrapper = await mountApp('/admin/notices')
    const router = wrapper.vm.$router
    const kotra = wrapper.findAll('button').find((b) => b.text() === 'KOTRA')
    await kotra!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ source: 'kotra' })
    const closed = wrapper.findAll('button').find((b) => b.text() === '마감')
    await closed!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ source: 'kotra', status: 'closed' })
    await wrapper.get('#notices-keyword').setValue('  수출  ')
    await wrapper.get('form[role="search"]').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ source: 'kotra', status: 'closed', q: '수출' })
    expect(wrapper.get('.list-count').text().replace(/정보 없음/g, '')).toMatch(/^전체\s*-\s*건 중\s*-\s*건 표시$/)
    wrapper.unmount()
  })
})

describe('관리자 프로필 팝업 (§5.2)', () => {
  beforeEach(() => stubLogin('admin'))
  afterEach(async () => {
    await useAuth().logout()
  })

  it('관리자는 사용자 화면에서도 팝업 항목이 관리자 홈 · 로그아웃이다', async () => {
    await useAuth().login('ADMIN', 'test-only')
    const router = makeRouter()
    await at(router, '/programs')
    const header = mount(AppHeader, { props: { menuOpen: false }, global: { plugins: [router] }, attachTo: document.body })
    const button = header.get('button[aria-label^="계정 메뉴"]')
    button.element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await flushPromises()
    const popup = header.get(`#${button.attributes('aria-controls')}`)
    const items = popup.findAll('a, button')
    expect(items.map((item) => item.text())).toEqual(['관리자 홈', '로그아웃'])
    expect(items[0]!.attributes('href')).toBe('/admin')
    header.unmount()
  })

  it('관리자가 아닌 계정이 관리자 화면을 열면 안내 토스트를 띄울 대상이다', () => {
    const toast = useToast()
    expect(typeof toast.show).toBe('function')
    const route = makeRouter().resolve('/admin')
    expect(isAdminDenied(route, { authenticated: true, role: 'test' })).toBe(true)
  })
})

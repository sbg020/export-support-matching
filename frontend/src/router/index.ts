import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type RouteMeta,
  type Router,
  type RouteRecordRaw,
  type RouteRecordRedirectOption,
  type RouteRecordSingleView,
} from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { APP_NAME, type NavSectionKey } from '@/constants/navigation'
import { ADMIN_AREA_LABEL, ADMIN_ONLY_MESSAGE, type AdminMenuKey } from '@/constants/adminNavigation'
import { useAuth, type AuthRole } from '@/stores/authStore'
import { useToast } from '@/stores/toastStore'
import { afterLoginPath } from '@/lib/redirect'

declare module 'vue-router' {
  interface RouteMeta {
    /** 페이지 제목 (브라우저 탭에 사용) */
    title: string
    /** 상단 주 메뉴·화면 내 하위 메뉴에서 선택 상태로 표시할 영역. 홈·로그인·기업 프로필은 없음 */
    section?: NavSectionKey
    /** 로그인이 필요한 화면 */
    requiresAuth?: boolean
    /** 관리자 영역 화면: 관리자 헤더를 쓴다 (REVISION_04 §6.1) */
    layout?: 'admin'
    /** 관리자 메뉴에서 선택 상태로 표시할 항목 */
    adminMenu?: AdminMenuKey
    /** 관리자 계정만 볼 수 있는 화면 */
    requiresAdmin?: boolean
    /** KOTRA·KITA 업로드 화면의 출처 */
    uploadSource?: 'kotra' | 'kita'
  }
}

/** 관리자 영역 화면: 관리자 헤더, 관리자 메뉴 선택 상태, 관리자 계정만 */
function adminRoute(
  path: string,
  name: string,
  title: string,
  adminMenu: AdminMenuKey,
  component: RouteRecordSingleView['component'],
): RouteRecordSingleView {
  return { path, name, component, meta: { title, layout: 'admin', adminMenu, requiresAdmin: true } }
}

/** 이동·통합된 화면의 기존 주소를 새 위치로 보낸다. 기존 쿼리와 해시는 유지한다. */
function moved(name: string, extraQuery: Record<string, string> = {}): RouteRecordRedirectOption {
  return (to) => ({
    name,
    query: { ...to.query, ...extraQuery },
    hash: to.hash,
  })
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: '서비스 소개', section: 'intro' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '로그인' },
  },

  // 기업 프로필: 기업정보 입력 화면. 로그인 없이 쓰며 어느 주 메뉴에도 속하지 않는다 (REVISION_03 §6)
  {
    path: '/profile',
    name: 'company-profile',
    component: () => import('@/views/diagnose/DiagnoseInputView.vue'),
    meta: { title: '기업 프로필' },
  },
  { path: '/diagnose', redirect: moved('company-profile') },
  { path: '/diagnose/input', redirect: moved('company-profile') },

  // 기업 맞춤 지원사업 (기업 진단 화면은 REVISION_04, 수출 로드맵은 REVISION_05에서 없앴다. 예전 주소는 맞춤 추천으로)
  { path: '/diagnose/result', redirect: moved('programs-recommended') },
  { path: '/roadmap', redirect: moved('programs-recommended') },
  {
    path: '/programs/recommended',
    name: 'programs-recommended',
    component: () => import('@/views/programs/ProgramRecommendedView.vue'),
    meta: { title: '맞춤 추천', section: 'find' },
  },

  // 전체 지원사업
  {
    path: '/programs',
    name: 'programs',
    component: () => import('@/views/programs/ProgramListView.vue'),
    meta: { title: '전체 공고', section: 'programs' },
  },
  {
    path: '/programs/calendar',
    name: 'programs-calendar',
    component: () => import('@/views/programs/ProgramCalendarView.vue'),
    meta: { title: '공고 달력', section: 'programs' },
  },
  {
    // 공고 비교는 전체 공고 하단 비교 영역으로 통합했다. 기존 ?ids= 선택도 넘긴다.
    path: '/programs/compare',
    redirect: (to) => {
      const { ids, compare, ...rest } = to.query
      const selected = compare ?? ids
      return {
        name: 'programs',
        query: { ...rest, ...(selected ? { compare: selected } : {}) },
        hash: '#compare',
      }
    },
  },
  {
    path: '/programs/:id',
    name: 'program-detail',
    component: () => import('@/views/programs/ProgramDetailView.vue'),
    props: true,
    meta: { title: '공고 상세', section: 'programs' },
  },

  // 커뮤니티 (읽기는 로그인 없이, 글쓰기는 로그인 필요). 글쓰기 경로가 :postId로 해석되지 않게 먼저 둔다.
  { path: '/community', redirect: moved('community-reviews') },
  {
    path: '/community/reviews',
    name: 'community-reviews',
    component: () => import('@/views/community/CommunityBoardView.vue'),
    props: { board: 'reviews' },
    meta: { title: '지원사업 후기', section: 'community' },
  },
  {
    path: '/community/info',
    name: 'community-info',
    component: () => import('@/views/community/CommunityBoardView.vue'),
    props: { board: 'info' },
    meta: { title: '지원사업 정보방', section: 'community' },
  },
  {
    path: '/community/:board(reviews|info)/write',
    name: 'community-write',
    component: () => import('@/views/community/CommunityWriteView.vue'),
    props: true,
    meta: { title: '글쓰기', section: 'community', requiresAuth: true },
  },
  {
    path: '/community/:board(reviews|info)/:postId',
    name: 'community-post',
    component: () => import('@/views/community/CommunityPostView.vue'),
    props: true,
    meta: { title: '글 보기', section: 'community' },
  },

  // 지원사업 관리 (로그인 필요)
  { path: '/manage', redirect: moved('manage-programs') },
  {
    path: '/manage/programs',
    name: 'manage-programs',
    component: () => import('@/views/mypage/MyProgramsView.vue'),
    meta: { title: '나의 사업 관리', section: 'manage', requiresAuth: true },
  },
  {
    path: '/manage/documents',
    name: 'manage-documents',
    component: () => import('@/views/mypage/DocumentsView.vue'),
    meta: { title: '서류함', section: 'manage', requiresAuth: true },
  },

  // 관리자 영역 (REVISION_04 §5.2). 사용자 메뉴에는 넣지 않는다
  adminRoute('/admin', 'admin-home', '관리자 홈', 'home', () => import('@/views/admin/AdminHomeView.vue')),
  adminRoute('/admin/bizinfo', 'admin-bizinfo', '기업마당 API 수집', 'bizinfo', () => import('@/views/admin/AdminBizinfoView.vue')),
  adminRoute('/admin/kotra', 'admin-kotra', 'KOTRA CSV 업로드', 'kotra', () => import('@/views/admin/AdminKotraView.vue')),
  // KITA: KOTRA와 같은 화면, 출처만 다르다 (REVISION_05 §7.4)
  {
    ...adminRoute('/admin/kita', 'admin-kita', 'KITA CSV 업로드', 'kita', () => import('@/views/admin/AdminKotraView.vue')),
    meta: { title: 'KITA CSV 업로드', layout: 'admin', adminMenu: 'kita', requiresAdmin: true, uploadSource: 'kita' },
  },
  adminRoute('/admin/review', 'admin-review', '공고 검수', 'review', () => import('@/views/admin/AdminReviewView.vue')),
  adminRoute('/admin/notices', 'admin-notices', '공고 관리', 'notices', () => import('@/views/admin/AdminNoticesView.vue')),
  adminRoute('/admin/settings', 'admin-settings', '기준·설정', 'settings', () => import('@/views/admin/AdminSettingsView.vue')),

  // 없어진 마이페이지 주소: 북마크·공유 링크가 계속 열리도록 새 위치로 보낸다 (쿼리·해시 유지)
  { path: '/mypage', redirect: moved('company-profile') },
  { path: '/mypage/profile', redirect: moved('company-profile') },
  { path: '/mypage/programs', redirect: moved('manage-programs') },
  { path: '/mypage/documents', redirect: moved('manage-documents') },
  { path: '/mypage/saved', redirect: moved('manage-programs', { tab: 'interested' }) },
  { path: '/mypage/preparation', redirect: moved('manage-programs', { tab: 'preparing' }) },
  { path: '/mypage/history', redirect: moved('manage-programs', { tab: 'applied' }) },
  { path: '/mypage/calendar', redirect: moved('programs-calendar') },

  // 공개 API 안내 (REVISION_05 §9). 메뉴에는 넣지 않고 바닥글 링크로 연다
  {
    path: '/developers',
    name: 'developers',
    component: () => import('@/views/DevelopersView.vue'),
    meta: { title: '개발자 안내 (공개 API)' },
  },

  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '페이지를 찾을 수 없음' },
  },
]

function headerOffset(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--header-height')
  return (Number.parseInt(value, 10) || 64) + 16
}

/** 해시 대상이 비동기로 그려질 수 있어 잠시 기다린 뒤 스크롤한다. */
function waitForElement(selector: string, timeoutMs = 1500): Promise<Element | null> {
  return new Promise((resolve) => {
    const started = Date.now()
    const tick = () => {
      let found: Element | null = null
      try {
        found = document.querySelector(selector)
      } catch {
        resolve(null)
        return
      }
      if (found || Date.now() - started > timeoutMs) resolve(found)
      else window.setTimeout(tick, 50)
    }
    tick()
  })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  async scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      const element = await waitForElement(to.hash)
      // 고정 헤더에 가리지 않도록 헤더 높이만큼 여백을 둔다.
      if (element) return { el: to.hash, top: headerOffset() }
      return false
    }
    // 같은 페이지에서 쿼리(필터·단계·탭)만 바뀌면 스크롤을 유지한다.
    if (to.path === from.path) return false
    return { top: 0 }
  },
})

/** 이동 규칙에 쓰는 로그인 상태. 역할은 화면 이동에만 쓴다 (서버 데이터는 서버가 역할을 다시 확인한다) */
export interface NavigationAuth {
  authenticated: boolean
  role: AuthRole | null
}

/**
 * 로그인 상태·역할에 따른 이동 (REVISION_03 §4, REVISION_04 §5.2).
 * - 로그인이 필요한 화면·관리자 화면을 비로그인으로 → 로그인 화면 (로그인 후 그 화면으로 돌아온다)
 * - 관리자가 아닌 계정으로 관리자 화면 → 맞춤 추천 (안내 토스트는 beforeEach가 띄운다)
 * - 로그인 상태에서 홈 → 관리자는 관리자 홈, 그 밖의 계정은 홈(서비스 소개)을 그대로 본다 (REVISION_05: 수출 로드맵 삭제)
 * - 로그인 상태에서 로그인 화면 → 안전한 redirect 또는 각 계정의 첫 화면
 */
export function authNavigationTarget(
  to: RouteLocationNormalized,
  auth: NavigationAuth,
  router: Router,
): RouteLocationRaw | true {
  const admin = auth.authenticated && auth.role === 'admin'
  if ((to.meta.requiresAuth || to.meta.requiresAdmin) && !auth.authenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !admin) return { name: 'programs-recommended' }
  if (admin && to.name === 'home') return { name: 'admin-home' }
  if (auth.authenticated && to.name === 'login') return afterLoginPath(to.query.redirect, router, auth.role)
  return true
}

/** 이동 대상의 이름과 meta만 보는 규칙에 쓰는 최소 형태 (resolve 결과도 받는다) */
interface RouteNameMeta {
  name?: unknown
  meta: RouteMeta
}

/** 관리자가 아닌 계정이 관리자 화면을 열었는지 (맞춤 추천으로 보내며 안내한다) */
export function isAdminDenied(to: RouteNameMeta, auth: NavigationAuth): boolean {
  return Boolean(to.meta.requiresAdmin) && auth.authenticated && auth.role !== 'admin'
}

router.beforeEach(async (to) => {
  const auth = useAuth()
  // 확인 중(unknown)에는 서버 확인이 끝난 뒤 판단한다
  await auth.ensureChecked()
  const navigationAuth: NavigationAuth = {
    authenticated: auth.state.status === 'authenticated',
    role: auth.state.user?.role ?? null,
  }
  if (isAdminDenied(to, navigationAuth)) useToast().show(ADMIN_ONLY_MESSAGE, 'warning')
  return authNavigationTarget(to, navigationAuth, router)
})

/** 브라우저 탭 제목: 관리자 화면은 '<제목> | 관리자 | 서비스 이름' (REVISION_04 §6.1) */
export function documentTitle(to: RouteNameMeta): string {
  if (to.name === 'home') return APP_NAME
  if (to.meta.layout === 'admin') return `${to.meta.title} | ${ADMIN_AREA_LABEL} | ${APP_NAME}`
  return `${to.meta.title} | ${APP_NAME}`
}

router.afterEach((to) => {
  document.title = documentTitle(to)
})

export default router

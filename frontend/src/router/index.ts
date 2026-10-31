import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type Router,
  type RouteRecordRaw,
  type RouteRecordRedirectOption,
} from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { APP_NAME, type NavSectionKey } from '@/constants/navigation'
import { useAuth } from '@/stores/authStore'
import { afterLoginPath } from '@/lib/redirect'

declare module 'vue-router' {
  interface RouteMeta {
    /** 페이지 제목 (브라우저 탭에 사용) */
    title: string
    /** 상단 주 메뉴·화면 내 하위 메뉴에서 선택 상태로 표시할 영역. 홈·로그인·기업 프로필은 없음 */
    section?: NavSectionKey
    /** 로그인이 필요한 화면 */
    requiresAuth?: boolean
  }
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
    meta: { title: '홈' },
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

  // 기업 맞춤 지원사업
  {
    path: '/diagnose/result',
    name: 'diagnose-result',
    component: () => import('@/views/diagnose/DiagnoseResultView.vue'),
    meta: { title: '기업 진단', section: 'find' },
  },
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

  // 수출 로드맵 (로그인 후 첫 화면)
  {
    path: '/roadmap',
    name: 'roadmap',
    component: () => import('@/views/RoadmapView.vue'),
    meta: { title: '수출 로드맵', section: 'roadmap' },
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
    meta: { title: '관심·준비 중·신청완료 사업', section: 'manage', requiresAuth: true },
  },
  {
    path: '/manage/documents',
    name: 'manage-documents',
    component: () => import('@/views/mypage/DocumentsView.vue'),
    meta: { title: '서류함', section: 'manage', requiresAuth: true },
  },

  // 없어진 마이페이지 주소: 북마크·공유 링크가 계속 열리도록 새 위치로 보낸다 (쿼리·해시 유지)
  { path: '/mypage', redirect: moved('company-profile') },
  { path: '/mypage/profile', redirect: moved('company-profile') },
  { path: '/mypage/programs', redirect: moved('manage-programs') },
  { path: '/mypage/documents', redirect: moved('manage-documents') },
  { path: '/mypage/saved', redirect: moved('manage-programs', { tab: 'interested' }) },
  { path: '/mypage/preparation', redirect: moved('manage-programs', { tab: 'preparing' }) },
  { path: '/mypage/history', redirect: moved('manage-programs', { tab: 'applied' }) },
  { path: '/mypage/calendar', redirect: moved('programs-calendar') },

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

/**
 * 로그인 상태에 따른 이동 (REVISION_03 §4).
 * - 로그인이 필요한 화면 → 로그인 화면 (로그인 후 그 화면으로 돌아온다)
 * - 로그인 상태에서 홈 → 수출 로드맵 (로그인 전 첫 화면은 보이지 않는다)
 * - 로그인 상태에서 로그인 화면 → 안전한 redirect 또는 수출 로드맵
 */
export function authNavigationTarget(
  to: RouteLocationNormalized,
  authenticated: boolean,
  router: Router,
): RouteLocationRaw | true {
  if (to.meta.requiresAuth && !authenticated) return { name: 'login', query: { redirect: to.fullPath } }
  if (authenticated && to.name === 'home') return { name: 'roadmap' }
  if (authenticated && to.name === 'login') return afterLoginPath(to.query.redirect, router)
  return true
}

router.beforeEach(async (to) => {
  const auth = useAuth()
  // 확인 중(unknown)에는 서버 확인이 끝난 뒤 판단한다
  await auth.ensureChecked()
  return authNavigationTarget(to, auth.state.status === 'authenticated', router)
})

router.afterEach((to) => {
  document.title = to.name === 'home' ? APP_NAME : `${to.meta.title} | ${APP_NAME}`
})

export default router

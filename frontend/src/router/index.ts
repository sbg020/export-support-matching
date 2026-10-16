import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type RouteRecordRedirectOption,
} from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { APP_NAME, type NavSectionKey } from '@/constants/navigation'
import { useAuth } from '@/stores/authStore'
import { safeRedirect } from '@/lib/redirect'

declare module 'vue-router' {
  interface RouteMeta {
    /** 페이지 제목 (브라우저 탭에 사용) */
    title: string
    /** 사이드바·화면 내 하위 메뉴에서 선택 상태로 표시할 영역. 홈·로그인은 없음 */
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

  // 지원사업 찾기
  { path: '/diagnose', redirect: moved('diagnose-input') },
  {
    path: '/diagnose/input',
    name: 'diagnose-input',
    component: () => import('@/views/diagnose/DiagnoseInputView.vue'),
    meta: { title: '기업정보 입력·저장', section: 'find' },
  },
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

  // 나의 로드맵
  {
    path: '/roadmap',
    name: 'roadmap',
    component: () => import('@/views/RoadmapView.vue'),
    meta: { title: '수출 로드맵', section: 'roadmap' },
  },

  // 마이페이지 (로그인 필요)
  { path: '/mypage', redirect: moved('mypage-profile') },
  {
    path: '/mypage/profile',
    name: 'mypage-profile',
    component: () => import('@/views/mypage/ProfileView.vue'),
    meta: { title: '기업 프로필', section: 'mypage', requiresAuth: true },
  },
  {
    path: '/mypage/programs',
    name: 'mypage-programs',
    component: () => import('@/views/mypage/MyProgramsView.vue'),
    meta: { title: '관심·준비 중·신청완료 사업', section: 'mypage', requiresAuth: true },
  },
  {
    path: '/mypage/documents',
    name: 'mypage-documents',
    component: () => import('@/views/mypage/DocumentsView.vue'),
    meta: { title: '서류함', section: 'mypage', requiresAuth: true },
  },
  { path: '/mypage/saved', redirect: moved('mypage-programs', { tab: 'interested' }) },
  { path: '/mypage/preparation', redirect: moved('mypage-programs', { tab: 'preparing' }) },
  { path: '/mypage/history', redirect: moved('mypage-programs', { tab: 'applied' }) },
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

router.beforeEach(async (to) => {
  const auth = useAuth()
  await auth.ensureChecked()
  const authenticated = auth.state.status === 'authenticated'
  if (to.meta.requiresAuth && !authenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && authenticated) {
    return safeRedirect(to.query.redirect, router) ?? '/'
  }
  return true
})

router.afterEach((to) => {
  document.title = to.name === 'home' ? APP_NAME : `${to.meta.title} | ${APP_NAME}`
})

export default router

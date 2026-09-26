import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { APP_NAME, type NavSectionKey } from '@/constants/navigation'

declare module 'vue-router' {
  interface RouteMeta {
    /** 페이지 제목 (브라우저 탭·이동 경로에 사용) */
    title: string
    /** 상단 메뉴에서 활성으로 표시할 영역 */
    section: NavSectionKey
    /** 이동 경로에 표시할 상위 페이지 이름 (가까운 순서가 마지막) */
    ancestors?: string[]
    /** 사이드바 없는 소개형 레이아웃 */
    landing?: boolean
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: '홈', section: 'home', landing: true },
  },
  { path: '/diagnose', redirect: { name: 'diagnose-input' } },
  {
    path: '/diagnose/input',
    name: 'diagnose-input',
    component: () => import('@/views/diagnose/DiagnoseInputView.vue'),
    meta: { title: '기업정보 입력', section: 'find' },
  },
  {
    path: '/diagnose/result',
    name: 'diagnose-result',
    component: () => import('@/views/diagnose/DiagnoseResultView.vue'),
    meta: { title: '기업 진단', section: 'find', ancestors: ['diagnose-input'] },
  },
  {
    path: '/programs',
    name: 'programs',
    component: () => import('@/views/programs/ProgramListView.vue'),
    meta: { title: '전체 지원사업', section: 'programs' },
  },
  {
    path: '/programs/recommended',
    name: 'programs-recommended',
    component: () => import('@/views/programs/ProgramRecommendedView.vue'),
    meta: { title: '맞춤 추천', section: 'find', ancestors: ['diagnose-result'] },
  },
  {
    path: '/programs/compare',
    name: 'programs-compare',
    component: () => import('@/views/programs/ProgramCompareView.vue'),
    meta: { title: '공고 비교', section: 'programs', ancestors: ['programs'] },
  },
  {
    path: '/programs/:id',
    name: 'program-detail',
    component: () => import('@/views/programs/ProgramDetailView.vue'),
    props: true,
    meta: { title: '공고 상세', section: 'programs', ancestors: ['programs'] },
  },
  {
    path: '/roadmap',
    name: 'roadmap',
    component: () => import('@/views/RoadmapView.vue'),
    meta: { title: '나의 수출 로드맵', section: 'roadmap' },
  },
  {
    path: '/mypage',
    name: 'mypage',
    component: () => import('@/views/mypage/MyPageHomeView.vue'),
    meta: { title: '마이페이지', section: 'mypage' },
  },
  {
    path: '/mypage/profile',
    name: 'mypage-profile',
    component: () => import('@/views/mypage/ProfileView.vue'),
    meta: { title: '기업 프로필', section: 'mypage', ancestors: ['mypage'] },
  },
  {
    path: '/mypage/saved',
    name: 'mypage-saved',
    component: () => import('@/views/mypage/SavedProgramsView.vue'),
    meta: { title: '관심 사업', section: 'mypage', ancestors: ['mypage'] },
  },
  {
    path: '/mypage/preparation',
    name: 'mypage-preparation',
    component: () => import('@/views/mypage/PreparationView.vue'),
    meta: { title: '준비 중 사업', section: 'mypage', ancestors: ['mypage'] },
  },
  {
    path: '/mypage/calendar',
    name: 'mypage-calendar',
    component: () => import('@/views/mypage/CalendarView.vue'),
    meta: { title: '일정', section: 'mypage', ancestors: ['mypage'] },
  },
  {
    path: '/mypage/history',
    name: 'mypage-history',
    component: () => import('@/views/mypage/HistoryView.vue'),
    meta: { title: '지원 이력', section: 'mypage', ancestors: ['mypage'] },
  },
  {
    path: '/mypage/documents',
    name: 'mypage-documents',
    component: () => import('@/views/mypage/DocumentsView.vue'),
    meta: { title: '서류함', section: 'mypage', ancestors: ['mypage'] },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '페이지를 찾을 수 없음', section: 'home' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 88 }
    // 같은 페이지에서 쿼리(필터·단계)만 바뀌면 스크롤을 유지한다.
    if (to.path === from.path) return false
    return { top: 0 }
  },
})

router.afterEach((to) => {
  document.title = to.name === 'home' ? APP_NAME : `${to.meta.title} | ${APP_NAME}`
})

export default router

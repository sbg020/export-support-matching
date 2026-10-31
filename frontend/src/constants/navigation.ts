import type { RouteLocationNormalizedLoaded } from 'vue-router'

export type NavSectionKey = 'roadmap' | 'find' | 'programs' | 'manage' | 'community'

export interface NavItem {
  label: string
  routeName: string
  /** 이 하위 메뉴를 선택 상태로 표시할 다른 경로 이름 (예: 공고 상세 → 전체 공고) */
  activeFor?: string[]
  /** activeFor 경로에서 이 값과 같은 경로 파라미터일 때만 선택 상태로 본다 (예: 글 보기의 게시판) */
  activeParams?: Record<string, string>
}

export interface NavSection {
  key: NavSectionKey
  label: string
  items: NavItem[]
}

export const APP_NAME = '수출지원사업 매칭'

/** 로그아웃 알림. 로그아웃은 서버 세션만 끝내고 이 기기에 저장한 정보는 지우지 않는다 */
export const LOGOUT_MESSAGE = '로그아웃했습니다. 이 기기에 저장한 기업정보는 그대로 남아 있습니다.'

/**
 * 메뉴 정의 (REVISION_03 §3.1). 상단 주 메뉴 5개와 그 아래 하위 메뉴 패널, 모바일 서랍,
 * 각 화면 제목 아래의 하위 메뉴 탭(SectionNav)이 모두 이 정의를 쓴다.
 * 주 메뉴를 누르면 그 섹션의 첫 번째 하위 메뉴가 열린다. 메뉴에는 아이콘을 두지 않는다.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'roadmap',
    label: '수출 로드맵',
    items: [{ label: '수출 로드맵', routeName: 'roadmap' }],
  },
  {
    key: 'find',
    label: '기업 맞춤 지원사업',
    items: [
      { label: '기업 진단', routeName: 'diagnose-result' },
      { label: '맞춤 추천', routeName: 'programs-recommended' },
    ],
  },
  {
    key: 'programs',
    label: '전체 지원사업',
    items: [
      { label: '전체 공고', routeName: 'programs', activeFor: ['program-detail'] },
      { label: '공고 달력', routeName: 'programs-calendar' },
    ],
  },
  {
    key: 'manage',
    label: '지원사업 관리',
    items: [
      { label: '관심·준비 중·신청완료 사업', routeName: 'manage-programs' },
      { label: '서류함', routeName: 'manage-documents' },
    ],
  },
  {
    key: 'community',
    label: '커뮤니티',
    items: [
      {
        label: '지원사업 후기',
        routeName: 'community-reviews',
        activeFor: ['community-post', 'community-write'],
        activeParams: { board: 'reviews' },
      },
      {
        label: '지원사업 정보방',
        routeName: 'community-info',
        activeFor: ['community-post', 'community-write'],
        activeParams: { board: 'info' },
      },
    ],
  },
]

export function sectionByKey(key: NavSectionKey | undefined): NavSection | undefined {
  return NAV_SECTIONS.find((section) => section.key === key)
}

/** 주 메뉴를 누르면 여는 화면 (그 섹션의 첫 번째 하위 메뉴) */
export function firstRouteName(section: NavSection): string {
  return section.items[0]?.routeName ?? 'home'
}

/**
 * 하위 메뉴 선택 상태: 정확히 이 화면이면 'page', 상세처럼 이 메뉴에 속한 화면이면 'true'.
 * 화면 안의 하위 메뉴 탭(SectionNav)과 상단 하위 메뉴 패널(TopNav)이 함께 쓴다.
 */
export function navItemCurrent(
  item: NavItem,
  route: Pick<RouteLocationNormalizedLoaded, 'name' | 'params' | 'query'>,
): 'page' | 'true' | undefined {
  const name = typeof route.name === 'string' ? route.name : ''
  if (name === item.routeName) return 'page'
  if (name === 'program-detail' && route.query.from === 'calendar') {
    return item.routeName === 'programs-calendar' ? 'true' : undefined
  }
  if (!item.activeFor?.includes(name)) return undefined
  const params = item.activeParams ?? {}
  return Object.entries(params).every(([key, value]) => route.params[key] === value) ? 'true' : undefined
}

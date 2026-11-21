/*
 * 관리자 메뉴 (REVISION_04 §5.3, §6.1). 사용자 주 메뉴(NAV_SECTIONS)와 따로 정의하고,
 * 사용자 헤더·서랍·하위 메뉴 패널에는 어떤 관리자 항목도 넣지 않는다.
 */
import type { RouteLocationNormalizedLoaded } from 'vue-router'

export type AdminMenuKey = 'home' | 'bizinfo' | 'kotra' | 'kita' | 'review' | 'notices' | 'settings'

/** 하위 탭 (화면 제목 아래 탭 모양 링크) */
export interface AdminSubNavItem {
  key: AdminMenuKey
  label: string
  routeName: string
}

export interface AdminNavItem {
  /** 하위 탭이 없는 메뉴는 화면의 메뉴 키, 있는 메뉴는 묶음 키 */
  key: AdminMenuKey | 'api' | 'upload'
  label: string
  /** 상위 메뉴를 누르면 여는 화면 (하위 탭이 있으면 첫 번째 탭) */
  routeName: string
  children?: AdminSubNavItem[]
}

/** 순서 고정. API 수집 > 기업마당, 직접 업로드 > KOTRA·KITA */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { key: 'home', label: '관리자 홈', routeName: 'admin-home' },
  {
    key: 'api',
    label: 'API 수집',
    routeName: 'admin-bizinfo',
    children: [{ key: 'bizinfo', label: '기업마당', routeName: 'admin-bizinfo' }],
  },
  {
    key: 'upload',
    label: '직접 업로드',
    routeName: 'admin-kotra',
    children: [
      { key: 'kotra', label: 'KOTRA', routeName: 'admin-kotra' },
      { key: 'kita', label: 'KITA', routeName: 'admin-kita' },
    ],
  },
  { key: 'review', label: '공고 검수', routeName: 'admin-review' },
  { key: 'notices', label: '공고 관리', routeName: 'admin-notices' },
  { key: 'settings', label: '기준·설정', routeName: 'admin-settings' },
]

/** 모든 관리자 화면 (하위 탭 포함, 메뉴 순서) */
export const ADMIN_PAGES: AdminSubNavItem[] = ADMIN_NAV_ITEMS.flatMap((item) =>
  item.children ?? [{ key: item.key as AdminMenuKey, label: item.label, routeName: item.routeName }],
)

/** 하위 탭이 있는 상위 메뉴 중 이 화면이 속한 것 */
export function adminGroupOf(menu: AdminMenuKey | undefined): AdminNavItem | null {
  if (!menu) return null
  return ADMIN_NAV_ITEMS.find((item) => item.children?.some((child) => child.key === menu)) ?? null
}

export const ADMIN_AREA_LABEL = '관리자'

/** 관리자가 아닌 계정이 관리자 화면을 열었을 때 (맞춤 추천으로 보낸 뒤 보여 준다) */
export const ADMIN_ONLY_MESSAGE = '관리자 계정만 볼 수 있는 화면입니다.'

/** 저장소가 없어 쓸 수 없는 버튼의 기본 이유 (REVISION_04 §6.2) */
export const ADMIN_STORE_REASON = '공고 저장소를 연결한 뒤 사용할 수 있습니다.'

export function adminItemCurrent(
  item: AdminNavItem | AdminSubNavItem,
  route: Pick<RouteLocationNormalizedLoaded, 'meta'>,
): 'page' | undefined {
  const menu = route.meta.adminMenu
  const current = 'children' in item && item.children ? item.children.some((c) => c.key === menu) : menu === item.key
  return current ? 'page' : undefined
}

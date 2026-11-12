/*
 * 관리자 메뉴 (REVISION_04 §5.3, §6.1). 사용자 주 메뉴(NAV_SECTIONS)와 따로 정의하고,
 * 사용자 헤더·서랍·하위 메뉴 패널에는 어떤 관리자 항목도 넣지 않는다.
 */
import type { RouteLocationNormalizedLoaded } from 'vue-router'

export type AdminMenuKey = 'home' | 'bizinfo' | 'kotra' | 'review' | 'notices' | 'settings'

export interface AdminNavItem {
  key: AdminMenuKey
  label: string
  routeName: string
}

/** 순서 고정, 하위 메뉴 없음 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { key: 'home', label: '관리자 홈', routeName: 'admin-home' },
  { key: 'bizinfo', label: '기업마당 수집', routeName: 'admin-bizinfo' },
  { key: 'kotra', label: 'KOTRA 업로드', routeName: 'admin-kotra' },
  { key: 'review', label: '공고 검수', routeName: 'admin-review' },
  { key: 'notices', label: '공고 관리', routeName: 'admin-notices' },
  { key: 'settings', label: '기준·설정', routeName: 'admin-settings' },
]

export const ADMIN_AREA_LABEL = '관리자'

/** 관리자가 아닌 계정이 관리자 화면을 열었을 때 (수출 로드맵으로 보낸 뒤 보여 준다) */
export const ADMIN_ONLY_MESSAGE = '관리자 계정만 볼 수 있는 화면입니다.'

/** 저장소가 없어 쓸 수 없는 버튼의 기본 이유 (REVISION_04 §6.2) */
export const ADMIN_STORE_REASON = '공고 저장소를 연결한 뒤 사용할 수 있습니다.'

export function adminItemCurrent(
  item: AdminNavItem,
  route: Pick<RouteLocationNormalizedLoaded, 'meta'>,
): 'page' | undefined {
  return route.meta.adminMenu === item.key ? 'page' : undefined
}

import type { Component } from 'vue'
import { IconListDetails, IconRoute, IconSearch, IconUserCircle } from '@tabler/icons-vue'

export type NavSectionKey = 'find' | 'programs' | 'roadmap' | 'mypage'

export interface NavItem {
  label: string
  routeName: string
  /** 이 하위 메뉴를 선택 상태로 표시할 다른 경로 이름 (예: 공고 상세 → 전체 공고) */
  activeFor?: string[]
}

export interface NavSection {
  key: NavSectionKey
  label: string
  icon: Component
  items: NavItem[]
}

export const APP_NAME = '수출지원사업 매칭'

/** 메뉴 정의. 사이드바에는 주 메뉴만, 각 화면 상단(SectionNav)에는 현재 섹션의 하위 메뉴만 보인다. */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'find',
    label: '지원사업 찾기',
    icon: IconSearch,
    items: [
      { label: '기업정보 입력·저장', routeName: 'diagnose-input' },
      { label: '기업 진단', routeName: 'diagnose-result' },
      { label: '맞춤 추천', routeName: 'programs-recommended' },
    ],
  },
  {
    key: 'programs',
    label: '전체 지원사업',
    icon: IconListDetails,
    items: [
      { label: '전체 공고', routeName: 'programs', activeFor: ['program-detail'] },
      { label: '공고 달력', routeName: 'programs-calendar' },
    ],
  },
  {
    key: 'roadmap',
    label: '나의 로드맵',
    icon: IconRoute,
    items: [{ label: '수출 로드맵', routeName: 'roadmap' }],
  },
  {
    key: 'mypage',
    label: '마이페이지',
    icon: IconUserCircle,
    items: [
      { label: '기업 프로필', routeName: 'mypage-profile' },
      { label: '관심·준비 중·신청완료 사업', routeName: 'mypage-programs' },
      { label: '서류함', routeName: 'mypage-documents' },
    ],
  },
]

/** 사이드바 주 메뉴 3개 (마이페이지는 헤더 프로필로 들어간다) */
export const SIDEBAR_SECTIONS = NAV_SECTIONS.filter((section) => section.key !== 'mypage')

export function sectionByKey(key: NavSectionKey | undefined): NavSection | undefined {
  return NAV_SECTIONS.find((section) => section.key === key)
}

import type { Component } from 'vue'
import {
  IconBookmark,
  IconCalendar,
  IconChecklist,
  IconFolder,
  IconForms,
  IconHistory,
  IconLayoutColumns,
  IconLayoutDashboard,
  IconListDetails,
  IconReportAnalytics,
  IconRoute,
  IconTargetArrow,
  IconUserCircle,
} from '@tabler/icons-vue'

export type NavSectionKey = 'home' | 'find' | 'programs' | 'roadmap' | 'mypage'

export interface NavItem {
  label: string
  routeName: string
  icon: Component
  /** 이 메뉴를 활성으로 표시할 다른 경로 이름 (예: 공고 상세 → 전체 공고) */
  activeFor?: string[]
}

export interface NavSection {
  key: Exclude<NavSectionKey, 'home'>
  /** 상단 메뉴 이름 */
  label: string
  routeName: string
  items: NavItem[]
}

export const APP_NAME = '수출지원사업 매칭'

export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'find',
    label: '지원사업 찾기',
    routeName: 'diagnose-input',
    items: [
      { label: '기업정보 입력', routeName: 'diagnose-input', icon: IconForms },
      { label: '기업 진단', routeName: 'diagnose-result', icon: IconReportAnalytics },
      { label: '맞춤 추천', routeName: 'programs-recommended', icon: IconTargetArrow },
    ],
  },
  {
    key: 'programs',
    label: '전체 지원사업',
    routeName: 'programs',
    items: [
      { label: '전체 공고', routeName: 'programs', icon: IconListDetails, activeFor: ['program-detail'] },
      { label: '공고 비교', routeName: 'programs-compare', icon: IconLayoutColumns },
    ],
  },
  {
    key: 'roadmap',
    label: '나의 수출 로드맵',
    routeName: 'roadmap',
    items: [{ label: '수출 로드맵', routeName: 'roadmap', icon: IconRoute }],
  },
  {
    key: 'mypage',
    label: '마이페이지',
    routeName: 'mypage',
    items: [
      { label: '마이페이지 홈', routeName: 'mypage', icon: IconLayoutDashboard },
      { label: '기업 프로필', routeName: 'mypage-profile', icon: IconUserCircle },
      { label: '관심 사업', routeName: 'mypage-saved', icon: IconBookmark },
      { label: '준비 중 사업', routeName: 'mypage-preparation', icon: IconChecklist },
      { label: '일정', routeName: 'mypage-calendar', icon: IconCalendar },
      { label: '지원 이력', routeName: 'mypage-history', icon: IconHistory },
      { label: '서류함', routeName: 'mypage-documents', icon: IconFolder },
    ],
  },
]

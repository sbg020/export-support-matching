<script setup lang="ts">
/**
 * 모바일 서랍의 메뉴 (REVISION_03 §3.3, REVISION_04 §6.1). 아이콘 없이 글자만 둔다.
 * - user: 주 메뉴 5개. 각 메뉴는 그 섹션의 첫 번째 하위 메뉴로 이동한다. 홈·로그인·기업 프로필에서는 아무것도
 *   선택하지 않는다. 하위 화면은 각 화면 제목 아래의 하위 메뉴 탭으로 이동한다.
 * - admin: 관리자 메뉴 6개와 '사용자 화면 보기'. 사용자 메뉴에는 관리자 항목을 넣지 않는다.
 */
import { computed } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { NAV_SECTIONS, firstRouteName } from '@/constants/navigation'
import { ADMIN_NAV_ITEMS } from '@/constants/adminNavigation'

const props = withDefaults(defineProps<{ variant?: 'user' | 'admin' }>(), { variant: 'user' })

const route = useRoute()

interface DrawerItem {
  key: string
  label: string
  to: RouteLocationRaw
  current: boolean
}

const items = computed<DrawerItem[]>(() =>
  props.variant === 'admin'
    ? [
        ...ADMIN_NAV_ITEMS.map((item) => ({
          key: item.key,
          label: item.label,
          to: { name: item.routeName },
          current: route.meta.adminMenu === item.key,
        })),
        { key: 'user-view', label: '사용자 화면 보기', to: { name: 'programs-recommended' }, current: false },
      ]
    : NAV_SECTIONS.map((section) => ({
        key: section.key,
        label: section.label,
        to: { name: firstRouteName(section) },
        current: route.meta.section === section.key,
      })),
)
const label = computed(() => (props.variant === 'admin' ? '관리자 메뉴' : '주 메뉴'))
</script>

<template>
  <nav class="side-nav" :aria-label="label">
    <ul class="side-nav__list">
      <li v-for="item in items" :key="item.key">
        <RouterLink v-slot="{ href, navigate }" :to="item.to" custom>
          <a
            :href="href"
            class="side-nav__link"
            :class="{ 'is-current': item.current }"
            :aria-current="item.current ? 'page' : undefined"
            @click="navigate"
          >
            {{ item.label }}
          </a>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.side-nav__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.side-nav__link {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 var(--space-3) 0 var(--space-4);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-weight: var(--fw-medium);
  text-decoration: none;
}

.side-nav__link:hover {
  background: var(--color-surface-sunken);
  color: var(--color-heading);
}

/* 현재 섹션: 배경 + 굵은 글씨 + 왼쪽 강조선 (색만으로 구분하지 않음) */
.side-nav__link.is-current {
  background: var(--color-yellow-soft);
  color: var(--color-ink);
  font-weight: var(--fw-bold);
}

.side-nav__link.is-current::before {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 0;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: var(--color-ink);
}

.side-nav__link:focus-visible {
  outline-offset: -2px;
}
</style>

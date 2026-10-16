<script setup lang="ts">
/** 주 메뉴 3개. 각 메뉴는 그 섹션의 첫 번째 하위 메뉴로 이동한다. 홈에서는 아무것도 선택하지 않는다. */
import { useRoute } from 'vue-router'
import { SIDEBAR_SECTIONS, type NavSection } from '@/constants/navigation'

const route = useRoute()

function firstRouteName(section: NavSection): string {
  return section.items[0]?.routeName ?? 'home'
}

function isCurrent(section: NavSection): boolean {
  return route.meta.section === section.key
}
</script>

<template>
  <nav class="side-nav" aria-label="주 메뉴">
    <ul class="side-nav__list">
      <li v-for="section in SIDEBAR_SECTIONS" :key="section.key">
        <RouterLink v-slot="{ href, navigate }" :to="{ name: firstRouteName(section) }" custom>
          <a
            :href="href"
            class="side-nav__link"
            :class="{ 'is-current': isCurrent(section) }"
            :aria-current="isCurrent(section) ? 'page' : undefined"
            @click="navigate"
          >
            <component :is="section.icon" :size="20" stroke-width="1.8" aria-hidden="true" />
            <span>{{ section.label }}</span>
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
  gap: 12px;
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
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
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
  background: var(--color-primary-strong);
}

.side-nav__link:focus-visible {
  outline-offset: -2px;
}
</style>

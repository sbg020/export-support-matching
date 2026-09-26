<script setup lang="ts">
import { useRoute } from 'vue-router'
import { NAV_SECTIONS, type NavItem } from '@/constants/navigation'

defineProps<{ idPrefix: string }>()

const route = useRoute()

function isActive(item: NavItem): boolean {
  const name = typeof route.name === 'string' ? route.name : ''
  return item.routeName === name || (item.activeFor?.includes(name) ?? false)
}
</script>

<template>
  <nav class="side-nav" aria-label="전체 메뉴">
    <div v-for="section in NAV_SECTIONS" :key="section.key" class="side-nav__group">
      <p :id="`${idPrefix}-${section.key}`" class="side-nav__heading">{{ section.label }}</p>
      <ul class="side-nav__list" :aria-labelledby="`${idPrefix}-${section.key}`">
        <li v-for="item in section.items" :key="item.routeName">
          <RouterLink
            :to="{ name: item.routeName }"
            class="side-nav__link"
            :class="{ 'is-active': isActive(item) }"
          >
            <component :is="item.icon" :size="19" stroke-width="1.8" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.side-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.side-nav__heading {
  margin: 0 0 6px;
  padding: 0 var(--space-3);
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
  letter-spacing: 0.02em;
  color: var(--color-text-muted);
}

.side-nav__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.side-nav__link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-weight: var(--fw-medium);
  text-decoration: none;
}

.side-nav__link:hover {
  background: var(--color-surface-sunken);
  color: var(--color-heading);
}

.side-nav__link.is-active {
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  font-weight: var(--fw-semibold);
}

.side-nav__link:focus-visible {
  outline-offset: -2px;
}
</style>

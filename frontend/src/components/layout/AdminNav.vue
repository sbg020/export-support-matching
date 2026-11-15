<script setup lang="ts">
/**
 * 관리자 메뉴 6개 (데스크톱, REVISION_04 §6.1). 하위 메뉴 없음.
 * 현재 화면은 aria-current="page", 굵은 글씨, 강조 글자색, 3px 밑줄 (사용자 상단 메뉴와 같은 표시).
 */
import { useRoute } from 'vue-router'
import { ADMIN_NAV_ITEMS, adminItemCurrent } from '@/constants/adminNavigation'

const route = useRoute()
</script>

<template>
  <nav class="admin-nav" aria-label="관리자 메뉴">
    <ul class="admin-nav__list">
      <li v-for="item in ADMIN_NAV_ITEMS" :key="item.key" class="admin-nav__item">
        <RouterLink v-slot="{ href, navigate }" :to="{ name: item.routeName }" custom>
          <a
            :href="href"
            class="admin-nav__link"
            :class="{ 'is-current': adminItemCurrent(item, route) }"
            :aria-current="adminItemCurrent(item, route)"
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
.admin-nav {
  --admin-nav-pad: var(--space-3);
  display: flex;
  align-self: stretch;
  min-width: 0;
}

.admin-nav__list {
  display: flex;
  align-items: stretch;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-nav__item {
  display: flex;
}

.admin-nav__link {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 var(--admin-nav-pad);
  color: var(--color-text);
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
  text-decoration: none;
  white-space: nowrap;
}

.admin-nav__link:hover {
  background: var(--color-surface-sunken);
  color: var(--color-heading);
}

.admin-nav__link.is-current {
  color: var(--color-ink);
  font-weight: var(--fw-bold);
}

.admin-nav__link.is-current::after {
  content: '';
  position: absolute;
  right: var(--admin-nav-pad);
  bottom: 0;
  left: var(--admin-nav-pad);
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: var(--color-ink);
}

.admin-nav__link:focus-visible {
  outline-offset: -2px;
}

@media (max-width: 1279.98px) {
  .admin-nav {
    --admin-nav-pad: var(--space-2);
  }
}
</style>

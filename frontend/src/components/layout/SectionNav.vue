<script setup lang="ts">
/**
 * 화면 안의 하위 메뉴. 현재 섹션의 하위 메뉴만 탭 모양 링크로 보여 준다.
 * 로그아웃은 헤더의 프로필 팝업에서 한다 (REVISION_03 §3.4).
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { navItemCurrent, sectionByKey } from '@/constants/navigation'

const route = useRoute()
const section = computed(() => sectionByKey(route.meta.section))
</script>

<template>
  <nav v-if="section" class="section-nav" :aria-label="`${section.label} 하위 메뉴`">
    <ul class="section-nav__list">
      <li v-for="item in section.items" :key="item.routeName">
        <RouterLink v-slot="{ href, navigate }" :to="{ name: item.routeName }" custom>
          <a
            :href="href"
            class="section-nav__link"
            :class="{ 'is-current': navItemCurrent(item, route) }"
            :aria-current="navItemCurrent(item, route)"
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
.section-nav {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.section-nav__list {
  position: relative;
  display: flex;
  flex: 1;
  gap: var(--space-1);
  min-width: 0;
  margin: 0;
  padding: 0;
  overflow-x: auto;
  list-style: none;
  scrollbar-width: thin;
}

.section-nav__link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 var(--space-4);
  border-bottom: 3px solid transparent;
  color: var(--color-text-muted);
  font-weight: var(--fw-medium);
  text-decoration: none;
  white-space: nowrap;
}

.section-nav__link:hover {
  color: var(--color-heading);
}

/* 현재 하위 메뉴: 밑줄 + 굵은 글씨 */
.section-nav__link.is-current {
  border-bottom-color: var(--color-primary-strong);
  color: var(--color-primary-strong);
  font-weight: var(--fw-bold);
}

.section-nav__link:focus-visible {
  outline-offset: -2px;
}
</style>

<script setup lang="ts">
import BrandLink from './BrandLink.vue'
import SidebarNav from './SidebarNav.vue'
</script>

<template>
  <aside class="app-sidebar" aria-label="사이드바">
    <div class="app-sidebar__inner">
      <div class="app-sidebar__brand">
        <BrandLink />
      </div>
      <SidebarNav />
    </div>
  </aside>
</template>

<style scoped>
/* 배경은 페이지 전체 높이로 늘이고, 로고와 메뉴는 화면에 고정한다. */
.app-sidebar {
  flex-shrink: 0;
  width: var(--sidebar-width);
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
}

.app-sidebar__inner {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-height: 100vh;
  overflow-y: auto;
  padding: 0 var(--space-4) var(--space-6);
}

.app-sidebar__brand {
  display: flex;
  align-items: center;
  height: var(--header-height);
  padding: 0 var(--space-2);
  border-bottom: 1px solid var(--color-border);
  margin: 0 calc(var(--space-4) * -1);
  padding-left: var(--space-6);
}
</style>

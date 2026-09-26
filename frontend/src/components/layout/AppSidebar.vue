<script setup lang="ts">
import SidebarNav from './SidebarNav.vue'
import DataStatusPanel from './DataStatusPanel.vue'
</script>

<template>
  <aside class="app-sidebar" aria-label="사이드바">
    <div class="app-sidebar__inner">
      <SidebarNav id-prefix="sidebar" />
      <DataStatusPanel />
    </div>
  </aside>
</template>

<style scoped>
/* 배경은 페이지 전체 높이로 늘이고, 메뉴 내용만 화면에 고정한다. */
.app-sidebar {
  flex-shrink: 0;
  width: var(--sidebar-width);
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
}

.app-sidebar__inner {
  position: sticky;
  top: var(--header-height);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-height: calc(100vh - var(--header-height));
  overflow-y: auto;
  padding: var(--space-6) var(--space-4);
}
</style>

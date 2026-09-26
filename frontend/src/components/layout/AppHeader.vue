<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { IconDeviceDesktop, IconMenu2 } from '@tabler/icons-vue'
import { APP_NAME, NAV_SECTIONS } from '@/constants/navigation'
import BrandMark from './BrandMark.vue'

defineProps<{ menuOpen: boolean }>()
const emit = defineEmits<{ openMenu: [] }>()

const route = useRoute()
const activeSection = computed(() => route.meta.section)
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <button
        type="button"
        class="btn btn-ghost btn-icon d-lg-none app-header__menu"
        aria-label="전체 메뉴 열기"
        aria-haspopup="dialog"
        :aria-expanded="menuOpen"
        @click="emit('openMenu')"
      >
        <IconMenu2 :size="22" stroke-width="2" aria-hidden="true" />
      </button>

      <RouterLink :to="{ name: 'home' }" class="brand">
        <BrandMark :size="30" />
        <span class="brand__name">{{ APP_NAME }}</span>
      </RouterLink>

      <nav class="top-nav d-none d-lg-flex" aria-label="주 메뉴">
        <RouterLink
          v-for="section in NAV_SECTIONS"
          :key="section.key"
          :to="{ name: section.routeName }"
          class="top-nav__link"
          :class="{ 'is-active': activeSection === section.key }"
          v-bind="activeSection === section.key ? { 'aria-current': 'true' } : {}"
        >
          {{ section.label }}
        </RouterLink>
      </nav>

      <div class="app-header__utils">
        <span class="device-chip d-none d-xl-inline-flex">
          <IconDeviceDesktop :size="16" stroke-width="1.9" aria-hidden="true" />
          입력 정보는 이 기기에만 저장됩니다
        </span>
        <button
          type="button"
          class="btn btn-secondary btn-sm d-none d-sm-inline-flex"
          aria-disabled="true"
          aria-describedby="header-login-reason"
        >
          로그인 · 준비 중
        </button>
        <span id="header-login-reason" class="visually-hidden">
          계정 기능이 아직 준비되지 않아 로그인할 수 없습니다.
        </span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 1030;
  height: var(--header-height);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: saturate(180%) blur(8px);
  border-bottom: 1px solid var(--color-border);
}

.app-header__inner {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  height: 100%;
  padding: 0 var(--space-6);
}

.app-header__menu {
  margin-left: calc(var(--space-2) * -1);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  color: var(--color-heading);
  font-size: var(--fs-md);
  font-weight: var(--fw-bold);
  letter-spacing: -0.02em;
  text-decoration: none;
}

.brand:hover {
  color: var(--color-heading);
}

.top-nav {
  align-items: stretch;
  gap: var(--space-1);
  height: 100%;
  margin-left: var(--space-5);
}

.top-nav__link {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--space-3);
  border-bottom: 3px solid transparent;
  border-top: 3px solid transparent;
  color: var(--color-text);
  font-weight: var(--fw-semibold);
  text-decoration: none;
  white-space: nowrap;
}

.top-nav__link:hover {
  color: var(--color-heading);
}

.top-nav__link.is-active {
  color: var(--color-primary-strong);
  border-bottom-color: var(--color-primary-strong);
}

.app-header__utils {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

.device-chip {
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);
  color: var(--color-text);
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  white-space: nowrap;
}

@media (max-width: 575.98px) {
  .app-header__inner {
    gap: var(--space-2);
    padding: 0 var(--space-4);
  }
  .brand {
    font-size: var(--fs-base);
  }
}
</style>

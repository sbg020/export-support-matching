<script setup lang="ts">
/**
 * 관리자 화면의 헤더 한 줄 (REVISION_04 §6.1).
 * 데스크톱: [로고 + '관리자' → /admin] [관리자 메뉴 6개] ……… [사용자 화면 보기] [프로필]
 * 모바일(991px 이하): [메뉴 버튼] [로고] ……… [프로필], 메뉴 버튼은 관리자 메뉴 서랍을 연다.
 * 본문 폭·좌우 여백은 사용자 헤더와 같다.
 */
import { ref } from 'vue'
import { IconMenu2 } from '@tabler/icons-vue'
import BrandLink from './BrandLink.vue'
import AdminNav from './AdminNav.vue'
import ProfileMenu from './ProfileMenu.vue'

defineProps<{ menuOpen: boolean }>()
const emit = defineEmits<{ openMenu: [] }>()

const profileOpen = ref(false)
</script>

<template>
  <header class="admin-header">
    <div class="admin-header__inner">
      <button
        type="button"
        class="btn btn-ghost btn-icon d-lg-none admin-header__menu"
        aria-label="관리자 메뉴 열기"
        aria-haspopup="dialog"
        :aria-expanded="menuOpen"
        @click="emit('openMenu')"
      >
        <IconMenu2 :size="22" stroke-width="2" aria-hidden="true" />
      </button>
      <BrandLink admin />
      <AdminNav class="d-none d-lg-flex" />

      <div class="admin-header__right">
        <RouterLink :to="{ name: 'programs-recommended' }" class="btn btn-ghost btn-sm d-none d-lg-inline-flex">
          사용자 화면 보기
        </RouterLink>
        <ProfileMenu v-model:open="profileOpen" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.admin-header {
  position: sticky;
  top: 0;
  z-index: 1030;
  height: var(--header-height);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: saturate(180%) blur(8px);
  border-bottom: 1px solid var(--color-border);
}

/* 본문(.page)과 같은 최대 너비·좌우 여백 */
.admin-header__inner {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
  max-width: var(--content-max);
  height: 100%;
  margin: 0 auto;
  padding: 0 var(--page-gutter);
}

.admin-header__menu {
  margin-left: calc(var(--space-2) * -1);
}

.admin-header__right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  min-width: 40px;
  min-height: 40px;
  margin-left: auto;
}

.admin-header__right .btn {
  white-space: nowrap;
}

@media (max-width: 991.98px) {
  .admin-header__inner {
    gap: var(--space-3);
  }
}
</style>

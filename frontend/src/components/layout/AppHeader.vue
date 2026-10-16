<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, type RouteLocationRaw } from 'vue-router'
import { IconMenu2 } from '@tabler/icons-vue'
import { useAuth } from '@/stores/authStore'
import BrandLink from './BrandLink.vue'

defineProps<{ menuOpen: boolean }>()
const emit = defineEmits<{ openMenu: [] }>()

const route = useRoute()
const auth = useAuth()

const user = computed(() => auth.state.user)
/** 계정 아이디의 첫 글자 (예: ADMIN → A) */
const initial = computed(() => Array.from(user.value?.id ?? '')[0] ?? '')
const inMypage = computed(() => route.meta.section === 'mypage')

/** 로그인 후 지금 보던 화면으로 돌아온다 */
const loginTarget = computed<RouteLocationRaw>(() => ({ name: 'login', query: { redirect: route.fullPath } }))
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <button
        type="button"
        class="btn btn-ghost btn-icon d-lg-none app-header__menu"
        aria-label="메뉴 열기"
        aria-haspopup="dialog"
        :aria-expanded="menuOpen"
        @click="emit('openMenu')"
      >
        <IconMenu2 :size="22" stroke-width="2" aria-hidden="true" />
      </button>
      <BrandLink class="d-lg-none" />

      <div class="app-header__auth">
        <!-- 확인 중에는 자리만 비워 둔다 (가짜 아바타·스켈레톤 없음) -->
        <RouterLink
          v-if="auth.state.status === 'authenticated' && user"
          :to="{ name: 'mypage-profile' }"
          class="profile-avatar"
          :class="{ 'is-current': inMypage }"
          :aria-label="`마이페이지로 이동 (${user.id} 계정)`"
          :aria-current="inMypage ? 'true' : undefined"
        >
          <span aria-hidden="true">{{ initial }}</span>
        </RouterLink>
        <RouterLink
          v-else-if="auth.state.status === 'anonymous' && route.name !== 'login'"
          :to="loginTarget"
          class="btn btn-primary btn-sm"
        >
          로그인
        </RouterLink>
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
  gap: var(--space-3);
  height: 100%;
  padding: 0 var(--page-gutter);
}

.app-header__menu {
  margin-left: calc(var(--space-2) * -1);
}

.app-header__auth {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 40px;
  min-height: 40px;
  margin-left: auto;
}

.profile-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-heading);
  color: #fff;
  font-size: var(--fs-md);
  font-weight: var(--fw-bold);
  text-decoration: none;
}

.profile-avatar:hover {
  color: #fff;
  background: var(--color-primary-strong);
}

/* 마이페이지 안에서는 선택 상태 (테두리 고리로 색 외 표시) */
.profile-avatar.is-current {
  background: var(--color-primary-strong);
  box-shadow:
    0 0 0 3px var(--color-surface),
    0 0 0 5px var(--color-primary-strong);
}
</style>

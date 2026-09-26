<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import AppModal from '@/components/common/AppModal.vue'
import SidebarNav from './SidebarNav.vue'
import DataStatusPanel from './DataStatusPanel.vue'

const open = defineModel<boolean>('open', { required: true })
const route = useRoute()

// 메뉴에서 다른 페이지로 이동하면 닫는다.
watch(
  () => route.fullPath,
  () => {
    open.value = false
  },
)
</script>

<template>
  <AppModal v-model:open="open" title="전체 메뉴" placement="left" size="sm">
    <div class="drawer-content">
      <RouterLink :to="{ name: 'home' }" class="drawer-home">홈으로</RouterLink>
      <SidebarNav id-prefix="drawer" />
      <div class="drawer-login">
        <button type="button" class="btn btn-secondary w-100" aria-disabled="true" aria-describedby="drawer-login-reason">
          로그인 · 준비 중
        </button>
        <p id="drawer-login-reason" class="disabled-reason">
          계정 기능이 아직 준비되지 않았습니다. 입력한 정보는 이 기기에만 저장됩니다.
        </p>
      </div>
      <DataStatusPanel />
    </div>
  </AppModal>
</template>

<style scoped>
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.drawer-home {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
  text-decoration: none;
  background: var(--color-surface-sunken);
}
</style>

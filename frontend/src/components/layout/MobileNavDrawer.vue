<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import AppModal from '@/components/common/AppModal.vue'
import BrandLink from './BrandLink.vue'
import SidebarNav from './SidebarNav.vue'

const open = defineModel<boolean>('open', { required: true })
const route = useRoute()

// 메뉴에서 다른 화면으로 이동하면 닫는다. (Esc·바깥 누르기·포커스 가두기는 AppModal이 처리)
watch(
  () => route.fullPath,
  () => {
    open.value = false
  },
)
</script>

<template>
  <AppModal v-model:open="open" title="메뉴" placement="left" size="sm">
    <div class="drawer-content">
      <BrandLink />
      <SidebarNav />
    </div>
  </AppModal>
</template>

<style scoped>
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
</style>

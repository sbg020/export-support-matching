<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import MobileNavDrawer from '@/components/layout/MobileNavDrawer.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import ToastRegion from '@/components/common/ToastRegion.vue'

const router = useRouter()
const menuOpen = ref(false)
const mainRef = ref<HTMLElement | null>(null)

function skipToMain() {
  mainRef.value?.focus()
}

// 페이지가 바뀌면 본문으로 포커스를 옮겨 키보드·화면낭독기 사용자가 새 페이지를 바로 읽게 한다.
// 해시(#compare 등)로 특정 영역에 가는 경우에는 그 영역 스크롤을 방해하지 않는다.
router.afterEach((to, from) => {
  if (from.matched.length > 0 && to.path !== from.path && !to.hash) {
    void nextTick(() => mainRef.value?.focus({ preventScroll: true }))
  }
})
</script>

<template>
  <a class="skip-link" href="#main-content" @click.prevent="skipToMain">본문 바로가기</a>
  <div class="app-shell">
    <AppSidebar class="d-none d-lg-block" />
    <div class="app-column">
      <AppHeader :menu-open="menuOpen" @open-menu="menuOpen = true" />
      <main id="main-content" ref="mainRef" class="app-main" tabindex="-1">
        <RouterView />
      </main>
      <SiteFooter />
    </div>
  </div>
  <MobileNavDrawer v-model:open="menuOpen" />
  <ToastRegion />
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}

.app-column {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.app-main {
  flex: 1;
  outline: none;
}
</style>

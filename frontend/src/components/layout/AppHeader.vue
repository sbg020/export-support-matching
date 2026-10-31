<script setup lang="ts">
/**
 * 상단 헤더 한 줄 (REVISION_03 §3).
 * 데스크톱: [로고] [주 메뉴 5개 + 하위 메뉴 패널] ……… [로그인 또는 프로필]
 * 모바일(991px 이하): [메뉴 버튼] [로고] ……… [로그인 또는 프로필], 메뉴 버튼은 왼쪽 서랍을 연다.
 * 하위 메뉴 패널과 프로필 팝업은 동시에 열리지 않는다.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { IconMenu2 } from '@tabler/icons-vue'
import BrandLink from './BrandLink.vue'
import TopNav from './TopNav.vue'
import ProfileMenu from './ProfileMenu.vue'

defineProps<{ menuOpen: boolean }>()
const emit = defineEmits<{ openMenu: [] }>()

/** 마우스가 헤더와 패널을 모두 벗어난 뒤 패널을 닫기까지의 시간 */
const PANEL_CLOSE_DELAY_MS = 150

const headerRef = ref<HTMLElement | null>(null)
const panelOpen = ref(false)
const profileOpen = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | undefined

watch(panelOpen, (value) => {
  if (value) profileOpen.value = false
})
watch(profileOpen, (value) => {
  if (value) panelOpen.value = false
})

function cancelClose() {
  clearTimeout(closeTimer)
}

function scheduleClose() {
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    panelOpen.value = false
  }, PANEL_CLOSE_DELAY_MS)
}

/** 포커스가 헤더 밖으로 나가면 패널을 닫는다 */
function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (!(next instanceof Node) || !headerRef.value?.contains(next)) panelOpen.value = false
}

onBeforeUnmount(() => clearTimeout(closeTimer))
</script>

<template>
  <header
    ref="headerRef"
    class="app-header"
    @mouseenter="cancelClose"
    @mouseleave="scheduleClose"
    @focusout="onFocusOut"
  >
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
      <BrandLink />
      <TopNav v-model:open="panelOpen" class="d-none d-lg-flex" />

      <div class="app-header__auth">
        <ProfileMenu v-model:open="profileOpen" />
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

/* 본문(.page)과 같은 최대 너비·좌우 여백: 로고와 프로필이 본문 좌우 끝에 맞는다 */
.app-header__inner {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  width: 100%;
  max-width: var(--content-max);
  height: 100%;
  margin: 0 auto;
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

@media (max-width: 991.98px) {
  .app-header__inner {
    gap: var(--space-3);
  }
}
</style>

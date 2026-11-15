<script setup lang="ts">
/**
 * 상단 헤더 한 줄 (REVISION_03 §3, REVISION_05 Sticky Header).
 * 데스크톱: [로고] [주 메뉴 5개 + 하위 메뉴 패널] ……… [로그인·회원가입 또는 프로필]
 * 모바일(991px 이하): [메뉴 버튼] [로고] ……… [로그인 또는 프로필], 메뉴 버튼은 왼쪽 서랍을 연다.
 * 하위 메뉴 패널과 프로필 팝업은 동시에 열리지 않는다.
 *
 * 홈(랜딩) 블랙 히어로 위에서는 배경을 투명하게 두고 흰 글자로 보이다가, 히어로를 지나면
 * 흰 배경·검은 글자로 바뀐다. 패널·팝업·서랍이 열리면 읽기 쉽게 흰 배경으로 바꾼다.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { IconMenu2 } from '@tabler/icons-vue'
import BrandLink from './BrandLink.vue'
import TopNav from './TopNav.vue'
import ProfileMenu from './ProfileMenu.vue'

const props = defineProps<{ menuOpen: boolean }>()
const emit = defineEmits<{ openMenu: [] }>()

/** 마우스가 헤더와 패널을 모두 벗어난 뒤 패널을 닫기까지의 시간 */
const PANEL_CLOSE_DELAY_MS = 150
/** 홈 히어로 요소 (HomeHero가 이 id를 쓴다) */
const HERO_ID = 'home-hero'

const route = useRoute()
const headerRef = ref<HTMLElement | null>(null)
const panelOpen = ref(false)
const profileOpen = ref(false)
const overHero = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | undefined

watch(panelOpen, (value) => {
  if (value) profileOpen.value = false
})
watch(profileOpen, (value) => {
  if (value) panelOpen.value = false
})

/** 헤더 아래가 아직 블랙 히어로인지 (요소 하나의 위치만 읽으므로 스크롤마다 바로 잰다) */
function measureHero() {
  const hero = typeof document === 'undefined' ? null : document.getElementById(HERO_ID)
  if (!hero) {
    overHero.value = false
    return
  }
  const headerHeight = headerRef.value?.offsetHeight ?? 64
  overHero.value = hero.getBoundingClientRect().bottom > headerHeight
}

function onScroll() {
  measureHero()
}

const dark = computed(
  () => route.name === 'home' && overHero.value && !panelOpen.value && !profileOpen.value && !props.menuOpen,
)

// 화면이 바뀌면 새 화면이 그려진 뒤 다시 잰다 (홈에 들어오거나 나갈 때)
watch(() => route.name, measureHero, { flush: 'post' })

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  measureHero()
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

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <header
    ref="headerRef"
    class="app-header"
    :class="{ 'app-header--dark': dark, 'app-header--home': route.name === 'home' }"
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
      <BrandLink :inverse="dark" />
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
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: saturate(180%) blur(8px);
  border-bottom: 1px solid var(--color-border);
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease;
}

/* 홈: 히어로 위에서는 투명 배경 + 흰 글자 */
.app-header--dark {
  background: rgba(17, 17, 17, 0);
  backdrop-filter: none;
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.app-header--dark :deep(.top-nav__link) {
  color: rgba(255, 255, 255, 0.88);
}

.app-header--dark :deep(.top-nav__link:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.app-header--dark :deep(.top-nav__link.is-current) {
  color: #fff;
}

.app-header--dark :deep(.top-nav__link.is-current::after) {
  background: var(--color-yellow);
}

.app-header--dark .app-header__menu {
  --bs-btn-color: #fff;
  --bs-btn-hover-color: #fff;
  --bs-btn-hover-bg: rgba(255, 255, 255, 0.1);
}

.app-header--dark :deep(.profile-menu__login) {
  color: rgba(255, 255, 255, 0.88);
}

.app-header--dark :deep(.profile-menu__login:hover) {
  color: #fff;
}

.app-header--dark :deep(.profile-menu__signup) {
  --bs-btn-color: var(--color-ink);
  --bs-btn-bg: var(--color-yellow);
  --bs-btn-border-color: var(--color-yellow);
  --bs-btn-hover-color: var(--color-ink);
  --bs-btn-hover-bg: var(--color-yellow-hover);
  --bs-btn-hover-border-color: var(--color-yellow-hover);
}

.app-header--dark :deep(.profile-avatar) {
  background: var(--color-yellow);
  color: var(--color-ink);
}

:where(.app-header--dark) :deep(:focus-visible) {
  outline-color: var(--color-yellow);
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

@media (prefers-reduced-motion: reduce) {
  .app-header {
    transition: none;
  }
}
</style>

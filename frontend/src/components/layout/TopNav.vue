<script setup lang="ts">
/**
 * 데스크톱 상단 주 메뉴 5개와 하위 메뉴 패널 (REVISION_03 §3.1·§3.2).
 *
 * - 주 메뉴에 마우스를 올리거나 키보드 포커스가 들어오면 다섯 섹션의 하위 메뉴를 한꺼번에 펼친다.
 * - 하위 목록은 자기 주 메뉴 li 안에 두고, 왼쪽 끝을 그 주 메뉴에 맞춘다. 닫혀 있으면 hidden이라
 *   Tab 순서와 화면낭독기에서 빠진다. 링크 목록이므로 role="menu"는 쓰지 않는다.
 * - 닫기: Esc(포커스는 그 주 메뉴 링크로), 항목 선택·화면 이동. 헤더·패널을 벗어난 뒤 150ms와
 *   포커스가 헤더 밖으로 나갈 때, 프로필 팝업을 열 때는 AppHeader가 닫는다.
 * - hover가 없는 기기(터치)에서는 패널을 열지 않고, 주 메뉴는 그 섹션의 첫 화면으로 가는 링크로만 쓴다.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  NAV_SECTIONS,
  firstRouteName,
  navItemCurrent,
  type NavSection,
} from '@/constants/navigation'

const open = defineModel<boolean>('open', { required: true })

const route = useRoute()
const navRef = ref<HTMLElement | null>(null)
const panelHeight = ref(0)
const hoverCapable = ref(true)
let hoverQuery: MediaQueryList | null = null

function onHoverQueryChange() {
  hoverCapable.value = hoverQuery?.matches ?? true
  if (!hoverCapable.value) open.value = false
}

onMounted(() => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  hoverQuery = window.matchMedia('(hover: hover)')
  hoverCapable.value = hoverQuery.matches
  hoverQuery.addEventListener?.('change', onHoverQueryChange)
})

onBeforeUnmount(() => hoverQuery?.removeEventListener?.('change', onHoverQueryChange))

function show() {
  if (hoverCapable.value) open.value = true
}

function isCurrentSection(section: NavSection): boolean {
  return route.meta.section === section.key
}

/** 긴 하위 메뉴 이름은 '·' 뒤에서 줄을 바꿀 수 있게 나눈다 (글자는 그대로) */
function labelParts(label: string): string[] {
  return label.split('·').map((part, index, parts) => (index < parts.length - 1 ? `${part}·` : part))
}

/** Esc: 패널을 닫고, 포커스가 메뉴 안에 있었으면 그 주 메뉴 링크로 옮긴다 */
function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open.value) return
  event.stopPropagation()
  const active = document.activeElement
  const item = active instanceof HTMLElement ? active.closest<HTMLElement>('.top-nav__item') : null
  item?.querySelector<HTMLElement>('.top-nav__link')?.focus()
  open.value = false
}

function onItemClick(navigate: (event?: MouseEvent) => unknown, event: MouseEvent) {
  open.value = false
  void navigate(event)
}

// 화면이 바뀌면 닫는다
watch(
  () => route.fullPath,
  () => {
    open.value = false
  },
)

/** 패널 배경 높이: 가장 긴 하위 목록에 맞춘다 */
function measure() {
  const lists = navRef.value?.querySelectorAll<HTMLElement>('.top-nav__sub') ?? []
  panelHeight.value = Math.max(0, ...Array.from(lists, (list) => list.offsetHeight))
}

watch(open, async (value) => {
  if (!value) return
  await nextTick()
  measure()
})
</script>

<template>
  <nav ref="navRef" class="top-nav" aria-label="주 메뉴" @keydown="onKeydown">
    <ul class="top-nav__list" @mouseenter="show" @focusin="show">
      <li v-for="section in NAV_SECTIONS" :key="section.key" class="top-nav__item">
        <RouterLink v-slot="{ href, navigate }" :to="{ name: firstRouteName(section) }" custom>
          <a
            :href="href"
            class="top-nav__link"
            :class="{ 'is-current': isCurrentSection(section) }"
            :aria-current="isCurrentSection(section) ? 'page' : undefined"
            @click="(event: MouseEvent) => onItemClick(navigate, event)"
          >
            {{ section.label }}
          </a>
        </RouterLink>
        <ul class="top-nav__sub" :hidden="!open">
          <li v-for="item in section.items" :key="item.routeName">
            <RouterLink v-slot="{ href, navigate }" :to="{ name: item.routeName }" custom>
              <a
                :href="href"
                class="top-nav__sublink"
                :class="{ 'is-current': navItemCurrent(item, route) }"
                :aria-current="navItemCurrent(item, route)"
                @click="(event: MouseEvent) => onItemClick(navigate, event)"
              >
                <template v-for="(part, index) in labelParts(item.label)" :key="index"
                  ><wbr v-if="index > 0" />{{ part }}</template
                >
              </a>
            </RouterLink>
          </li>
        </ul>
      </li>
    </ul>
    <div v-show="open" class="top-nav__panel" aria-hidden="true" :style="{ height: `${panelHeight}px` }" />
  </nav>
</template>

<style scoped>
/* 패널 배경은 헤더(sticky)를 기준으로 화면 전체 폭에 놓인다. nav와 그 위 요소는 위치 지정을 하지 않는다 */
.top-nav {
  --top-nav-gap: var(--space-2);
  --top-nav-pad: var(--space-4);
  display: flex;
  align-self: stretch;
  min-width: 0;
}

.top-nav__list {
  display: flex;
  align-items: stretch;
  gap: var(--top-nav-gap);
  margin: 0;
  padding: 0;
  list-style: none;
}

.top-nav__item {
  position: relative;
  display: flex;
}

.top-nav__link {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 var(--top-nav-pad);
  color: var(--color-text);
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
  text-decoration: none;
  white-space: nowrap;
}

.top-nav__link:hover {
  background: var(--color-surface-sunken);
  color: var(--color-heading);
}

/* 현재 섹션: 강조 글자색 + 굵은 글씨 + 글자 아래 3px 강조선 (색만으로 구분하지 않음) */
.top-nav__link.is-current {
  color: var(--color-primary-strong);
  font-weight: var(--fw-bold);
}

.top-nav__link.is-current::after {
  content: '';
  position: absolute;
  right: var(--top-nav-pad);
  bottom: 0;
  left: var(--top-nav-pad);
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: var(--color-primary-strong);
}

.top-nav__link:focus-visible,
.top-nav__sublink:focus-visible {
  outline-offset: -2px;
}

/* 하위 목록: 자기 주 메뉴 왼쪽 끝에서 시작하고, 다음 주 메뉴를 넘지 않게 줄을 바꾼다 */
.top-nav__sub {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 2;
  width: max-content;
  min-width: 100%;
  max-width: calc(100% + var(--top-nav-gap) - var(--space-1));
  margin: 0;
  padding: var(--space-3) 0 var(--space-4);
  list-style: none;
}

.top-nav__item:last-child .top-nav__sub {
  max-width: 240px;
}

.top-nav__sub[hidden] {
  display: none;
}

.top-nav__sublink {
  display: block;
  padding: 7px var(--top-nav-pad);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--fs-base);
  line-height: 1.45;
  text-decoration: none;
  word-break: keep-all;
}

.top-nav__sublink:hover {
  color: var(--color-primary-strong);
}

.top-nav__sublink.is-current {
  color: var(--color-primary-strong);
  font-weight: var(--fw-bold);
}

.top-nav__panel {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  z-index: 1;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.top-nav__panel,
.top-nav__sub:not([hidden]) {
  animation: top-nav-reveal 0.15s ease-out;
}

@keyframes top-nav-reveal {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .top-nav__panel,
  .top-nav__sub:not([hidden]) {
    animation: none;
  }
}

@media (max-width: 1279.98px) {
  .top-nav {
    --top-nav-gap: var(--space-1);
    --top-nav-pad: var(--space-3);
  }
}
</style>

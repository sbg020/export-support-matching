<script setup lang="ts" generic="K extends string">
/**
 * 탭 목록 (WAI-ARIA tabs). 탭 패널은 부모가 `${idPrefix}-panel` id로 렌더링한다.
 * 좌우 화살표·Home·End 키로 이동한다.
 */
import { ref } from 'vue'
import DataValue from './DataValue.vue'
import type { TabItem } from './types'

const model = defineModel<K>({ required: true })

const props = defineProps<{
  tabs: TabItem<K>[]
  label: string
  idPrefix: string
}>()

const buttons = ref<HTMLButtonElement[]>([])

function select(index: number) {
  const tab = props.tabs[index]
  if (!tab) return
  model.value = tab.key
  buttons.value[index]?.focus()
}

function onKeydown(event: KeyboardEvent, index: number) {
  const last = props.tabs.length - 1
  let next: number | null = null
  if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
  else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = last
  if (next !== null) {
    event.preventDefault()
    select(next)
  }
}
</script>

<template>
  <div class="tab-nav" role="tablist" :aria-label="label">
    <button
      v-for="(tab, index) in tabs"
      :id="`${idPrefix}-tab-${tab.key}`"
      :key="tab.key"
      ref="buttons"
      type="button"
      role="tab"
      class="tab-nav__tab"
      :class="{ 'is-active': model === tab.key }"
      :aria-selected="model === tab.key"
      :aria-controls="`${idPrefix}-panel`"
      :tabindex="model === tab.key ? 0 : -1"
      @click="model = tab.key"
      @keydown="onKeydown($event, index)"
    >
      <span>{{ tab.label }}</span>
      <span v-if="tab.count !== undefined" class="tab-nav__count">
        <DataValue :value="tab.count" />
      </span>
    </button>
  </div>
</template>

<style scoped>
.tab-nav {
  position: relative;
  display: flex;
  gap: var(--space-1);
  overflow-x: auto;
  border-bottom: 1px solid var(--color-border);
  scrollbar-width: thin;
}

.tab-nav__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 var(--space-4);
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  color: var(--color-text-muted);
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
  cursor: pointer;
}

.tab-nav__tab:hover {
  color: var(--color-heading);
}

.tab-nav__tab.is-active {
  color: var(--color-primary-strong);
  border-bottom-color: var(--color-primary-strong);
}

.tab-nav__tab:focus-visible {
  outline-offset: -2px;
}

.tab-nav__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  padding: 0 6px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);
  font-size: var(--fs-xs);
  color: var(--color-text);
}

.tab-nav__tab.is-active .tab-nav__count {
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}
</style>

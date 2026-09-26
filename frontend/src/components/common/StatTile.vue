<script setup lang="ts">
/** 요약 수치 슬롯. 값이 없으면 '-'를 표시한다. */
import type { Component } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import DataValue from './DataValue.vue'

withDefaults(
  defineProps<{
    label: string
    value?: string | number | null
    hint?: string
    icon?: Component
    tone?: 'primary' | 'secondary' | 'accent' | 'neutral'
    to?: RouteLocationRaw
  }>(),
  { value: null, hint: undefined, icon: undefined, tone: 'primary', to: undefined },
)
</script>

<template>
  <component
    :is="to ? RouterLink : 'div'"
    :to="to"
    class="stat-tile surface-card"
    :class="[`stat-tile--${tone}`, { 'stat-tile--link': to }]"
  >
    <div class="stat-tile__top">
      <span class="stat-tile__label">{{ label }}</span>
      <span v-if="icon" class="stat-tile__icon" aria-hidden="true">
        <component :is="icon" :size="18" stroke-width="1.8" />
      </span>
    </div>
    <p class="stat-tile__value">
      <slot><DataValue :value="value" /></slot>
    </p>
    <p v-if="hint" class="stat-tile__hint">{{ hint }}</p>
  </component>
</template>

<style scoped>
.stat-tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-5);
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.stat-tile--link {
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.stat-tile--link:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}

.stat-tile__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.stat-tile__label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-text);
}

.stat-tile__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  flex-shrink: 0;
}

.stat-tile--primary .stat-tile__icon {
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.stat-tile--secondary .stat-tile__icon {
  background: var(--color-secondary-soft);
  color: var(--color-secondary-strong);
}

.stat-tile--accent .stat-tile__icon {
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}

.stat-tile--neutral .stat-tile__icon {
  background: var(--color-surface-sunken);
  color: var(--color-text);
}

.stat-tile__value {
  font-size: var(--fs-2xl);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
  line-height: 1.2;
}

.stat-tile__value :deep(.value-missing) {
  color: var(--color-text-muted);
}

.stat-tile__hint {
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

@media (max-width: 575.98px) {
  .stat-tile {
    padding: var(--space-4);
  }
  .stat-tile__value {
    font-size: var(--fs-xl);
  }
}
</style>

<script setup lang="ts">
/** 상태 배지. 색상만으로 구분하지 않도록 항상 글자(와 선택적 아이콘)를 함께 표시한다. */
import type { Component } from 'vue'
import type { BadgeTone } from './types'

withDefaults(
  defineProps<{
    label: string
    tone?: BadgeTone
    icon?: Component
    size?: 'sm' | 'md'
  }>(),
  { tone: 'neutral', icon: undefined, size: 'md' },
)
</script>

<template>
  <span class="status-badge" :class="[`status-badge--${tone}`, `status-badge--${size}`]">
    <component :is="icon" v-if="icon" :size="size === 'sm' ? 13 : 15" stroke-width="2" aria-hidden="true" />
    <span>{{ label }}</span>
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  line-height: 1.4;
  white-space: nowrap;
}

.status-badge--sm {
  padding: 1px 8px;
  font-size: var(--fs-xs);
}

.status-badge--neutral {
  background: var(--color-surface-sunken);
  color: var(--color-text);
  border-color: var(--color-border);
}

.status-badge--primary {
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.status-badge--success {
  background: var(--color-success-soft);
  color: var(--color-success-strong);
}

.status-badge--warning {
  background: var(--color-warning-soft);
  color: var(--color-warning-strong);
}

.status-badge--danger {
  background: var(--color-danger-soft);
  color: var(--color-danger-strong);
}

.status-badge--accent {
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}

.status-badge--info {
  background: var(--color-secondary-soft);
  color: var(--color-secondary-strong);
}
</style>

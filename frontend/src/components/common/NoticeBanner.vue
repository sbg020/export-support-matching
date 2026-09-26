<script setup lang="ts">
import { computed, type Component } from 'vue'
import { IconAlertCircle, IconAlertTriangle, IconInfoCircle, IconLock } from '@tabler/icons-vue'

const props = withDefaults(
  defineProps<{
    tone?: 'info' | 'neutral' | 'warning' | 'danger' | 'privacy'
    title?: string
    icon?: Component
    /** 오류처럼 즉시 알려야 하는 경우 */
    alert?: boolean
  }>(),
  { tone: 'info', title: undefined, icon: undefined, alert: false },
)

const toneIcon = computed<Component>(() => {
  if (props.icon) return props.icon
  switch (props.tone) {
    case 'warning':
      return IconAlertTriangle
    case 'danger':
      return IconAlertCircle
    case 'privacy':
      return IconLock
    default:
      return IconInfoCircle
  }
})
</script>

<template>
  <div class="notice" :class="`notice--${tone}`" :role="alert ? 'alert' : undefined">
    <span class="notice__icon" aria-hidden="true">
      <component :is="toneIcon" :size="20" stroke-width="1.9" />
    </span>
    <div class="notice__body">
      <p v-if="title" class="notice__title">{{ title }}</p>
      <div class="notice__text"><slot /></div>
    </div>
    <div v-if="$slots.actions" class="notice__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.notice {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--space-3);
  padding: 14px var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-size: var(--fs-sm);
  line-height: 1.6;
}

.notice__icon {
  display: inline-flex;
  flex-shrink: 0;
  margin-top: 1px;
}

.notice__body {
  flex: 1 1 240px;
  min-width: 0;
}

.notice__title {
  margin-bottom: 2px;
  font-size: var(--fs-base);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.notice__text {
  color: var(--color-text);
}

.notice__text :deep(p + p) {
  margin-top: 4px;
}

.notice__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-self: center;
}

.notice--info {
  background: var(--color-primary-soft);
  border-color: #cfe0fd;
}

.notice--info .notice__icon {
  color: var(--color-primary-strong);
}

.notice--neutral {
  background: var(--color-surface-muted);
  border-color: var(--color-border);
}

.notice--neutral .notice__icon {
  color: var(--color-text-muted);
}

.notice--warning {
  background: var(--color-warning-soft);
  border-color: #fbdca5;
}

.notice--warning .notice__icon {
  color: var(--color-warning-strong);
}

.notice--danger {
  background: var(--color-danger-soft);
  border-color: #f7c3c4;
}

.notice--danger .notice__icon {
  color: var(--color-danger-strong);
}

.notice--privacy {
  background: var(--color-accent-soft);
  border-color: #d9d4ff;
}

.notice--privacy .notice__icon {
  color: var(--color-accent-strong);
}
</style>

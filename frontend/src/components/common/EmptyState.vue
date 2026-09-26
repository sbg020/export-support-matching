<script setup lang="ts">
/** 빈 상태. 데이터가 없을 때 가상 항목 대신 표시한다. */
import type { Component } from 'vue'
import { IconDatabaseOff } from '@tabler/icons-vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: Component
    compact?: boolean
    level?: 2 | 3 | 4
  }>(),
  { description: undefined, icon: () => IconDatabaseOff, compact: false, level: 3 },
)
</script>

<template>
  <div class="empty-state" :class="{ 'empty-state--compact': compact }">
    <span class="empty-state__icon" aria-hidden="true">
      <component :is="icon" :size="compact ? 22 : 28" stroke-width="1.6" />
    </span>
    <component :is="`h${level}`" class="empty-state__title">{{ title }}</component>
    <p v-if="description" class="empty-state__description">{{ description }}</p>
    <div v-if="$slots.default" class="empty-state__extra">
      <slot />
    </div>
    <div v-if="$slots.actions" class="empty-state__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-5);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.empty-state--compact {
  padding: var(--space-6) var(--space-4);
}

.empty-state__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: var(--space-1);
  border-radius: 50%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
}

.empty-state--compact .empty-state__icon {
  width: 44px;
  height: 44px;
}

.empty-state__title {
  margin: 0;
  font-size: var(--fs-md);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.empty-state__description {
  max-width: 520px;
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.empty-state__extra {
  width: 100%;
  max-width: 640px;
  margin-top: var(--space-3);
}

.empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
</style>

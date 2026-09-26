<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    icon?: Component
    /** 제목 태그 수준 */
    level?: 2 | 3
    headingId?: string
    /** 본문 안쪽 여백 없이 (표 등) */
    flush?: boolean
  }>(),
  {
    title: undefined,
    description: undefined,
    icon: undefined,
    level: 2,
    headingId: undefined,
    flush: false,
  },
)
</script>

<template>
  <section class="section-card surface-card" :aria-labelledby="title ? headingId : undefined">
    <header v-if="title || $slots.actions" class="section-card__header">
      <div class="section-card__heading">
        <span v-if="icon" class="section-card__icon" aria-hidden="true">
          <component :is="icon" :size="20" stroke-width="1.8" />
        </span>
        <div class="min-w-0">
          <component :is="`h${level}`" v-if="title" :id="headingId" class="section-card__title">
            {{ title }}
          </component>
          <p v-if="description" class="section-card__description">{{ description }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="section-card__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="section-card__body" :class="{ 'section-card__body--flush': flush }">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="section-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.section-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.section-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--card-padding) var(--card-padding) 0;
}

.section-card__heading {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-width: 0;
  flex: 1 1 260px;
}

.min-w-0 {
  min-width: 0;
}

.section-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.section-card__title {
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
}

.section-card__description {
  margin-top: 4px;
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.section-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.section-card__body {
  padding: var(--space-4) var(--card-padding) var(--card-padding);
  flex: 1;
}

.section-card__body--flush {
  padding: var(--space-4) 0 0;
}

.section-card__footer {
  padding: var(--space-4) var(--card-padding);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}
</style>

<script setup lang="ts">
/** 마이페이지 요약 카드. 기록이 없으면 값은 '-'이고 빈 상태 안내를 보여 준다. */
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { IconArrowRight } from '@tabler/icons-vue'
import DataValue from '@/components/common/DataValue.vue'

withDefaults(
  defineProps<{
    title: string
    icon: Component
    value?: string | number | null
    valueLabel: string
    emptyText: string
    to: RouteLocationRaw
    linkLabel: string
    tone?: 'primary' | 'secondary' | 'accent'
  }>(),
  { value: null, tone: 'primary' },
)
</script>

<template>
  <section class="summary-card surface-card" :class="`summary-card--${tone}`">
    <header class="summary-card__header">
      <span class="summary-card__icon" aria-hidden="true">
        <component :is="icon" :size="20" stroke-width="1.8" />
      </span>
      <h2 class="summary-card__title">{{ title }}</h2>
    </header>
    <p class="summary-card__value">
      <span class="summary-card__value-label">{{ valueLabel }}</span>
      <strong><DataValue :value="value" /></strong>
    </p>
    <p class="summary-card__empty">{{ emptyText }}</p>
    <RouterLink :to="to" class="summary-card__link">
      {{ linkLabel }}
      <IconArrowRight :size="16" stroke-width="2" aria-hidden="true" />
    </RouterLink>
  </section>
</template>

<style scoped>
.summary-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--card-padding);
}

.summary-card__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.summary-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

.summary-card--primary .summary-card__icon {
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.summary-card--secondary .summary-card__icon {
  background: var(--color-secondary-soft);
  color: var(--color-secondary-strong);
}

.summary-card--accent .summary-card__icon {
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}

.summary-card__title {
  margin: 0;
  font-size: var(--fs-md);
}

.summary-card__value {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.summary-card__value-label {
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.summary-card__value strong {
  font-size: var(--fs-xl);
  color: var(--color-heading);
}

.summary-card__empty {
  flex: 1;
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.summary-card__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}
</style>

<script setup lang="ts" generic="T">
/** 정보 행 (InfoList 안에서 사용). 값이 없으면 '-'로 표시한다. */
import DataValue from './DataValue.vue'

withDefaults(
  defineProps<{
    label: string
    value?: T | null
    format?: (value: T) => string
    hint?: string
    /** 가로 배치(라벨 왼쪽) 대신 세로 배치 */
    stacked?: boolean
  }>(),
  { value: null, format: undefined, hint: undefined, stacked: false },
)
</script>

<template>
  <div class="info-row" :class="{ 'info-row--stacked': stacked }">
    <dt class="info-row__label">{{ label }}</dt>
    <dd class="info-row__value">
      <slot><DataValue :value="value" :format="format" /></slot>
      <span v-if="hint" class="info-row__hint">{{ hint }}</span>
    </dd>
  </div>
</template>

<style scoped>
.info-row {
  display: grid;
  grid-template-columns: minmax(96px, 38%) minmax(0, 1fr);
  gap: var(--space-3);
  padding: 11px 0;
  border-bottom: 1px solid var(--color-border);
}

:global(.info-list--compact) .info-row {
  padding: 8px 0;
}

.info-row--stacked {
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;
}

.info-row__label {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  color: var(--color-text-muted);
}

.info-row__value {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  min-width: 0;
  color: var(--color-heading);
  font-weight: var(--fw-medium);
}

.info-row__hint {
  font-size: var(--fs-xs);
  font-weight: var(--fw-regular);
  color: var(--color-text-muted);
}
</style>

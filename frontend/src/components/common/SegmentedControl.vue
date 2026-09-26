<script setup lang="ts" generic="K extends string">
import type { Component } from 'vue'

const model = defineModel<K>({ required: true })

defineProps<{
  options: { value: K; label: string; icon?: Component }[]
  label: string
}>()
</script>

<template>
  <div class="segmented" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="segmented__item"
      :class="{ 'is-active': model === option.value }"
      :aria-pressed="model === option.value"
      @click="model = option.value"
    >
      <component :is="option.icon" v-if="option.icon" :size="16" stroke-width="2" aria-hidden="true" />
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: inline-flex;
  padding: 3px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
}

.segmented__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  cursor: pointer;
}

.segmented__item.is-active {
  background: var(--color-surface);
  color: var(--color-primary-strong);
  box-shadow: var(--shadow-sm);
}
</style>

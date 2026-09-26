<script setup lang="ts">
withDefaults(defineProps<{ columns?: 1 | 2 | 3; compact?: boolean }>(), { columns: 1, compact: false })
</script>

<template>
  <dl class="info-list" :class="[`info-list--cols-${columns}`, { 'info-list--compact': compact }]">
    <slot />
  </dl>
</template>

<style scoped>
.info-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin: 0;
  column-gap: var(--space-6);
}

@media (min-width: 768px) {
  .info-list--cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .info-list--cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>

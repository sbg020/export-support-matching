<script setup lang="ts">
/** 페이지 제목과 한 줄 설명, 그 아래 현재 섹션의 하위 메뉴(SectionNav) */
import SectionNav from './SectionNav.vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    eyebrow?: string
  }>(),
  { description: undefined, eyebrow: undefined },
)
</script>

<template>
  <header class="page-header">
    <div class="page-header__main">
      <div class="page-header__titles">
        <p v-if="eyebrow" class="section-eyebrow">{{ eyebrow }}</p>
        <h1 class="page-header__title">{{ title }}</h1>
        <p v-if="description" class="page-header__description">{{ description }}</p>
        <div v-if="$slots.meta" class="page-header__meta"><slot name="meta" /></div>
      </div>
      <div v-if="$slots.actions" class="page-header__actions">
        <slot name="actions" />
      </div>
    </div>
    <SectionNav />
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-bottom: var(--card-gap);
}

.page-header__main {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-header__titles {
  flex: 1 1 420px;
  min-width: 0;
}

.page-header__title {
  margin: 0;
  font-size: var(--fs-2xl);
}

.page-header__description {
  margin-top: 6px;
  max-width: 760px;
  color: var(--color-text);
}

.page-header__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

@media (max-width: 575.98px) {
  .page-header__title {
    font-size: var(--fs-xl);
  }
  .page-header__actions {
    width: 100%;
  }
}
</style>

<script setup lang="ts">
/**
 * 공고의 세부 분야 칩과 바우처형·15개 분류 밖 배지.
 * 분류가 확인되지 않았으면 아무것도 그리지 않는다.
 */
import type { Program } from '@/types/program'
import { categoryName } from '@/constants/categories'

defineProps<{ program: Program }>()
</script>

<template>
  <ul
    v-if="(program.supportCategories && program.supportCategories.length > 0) || program.isVoucherMenu || program.outOfCategoryScope"
    class="category-chips"
    aria-label="세부 분야"
  >
    <li v-for="code in program.supportCategories ?? []" :key="code" class="category-chip">
      <span class="category-chip__code">{{ code }}</span>
      {{ categoryName(code) }}
    </li>
    <li v-if="program.isVoucherMenu" class="category-chip category-chip--badge">바우처형 (메뉴 선택)</li>
    <li v-if="program.outOfCategoryScope" class="category-chip category-chip--badge">15개 분류 밖</li>
  </ul>
</template>

<style scoped>
.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  font-size: var(--fs-xs);
  color: var(--color-text);
}

.category-chip__code {
  font-weight: var(--fw-bold, 700);
  color: var(--color-primary-strong);
}

.category-chip--badge {
  border-style: dashed;
  font-weight: var(--fw-semibold);
}
</style>

<script setup lang="ts">
/**
 * '초안 기준' 꼬리표. 사람 검수 전 테스트 데이터로 계산한 판정·적합도 옆에 붙인다 (REVISION_02 §3.6).
 * 색만으로 구분하지 않도록 글자로 표시한다.
 */
import type { DataState } from '@/types/program'

defineProps<{ state: DataState | null | undefined }>()
</script>

<template>
  <span v-if="state === 'draft'" class="draft-tag" title="사람 검수 전 초안으로 계산한 결과입니다">초안 기준</span>
</template>

<style scoped>
.draft-tag {
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  line-height: 1.6;
  color: var(--color-text-muted);
  white-space: nowrap;
}
</style>

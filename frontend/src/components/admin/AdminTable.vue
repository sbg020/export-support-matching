<script setup lang="ts">
/**
 * 관리자 표 (REVISION_04 §6.1). 기존 표 스타일(.data-table)을 쓰고, 좁은 화면에서는 표 상자 안에서 가로 스크롤한다.
 * 행이 없으면 머리글은 그대로 두고 아래에 빈 상태를 보여 준다 (앞으로 보일 열의 위치를 알 수 있게).
 */
import EmptyState from '@/components/common/EmptyState.vue'

withDefaults(
  defineProps<{
    /** 표 이름 (스크롤 영역·표 제목으로 읽힌다) */
    label: string
    columns: string[]
    /** 표시할 행 수. 0이면 빈 상태를 보여 준다 */
    rowCount: number
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  { emptyTitle: '표시할 내용이 없습니다', emptyDescription: '공고 저장소를 연결하면 이곳에 표시됩니다.' },
)
</script>

<template>
  <div class="admin-table">
    <div class="scroll-x admin-table__scroll" tabindex="0" role="region" :aria-label="label">
      <table class="data-table">
        <caption class="visually-hidden">{{ label }}</caption>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column" scope="col">{{ column }}</th>
          </tr>
        </thead>
        <tbody>
          <slot />
        </tbody>
      </table>
    </div>
    <EmptyState v-if="rowCount === 0" :title="emptyTitle" :description="emptyDescription" compact :level="4" />
  </div>
</template>

<style scoped>
.admin-table {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.admin-table__scroll {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.admin-table__scroll:focus-visible {
  outline-offset: 2px;
}

.admin-table__scroll .data-table {
  min-width: 640px;
}

.admin-table__scroll .data-table tbody tr:last-child > * {
  border-bottom: 0;
}
</style>

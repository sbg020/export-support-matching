<script setup lang="ts">
/**
 * 공고 비교 표. 최대 4개 열이며, 빈 슬롯은 열 제목부터 값까지 '-'로 표시한다.
 * 어떤 공고가 더 좋다고 판단하지 않는다.
 */
import DataValue from '@/components/common/DataValue.vue'
import EligibilityBadge from './EligibilityBadge.vue'
import { COMPARE_ROW_GROUPS, type CompareRowKey, type CompareSlot } from './compareRows'

defineProps<{
  slots: CompareSlot[]
  view: 'table' | 'cards'
  valueOf: (key: CompareRowKey, slot: CompareSlot) => string | null
}>()
</script>

<template>
  <div v-if="view === 'table'" class="compare-scroll" tabindex="0" aria-label="공고 비교 표 (가로로 스크롤할 수 있습니다)" role="region">
    <table class="compare-table">
      <caption class="visually-hidden">선택한 공고의 항목별 비교</caption>
      <colgroup>
        <col class="compare-table__label-col" />
        <col v-for="slot in slots" :key="slot.index" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col" class="compare-table__corner">비교 항목</th>
          <th v-for="slot in slots" :key="slot.index" scope="col" class="compare-table__head">
            <span class="compare-table__slot">공고 {{ slot.index + 1 }}</span>
            <span class="compare-table__title">
              <DataValue :value="slot.program?.title ?? null" missing-label="선택한 공고 없음" />
            </span>
          </th>
        </tr>
      </thead>
      <template v-for="group in COMPARE_ROW_GROUPS" :key="group.label">
        <tbody>
          <tr class="compare-table__group">
            <th :colspan="slots.length + 1" scope="colgroup">{{ group.label }}</th>
          </tr>
          <tr v-for="row in group.rows" :key="row.key">
            <th scope="row">
              {{ row.label }}
              <span v-if="row.note" class="compare-table__note">{{ row.note }}</span>
            </th>
            <td v-for="slot in slots" :key="slot.index">
              <EligibilityBadge v-if="row.key === 'eligibility'" :status="slot.eligibility?.status ?? null" size="sm" />
              <DataValue v-else :value="valueOf(row.key, slot)" />
            </td>
          </tr>
        </tbody>
      </template>
    </table>
  </div>

  <ul v-else class="compare-cards">
    <li v-for="slot in slots" :key="slot.index" class="compare-card surface-card">
      <p class="compare-table__slot">공고 {{ slot.index + 1 }}</p>
      <h3 class="compare-card__title">
        <DataValue :value="slot.program?.title ?? null" missing-label="선택한 공고 없음" />
      </h3>
      <div v-for="group in COMPARE_ROW_GROUPS" :key="group.label" class="compare-card__group">
        <p class="compare-card__group-label">{{ group.label }}</p>
        <dl class="compare-card__list">
          <div v-for="row in group.rows" :key="row.key" class="compare-card__row">
            <dt>{{ row.label }}</dt>
            <dd>
              <EligibilityBadge v-if="row.key === 'eligibility'" :status="slot.eligibility?.status ?? null" size="sm" />
              <DataValue v-else :value="valueOf(row.key, slot)" />
            </dd>
          </div>
        </dl>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.compare-scroll {
  position: relative;
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.compare-table {
  width: 100%;
  min-width: 640px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
}

.compare-table__label-col {
  width: 180px;
}

.compare-table th,
.compare-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
  text-align: left;
  font-size: var(--fs-sm);
}

.compare-table td + td,
.compare-table th + td,
.compare-table thead th + th {
  border-left: 1px solid var(--color-border);
}

.compare-table thead th {
  background: var(--color-surface-muted);
}

.compare-table__corner {
  position: sticky;
  left: 0;
  z-index: 2;
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.compare-table tbody th[scope='row'] {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--color-surface);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.compare-table__head {
  vertical-align: bottom;
}

.compare-table__slot {
  display: block;
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
  color: var(--color-primary-strong);
}

.compare-table__title {
  display: block;
  margin-top: 2px;
  font-size: var(--fs-base);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.compare-table__group th {
  position: static;
  padding: 8px 14px;
  background: var(--color-surface-sunken);
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
  color: var(--color-text);
  letter-spacing: 0.02em;
}

.compare-table__note {
  display: block;
  margin-top: 2px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-regular);
  color: var(--color-text-muted);
}

.compare-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.compare-card {
  padding: var(--space-5);
}

.compare-card__title {
  margin: 2px 0 var(--space-3);
  font-size: var(--fs-md);
}

.compare-card__group + .compare-card__group {
  margin-top: var(--space-4);
}

.compare-card__group-label {
  margin-bottom: 4px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
  color: var(--color-text-muted);
}

.compare-card__list {
  margin: 0;
}

.compare-card__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--fs-sm);
}

.compare-card__row dt {
  font-weight: var(--fw-medium);
  color: var(--color-text);
}

.compare-card__row dd {
  margin: 0;
  text-align: right;
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}
</style>

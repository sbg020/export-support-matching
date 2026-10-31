<script setup lang="ts">
/**
 * 수출단계 진단 기준의 출처 (REVISION_02 §5.2).
 * 기준 구간표와 원문 문구(요약 없이 그대로), 쪽, 확인일을 보여 준다.
 */
import { useId } from 'vue'
import { ACTIVE_EXPORT_STAGE_CRITERIA, bandText } from '@/lib/engine/diagnosis'
import { exportStageText } from '@/lib/programDisplay'

const criteria = ACTIVE_EXPORT_STAGE_CRITERIA
const tableId = `${useId()}-bands`
</script>

<template>
  <details class="criteria-note">
    <summary>진단 기준과 출처 보기 ({{ criteria.version }})</summary>
    <div class="criteria-note__body">
      <div class="scroll-x">
        <table :id="tableId" class="data-table criteria-note__table">
          <caption class="visually-hidden">수출단계 기준 구간</caption>
          <thead>
            <tr>
              <th scope="col">수출단계</th>
              <th scope="col">직전 연도 수출액 (USD)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="band in criteria.bands" :key="band.stage">
              <th scope="row">{{ exportStageText(band.stage) }}</th>
              <td>{{ bandText(band) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="criteria-note__source">
        출처: {{ criteria.sourceTitle }} · {{ criteria.source.locator }} · 확인일 {{ criteria.verifiedAt }}
      </p>
      <blockquote class="criteria-note__quote">{{ criteria.source.quote }}</blockquote>
      <p v-if="criteria.source.url" class="criteria-note__source">
        <a :href="criteria.source.url" target="_blank" rel="noopener noreferrer">원문 보기 (사본)</a>
        <span v-if="criteria.sourceNote"> · {{ criteria.sourceNote }}</span>
      </p>
    </div>
  </details>
</template>

<style scoped>
.criteria-note {
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  font-size: var(--fs-sm);
}

.criteria-note summary {
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
  cursor: pointer;
}

.criteria-note__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.criteria-note__table {
  max-width: 420px;
}

.criteria-note__source {
  margin: 0;
  color: var(--color-text);
}

.criteria-note__quote {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-left: 3px solid var(--color-border-strong);
  background: var(--color-surface);
  white-space: pre-line;
  color: var(--color-text);
}
</style>

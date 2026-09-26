<script setup lang="ts">
/** 데이터·계정 연결 상태를 조용히 알려 주는 패널 */
import { computed } from 'vue'
import { programRepository } from '@/repositories'
import StatusBadge from '@/components/common/StatusBadge.vue'

const programSourceConnected = computed(() => programRepository.source.kind === 'api')
</script>

<template>
  <section class="data-status" aria-labelledby="data-status-title">
    <h2 id="data-status-title" class="data-status__title">서비스 준비 상태</h2>
    <dl class="data-status__list">
      <div class="data-status__row">
        <dt>공고 데이터</dt>
        <dd>
          <StatusBadge
            :label="programSourceConnected ? 'API 연결됨' : '준비 중'"
            :tone="programSourceConnected ? 'success' : 'neutral'"
            size="sm"
          />
        </dd>
      </div>
      <div class="data-status__row">
        <dt>로그인·계정</dt>
        <dd><StatusBadge label="준비 중" size="sm" /></dd>
      </div>
      <div class="data-status__row">
        <dt>입력 정보 저장</dt>
        <dd><StatusBadge label="이 기기만" tone="accent" size="sm" /></dd>
      </div>
    </dl>
    <p class="data-status__note">
      공고가 수집·검증되기 전까지 추천 결과와 금액·일정은 '-'로 표시됩니다.
    </p>
  </section>
</template>

<style scoped>
.data-status {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
}

.data-status__title {
  margin: 0 0 var(--space-2);
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
}

.data-status__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
}

.data-status__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--fs-sm);
}

.data-status__row dt {
  font-weight: var(--fw-medium);
  color: var(--color-text);
}

.data-status__row dd {
  margin: 0;
}

.data-status__note {
  margin-top: var(--space-3);
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}
</style>

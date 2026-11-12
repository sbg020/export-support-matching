<script setup lang="ts">
/** 공고가 등록되면 카드에 표시될 정보 안내 (가짜 카드를 대신한다) */
import { computed } from 'vue'

const props = withDefaults(defineProps<{ recommended?: boolean }>(), { recommended: false })

const fields = computed(() =>
  props.recommended
    ? ['신청자격', '공고명', '주관·수행기관', '신청 마감', '지원 내용', '지원금', '자부담']
    : ['공고명', '주관·수행기관', '접수상태', '접수기간', '지원방식', '지원규모'],
)
const judgementFields = computed(() =>
  props.recommended ? ['적합도 (시험용 기준)', '계산 근거 보기'] : ['신청 자격', '적합도', '추천 이유'],
)
const actions = computed(() =>
  props.recommended ? ['자세히 보기', '관심사업 저장', '비교에 추가'] : ['상세보기', '비교에 추가', '관심사업 저장'],
)
</script>

<template>
  <div class="field-guide">
    <p class="field-guide__title">공고가 등록되면 공고마다 이런 정보를 보여 드립니다</p>
    <ul class="field-guide__chips" aria-label="공고 기본 정보">
      <li v-for="field in fields" :key="field">{{ field }}</li>
    </ul>
    <ul class="field-guide__chips field-guide__chips--judgement" aria-label="판정 정보">
      <li v-for="field in judgementFields" :key="field">{{ field }}</li>
    </ul>
    <ul class="field-guide__chips field-guide__chips--action" aria-label="할 수 있는 일">
      <li v-for="action in actions" :key="action">{{ action }}</li>
    </ul>
    <p class="field-guide__note">
      {{
        recommended
          ? '신청 가능 · 확인 필요 · 신청 불가 탭으로 나누어 보여 드리고, 신청할 수 없는 공고는 적합도를 계산하지 않습니다.'
          : '신청 자격과 적합도는 서로 다른 기준으로, 근거와 함께 따로 표시합니다.'
      }}
    </p>
  </div>
</template>

<style scoped>
.field-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.field-guide__title {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.field-guide__chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.field-guide__chips li {
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text);
}

.field-guide__chips--judgement li {
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}

.field-guide__chips--action li {
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.field-guide__note {
  max-width: 520px;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
  text-align: center;
}
</style>

<script setup lang="ts">
/**
 * 조건 하나의 판정 카드: 조건 문구, 판정 배지, 해석·예외 배지, 이유, 우리 회사 정보, 원문 근거.
 * 직접 확인할 수 있으면 답 선택을, 입력이 없어 판정하지 못했으면 입력 화면 링크를 보여 준다.
 */
import { computed } from 'vue'
import type { ConditionResult } from '@/types/results'
import { COMMON_CHECK_KEY_LABEL, NEEDS_CHECK_REASON_OPTIONS, optionLabel } from '@/constants/options'
import DataValue from '@/components/common/DataValue.vue'
import ConditionBadge from './ConditionBadge.vue'
import SelfCheckControl from './SelfCheckControl.vue'

const props = withDefaults(
  defineProps<{ programId: string; condition: ConditionResult; selfCheck?: boolean }>(),
  { selfCheck: true },
)

/** 해석·예외 배지와 겹치지 않는 '확인 필요' 이유만 꼬리표로 보여 준다 */
const reasonTag = computed(() => {
  const { status, reasonCode } = props.condition
  if (status !== 'needs-check' || reasonCode === null || reasonCode === 'ambiguous' || reasonCode === 'exception') {
    return null
  }
  return optionLabel(NEEDS_CHECK_REASON_OPTIONS, reasonCode)
})
</script>

<template>
  <article class="cond">
    <header class="cond__head">
      <span v-if="condition.scope" class="cond__scope">{{ condition.scope }}</span>
      <span class="cond__label">{{ condition.label }}</span>
      <ConditionBadge :status="condition.status" :kind="condition.kind" :self-checked="condition.selfChecked" />
      <span v-if="condition.certainty === 'ambiguous'" class="cond__tag">해석 확인 필요</span>
      <span v-if="condition.exceptionText" class="cond__tag">예외 있음</span>
      <span v-if="reasonTag" class="cond__tag cond__tag--muted">{{ reasonTag }}</span>
    </header>
    <p class="cond__reason">{{ condition.reason }}</p>
    <dl class="cond__facts">
      <div>
        <dt>우리 회사 정보</dt>
        <dd><DataValue :value="condition.companyValue" /></dd>
      </div>
      <div v-if="condition.basis">
        <dt>기준 시점</dt>
        <dd>{{ condition.basis }}</dd>
      </div>
    </dl>
    <p v-if="condition.commonCheckKeys" class="cond__reason">
      공통 확인 항목: {{ condition.commonCheckKeys.map((key) => COMMON_CHECK_KEY_LABEL[key]).join(', ') }} ·
      <RouterLink :to="{ name: 'programs-recommended', hash: '#common-checks' }">공통 확인 사항에서 답하기</RouterLink>
    </p>
    <blockquote class="cond__quote">
      “{{ condition.source.quote }}”<span v-if="condition.source.locator"> · {{ condition.source.locator }}</span>
    </blockquote>
    <SelfCheckControl v-if="selfCheck && condition.selfCheckable" :program-id="programId" :condition="condition" />
    <RouterLink
      v-else-if="condition.reasonCode === 'missing-input' && condition.inputStep"
      :to="{ name: 'diagnose-input', query: { step: condition.inputStep } }"
      class="btn btn-secondary btn-sm cond__input"
    >
      기업정보 입력하기 ({{ condition.inputStep }}단계)
    </RouterLink>
  </article>
</template>

<style scoped>
.cond {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.cond__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px var(--space-2);
}

.cond__label {
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.cond__scope {
  padding: 0 6px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-sunken);
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
}

.cond__tag {
  padding: 0 6px;
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-sm);
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-warning-strong);
}

.cond__tag--muted {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.cond__reason {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.cond__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px var(--space-5);
  margin: 0;
  font-size: var(--fs-sm);
}

.cond__facts > div {
  display: flex;
  gap: var(--space-2);
}

.cond__facts dt {
  font-weight: var(--fw-medium);
  color: var(--color-text-muted);
}

.cond__facts dd {
  margin: 0;
}

.cond__quote {
  margin: 0;
  padding: 4px var(--space-3);
  border-left: 3px solid var(--color-border-strong);
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.cond__input {
  align-self: flex-start;
}
</style>

<script setup lang="ts">
/**
 * 공고별 직접 확인 (REVISION_02 §6.9).
 * 필수 조건은 '충족함 / 충족하지 않음', 제외 조건은 '해당 없음 / 해당함'으로 답한다.
 * 답은 이 기기(esm.selfChecks.v1)에만 저장한다.
 */
import { computed, useId } from 'vue'
import type { ConditionResult } from '@/types/results'
import type { RuleCheckAnswer } from '@/types/selfCheck'
import { useSelfChecks } from '@/stores/selfCheckStore'

const props = defineProps<{ programId: string; condition: ConditionResult }>()

const selfChecks = useSelfChecks()
const name = `${useId()}-answer`
const current = computed<RuleCheckAnswer | null>(
  () => selfChecks.answers.value.programs[props.programId]?.[props.condition.ruleId]?.answer ?? null,
)
const options = computed<{ value: RuleCheckAnswer; label: string }[]>(() =>
  props.condition.kind === 'exclusion'
    ? [
        { value: 'met', label: '해당 없음' },
        { value: 'unmet', label: '해당함' },
      ]
    : [
        { value: 'met', label: '충족함' },
        { value: 'unmet', label: '충족하지 않음' },
      ],
)

function answer(value: RuleCheckAnswer | null) {
  selfChecks.setProgramAnswer(props.programId, props.condition.ruleId, value)
}
</script>

<template>
  <fieldset class="self-check">
    <legend class="self-check__legend">직접 확인</legend>
    <label v-for="option in options" :key="option.value" class="self-check__option">
      <input
        type="radio"
        class="form-check-input"
        :name="name"
        :value="option.value"
        :checked="current === option.value"
        @change="answer(option.value)"
      />
      {{ option.label }}
    </label>
    <button v-if="current !== null" type="button" class="btn btn-ghost btn-sm" @click="answer(null)">답 지우기</button>
  </fieldset>
</template>

<style scoped>
.self-check {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.self-check__legend {
  float: left;
  width: auto;
  margin: 0;
  padding: 0;
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.self-check__option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  font-size: var(--fs-sm);
  cursor: pointer;
}

.self-check__option .form-check-input {
  margin: 0;
}
</style>

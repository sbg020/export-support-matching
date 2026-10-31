<script setup lang="ts">
/**
 * 맞춤 추천 상단의 '공통 확인 사항' (REVISION_02 §6.9·§6.10). 기본은 접혀 있다.
 * 휴·폐업·체납·신용·제재·재무 상태 5가지를 '해당 없음 / 해당 있음 / 모르겠음'으로 답한다.
 * 재무 수치는 묻지 않는다. 답은 이 기기(esm.selfChecks.v1)에만 저장하고 서버로 보내지 않는다.
 */
import { computed, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'
import { IconChevronDown, IconListCheck } from '@tabler/icons-vue'
import type { CommonCheckKey } from '@/types/program'
import type { CommonCheckAnswer } from '@/types/selfCheck'
import { COMMON_CHECK_ANSWER_OPTIONS, COMMON_CHECK_OPTIONS } from '@/constants/options'
import { useSelfChecks } from '@/stores/selfCheckStore'
import { useToast } from '@/stores/toastStore'

const route = useRoute()
const selfChecks = useSelfChecks()
const toast = useToast()
const uid = useId()
const bodyId = `${uid}-body`
const open = ref(false)
const answeredCount = computed(() => Object.keys(selfChecks.answers.value.common).length)

// 공고 상세의 '공통 확인 사항에서 답하기'로 들어오면 펼친다
watch(
  () => route.hash,
  (hash) => {
    if (hash === '#common-checks') open.value = true
  },
  { immediate: true },
)

function answerOf(key: CommonCheckKey): CommonCheckAnswer | null {
  return selfChecks.answers.value.common[key] ?? null
}

function clearAll() {
  selfChecks.clearAll()
  toast.show('직접 확인한 답을 모두 지웠습니다.', 'info')
}
</script>

<template>
  <section id="common-checks" class="common-checks surface-card" aria-labelledby="common-checks-title">
    <h2 id="common-checks-title" class="common-checks__heading">
      <button
        type="button"
        class="common-checks__toggle"
        :aria-expanded="open"
        :aria-controls="bodyId"
        @click="open = !open"
      >
        <IconListCheck :size="20" stroke-width="1.9" aria-hidden="true" />
        공통 확인 사항
        <span class="common-checks__count">{{ answeredCount }}/{{ COMMON_CHECK_OPTIONS.length }} 답함</span>
        <IconChevronDown :size="18" stroke-width="2" aria-hidden="true" :class="{ 'is-open': open }" />
      </button>
    </h2>
    <div v-show="open" :id="bodyId" class="common-checks__body">
      <p class="common-checks__lead">
        여러 공고에 공통으로 나오는 결격 사유입니다. 한 번 답하면 해당 조건이 있는 모든 공고의 판정에 반영됩니다. 공고마다
        예외가 있거나 기준이 다르면 '확인 필요'로 남겨 공고 상세에서 다시 확인하게 합니다.
      </p>
      <ul class="common-checks__list">
        <li v-for="item in COMMON_CHECK_OPTIONS" :key="item.value" class="common-check">
          <fieldset>
            <legend class="common-check__label">{{ item.label }}</legend>
            <p v-if="item.description" class="common-check__hint">{{ item.description }}</p>
            <div class="common-check__answers">
              <label v-for="answer in COMMON_CHECK_ANSWER_OPTIONS" :key="answer.value" class="common-check__answer">
                <input
                  type="radio"
                  class="form-check-input"
                  :name="`${uid}-${item.value}`"
                  :value="answer.value"
                  :checked="answerOf(item.value) === answer.value"
                  @change="selfChecks.setCommon(item.value, answer.value)"
                />
                {{ answer.label }}
              </label>
            </div>
          </fieldset>
        </li>
      </ul>
      <div class="common-checks__footer">
        <p class="common-checks__privacy">
          직접 확인한 답은 이 기기에만 저장되며, 판정 결과에 '직접 확인'으로 표시됩니다.
        </p>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :disabled="!selfChecks.hasAny.value"
          @click="clearAll"
        >
          직접 확인 모두 지우기
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.common-checks {
  padding: 0;
  scroll-margin-top: calc(var(--header-height) + 16px);
}

.common-checks__heading {
  margin: 0;
  font-size: var(--fs-md);
}

.common-checks__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 52px;
  padding: 0 var(--card-padding);
  border: 0;
  background: none;
  font: inherit;
  font-weight: var(--fw-bold);
  color: var(--color-heading);
  text-align: left;
  cursor: pointer;
}

.common-checks__toggle svg:last-child {
  margin-left: auto;
  transition: transform 0.2s ease;
}

.common-checks__toggle svg.is-open {
  transform: rotate(180deg);
}

.common-checks__count {
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.common-checks__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 0 var(--card-padding) var(--card-padding);
}

.common-checks__lead,
.common-checks__privacy {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.common-checks__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.common-check fieldset {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.common-check__label {
  float: none;
  width: auto;
  margin: 0 0 6px;
  padding: 0;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.common-check__hint {
  margin: 0 0 6px;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.common-check__answers {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
}

.common-check__answer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  font-size: var(--fs-sm);
  cursor: pointer;
}

.common-check__answer .form-check-input {
  margin: 0;
}

.common-checks__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
</style>

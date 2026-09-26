<script setup lang="ts">
/** 단계 폼 진행 표시: 현재 단계/전체 단계, 진행 막대, 단계별 상태 */
import { computed } from 'vue'
import { IconCheck, IconCircleDashed, IconPlayerSkipForward, IconPoint } from '@tabler/icons-vue'
import type { ProfileStepDefinition } from '@/constants/options'
import type { ProfileStepId } from '@/types/profile'
import { STEP_STATUS_LABEL, type StepStatus } from '@/lib/profileSteps'

const props = defineProps<{
  steps: ProfileStepDefinition[]
  current: ProfileStepId
  statuses: Record<ProfileStepId, StepStatus>
}>()

const emit = defineEmits<{ select: [step: ProfileStepId] }>()

const currentIndex = computed(() => props.steps.findIndex((s) => s.id === props.current))
const currentStep = computed(() => props.steps[currentIndex.value])
const percent = computed(() => Math.round(((currentIndex.value + 1) / props.steps.length) * 100))

const STATUS_ICON = {
  complete: IconCheck,
  incomplete: IconCircleDashed,
  skipped: IconPlayerSkipForward,
  optional: IconPoint,
}
</script>

<template>
  <div class="step-progress">
    <div class="step-progress__summary">
      <p class="step-progress__count">
        <span class="step-progress__current">{{ currentIndex + 1 }}</span>
        <span aria-hidden="true"> / </span>
        <span class="visually-hidden">단계, 전체 </span>
        <span>{{ steps.length }}</span>
        <span> 단계</span>
      </p>
      <p class="step-progress__title">{{ currentStep?.title }}</p>
    </div>
    <div
      class="step-progress__bar"
      role="progressbar"
      :aria-valuenow="currentIndex + 1"
      aria-valuemin="1"
      :aria-valuemax="steps.length"
      :aria-valuetext="`전체 ${steps.length}단계 중 ${currentIndex + 1}단계`"
      aria-label="입력 진행"
    >
      <span class="step-progress__fill" :style="{ width: `${percent}%` }" />
    </div>
    <ol class="step-progress__list">
      <li v-for="(step, index) in steps" :key="step.id">
        <button
          type="button"
          class="step-progress__step"
          :class="[`is-${statuses[step.id]}`, { 'is-current': step.id === current }]"
          :aria-current="step.id === current ? 'step' : undefined"
          @click="emit('select', step.id)"
        >
          <span class="step-progress__head">
            <span class="step-progress__num" aria-hidden="true">{{ index + 1 }}</span>
            <span class="step-progress__name">{{ step.title }}</span>
          </span>
          <span class="step-progress__status">
            <component :is="STATUS_ICON[statuses[step.id]]" :size="13" stroke-width="2.2" aria-hidden="true" />
            <span class="step-progress__status-text">{{ STEP_STATUS_LABEL[statuses[step.id]] }}</span>
          </span>
          <span class="visually-hidden">{{ index + 1 }}단계로 이동</span>
        </button>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.step-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.step-progress__summary {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}

.step-progress__count {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.step-progress__current {
  color: var(--color-primary-strong);
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
}

.step-progress__title {
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.step-progress__bar {
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);
  overflow: hidden;
}

.step-progress__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  transition: width 0.25s ease;
}

.step-progress__list {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.step-progress__step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  text-align: left;
  cursor: pointer;
}

.step-progress__step:hover {
  border-color: var(--color-primary);
}

.step-progress__step.is-current {
  border-color: var(--color-primary-strong);
  background: var(--color-primary-soft);
  box-shadow: inset 0 0 0 1px var(--color-primary-strong);
}

.step-progress__head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
}

.step-progress__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-surface-sunken);
  color: var(--color-text);
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
}

.is-current .step-progress__num {
  background: var(--color-primary-strong);
  color: #fff;
}

.is-complete:not(.is-current) .step-progress__num {
  background: var(--color-success-soft);
  color: var(--color-success-strong);
}

.step-progress__name {
  overflow: hidden;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.step-progress__status {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.is-complete .step-progress__status {
  color: var(--color-success-strong);
}

.is-skipped .step-progress__status {
  color: var(--color-warning-strong);
}

@media (max-width: 1199.98px) {
  .step-progress__step {
    align-items: center;
    padding: 8px 4px;
    text-align: center;
  }
  .step-progress__head {
    flex-direction: column;
    gap: 4px;
  }
  .step-progress__name {
    font-size: var(--fs-xs);
  }
  .step-progress__status-text {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
}

@media (max-width: 575.98px) {
  .step-progress__list {
    gap: 4px;
  }
  /* 좁은 화면에서는 번호와 상태 아이콘만 보이고, 현재 단계 이름은 위 요약 줄에 표시한다. */
  .step-progress__name {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }
}
</style>

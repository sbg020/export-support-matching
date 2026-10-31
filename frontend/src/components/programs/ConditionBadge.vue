<script setup lang="ts">
/**
 * 조건별 판정 배지. 제외 조건은 '해당 없음' / '제외 대상 해당'으로 표시하고,
 * 직접 확인으로 정해졌으면 '(직접 확인)'을 붙여 자동 판정과 구분한다.
 */
import { computed } from 'vue'
import { IconCircleCheck, IconCircleX, IconHelpCircle } from '@tabler/icons-vue'
import type { ConditionStatus } from '@/types/results'
import { CONDITION_STATUS_OPTIONS, EXCLUSION_STATUS_OPTIONS, optionLabel } from '@/constants/options'
import StatusBadge from '@/components/common/StatusBadge.vue'

const props = withDefaults(
  defineProps<{
    status: ConditionStatus
    kind?: 'required' | 'exclusion'
    selfChecked?: boolean
  }>(),
  { kind: 'required', selfChecked: false },
)

const config = computed(() => {
  switch (props.status) {
    case 'met':
      return { tone: 'success' as const, icon: IconCircleCheck }
    case 'unmet':
      return { tone: 'danger' as const, icon: IconCircleX }
    default:
      return { tone: 'warning' as const, icon: IconHelpCircle }
  }
})

const label = computed(() => {
  const options = props.kind === 'exclusion' ? EXCLUSION_STATUS_OPTIONS : CONDITION_STATUS_OPTIONS
  const text = optionLabel(options, props.status) ?? ''
  return props.selfChecked ? `${text} (직접 확인)` : text
})
</script>

<template>
  <StatusBadge :label="label" :tone="config.tone" :icon="config.icon" size="sm" />
</template>

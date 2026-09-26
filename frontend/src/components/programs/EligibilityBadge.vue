<script setup lang="ts">
/** 신청 자격 상태. 판정 결과가 없으면(null) '-'로 표시하고 임의로 판정하지 않는다. */
import { computed } from 'vue'
import { IconCircleCheck, IconCircleX, IconHelpCircle } from '@tabler/icons-vue'
import type { EligibilityStatus } from '@/types/results'
import { ELIGIBILITY_STATUS_OPTIONS, optionLabel } from '@/constants/options'
import StatusBadge from '@/components/common/StatusBadge.vue'
import DataValue from '@/components/common/DataValue.vue'

const props = withDefaults(defineProps<{ status: EligibilityStatus | null; size?: 'sm' | 'md' }>(), {
  size: 'md',
})

const config = computed(() => {
  switch (props.status) {
    case 'eligible':
      return { tone: 'success' as const, icon: IconCircleCheck }
    case 'needs-check':
      return { tone: 'warning' as const, icon: IconHelpCircle }
    case 'ineligible':
      return { tone: 'danger' as const, icon: IconCircleX }
    default:
      return null
  }
})
</script>

<template>
  <StatusBadge
    v-if="status && config"
    :label="optionLabel(ELIGIBILITY_STATUS_OPTIONS, status) ?? ''"
    :tone="config.tone"
    :icon="config.icon"
    :size="size"
  />
  <DataValue v-else :value="null" missing-label="판정 전" />
</template>

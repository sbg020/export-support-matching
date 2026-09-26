<script setup lang="ts">
import { computed } from 'vue'
import { IconCircleCheck, IconCircleX, IconHelpCircle } from '@tabler/icons-vue'
import type { ConditionStatus } from '@/types/results'
import { CONDITION_STATUS_OPTIONS, optionLabel } from '@/constants/options'
import StatusBadge from '@/components/common/StatusBadge.vue'

const props = defineProps<{ status: ConditionStatus }>()

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
</script>

<template>
  <StatusBadge
    :label="optionLabel(CONDITION_STATUS_OPTIONS, status) ?? ''"
    :tone="config.tone"
    :icon="config.icon"
    size="sm"
  />
</template>

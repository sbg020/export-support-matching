<script setup lang="ts">
import { computed } from 'vue'
import { IconCircleCheck, IconCircleDashed, IconPencil } from '@tabler/icons-vue'
import type { ProfileStatus } from '@/types/profile'
import { PROFILE_STATUS_LABEL } from '@/lib/profile'
import StatusBadge from '@/components/common/StatusBadge.vue'

const props = withDefaults(defineProps<{ status: ProfileStatus; size?: 'sm' | 'md' }>(), { size: 'md' })

const config = computed(() => {
  switch (props.status) {
    case 'complete':
      return { tone: 'success' as const, icon: IconCircleCheck }
    case 'in-progress':
      return { tone: 'warning' as const, icon: IconPencil }
    default:
      return { tone: 'neutral' as const, icon: IconCircleDashed }
  }
})
</script>

<template>
  <StatusBadge :label="PROFILE_STATUS_LABEL[status]" :tone="config.tone" :icon="config.icon" :size="size" />
</template>

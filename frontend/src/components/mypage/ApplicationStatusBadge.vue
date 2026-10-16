<script setup lang="ts">
import { computed } from 'vue'
import type { ApplicationStatus } from '@/types/tracking'
import type { BadgeTone } from '@/components/common/types'
import { statusLabel } from '@/constants/applicationStatus'
import StatusBadge from '@/components/common/StatusBadge.vue'

const props = withDefaults(defineProps<{ status: ApplicationStatus; size?: 'sm' | 'md' }>(), { size: 'sm' })

const TONES: Record<ApplicationStatus, BadgeTone> = {
  interested: 'neutral',
  preparing: 'info',
  applied: 'primary',
  under_review: 'accent',
  selected: 'success',
  not_selected: 'danger',
  in_progress: 'primary',
  completed: 'success',
}

const tone = computed(() => TONES[props.status])
</script>

<template>
  <StatusBadge :label="statusLabel(status)" :tone="tone" :size="size" />
</template>

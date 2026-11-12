<script setup lang="ts">
/**
 * 신청 자격 상태. 판정 결과가 없으면(null) '-'로 표시하고 임의로 판정하지 않는다.
 * 직접 확인으로 정해진 조건이 있으면 '(직접 확인 n개 포함)'을 붙인다.
 */
import { computed } from 'vue'
import { IconCircleCheck, IconCircleX, IconHelpCircle } from '@tabler/icons-vue'
import type { EligibilityStatus } from '@/types/results'
import { ELIGIBILITY_STATUS_OPTIONS, optionLabel } from '@/constants/options'
import StatusBadge from '@/components/common/StatusBadge.vue'
import DataValue from '@/components/common/DataValue.vue'

const props = withDefaults(
  defineProps<{
    status: EligibilityStatus | null
    size?: 'sm' | 'md'
    /** 직접 확인으로 정해진 조건 수 */
    selfCheckedCount?: number
  }>(),
  { size: 'md', selfCheckedCount: 0 },
)

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
  <span v-if="status && config" class="eligibility-badge">
    <StatusBadge
      :label="optionLabel(ELIGIBILITY_STATUS_OPTIONS, status) ?? ''"
      :tone="config.tone"
      :icon="config.icon"
      :size="size"
    />
    <span v-if="selfCheckedCount > 0" class="eligibility-badge__self">(직접 확인 {{ selfCheckedCount }}개 포함)</span>
  </span>
  <DataValue v-else :value="null" missing-label="판정 전" />
</template>

<style scoped>
.eligibility-badge {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.eligibility-badge__self {
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text);
}
</style>

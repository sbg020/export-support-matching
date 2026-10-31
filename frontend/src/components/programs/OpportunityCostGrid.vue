<script setup lang="ts">
/**
 * 공고 상세 '기회비용' (REVISION_02 §8.1·§8.3).
 * 원문(정답 세트)에 근거가 있는 값만 보여 주고, 부담이 크다·작다고 판단하지 않는다.
 * 마감 여유는 데이터 기준일 대비이며, 최대 자기부담은 총사업비 한도 − 지원금 한도가 0보다 클 때만 보인다.
 */
import { computed } from 'vue'
import type { Program } from '@/types/program'
import type { OpportunityCostResult } from '@/types/results'
import { SETTLEMENT_LABEL } from '@/constants/options'
import { formatKrw } from '@/lib/display'
import DataValue from '@/components/common/DataValue.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const props = defineProps<{ program: Program | null; opportunity: OpportunityCostResult | null }>()

const o = computed(() => props.opportunity)

const docsText = computed(() => {
  const counts = o.value?.documentCounts
  if (!counts) return null
  const optional = counts.optional > 0 ? ` · 선택 ${counts.optional}개` : ''
  return `필수 ${counts.required}개 · 해당 시 ${counts.conditional}개${optional}`
})
const docsBasis = computed(() => {
  const counts = o.value?.documentCounts
  if (!counts) return null
  const pages = counts.locators.length > 0 ? `서류 목록 ${counts.locators.join(', ')}` : null
  return [`공고 전용 서식 ${counts.programForms}개 포함`, pages].filter(Boolean).join(' · ')
})
const selfPaymentText = computed(() => {
  const ratio = o.value?.selfPaymentRatioPercent ?? null
  const max = o.value?.selfPaymentMaxKrw ?? null
  const parts = [ratio !== null ? `${ratio}%` : null, max ? `최대 ${formatKrw(max.value)}` : null].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
})
const selfPaymentBasis = computed(() => {
  const parts = [
    o.value?.selfPaymentMaxKrw?.basis ?? null,
    o.value?.selfPaymentNote ? `원문: ${o.value.selfPaymentNote}` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
})
const settlementText = computed(() => (o.value?.settlement ? SETTLEMENT_LABEL[o.value.settlement.type] : null))
const amountsText = computed(() => {
  if (!o.value || (o.value.maxAmountKrw === null && o.value.totalBudgetMaxKrw === null)) return null
  return `지원금 ${formatKrw(o.value.maxAmountKrw)} · 총사업비 ${formatKrw(o.value.totalBudgetMaxKrw)}`
})
const amountsBasis = computed(() => {
  const locator = props.program?.amountSource?.locator ?? null
  const note = o.value?.amountNote ?? null
  return [note ? `원문: ${note}` : null, locator].filter(Boolean).join(' · ') || null
})
const deadlineText = computed(() => {
  const days = o.value?.daysUntilDeadline ?? null
  if (days === null) return null
  return days >= 0 ? `마감까지 ${days}일` : '접수 마감'
})
const deadlineBasis = computed(() => {
  if (o.value?.daysUntilDeadline === null || o.value?.daysUntilDeadline === undefined) {
    return props.program?.applyPeriodNote ? `기간 메모: ${props.program.applyPeriodNote}` : null
  }
  return o.value.basisDate ? `기준일(${o.value.basisDate}) 대비` : null
})

interface CostItem {
  label: string
  value: string | null
  basis: string | null
  /** 값이 없을 때 '산정 전' 배지를 붙인다 */
  pending: boolean
}

const items = computed<CostItem[]>(() => [
  { label: '필요 서류', value: docsText.value, basis: docsBasis.value, pending: true },
  { label: '새로 준비할 서류', value: null, basis: '서류함이 연결되면 계산합니다.', pending: true },
  { label: '자기부담금', value: selfPaymentText.value ?? (o.value?.selfPaymentNote ?? null), basis: selfPaymentText.value ? selfPaymentBasis.value : null, pending: false },
  {
    label: '정산 방식',
    value: settlementText.value,
    basis: o.value?.settlement ? `원문: ${o.value.settlement.source.quote}` : null,
    pending: false,
  },
  { label: '지원금·총사업비 한도', value: amountsText.value ?? (o.value?.amountNote ?? null), basis: amountsText.value ? amountsBasis.value : null, pending: false },
  { label: '마감 여유', value: deadlineText.value, basis: deadlineBasis.value, pending: false },
  {
    label: '예상 준비 시간',
    value: o.value?.prepHours ? `약 ${o.value.prepHours.value}시간` : null,
    basis: o.value?.prepHours?.basis ?? '참여 후기 5건 이상이 쌓이면 중앙값으로 표시합니다.',
    pending: true,
  },
  {
    label: '선정 후 의무',
    value: o.value?.obligations ? (o.value.obligations.length > 0 ? o.value.obligations.join(', ') : '없음') : null,
    basis: null,
    pending: true,
  },
])
</script>

<template>
  <ul class="cost-grid">
    <li v-for="item in items" :key="item.label" class="cost-item">
      <p class="cost-item__label">{{ item.label }}</p>
      <p class="cost-item__value"><DataValue :value="item.value" /></p>
      <StatusBadge v-if="item.value === null && item.pending" label="산정 전" size="sm" />
      <p v-if="item.basis" class="cost-item__basis">{{ item.basis }}</p>
    </li>
  </ul>
  <p class="fs-sm text-muted-strong mt-3 mb-0">
    이 값들은 사업이 더 좋거나 나쁘다는 판단이 아닙니다. 준비에 드는 부담을 미리 가늠하는 참고 정보이며, 산정 근거와
    기준일을 함께 표시합니다. 정산 방식이 '먼저 집행 후 지급'이면 지원금을 받기 전에 비용을 먼저 내야 합니다.
  </p>
</template>

<style scoped>
.cost-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.cost-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.cost-item__label {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-text);
}

.cost-item__value {
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
  word-break: keep-all;
}

.cost-item__basis {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

@media (max-width: 1199.98px) {
  .cost-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 575.98px) {
  .cost-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

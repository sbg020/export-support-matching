<script setup lang="ts">
/**
 * 재무제표 금액 (② 기업 규모 단계, 선택 입력).
 * 당기 매출액은 같은 단계의 '최근 매출액'(필수)이고, 나머지 5개는 선택이다. 6개를 모두 입력하면 적합도의 재무 요소를
 * 계산하고, 입력하지 않으면 재무 요소는 0점이다. 비율은 화면에서만 계산하고 저장하지 않는다. DART 연동은 없다.
 */
import { computed } from 'vue'
import { useProfileForm } from '@/composables/useProfileForm'
import { financeSummary, percentText, RETENTION_NOTE } from '@/lib/finance'
import { formatKrwReadable } from '@/lib/display'
import FormField from '@/components/form/FormField.vue'
import FormFieldset from '@/components/form/FormFieldset.vue'
import NumberInput from '@/components/form/NumberInput.vue'
import DataValue from '@/components/common/DataValue.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

const { profile, fieldId } = useProfileForm()

/** 수집 항목 (출처) — 당기 매출액은 위의 '최근 매출액' */
const amounts = [
  { field: 'revenuePrevKrw', label: '전기 매출액', source: '손익계산서', negative: false },
  { field: 'operatingIncomeKrw', label: '영업이익', source: '손익계산서', negative: true },
  { field: 'netIncomeKrw', label: '당기순이익', source: '손익계산서', negative: true },
  { field: 'totalLiabilitiesKrw', label: '부채총계', source: '재무상태표', negative: false },
  { field: 'totalEquityKrw', label: '자본총계', source: '재무상태표', negative: true },
] as const

const summary = computed(() => financeSummary(profile.value))
const hintOf = (amount: (typeof amounts)[number]) => {
  const value = profile.value[amount.field]
  const parts = [`출처: ${amount.source}`]
  if (amount.negative) parts.push('음수(손실·자본잠식)도 입력할 수 있습니다')
  if (value !== null) parts.push(`입력한 금액: ${formatKrwReadable(value)}`)
  return parts.join(' · ')
}
</script>

<template>
  <FormFieldset
    :id="fieldId('finance')"
    legend="재무제표 금액 (선택 입력)"
    hint="매출액 기준연도와 같은 해의 손익계산서·재무상태표 금액을 원 단위로 입력하세요 (홈택스 '표준재무제표증명'). 입력하면 적합도의 재무 요소를 계산하고, 입력하지 않으면 재무 요소는 0점입니다."
  >
    <div class="finance-grid">
      <FormField
        v-for="amount in amounts"
        :id="fieldId(amount.field)"
        :key="amount.field"
        v-slot="{ id, describedby }"
        :label="amount.label"
        optional
        :hint="hintOf(amount)"
      >
        <NumberInput :id="id" v-model="profile[amount.field]" unit="원" :allow-negative="amount.negative" :describedby="describedby" />
      </FormField>
    </div>

    <div class="finance-summary" aria-live="polite">
      <p class="finance-summary__status">
        <StatusBadge
          :label="summary.status === 'complete' ? '재무 입력 완료' : '재무 미입력'"
          :tone="summary.status === 'complete' ? 'success' : 'warning'"
        />
        <StatusBadge v-if="summary.capitalImpaired" label="자본잠식" tone="danger" />
        <span v-if="summary.status !== 'complete'" class="fs-sm text-muted-strong">
          당기 매출액을 포함한 6개 금액을 모두 입력해야 재무 요소를 계산합니다. 빠진 값이 있으면 재무 요소는 0점입니다.
        </span>
      </p>
      <dl class="finance-summary__grid">
        <div><dt>매출액증가율</dt><dd><DataValue :value="percentText(summary.revenueGrowth)" /></dd></div>
        <div><dt>매출액영업이익률</dt><dd><DataValue :value="percentText(summary.operatingMargin)" /></dd></div>
        <div><dt>매출액순이익률</dt><dd><DataValue :value="percentText(summary.netMargin)" /></dd></div>
        <div><dt>부채비율</dt><dd><DataValue :value="percentText(summary.debtRatio)" /></dd></div>
        <div><dt>ROE</dt><dd><DataValue :value="percentText(summary.roe)" /></dd></div>
        <div><dt>지속가능성장률(SGR)</dt><dd><DataValue :value="percentText(summary.sgr)" /></dd></div>
      </dl>
      <p class="fs-xs text-muted-strong mb-0">
        SGR = ROE × 유보율. {{ RETENTION_NOTE }}. 계산값은 저장하지 않고 입력값에서 매번 계산합니다.
      </p>
    </div>
  </FormFieldset>
</template>

<style scoped>
.finance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.finance-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-5);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.finance-summary__status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
}

.finance-summary__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.finance-summary__grid dt {
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.finance-summary__grid dd {
  margin: 0;
  font-weight: var(--fw-bold);
  color: var(--color-heading);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 575.98px) {
  .finance-grid,
  .finance-summary__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

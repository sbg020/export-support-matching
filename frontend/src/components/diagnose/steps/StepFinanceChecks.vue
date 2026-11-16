<script setup lang="ts">
/**
 * ⑦ 재무·신청 전 확인 (선택, REVISION_05 §3). 건너뛸 수 있다.
 * - 재무: 표준재무제표증명의 금액(원)을 직접 입력한다. DART 연동은 없다. 비율은 화면에서만 계산하고 저장하지 않는다.
 * - 신청 전 확인: 공통 결격 사유 6개(B01·B02·B03·B04·B05·B08)에 해당 없음 / 해당 / 모르겠음으로 답한다.
 * - 수출 의향·참여 조건 수용(B09)과 준비 상태(자부담 납부 가능)
 */
import { computed } from 'vue'
import { recentYears, useProfileForm } from '@/composables/useProfileForm'
import { financeSummary, percentText, RETENTION_NOTE } from '@/lib/finance'
import { formatKrw } from '@/lib/display'
import { PRE_APPLY_QUESTIONS } from '@/constants/preApply'
import type { PreApplyAnswer, PreApplyCode } from '@/types/profile'
import FormField from '@/components/form/FormField.vue'
import FormFieldset from '@/components/form/FormFieldset.vue'
import NumberInput from '@/components/form/NumberInput.vue'
import SelectInput from '@/components/form/SelectInput.vue'
import ChoiceCards from '@/components/form/ChoiceCards.vue'
import DataValue from '@/components/common/DataValue.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { siteNow } from '@/lib/siteClock'

const { profile, fieldId } = useProfileForm()
const yearOptions = recentYears(6).map((y) => ({ value: String(y), label: `${y}년` }))
const AMOUNT_HINT = "홈택스 '표준재무제표증명'의 금액을 원 단위로 입력하세요."

const amounts = [
  { field: 'revenuePrevKrw', label: '전기 매출액', negative: false },
  { field: 'operatingIncomeKrw', label: '영업이익', negative: true },
  { field: 'netIncomeKrw', label: '당기순이익', negative: true },
  { field: 'totalLiabilitiesKrw', label: '부채총계', negative: false },
  { field: 'totalEquityKrw', label: '자본총계', negative: true },
] as const

const ANSWER_OPTIONS: { value: PreApplyAnswer; label: string }[] = [
  { value: 'no', label: '해당 없음' },
  { value: 'yes', label: '해당' },
  { value: 'unknown', label: '모르겠음' },
]
const YES_NO = [
  { value: true, label: '예' },
  { value: false, label: '아니요' },
]

const baseYear = computed<string | null>({
  get: () => (profile.value.finBaseYear === null ? null : String(profile.value.finBaseYear)),
  set: (v) => {
    profile.value.finBaseYear = v === null ? null : Number(v)
  },
})

const summary = computed(() => financeSummary(profile.value))

function today(): string {
  const now = siteNow()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function answerModel(code: PreApplyCode) {
  return computed<PreApplyAnswer | null>({
    get: () => profile.value.preApplyChecks[code] ?? null,
    set: (value) => {
      const next = { ...profile.value.preApplyChecks }
      if (value === null) delete next[code]
      else next[code] = value
      profile.value.preApplyChecks = next
      // 답한 날짜(사용자 입력 시점). 공고 기준일로 쓰지 않는다
      profile.value.preApplyCheckedAt = today()
    },
  })
}
const answerModels = Object.fromEntries(PRE_APPLY_QUESTIONS.map((q) => [q.code, answerModel(q.code)]))
</script>

<template>
  <div class="step-fields">
    <FormFieldset :id="fieldId('finance')" legend="재무 (직접 입력)" :hint="AMOUNT_HINT">
      <div class="finance-grid">
        <FormField v-slot="{ id, describedby }" :id="fieldId('finBaseYear')" label="재무 기준연도">
          <SelectInput :id="id" v-model="baseYear" :options="yearOptions" placeholder="연도 선택" :describedby="describedby" />
        </FormField>
        <FormField
          v-slot="{ id, describedby }"
          :id="fieldId('revenueKrw-fin')"
          label="당기 매출액"
          hint="②단계 '최근 매출액'과 같은 값입니다."
        >
          <NumberInput :id="id" v-model="profile.revenueKrw" unit="원" :describedby="describedby" />
        </FormField>
        <FormField
          v-for="amount in amounts"
          :id="fieldId(amount.field)"
          :key="amount.field"
          v-slot="{ id, describedby }"
          :label="amount.label"
          :hint="amount.negative ? '음수(손실·자본잠식)도 입력할 수 있습니다.' : undefined"
        >
          <NumberInput :id="id" v-model="profile[amount.field]" unit="원" :allow-negative="amount.negative" :describedby="describedby" />
        </FormField>
      </div>

      <div class="finance-summary" aria-live="polite">
        <p class="finance-summary__status">
          <StatusBadge
            :label="summary.status === 'complete' ? '재무 입력 완료' : '재무 미입력'"
            :tone="summary.status === 'complete' ? 'success' : 'neutral'"
          />
          <StatusBadge v-if="summary.capitalImpaired" label="자본잠식" tone="danger" />
          <span v-if="summary.status !== 'complete'" class="fs-sm text-muted-strong">
            6개 금액 중 빠진 값이 있으면 적합도에서 재무 요소를 뺍니다.
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
        <p class="fs-xs text-muted-strong">
          SGR = ROE × 유보율. {{ RETENTION_NOTE }}. 계산값은 저장하지 않고 입력값에서 매번 계산합니다.
          <template v-if="profile.revenueKrw !== null"> 당기 매출액 {{ formatKrw(profile.revenueKrw) }}.</template>
        </p>
      </div>
    </FormFieldset>

    <FormFieldset
      :id="fieldId('preApply')"
      legend="신청 전 확인 (공통 결격 사유)"
      hint="대부분의 지원사업이 신청 자격에서 빼는 사유입니다. '해당'이면 그 조건이 있는 공고는 신청 불가로, '모르겠음'이나 미응답은 공고 상세에서 다시 확인합니다."
    >
      <div class="pre-apply">
        <div v-for="q in PRE_APPLY_QUESTIONS" :key="q.code" class="pre-apply__item">
          <p :id="fieldId(`pre-${q.code}`)" class="pre-apply__question">{{ q.question }}</p>
          <ChoiceCards
            v-model="answerModels[q.code]!.value"
            :name="fieldId(`pre-${q.code}-answer`)"
            :options="ANSWER_OPTIONS"
            :columns="3"
            :describedby="fieldId(`pre-${q.code}`)"
            clearable
          />
        </div>
        <p class="fs-sm text-muted-strong">
          기준일 <DataValue :value="profile.preApplyCheckedAt ? profile.preApplyCheckedAt.split('-').join('.') : null" />
        </p>
      </div>
    </FormFieldset>

    <FormFieldset :id="fieldId('intent')" legend="수출 의향·참여 조건">
      <div class="pre-apply">
        <div class="pre-apply__item">
          <p :id="fieldId('intentExport-q')" class="pre-apply__question">수출 계획(희망)이 있습니까?</p>
          <ChoiceCards v-model="profile.intentExport" :name="fieldId('intentExport')" :options="YES_NO" :describedby="fieldId('intentExport-q')" clearable />
        </div>
        <div class="pre-apply__item">
          <p :id="fieldId('intentCommit-q')" class="pre-apply__question">자부담·일정 참여 등 사업의 참여 조건을 받아들일 수 있습니까?</p>
          <ChoiceCards v-model="profile.intentCommit" :name="fieldId('intentCommit')" :options="YES_NO" :describedby="fieldId('intentCommit-q')" clearable />
        </div>
        <div class="pre-apply__item">
          <p :id="fieldId('selfPaymentReady-q')" class="pre-apply__question">준비 상태: 자부담금을 낼 수 있습니까?</p>
          <ChoiceCards v-model="profile.selfPaymentReady" :name="fieldId('selfPaymentReady')" :options="YES_NO" :describedby="fieldId('selfPaymentReady-q')" clearable />
        </div>
      </div>
    </FormFieldset>
  </div>
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

.pre-apply {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.pre-apply__question {
  margin-bottom: var(--space-2);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

@media (max-width: 575.98px) {
  .finance-grid,
  .finance-summary__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

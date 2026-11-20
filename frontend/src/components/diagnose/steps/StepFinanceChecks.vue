<script setup lang="ts">
/**
 * ⑦ 신청 전 확인 (선택, REVISION_05 §3). 건너뛸 수 있다.
 * - 재무제표 금액은 ② 기업 규모 단계로 옮겼다 (FinanceAmountsFields.vue).
 * - 신청 전 확인: 공통 결격 사유 6개(B01·B02·B03·B04·B05·B08)에 해당 없음 / 해당 / 모르겠음으로 답한다.
 * - 수출 의향·참여 조건 수용(B09)과 준비 상태(자부담 납부 가능)
 */
import { computed } from 'vue'
import { useProfileForm } from '@/composables/useProfileForm'
import { PRE_APPLY_QUESTIONS } from '@/constants/preApply'
import type { PreApplyAnswer, PreApplyCode } from '@/types/profile'
import FormFieldset from '@/components/form/FormFieldset.vue'
import ChoiceCards from '@/components/form/ChoiceCards.vue'
import { siteNow } from '@/lib/siteClock'

const { profile, fieldId } = useProfileForm()


const ANSWER_OPTIONS: { value: PreApplyAnswer; label: string }[] = [
  { value: 'no', label: '해당 없음' },
  { value: 'yes', label: '해당' },
  { value: 'unknown', label: '모르겠음' },
]
const YES_NO = [
  { value: true, label: '예' },
  { value: false, label: '아니요' },
]



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

</style>

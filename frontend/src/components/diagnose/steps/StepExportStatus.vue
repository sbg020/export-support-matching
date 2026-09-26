<script setup lang="ts">
import { recentYears, useProfileForm } from '@/composables/useProfileForm'
import { formatUsd } from '@/lib/display'
import FormField from '@/components/form/FormField.vue'
import FormFieldset from '@/components/form/FormFieldset.vue'
import NumberInput from '@/components/form/NumberInput.vue'
import YearMonthInput from '@/components/form/YearMonthInput.vue'
import TagInput from '@/components/form/TagInput.vue'

const { profile, errors, fieldId } = useProfileForm()

const years = recentYears(11)

function setNoExport() {
  profile.value.exportUsdLastYear = 0
}
</script>

<template>
  <div class="step-fields">
    <FormField
      v-slot="{ id, describedby, invalid }"
      :id="fieldId('exportUsdLastYear')"
      label="최근 1년 수출액"
      required
      hint="미국 달러(USD)로 입력해 주세요. 0은 '수출 실적 없음'으로 저장되며, 입력하지 않은 것과 구분됩니다."
      :error="errors.exportUsdLastYear"
    >
      <NumberInput
        :id="id"
        v-model="profile.exportUsdLastYear"
        unit="USD"
        :describedby="describedby"
        :invalid="invalid"
      />
      <div class="d-flex flex-wrap align-items-center gap-2 mt-2">
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :aria-pressed="profile.exportUsdLastYear === 0"
          @click="setNoExport"
        >
          수출 실적 없음 (0 USD)
        </button>
        <span v-if="profile.exportUsdLastYear !== null" class="fs-sm text-muted-strong">
          입력한 값: {{ formatUsd(profile.exportUsdLastYear) }}
        </span>
      </div>
    </FormField>

    <FormFieldset
      v-slot="{ describedby }"
      :id="fieldId('exportPeriod')"
      legend="측정 기간"
      required
      hint="위 수출액을 집계한 기간입니다. 예를 들어 최근 12개월이나 지난 회계연도를 선택해 주세요."
    >
      <div class="field-pair">
        <div :id="fieldId('exportPeriodStart')">
          <p class="period-label">시작</p>
          <YearMonthInput
            :id="fieldId('exportPeriodStart-input')"
            v-model="profile.exportPeriodStart"
            label="측정 시작"
            :years="years"
            :describedby="[describedby, errors.exportPeriodStart ? fieldId('exportPeriodStart-error') : null].filter(Boolean).join(' ') || undefined"
            :invalid="Boolean(errors.exportPeriodStart)"
          />
          <p v-if="errors.exportPeriodStart" :id="fieldId('exportPeriodStart-error')" class="form-error">
            {{ errors.exportPeriodStart }}
          </p>
        </div>
        <div :id="fieldId('exportPeriodEnd')">
          <p class="period-label">종료</p>
          <YearMonthInput
            :id="fieldId('exportPeriodEnd-input')"
            v-model="profile.exportPeriodEnd"
            label="측정 종료"
            :years="years"
            :describedby="[describedby, errors.exportPeriodEnd ? fieldId('exportPeriodEnd-error') : null].filter(Boolean).join(' ') || undefined"
            :invalid="Boolean(errors.exportPeriodEnd)"
          />
          <p v-if="errors.exportPeriodEnd" :id="fieldId('exportPeriodEnd-error')" class="form-error">
            {{ errors.exportPeriodEnd }}
          </p>
        </div>
      </div>
    </FormFieldset>

    <FormField
      v-slot="{ id, describedby }"
      :id="fieldId('exportCountries')"
      label="수출 대상 국가"
      optional
      hint="국가 이름을 입력하고 Enter 또는 '추가'를 눌러 주세요. 아직 없으면 비워 두어도 됩니다."
    >
      <TagInput
        :id="id"
        v-model="profile.exportCountries"
        :describedby="describedby"
        item-label="수출 대상 국가"
      />
    </FormField>
  </div>
</template>

<style scoped>
.period-label {
  margin-bottom: 6px;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-text);
}
</style>

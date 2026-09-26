<script setup lang="ts">
import { computed } from 'vue'
import { INDUSTRY_MODE_OPTIONS } from '@/constants/options'
import { recentYears, useProfileForm } from '@/composables/useProfileForm'
import { formatKrwReadable } from '@/lib/display'
import FormField from '@/components/form/FormField.vue'
import FormFieldset from '@/components/form/FormFieldset.vue'
import TextInput from '@/components/form/TextInput.vue'
import NumberInput from '@/components/form/NumberInput.vue'
import SelectInput from '@/components/form/SelectInput.vue'
import ChoiceCards from '@/components/form/ChoiceCards.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'

const { profile, errors, fieldId } = useProfileForm()

const yearOptions = recentYears(11).map((year) => ({ value: year, label: `${year}년` }))

const revenueHint = computed(() => {
  const base = '원 단위로 입력해 주세요. 매출이 없으면 0을 입력하면 됩니다.'
  if (profile.value.revenueKrw === null) return base
  return `${base} 입력한 금액: ${formatKrwReadable(profile.value.revenueKrw)}`
})

function onModeChange() {
  if (profile.value.industryInputMode !== 'ksic') profile.value.ksicCode = null
}
</script>

<template>
  <div class="step-fields">
    <FormFieldset
      v-slot="{ describedby, invalid }"
      :id="fieldId('industryInputMode')"
      legend="업종"
      required
      hint="표준산업분류(KSIC) 코드 또는 업종명 중 아는 방법으로 입력해 주세요."
      :error="errors.industryInputMode"
    >
      <ChoiceCards
        v-model="profile.industryInputMode"
        :name="fieldId('industryInputMode-choice')"
        :options="INDUSTRY_MODE_OPTIONS"
        :columns="3"
        :describedby="describedby"
        :invalid="invalid"
        @update:model-value="onModeChange"
      />
    </FormFieldset>

    <template v-if="profile.industryInputMode === 'ksic'">
      <FormField
        v-slot="{ id, describedby, invalid }"
        :id="fieldId('ksicCode')"
        label="KSIC 코드"
        required
        hint="코드 기준표가 아직 연결되지 않아 자동 검색은 제공하지 않습니다. 사업자등록증명 등에서 확인한 코드를 그대로 입력해 주세요."
        :error="errors.ksicCode"
      >
        <TextInput
          :id="id"
          v-model="profile.ksicCode"
          :describedby="describedby"
          :invalid="invalid"
          :maxlength="6"
        />
      </FormField>
      <FormField v-slot="{ id, describedby }" :id="fieldId('industryName')" label="업종명" optional>
        <TextInput :id="id" v-model="profile.industryName" :describedby="describedby" :maxlength="60" />
      </FormField>
    </template>

    <FormField
      v-else-if="profile.industryInputMode === 'name'"
      v-slot="{ id, describedby, invalid }"
      :id="fieldId('industryName')"
      label="업종명"
      required
      hint="주로 하는 사업을 간단히 적어 주세요. 입력한 내용은 나중에 KSIC 코드 확인에 사용합니다."
      :error="errors.industryName"
    >
      <TextInput
        :id="id"
        v-model="profile.industryName"
        :describedby="describedby"
        :invalid="invalid"
        :maxlength="60"
      />
    </FormField>

    <template v-else-if="profile.industryInputMode === 'unknown'">
      <NoticeBanner tone="neutral">
        업종은 나중에 확인할 항목으로 남겨 둡니다. 확인 전까지 프로필은 '입력 중'으로 표시되며, 자격 판정에
        사용하지 않습니다.
      </NoticeBanner>
      <FormField
        v-slot="{ id, describedby }"
        :id="fieldId('industryName')"
        label="알고 있는 업종 설명"
        optional
      >
        <TextInput :id="id" v-model="profile.industryName" :describedby="describedby" :maxlength="60" />
      </FormField>
    </template>

    <FormField
      v-slot="{ id, describedby, invalid }"
      :id="fieldId('revenueKrw')"
      label="최근 매출액"
      required
      :hint="revenueHint"
      :error="errors.revenueKrw"
    >
      <NumberInput
        :id="id"
        v-model="profile.revenueKrw"
        unit="원"
        :describedby="describedby"
        :invalid="invalid"
      />
    </FormField>

    <FormField
      v-slot="{ id, describedby, invalid }"
      :id="fieldId('revenueYear')"
      label="매출액 기준연도"
      required
      hint="입력한 매출액이 어느 해의 금액인지 선택해 주세요."
      :error="errors.revenueYear"
    >
      <SelectInput
        :id="id"
        v-model="profile.revenueYear"
        :options="yearOptions"
        placeholder="연도를 선택해 주세요"
        :describedby="describedby"
        :invalid="invalid"
      />
    </FormField>
  </div>
</template>

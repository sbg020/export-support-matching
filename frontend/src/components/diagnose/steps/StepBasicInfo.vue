<script setup lang="ts">
import { computed, watch } from 'vue'
import { COMPANY_TYPE_OPTIONS, REGION_OPTIONS } from '@/constants/options'
import { useProfileForm } from '@/composables/useProfileForm'
import { formatBusinessNumber } from '@/lib/display'
import { normalizeBusinessNumber } from '@/lib/profile'
import FormField from '@/components/form/FormField.vue'
import FormFieldset from '@/components/form/FormFieldset.vue'
import TextInput from '@/components/form/TextInput.vue'
import NumberInput from '@/components/form/NumberInput.vue'
import SelectInput from '@/components/form/SelectInput.vue'
import ChoiceCards from '@/components/form/ChoiceCards.vue'

const { profile, errors, fieldId } = useProfileForm()

const factoryOptions = [
  { value: true, label: '있어요', description: '생산 공장을 운영하고 있어요' },
  { value: false, label: '없어요', description: '공장이 없어도 계속 진행할 수 있어요' },
]

const todayMax = computed(() => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
})

// 공장이 없다고 선택하면 공장 소재지 입력값을 지운다.
watch(
  () => profile.value.hasFactory,
  (hasFactory) => {
    if (hasFactory === false) {
      profile.value.factoryRegion = null
      profile.value.factoryDistrict = null
    }
  },
)

function formatBusinessNumberOnBlur() {
  const value = profile.value.businessNumber
  if (value !== null && normalizeBusinessNumber(value).length === 10) {
    profile.value.businessNumber = formatBusinessNumber(value)
  }
}
</script>

<template>
  <div class="step-fields">
    <FormField
      v-slot="{ id, describedby, invalid }"
      :id="fieldId('companyName')"
      label="기업명"
      required
      :error="errors.companyName"
    >
      <TextInput
        :id="id"
        v-model="profile.companyName"
        :describedby="describedby"
        :invalid="invalid"
        autocomplete="organization"
        :maxlength="100"
      />
    </FormField>

    <FormField
      v-slot="{ id, describedby, invalid }"
      :id="fieldId('businessNumber')"
      label="사업자등록번호"
      required
      hint="숫자 10자리의 형식만 확인하며, 실제 등록된 기업인지는 조회하지 않습니다. 보안을 위해 이 기기에 저장하지 않으므로 새로고침하면 다시 입력해야 합니다."
      :error="errors.businessNumber"
    >
      <TextInput
        :id="id"
        v-model="profile.businessNumber"
        :describedby="describedby"
        :invalid="invalid"
        inputmode="numeric"
        placeholder="000-00-00000"
        :maxlength="12"
        @blur="formatBusinessNumberOnBlur"
      />
    </FormField>

    <FormFieldset
      v-slot="{ describedby, invalid }"
      :id="fieldId('companyType')"
      legend="기업 형태"
      required
      :error="errors.companyType"
    >
      <ChoiceCards
        v-model="profile.companyType"
        :name="fieldId('companyType-choice')"
        :options="COMPANY_TYPE_OPTIONS"
        :describedby="describedby"
        :invalid="invalid"
      />
    </FormFieldset>

    <FormField
      v-slot="{ id, describedby, invalid }"
      :id="fieldId('foundedAt')"
      label="설립일"
      required
      hint="사업자등록증의 개업일 또는 법인 설립일을 입력해 주세요."
      :error="errors.foundedAt"
    >
      <TextInput
        :id="id"
        v-model="profile.foundedAt"
        type="date"
        :max="todayMax"
        :describedby="describedby"
        :invalid="invalid"
      />
    </FormField>

    <div class="field-pair">
      <FormField
        v-slot="{ id, describedby, invalid }"
        :id="fieldId('hqRegion')"
        label="본사 소재지 (시·도)"
        required
        :error="errors.hqRegion"
      >
        <SelectInput
          :id="id"
          v-model="profile.hqRegion"
          :options="REGION_OPTIONS"
          :describedby="describedby"
          :invalid="invalid"
        />
      </FormField>
      <FormField v-slot="{ id, describedby }" :id="fieldId('hqDistrict')" label="본사 시·군·구" optional>
        <TextInput :id="id" v-model="profile.hqDistrict" :describedby="describedby" :maxlength="40" />
      </FormField>
    </div>

    <FormFieldset
      v-slot="{ describedby, invalid }"
      :id="fieldId('hasFactory')"
      legend="공장이 있나요?"
      required
      :error="errors.hasFactory"
    >
      <ChoiceCards
        v-model="profile.hasFactory"
        :name="fieldId('hasFactory-choice')"
        :options="factoryOptions"
        :describedby="describedby"
        :invalid="invalid"
      />
    </FormFieldset>

    <div v-if="profile.hasFactory" class="field-pair">
      <FormField
        v-slot="{ id, describedby, invalid }"
        :id="fieldId('factoryRegion')"
        label="공장 소재지 (시·도)"
        required
        :error="errors.factoryRegion"
      >
        <SelectInput
          :id="id"
          v-model="profile.factoryRegion"
          :options="REGION_OPTIONS"
          :describedby="describedby"
          :invalid="invalid"
        />
      </FormField>
      <FormField v-slot="{ id, describedby }" :id="fieldId('factoryDistrict')" label="공장 시·군·구" optional>
        <TextInput :id="id" v-model="profile.factoryDistrict" :describedby="describedby" :maxlength="40" />
      </FormField>
    </div>

    <FormField
      v-slot="{ id, describedby, invalid }"
      :id="fieldId('employeeCount')"
      label="종업원 수"
      optional
      hint="상시 근로자 수를 입력해 주세요. 모르면 비워 두어도 됩니다."
      :error="errors.employeeCount"
    >
      <NumberInput
        :id="id"
        v-model="profile.employeeCount"
        unit="명"
        :max-digits="7"
        :describedby="describedby"
        :invalid="invalid"
      />
    </FormField>
  </div>
</template>

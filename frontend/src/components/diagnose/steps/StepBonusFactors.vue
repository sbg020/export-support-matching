<script setup lang="ts">
import { watch } from 'vue'
import { CERTIFICATION_OPTIONS, HOLDING_STATUS_OPTIONS, IP_OPTIONS } from '@/constants/options'
import { useProfileForm } from '@/composables/useProfileForm'
import FormField from '@/components/form/FormField.vue'
import FormFieldset from '@/components/form/FormFieldset.vue'
import TextInput from '@/components/form/TextInput.vue'
import ChoiceCards from '@/components/form/ChoiceCards.vue'
import CheckCards from '@/components/form/CheckCards.vue'

const { profile, errors, fieldId } = useProfileForm()

// '보유하지 않아요' 또는 '선택 해제'로 바꾸면 선택한 항목을 지운다.
watch(
  () => profile.value.certificationStatus,
  (status) => {
    if (status !== 'has') {
      profile.value.certifications = []
      profile.value.certificationOther = null
    }
  },
)

watch(
  () => profile.value.ipStatus,
  (status) => {
    if (status !== 'has') {
      profile.value.ipTypes = []
      profile.value.ipOther = null
    }
  },
)
</script>

<template>
  <div class="step-fields">
    <p class="step-note">
      이 단계는 선택 입력입니다. 고르지 않은 항목은 '보유하지 않음'이 아니라 '아직 입력하지 않음'으로 남습니다.
    </p>

    <FormFieldset
      v-slot="{ describedby }"
      :id="fieldId('certificationStatus')"
      legend="기업 인증"
      optional
    >
      <ChoiceCards
        v-model="profile.certificationStatus"
        :name="fieldId('certificationStatus-choice')"
        :options="HOLDING_STATUS_OPTIONS"
        :describedby="describedby"
        clearable
      />
    </FormFieldset>

    <template v-if="profile.certificationStatus === 'has'">
      <FormFieldset
        v-slot="{ describedby, invalid }"
        :id="fieldId('certifications')"
        legend="보유한 인증"
        required
        :error="errors.certifications"
      >
        <CheckCards
          v-model="profile.certifications"
          :name="fieldId('certifications-choice')"
          :options="CERTIFICATION_OPTIONS"
          :describedby="describedby"
          :invalid="invalid"
        />
      </FormFieldset>
      <FormField
        v-slot="{ id, describedby }"
        :id="fieldId('certificationOther')"
        label="그 밖의 인증"
        optional
        hint="목록에 없는 인증이 있으면 적어 주세요."
      >
        <TextInput :id="id" v-model="profile.certificationOther" :describedby="describedby" :maxlength="80" />
      </FormField>
    </template>

    <FormFieldset v-slot="{ describedby }" :id="fieldId('ipStatus')" legend="지식재산권" optional>
      <ChoiceCards
        v-model="profile.ipStatus"
        :name="fieldId('ipStatus-choice')"
        :options="HOLDING_STATUS_OPTIONS"
        :describedby="describedby"
        clearable
      />
    </FormFieldset>

    <template v-if="profile.ipStatus === 'has'">
      <FormFieldset
        v-slot="{ describedby, invalid }"
        :id="fieldId('ipTypes')"
        legend="보유한 지식재산권"
        required
        :error="errors.ipTypes"
      >
        <CheckCards
          v-model="profile.ipTypes"
          :name="fieldId('ipTypes-choice')"
          :options="IP_OPTIONS"
          :describedby="describedby"
          :invalid="invalid"
        />
      </FormFieldset>
      <FormField
        v-slot="{ id, describedby }"
        :id="fieldId('ipOther')"
        label="그 밖의 지식재산권"
        optional
        hint="목록에 없는 권리가 있으면 적어 주세요."
      >
        <TextInput :id="id" v-model="profile.ipOther" :describedby="describedby" :maxlength="80" />
      </FormField>
    </template>
  </div>
</template>

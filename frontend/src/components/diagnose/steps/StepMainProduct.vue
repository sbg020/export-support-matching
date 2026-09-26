<script setup lang="ts">
import { HS_STATUS_OPTIONS } from '@/constants/options'
import { useProfileForm } from '@/composables/useProfileForm'
import FormField from '@/components/form/FormField.vue'
import FormFieldset from '@/components/form/FormFieldset.vue'
import TextInput from '@/components/form/TextInput.vue'
import ChoiceCards from '@/components/form/ChoiceCards.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'

const { profile, errors, fieldId } = useProfileForm()

function onStatusChange() {
  if (profile.value.hsCodeStatus === 'unknown') profile.value.hsCode = null
}
</script>

<template>
  <div class="step-fields">
    <FormField
      v-slot="{ id, describedby, invalid }"
      :id="fieldId('productName')"
      label="주력 제품명"
      required
      hint="가장 많이 수출하거나 수출하려는 제품을 적어 주세요."
      :error="errors.productName"
    >
      <TextInput
        :id="id"
        v-model="profile.productName"
        :describedby="describedby"
        :invalid="invalid"
        :maxlength="80"
      />
    </FormField>

    <FormFieldset
      v-slot="{ describedby, invalid }"
      :id="fieldId('hsCodeStatus')"
      legend="HS 코드(품목 분류 번호)"
      required
      hint="수출할 때 제품을 분류하는 번호입니다. 모르면 '잘 모르겠어요'를 선택하고 나중에 확인할 수 있어요."
      :error="errors.hsCodeStatus"
    >
      <ChoiceCards
        v-model="profile.hsCodeStatus"
        :name="fieldId('hsCodeStatus-choice')"
        :options="HS_STATUS_OPTIONS"
        :columns="3"
        :describedby="describedby"
        :invalid="invalid"
        @update:model-value="onStatusChange"
      />
    </FormFieldset>

    <FormField
      v-if="profile.hsCodeStatus === 'confirmed' || profile.hsCodeStatus === 'provisional'"
      v-slot="{ id, describedby, invalid }"
      :id="fieldId('hsCode')"
      :label="profile.hsCodeStatus === 'provisional' ? 'HS 코드 (임시)' : 'HS 코드'"
      required
      hint="숫자 4~10자리로 입력해 주세요. 점(.)과 하이픈(-)은 빼도 됩니다. 코드 기준표가 연결되지 않아 자동 검색은 제공하지 않습니다."
      :error="errors.hsCode"
    >
      <TextInput
        :id="id"
        v-model="profile.hsCode"
        inputmode="numeric"
        :describedby="describedby"
        :invalid="invalid"
        :maxlength="13"
      />
    </FormField>

    <NoticeBanner v-if="profile.hsCodeStatus === 'provisional' || profile.hsCodeStatus === 'unknown'" tone="neutral">
      HS 코드는 나중에 확인할 항목으로 남겨 둡니다. 확인 전까지 프로필은 '입력 중'으로 표시되며, 자격 판정에
      사용하지 않습니다.
    </NoticeBanner>
  </div>
</template>

<script setup lang="ts">
import { INTEREST_AREA_OPTIONS } from '@/constants/options'
import { useProfileForm } from '@/composables/useProfileForm'
import type { InterestArea } from '@/types/profile'
import FormFieldset from '@/components/form/FormFieldset.vue'
import CheckCards from '@/components/form/CheckCards.vue'

const { profile, errors, fieldId } = useProfileForm()

function onAreasChange(areas: InterestArea[]) {
  if (areas.length > 0) profile.value.interestUnsure = false
}

function onUnsureChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  profile.value.interestUnsure = checked
  if (checked) profile.value.interestAreas = []
}
</script>

<template>
  <div class="step-fields">
    <FormFieldset
      v-slot="{ describedby, invalid }"
      :id="fieldId('interestAreas')"
      legend="도움받고 싶은 분야"
      required
      hint="여러 개를 고를 수 있습니다. 잘 모르겠다면 아래의 '잘 모르겠어요'를 선택해 주세요."
      :error="errors.interestAreas"
    >
      <CheckCards
        v-model="profile.interestAreas"
        :name="fieldId('interestAreas-choice')"
        :options="INTEREST_AREA_OPTIONS"
        :describedby="describedby"
        :invalid="invalid"
        @update:model-value="onAreasChange"
      />
      <label class="choice-card unsure-card mt-2" :class="{ 'is-checked': profile.interestUnsure }">
        <input
          :id="fieldId('interestUnsure')"
          type="checkbox"
          class="form-check-input"
          :checked="profile.interestUnsure"
          :aria-describedby="describedby"
          @change="onUnsureChange"
        />
        <span class="choice-card__text">
          <span class="choice-card__label">잘 모르겠어요</span>
          <span class="choice-card__description">
            어떤 지원이 필요한지 아직 정하지 못했어요. 선택하면 위에서 고른 분야는 해제됩니다.
          </span>
        </span>
      </label>
    </FormFieldset>
  </div>
</template>

<style scoped>
.unsure-card {
  border-style: dashed;
}
</style>

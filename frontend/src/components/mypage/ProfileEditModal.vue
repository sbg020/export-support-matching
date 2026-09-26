<script setup lang="ts">
/**
 * 프로필 단계별 수정 모달. 저장소 값의 복사본을 편집하고, '저장'을 누르면 검증 후 반영한다.
 */
import { computed, nextTick, ref, watch, type Component } from 'vue'
import AppModal from '@/components/common/AppModal.vue'
import StepBasicInfo from '@/components/diagnose/steps/StepBasicInfo.vue'
import StepCompanySize from '@/components/diagnose/steps/StepCompanySize.vue'
import StepExportStatus from '@/components/diagnose/steps/StepExportStatus.vue'
import StepMainProduct from '@/components/diagnose/steps/StepMainProduct.vue'
import StepBonusFactors from '@/components/diagnose/steps/StepBonusFactors.vue'
import StepInterests from '@/components/diagnose/steps/StepInterests.vue'
import { PROFILE_STEPS } from '@/constants/options'
import { focusProfileField, provideProfileForm } from '@/composables/useProfileForm'
import { cloneProfile, hasErrors, validateStep, type FieldErrors } from '@/lib/profile'
import { useProfileStore } from '@/stores/profileStore'
import { useToast } from '@/stores/toastStore'
import type { CompanyProfile, ProfileField, ProfileStepId } from '@/types/profile'

const STEP_COMPONENTS: Record<ProfileStepId, Component> = {
  1: StepBasicInfo,
  2: StepCompanySize,
  3: StepExportStatus,
  4: StepMainProduct,
  5: StepBonusFactors,
  6: StepInterests,
}
const ID_PREFIX = 'pe'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ step: ProfileStepId }>()

const store = useProfileStore()
const toast = useToast()
const draft = ref<CompanyProfile>(cloneProfile(store.state.profile))
const errors = ref<FieldErrors>({})
provideProfileForm({ profile: draft, errors, idPrefix: ID_PREFIX })

const title = computed(() => {
  const def = PROFILE_STEPS.find((s) => s.id === props.step)
  return `${props.step}단계 · ${def?.title ?? ''} 수정`
})
const description = computed(() => PROFILE_STEPS.find((s) => s.id === props.step)?.description)

watch(open, (isOpen) => {
  if (isOpen) {
    draft.value = cloneProfile(store.state.profile)
    errors.value = {}
  }
})

async function save() {
  const result = validateStep(props.step, draft.value, { requireSessionFields: true })
  if (hasErrors(result)) {
    errors.value = result
    await nextTick()
    const first = Object.keys(result)[0] as ProfileField | undefined
    if (first) focusProfileField(ID_PREFIX, first)
    return
  }
  store.replaceProfile(draft.value)
  store.clearStepSkipped(props.step)
  const saved = store.saveToDevice()
  toast.show(saved ? '변경한 내용을 이 기기에 저장했습니다.' : '화면에는 반영했지만 이 기기에 저장하지 못했습니다.', saved ? 'success' : 'warning')
  open.value = false
}
</script>

<template>
  <AppModal v-model:open="open" :title="title" :description="description" size="lg">
    <p v-if="Object.keys(errors).length > 0" class="modal-error" role="alert">
      입력이 필요한 항목이 {{ Object.keys(errors).length }}개 있습니다. 아래 표시된 항목을 확인해 주세요.
    </p>
    <form id="profile-edit-form" novalidate @submit.prevent="save">
      <component :is="STEP_COMPONENTS[step]" />
    </form>
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="open = false">취소</button>
      <button type="submit" form="profile-edit-form" class="btn btn-primary">저장</button>
    </template>
  </AppModal>
</template>

<style scoped>
.modal-error {
  margin-bottom: var(--space-4);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  background: var(--color-danger-soft);
  color: var(--color-danger-strong);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}
</style>

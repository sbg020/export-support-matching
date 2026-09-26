<script setup lang="ts">
import { computed, ref } from 'vue'
import { IconForms, IconTrash, IconUserCircle } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import AppModal from '@/components/common/AppModal.vue'
import LocalModeNotice from '@/components/mypage/LocalModeNotice.vue'
import ProfileEditModal from '@/components/mypage/ProfileEditModal.vue'
import ProfileSummary from '@/components/diagnose/ProfileSummary.vue'
import ProfileStatusBadge from '@/components/diagnose/ProfileStatusBadge.vue'
import { useProfileStore } from '@/stores/profileStore'
import { useToast } from '@/stores/toastStore'
import { formatDateTime } from '@/lib/display'
import type { ProfileStepId } from '@/types/profile'

const store = useProfileStore()
const toast = useToast()
const assessment = computed(() => store.assessment.value)

const editOpen = ref(false)
const editStep = ref<ProfileStepId>(1)
const deleteOpen = ref(false)

function openEdit(step: ProfileStepId) {
  editStep.value = step
  editOpen.value = true
}

function deleteProfile() {
  store.clearAll()
  deleteOpen.value = false
  toast.show('이 기기에 저장된 기업정보를 삭제했습니다.', 'info')
}
</script>

<template>
  <div class="page">
    <PageHeader title="기업 프로필" description="입력한 기업정보를 확인하고 단계별로 고칠 수 있습니다. 입력하지 않은 항목은 '-'로 표시됩니다.">
      <template #actions>
        <RouterLink :to="{ name: 'diagnose-input' }" class="btn btn-secondary">
          <IconForms :size="18" stroke-width="2" aria-hidden="true" />
          입력 화면에서 수정
        </RouterLink>
        <button
          v-if="assessment.status !== 'empty'"
          type="button"
          class="btn btn-danger-outline"
          @click="deleteOpen = true"
        >
          <IconTrash :size="18" stroke-width="2" aria-hidden="true" />
          이 기기에서 삭제
        </button>
      </template>
    </PageHeader>

    <div class="stack">
      <LocalModeNotice />
      <NoticeBanner v-if="!store.state.storageAvailable" tone="warning" title="브라우저 저장소를 사용할 수 없습니다">
        사생활 보호 모드 등으로 저장소가 차단되어, 입력한 정보는 이 화면을 떠나면 사라질 수 있습니다.
      </NoticeBanner>

      <div class="grid-12">
        <SectionCard
          class="col-span-12 lg-span-8"
          title="입력한 기업정보"
          heading-id="profile-detail-title"
          :icon="IconUserCircle"
        >
          <EmptyState
            v-if="assessment.status === 'empty'"
            :icon="IconForms"
            title="아직 입력한 기업정보가 없습니다"
            description="기업정보 입력 화면에서 6단계로 입력할 수 있습니다. 각 단계는 아래에서 바로 입력·수정할 수도 있습니다."
            class="mb-4"
            compact
          >
            <template #actions>
              <RouterLink :to="{ name: 'diagnose-input' }" class="btn btn-primary">기업정보 입력하기</RouterLink>
            </template>
          </EmptyState>
          <ProfileSummary :profile="store.state.profile" editable @edit="openEdit" />
        </SectionCard>

        <div class="col-span-12 lg-span-4 stack">
          <SectionCard title="저장 상태" heading-id="profile-status-title">
            <InfoList compact>
              <InfoRow label="프로필 상태">
                <span><ProfileStatusBadge :status="assessment.status" size="sm" /></span>
              </InfoRow>
              <InfoRow label="저장 위치" value="이 브라우저" />
              <InfoRow label="서버 동기화" value="준비 중" />
              <InfoRow label="마지막 저장" :value="store.state.meta.lastSavedAt" :format="formatDateTime" />
              <InfoRow
                label="빠진 필수 항목"
                :value="assessment.status === 'empty' ? null : `${assessment.missing.length}개`"
              />
              <InfoRow
                label="확인이 필요한 항목"
                :value="assessment.status === 'empty' ? null : `${assessment.needsVerification.length}개`"
              />
            </InfoList>
          </SectionCard>
          <SectionCard title="개인정보 보호" heading-id="profile-privacy-title">
            <ul class="privacy-list">
              <li>입력한 정보는 서버로 전송되지 않습니다.</li>
              <li>사업자등록번호는 이 기기에도 저장하지 않으며, 새로고침하면 사라집니다.</li>
              <li>서류 원본은 업로드·저장하지 않습니다.</li>
              <li>'이 기기에서 삭제'로 저장된 기업정보를 언제든 지울 수 있습니다.</li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>

    <ProfileEditModal v-model:open="editOpen" :step="editStep" />

    <AppModal v-model:open="deleteOpen" title="기업정보를 삭제할까요?" size="sm">
      <p>이 브라우저에 저장된 기업정보를 모두 삭제합니다. 삭제한 정보는 되돌릴 수 없습니다.</p>
      <template #footer>
        <button type="button" class="btn btn-secondary" @click="deleteOpen = false">취소</button>
        <button type="button" class="btn btn-danger" @click="deleteProfile">삭제하기</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.privacy-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--fs-sm);
}
</style>

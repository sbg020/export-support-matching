<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconDeviceFloppy,
  IconPlayerSkipForward,
  IconRefresh,
} from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import AppModal from '@/components/common/AppModal.vue'
import StepProgress from '@/components/diagnose/StepProgress.vue'
import ProfileStatusBadge from '@/components/diagnose/ProfileStatusBadge.vue'
import StepBasicInfo from '@/components/diagnose/steps/StepBasicInfo.vue'
import StepCompanySize from '@/components/diagnose/steps/StepCompanySize.vue'
import StepExportStatus from '@/components/diagnose/steps/StepExportStatus.vue'
import StepMainProduct from '@/components/diagnose/steps/StepMainProduct.vue'
import StepBonusFactors from '@/components/diagnose/steps/StepBonusFactors.vue'
import StepInterests from '@/components/diagnose/steps/StepInterests.vue'
import { PROFILE_STEPS } from '@/constants/options'
import { focusProfileField, provideProfileForm } from '@/composables/useProfileForm'
import { useProfileStore } from '@/stores/profileStore'
import { useToast } from '@/stores/toastStore'
import {
  PROFILE_STEP_IDS,
  hasErrors,
  validateAll,
  validateStep,
  type FieldErrors,
} from '@/lib/profile'
import { getStepStatus, type StepStatus } from '@/lib/profileSteps'
import { formatDateTime } from '@/lib/display'
import type { ProfileField, ProfileStepId } from '@/types/profile'

const STEP_COMPONENTS: Record<ProfileStepId, Component> = {
  1: StepBasicInfo,
  2: StepCompanySize,
  3: StepExportStatus,
  4: StepMainProduct,
  5: StepBonusFactors,
  6: StepInterests,
}

const ID_PREFIX = 'pf'

const route = useRoute()
const router = useRouter()
const store = useProfileStore()
const toast = useToast()

const errors = ref<FieldErrors>({})
provideProfileForm({ profile: toRef(store.state, 'profile'), errors, idPrefix: ID_PREFIX })

function parseStep(value: unknown): ProfileStepId {
  const raw = Array.isArray(value) ? value[0] : value
  const n = Number(raw)
  return (PROFILE_STEP_IDS as number[]).includes(n) ? (n as ProfileStepId) : 1
}

const currentStep = computed(() => parseStep(route.query.step))
const stepDef = computed(() => PROFILE_STEPS.find((s) => s.id === currentStep.value) ?? PROFILE_STEPS[0]!)
const isFirst = computed(() => currentStep.value === 1)
const isLast = computed(() => currentStep.value === 6)

const statuses = computed(
  () =>
    Object.fromEntries(
      PROFILE_STEP_IDS.map((step) => [step, getStepStatus(step, store.state.profile, store.state.meta)]),
    ) as Record<ProfileStepId, StepStatus>,
)

const errorList = computed(() => Object.entries(errors.value) as [ProfileField, string][])

interface CompletionIssue {
  step: ProfileStepId
  title: string
  messages: string[]
}
const completionIssues = ref<CompletionIssue[]>([])

const stepHeading = ref<HTMLElement | null>(null)
const errorSummary = ref<HTMLElement | null>(null)
const completionPanel = ref<HTMLElement | null>(null)
const resetOpen = ref(false)

const skippedTitles = computed(() =>
  store.state.meta.skippedSteps
    .map((step) => PROFILE_STEPS.find((s) => s.id === step)?.title)
    .filter((title): title is string => Boolean(title)),
)

watch(currentStep, async () => {
  errors.value = {}
  completionIssues.value = []
  await nextTick()
  stepHeading.value?.focus()
})

function goToStep(step: ProfileStepId) {
  void router.push({ query: { ...route.query, step: String(step) } })
}

function persist(): boolean {
  const ok = store.saveToDevice()
  if (!ok) {
    toast.show(
      '브라우저 저장소를 사용할 수 없어 이 기기에 저장하지 못했습니다. 입력값은 이 화면을 떠나기 전까지만 유지됩니다.',
      'warning',
      6000,
    )
  }
  return ok
}

async function showErrors(next: FieldErrors) {
  errors.value = next
  await nextTick()
  errorSummary.value?.focus()
}

function validateCurrent(): boolean {
  const result = validateStep(currentStep.value, store.state.profile, { requireSessionFields: true })
  if (hasErrors(result)) {
    void showErrors(result)
    return false
  }
  errors.value = {}
  return true
}

function next() {
  if (!validateCurrent()) return
  store.clearStepSkipped(currentStep.value)
  persist()
  goToStep((currentStep.value + 1) as ProfileStepId)
}

function prev() {
  if (isFirst.value) return
  goToStep((currentStep.value - 1) as ProfileStepId)
}

function skip() {
  store.markStepSkipped(currentStep.value)
  persist()
  toast.show(`'${stepDef.value.title}' 단계를 건너뛰었습니다. 나중에 다시 입력할 수 있어요.`, 'info')
  goToStep((currentStep.value + 1) as ProfileStepId)
}

function saveDraft() {
  if (persist()) toast.show('입력한 내용을 이 기기에 임시 저장했습니다.')
}

async function complete() {
  const all = validateAll(store.state.profile, { requireSessionFields: true })
  if (hasErrors(all[6])) {
    await showErrors(all[6])
    return
  }
  errors.value = {}
  store.clearStepSkipped(6)
  const issues = PROFILE_STEP_IDS.filter((step) => step !== 6 && hasErrors(all[step])).map((step) => ({
    step,
    title: PROFILE_STEPS.find((s) => s.id === step)?.title ?? `${step}단계`,
    messages: Object.values(all[step]),
  }))
  if (issues.length > 0) {
    completionIssues.value = issues
    persist()
    await nextTick()
    completionPanel.value?.focus()
    return
  }
  PROFILE_STEP_IDS.forEach((step) => store.clearStepSkipped(step))
  persist()
  toast.show('기업정보 입력을 마쳤습니다.')
  void router.push({ name: 'diagnose-result' })
}

function viewResultInProgress() {
  persist()
  void router.push({ name: 'diagnose-result' })
}

function onSubmit() {
  if (isLast.value) void complete()
  else next()
}

function resetAll() {
  store.clearAll()
  errors.value = {}
  completionIssues.value = []
  resetOpen.value = false
  toast.show('입력한 기업정보를 모두 지웠습니다.', 'info')
  if (currentStep.value !== 1) goToStep(1)
}
</script>

<template>
  <div class="page">
    <PageHeader
      title="기업정보 입력"
      description="기업 정보를 입력하면 공고가 준비된 후 신청자격과 지원내용을 한눈에 확인할 수 있습니다."
    />

    <div class="grid-12">
      <div class="col-span-12 lg-span-8 stack">
        <NoticeBanner tone="privacy" title="입력 정보는 이 기기에만 저장됩니다">
          서버로 전송하지 않으며, '다음'·'건너뛰기'·'임시 저장'을 누를 때 이 브라우저에 저장합니다. 사업자등록번호는
          저장하지 않습니다.
        </NoticeBanner>

        <form class="surface-card step-form" novalidate @submit.prevent="onSubmit">
          <div class="step-form__progress">
            <StepProgress
              :steps="PROFILE_STEPS"
              :current="currentStep"
              :statuses="statuses"
              @select="goToStep"
            />
          </div>

          <div class="step-form__body">
            <header class="step-form__header">
              <h2 ref="stepHeading" class="step-form__title" tabindex="-1">
                <span class="visually-hidden">{{ currentStep }}단계: </span>{{ stepDef.title }}
                <span v-if="stepDef.optional" class="tag-optional">선택 단계</span>
              </h2>
              <p class="step-form__description">{{ stepDef.description }}</p>
            </header>

            <div
              v-if="errorList.length > 0"
              ref="errorSummary"
              class="error-summary"
              role="alert"
              tabindex="-1"
            >
              <p class="error-summary__title">
                <IconAlertCircle :size="18" stroke-width="2" aria-hidden="true" />
                확인이 필요한 항목이 {{ errorList.length }}개 있습니다.
              </p>
              <ul class="error-summary__list">
                <li v-for="[field, message] in errorList" :key="field">
                  <button type="button" class="error-summary__link" @click="focusProfileField(ID_PREFIX, field)">
                    {{ message }}
                  </button>
                </li>
              </ul>
            </div>

            <component :is="STEP_COMPONENTS[currentStep]" />

            <div
              v-if="completionIssues.length > 0"
              ref="completionPanel"
              class="completion-panel"
              role="alert"
              tabindex="-1"
            >
              <p class="completion-panel__title">아직 입력하지 않은 필수 항목이 있습니다.</p>
              <p class="completion-panel__text">
                아래 단계를 마저 입력하면 '입력 완료'가 됩니다. 지금 진단 화면을 보면 프로필은 '입력 중'으로 표시되며,
                완료된 자격 판정에 사용하지 않습니다.
              </p>
              <ul class="completion-panel__list">
                <li v-for="issue in completionIssues" :key="issue.step">
                  <div>
                    <p class="fw-semibold text-heading mb-1">{{ issue.step }}단계 · {{ issue.title }}</p>
                    <ul class="completion-panel__messages">
                      <li v-for="message in issue.messages" :key="message">{{ message }}</li>
                    </ul>
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" @click="goToStep(issue.step)">
                    이 단계 입력하기
                  </button>
                </li>
              </ul>
              <button type="button" class="btn btn-outline-primary" @click="viewResultInProgress">
                '입력 중' 상태로 진단 화면 보기
              </button>
            </div>
          </div>

          <footer class="step-form__footer">
            <button v-if="!isFirst" type="button" class="btn btn-secondary" @click="prev">
              <IconArrowLeft :size="18" stroke-width="2" aria-hidden="true" />
              이전
            </button>
            <div class="step-form__footer-right">
              <button type="button" class="btn btn-ghost" @click="saveDraft">
                <IconDeviceFloppy :size="18" stroke-width="2" aria-hidden="true" />
                임시 저장
              </button>
              <button v-if="!isLast" type="button" class="btn btn-secondary" @click="skip">
                <IconPlayerSkipForward :size="18" stroke-width="2" aria-hidden="true" />
                건너뛰기
              </button>
              <button v-if="!isLast" type="submit" class="btn btn-primary step-form__primary">
                다음
                <IconArrowRight :size="18" stroke-width="2" aria-hidden="true" />
              </button>
              <button v-else type="submit" class="btn btn-primary step-form__primary">
                <IconCheck :size="18" stroke-width="2" aria-hidden="true" />
                입력 완료
              </button>
            </div>
          </footer>
        </form>
      </div>

      <aside class="col-span-12 lg-span-4 stack" aria-label="입력 현황과 도움말">
        <SectionCard title="입력 현황" heading-id="input-status-title">
          <InfoList compact>
            <InfoRow label="프로필 상태">
              <span><ProfileStatusBadge :status="store.assessment.value.status" size="sm" /></span>
            </InfoRow>
            <InfoRow label="확인이 필요한 항목">
              <ul v-if="store.assessment.value.needsVerification.length > 0" class="list-plain fs-sm">
                <li v-for="issue in store.assessment.value.needsVerification" :key="issue.field">
                  {{ issue.message }}
                </li>
              </ul>
              <span v-else class="value-missing">없음</span>
            </InfoRow>
            <InfoRow label="건너뛴 단계">
              <span v-if="skippedTitles.length > 0">{{ skippedTitles.join(', ') }}</span>
              <span v-else class="value-missing">없음</span>
            </InfoRow>
            <InfoRow label="마지막 저장" :value="store.state.meta.lastSavedAt" :format="formatDateTime" />
          </InfoList>
          <p class="fs-sm text-muted-strong mt-3 mb-0">
            '입력 중'과 '입력 완료'는 입력 진행 상태이며, 지원사업 신청 자격 판정이 아닙니다.
          </p>
          <template #footer>
            <button type="button" class="btn btn-danger-outline btn-sm" @click="resetOpen = true">
              <IconRefresh :size="16" stroke-width="2" aria-hidden="true" />
              처음부터 다시 입력
            </button>
          </template>
        </SectionCard>

        <SectionCard title="코드를 모를 때" heading-id="code-help-title">
          <ul class="help-list">
            <li>
              <strong>업종(KSIC) 코드</strong>를 모르면 업종명으로 입력하거나 '잘 모르겠어요'를 선택하세요.
            </li>
            <li>
              <strong>HS 코드</strong>는 대략 아는 번호를 임시로 입력하거나 '잘 모르겠어요'로 남겨 둘 수 있습니다.
            </li>
            <li>미확정 코드는 '확인이 필요한 항목'으로 남고, 프로필은 '입력 중'으로 표시됩니다.</li>
            <li>코드 기준표가 아직 연결되지 않아 자동 검색은 제공하지 않습니다.</li>
          </ul>
        </SectionCard>
      </aside>
    </div>

    <AppModal v-model:open="resetOpen" title="처음부터 다시 입력할까요?" size="sm">
      <p>이 기기에 저장된 기업정보와 지금 입력 중인 내용을 모두 지웁니다. 지운 내용은 되돌릴 수 없습니다.</p>
      <template #footer>
        <button type="button" class="btn btn-secondary" @click="resetOpen = false">취소</button>
        <button type="button" class="btn btn-danger" @click="resetAll">모두 지우기</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.step-form {
  display: flex;
  flex-direction: column;
}

.step-form__progress {
  padding: var(--card-padding);
  border-bottom: 1px solid var(--color-border);
}

.step-form__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--card-padding);
}

.step-form__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--fs-xl);
}

.step-form__description {
  margin-top: 6px;
  color: var(--color-text);
}

.step-form__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--card-padding);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.step-form__footer-right {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-left: auto;
}

.error-summary,
.completion-panel {
  padding: var(--space-4);
  border: 1px solid #f7c3c4;
  border-left: 4px solid var(--color-danger-strong);
  border-radius: var(--radius-md);
  background: var(--color-danger-soft);
}

.completion-panel {
  border-color: #fbdca5;
  border-left-color: var(--color-warning-strong);
  background: var(--color-warning-soft);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
}

.error-summary:focus,
.completion-panel:focus {
  outline: 2px solid var(--color-primary-strong);
  outline-offset: 2px;
}

.error-summary__title,
.completion-panel__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.error-summary__list {
  margin: var(--space-2) 0 0;
  padding-left: var(--space-5);
}

.error-summary__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-danger-strong);
  font-weight: var(--fw-medium);
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.completion-panel__text {
  font-size: var(--fs-sm);
}

.completion-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.completion-panel__list > li {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.completion-panel__messages {
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--fs-sm);
}

.help-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--fs-sm);
}

.help-list strong {
  color: var(--color-heading);
}

@media (max-width: 575.98px) {
  .step-form__footer-right {
    width: 100%;
    margin-left: 0;
  }
  .step-form__primary {
    flex: 1 1 100%;
    order: -1;
  }
}
</style>

<script setup lang="ts">
/**
 * 공고 상세. 공고가 조회되지 않아도 상세 화면의 틀과 '-' 슬롯을 보여 주고,
 * 공고가 필요한 동작(신청·원문 보기·서류 체크·저장·비교)은 이유와 함께 비활성화한다.
 * 테스트 데이터(검수 전 초안)일 때는 출처·기준일과 '초안 기준'을 함께 보여 준다 (REVISION_02 §11).
 * '비교에 추가'는 화면을 이동하지 않고 선택만 바꾼다. 하단 비교 바에서 비교 영역으로 간다.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import {
  IconArrowLeft,
  IconBookmark,
  IconChecklist,
  IconCircleCheck,
  IconCircleX,
  IconExternalLink,
  IconFileText,
  IconHelpCircle,
  IconLayoutColumns,
  IconListDetails,
  IconScale,
  IconSend,
  IconTargetArrow,
} from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import DataValue from '@/components/common/DataValue.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ActionButton from '@/components/common/ActionButton.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import DataSourceNotice from '@/components/common/DataSourceNotice.vue'
import DraftTag from '@/components/common/DraftTag.vue'
import EligibilityBadge from '@/components/programs/EligibilityBadge.vue'
import EligibilityConditions from '@/components/programs/EligibilityConditions.vue'
import FitBreakdownTable from '@/components/programs/FitBreakdownTable.vue'
import CategoryChips from '@/components/programs/CategoryChips.vue'
import DocumentChecklist from '@/components/programs/DocumentChecklist.vue'
import OpportunityCostGrid from '@/components/programs/OpportunityCostGrid.vue'
import ProgramReviewsSection from '@/components/programs/ProgramReviewsSection.vue'
import CompareDock from '@/components/programs/CompareDock.vue'
import { programRepository } from '@/repositories'
import { viewEventSink } from '@/repositories/viewEventSink'
import { useApplicationStore } from '@/stores/applicationStore'
import { useAuth } from '@/stores/authStore'
import { useToast } from '@/stores/toastStore'
import { useSelfChecks } from '@/stores/selfCheckStore'
import { compareToggleMessage, useCompareSelection } from '@/composables/useCompareSelection'
import { useProgramEvaluations } from '@/composables/useProgramEvaluations'
import { formatDate } from '@/lib/display'
import {
  agencyTypeText,
  amountsText,
  applyPeriodText,
  dataStateText,
  exportStageText,
  programTitleText,
  receptionStatusWithBasisText,
  regionsText,
  selfPaymentText,
  sourceUnavailableReason,
  supportAreasLabelText,
  supportPhasesText,
  supportTypesWithNoteText,
} from '@/lib/programDisplay'
import type { Program } from '@/types/program'
import type { LoadStatus } from '@/composables/useProgramList'

const props = defineProps<{ id: string }>()

const route = useRoute()
const router = useRouter()
const selection = useCompareSelection()
const applications = useApplicationStore()
const auth = useAuth()
const toast = useToast()
const selfChecks = useSelfChecks()
const evaluation = useProgramEvaluations()

/** 들어온 화면(from)으로 돌아가는 '목록으로' 링크. 없으면 전체 공고 */
const backLink = computed<{ to: RouteLocationRaw; label: string }>(() => {
  if (route.query.from === 'recommended') return { to: { name: 'programs-recommended' }, label: '맞춤 추천' }
  if (route.query.from === 'calendar') return { to: { name: 'programs-calendar' }, label: '공고 달력' }
  if (route.query.from === 'mypage') return { to: { name: 'mypage-programs' }, label: '관심·준비 중·신청완료 사업' }
  return { to: { name: 'programs' }, label: '전체 공고' }
})

const program = ref<Program | null>(null)
const status = ref<LoadStatus>('loading')

async function load() {
  status.value = 'loading'
  try {
    program.value = await programRepository.getById(props.id)
    status.value = 'ready'
    // 조회 집계는 서버 저장소가 연결되면 시작한다 (지금은 저장하지 않음)
    if (program.value) viewEventSink.record(program.value.id)
  } catch {
    program.value = null
    status.value = 'error'
  }
}

watch(() => props.id, load, { immediate: true })

const notFound = computed(() => status.value === 'ready' && program.value === null)
const p = computed(() => program.value)

/** 자격·적합도·기회비용은 화면 공통 계산을 쓴다 (직접 확인 답·데이터 기준일 반영) */
const result = computed(() => (p.value ? evaluation.get(p.value.id) : undefined))
const eligibility = computed(() => result.value?.eligibility ?? null)
const fit = computed(() => result.value?.fit ?? null)
const opportunity = computed(() => result.value?.opportunity ?? null)

const pageTitle = computed(() => programTitleText(p.value) ?? '공고 상세')
const periodText = computed(() => {
  const period = applyPeriodText(p.value)
  const note = p.value?.applyPeriodNote ?? null
  if (period && note) return `${period} (${note})`
  return period ?? note
})
const agencyNames = computed(() => {
  if (!p.value) return null
  const type = agencyTypeText(p.value)
  return p.value.ministry && type ? `${p.value.ministry} (${type})` : p.value.ministry
})
const amountHint = computed(() => {
  const program = p.value
  if (!program?.amountNote || (program.maxAmountKrw === null && program.totalBudgetMaxKrw === null)) return undefined
  return `금액 메모: ${program.amountNote}${program.amountSource?.locator ? ` · ${program.amountSource.locator}` : ''}`
})
const categoryEvidence = computed(() => {
  const source = p.value?.categorySource
  if (!source?.quote) return null
  return source.locator ? `“${source.quote}” · ${source.locator}` : `“${source.quote}”`
})
const targetStagesText = computed(() => {
  const stages = p.value?.targetExportStages
  if (!stages) return null
  return stages.length > 0 ? stages.map((s) => exportStageText(s)).join(', ') : '명시 없음'
})
const verdictBasis = computed(() =>
  eligibility.value ? `${formatDate(eligibility.value.basisDate)} · ${eligibility.value.engineVersion}` : null,
)
const duplicateText = computed(() =>
  p.value?.duplicateSupportNotes ? p.value.duplicateSupportNotes.map((n) => `“${n.quote}”`).join(' ') : null,
)

const sourceReasonId = computed(() => {
  if (!p.value) return 'detail-action-reason'
  return p.value.sourceUrl ? undefined : 'detail-source-reason'
})

const SECTIONS = [
  { id: 'section-summary', label: '공고 요약' },
  { id: 'section-support', label: '지원 내용' },
  { id: 'section-eligibility', label: '신청 자격' },
  { id: 'section-fit', label: '적합도' },
  { id: 'section-preparation', label: '신청 준비' },
  { id: 'section-cost', label: '기회비용' },
  { id: 'section-reviews', label: '참여 후기' },
  { id: 'section-source', label: '원문·출처' },
]

const savedRecord = computed(() =>
  p.value ? applications.records.value.find((r) => r.programId === p.value?.id) : undefined,
)
const inCompare = computed(() => (p.value ? selection.has(p.value.id) : false))

const relatedPrograms = computed(() => {
  const ids = p.value?.relatedProgramIds ?? []
  return ids.map((id) => ({ id, program: evaluation.programs.value.find((item) => item.id === id) ?? null }))
})

/** 화면을 이동하지 않고 비교 선택만 바꾼다 */
function toggleCompare() {
  if (!p.value) return
  const outcome = selection.toggle(p.value.id)
  toast.show(compareToggleMessage(outcome, selection.count.value), outcome === 'full' ? 'warning' : 'success')
}

async function saveInterested() {
  if (!p.value) return
  if (auth.state.status !== 'authenticated') {
    await router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  const outcome = applications.saveInterested(p.value.id)
  toast.show(outcome === 'added' ? '관심 사업으로 저장했습니다.' : '이미 관리 기록에 있는 사업입니다.', 'info')
}

function clearSelfChecks() {
  selfChecks.clearAll()
  toast.show('직접 확인한 답을 모두 지웠습니다.', 'info')
}

const formatConditionCount = (n: number) => `${n}개`
</script>

<template>
  <div class="page">
    <PageHeader :title="pageTitle" description="지원 내용, 신청 자격, 적합도, 신청 준비, 기회비용을 순서대로 확인합니다.">
      <template #meta>
        <span class="fs-sm text-muted-strong">접수상태</span>
        <strong class="text-heading"><DataValue :value="receptionStatusWithBasisText(p)" /></strong>
        <span class="fs-sm text-muted-strong ms-2">신청 자격</span>
        <EligibilityBadge
          :status="eligibility?.status ?? null"
          size="sm"
          :self-checked-count="eligibility?.selfCheckedCount ?? 0"
          :data-state="eligibility?.dataState ?? null"
        />
      </template>
      <template #actions>
        <RouterLink :to="backLink.to" class="btn btn-secondary">
          <IconArrowLeft :size="18" stroke-width="2" aria-hidden="true" />
          목록으로<span class="visually-hidden"> ({{ backLink.label }})</span>
        </RouterLink>
      </template>
    </PageHeader>

    <div class="stack">
      <DataSourceNotice />

      <p v-if="status === 'loading'" class="loading-line" role="status">
        <span class="spinner-border spinner-border-sm" aria-hidden="true" />
        공고를 불러오는 중입니다.
      </p>

      <NoticeBanner v-if="status === 'error'" tone="danger" title="공고를 불러오지 못했습니다" alert>
        공고 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.
        <template #actions>
          <button type="button" class="btn btn-secondary btn-sm" @click="load">다시 시도</button>
        </template>
      </NoticeBanner>

      <NoticeBanner v-if="notFound" tone="warning" title="해당 공고를 찾을 수 없습니다." alert>
        <p>
          요청한 공고가 등록되어 있지 않거나 삭제되었을 수 있습니다. 아래에는 공고 상세 화면의 구성만 '-'로 보여
          드립니다.
        </p>
        <p class="request-id">요청한 공고 ID: {{ id }}</p>
        <template #actions>
          <RouterLink :to="{ name: 'programs' }" class="btn btn-secondary btn-sm">전체 공고 보기</RouterLink>
          <RouterLink :to="{ name: 'programs-recommended' }" class="btn btn-secondary btn-sm">맞춤 추천 보기</RouterLink>
        </template>
      </NoticeBanner>

      <nav class="section-nav surface-card" aria-label="상세 내용 바로가기">
        <ul class="section-nav__list">
          <li v-for="section in SECTIONS" :key="section.id">
            <RouterLink :to="{ query: route.query, hash: `#${section.id}` }" class="section-nav__link">
              {{ section.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <!-- 1. 공고 요약 -->
      <SectionCard id="section-summary" title="공고 요약" heading-id="section-summary-title" :icon="IconListDetails">
        <CategoryChips v-if="p" :program="p" class="mb-3" />
        <InfoList :columns="2">
          <InfoRow label="공고명" :value="programTitleText(p)" />
          <InfoRow label="접수상태" :value="receptionStatusWithBasisText(p)" />
          <InfoRow label="접수기간" :value="periodText" />
          <InfoRow label="지원 단계" :value="supportPhasesText(p)" />
          <InfoRow label="주관" :value="agencyNames" />
          <InfoRow label="운영·수행" :value="p?.agency ?? null" />
          <InfoRow label="대상 지역" :value="regionsText(p)" />
          <InfoRow label="지원방식" :value="supportTypesWithNoteText(p)" />
          <InfoRow label="지원금·총사업비 한도" :value="amountsText(p)" :hint="amountHint" />
          <InfoRow label="자기부담" :value="selfPaymentText(p)" />
          <InfoRow label="선정 규모" :value="p?.selectionSize ?? null" />
          <InfoRow label="대상 수출단계 (공고 명시)" :value="targetStagesText" />
          <InfoRow label="공고 원문">
            <a v-if="p?.sourceUrl" :href="p.sourceUrl" target="_blank" rel="noopener noreferrer">
              {{ p.sourceTitle ?? '공고 원문' }}
              <IconExternalLink :size="14" stroke-width="2" aria-hidden="true" />
              <span class="visually-hidden">(새 창)</span>
            </a>
            <span v-else>공고 원문 <DataValue :value="null" missing-label="원문 링크 없음" /></span>
          </InfoRow>
        </InfoList>
        <template #footer>
          <div class="action-row">
            <ActionButton
              variant="primary"
              :icon="IconSend"
              :href="p?.sourceUrl ?? undefined"
              :disabled="!p?.sourceUrl"
              :describedby="sourceReasonId"
            >
              신청하기
            </ActionButton>
            <ActionButton
              :icon="IconExternalLink"
              :href="p?.sourceUrl ?? undefined"
              :disabled="!p?.sourceUrl"
              :describedby="sourceReasonId"
            >
              원문 보기
            </ActionButton>
            <ActionButton
              :icon="IconBookmark"
              :disabled="!p || Boolean(savedRecord)"
              :describedby="!p ? 'detail-action-reason' : savedRecord ? 'detail-save-reason' : undefined"
              @click="saveInterested"
            >
              관심사업 저장
            </ActionButton>
            <ActionButton
              :icon="IconLayoutColumns"
              :disabled="!p"
              :aria-pressed="p ? inCompare : undefined"
              :describedby="p ? undefined : 'detail-action-reason'"
              @click="toggleCompare"
            >
              {{ inCompare ? '비교에서 빼기' : '비교에 추가' }}
            </ActionButton>
          </div>
          <DisabledReason v-if="!p" id="detail-action-reason">
            공고 정보가 없어 신청하기, 원문 보기, 관심사업 저장, 비교에 추가를 사용할 수 없습니다.
          </DisabledReason>
          <template v-else>
            <DisabledReason v-if="!p.sourceUrl" id="detail-source-reason">
              {{ sourceUnavailableReason(p) }}
            </DisabledReason>
            <p v-else class="fs-sm text-muted-strong mt-2 mb-0">
              신청은 공고 원문에 안내된 방법으로 진행합니다. 버튼을 누르면 원문이 새 창에서 열립니다.
            </p>
            <DisabledReason v-if="savedRecord" id="detail-save-reason">
              이미 마이페이지 관리 기록에 있는 사업입니다.
            </DisabledReason>
          </template>
        </template>
      </SectionCard>

      <!-- 2. 무엇을 지원받나요? -->
      <SectionCard
        id="section-support"
        title="무엇을 지원받나요?"
        heading-id="section-support-title"
        description="쉬운 설명·지원 대상·활용 예는 원문 검수 후 채웁니다. 원문에 없는 설명은 만들지 않습니다."
        :icon="IconFileText"
      >
        <InfoList>
          <InfoRow label="쉬운 설명" :value="p?.summaryEasy ?? null" />
          <InfoRow label="지원 대상" :value="p?.targetDescription ?? null" />
          <InfoRow label="활용 예" :value="p?.useExamples ? p.useExamples.join(' / ') : null" />
          <InfoRow label="관련 관심 분야" :value="supportAreasLabelText(p)" />
          <InfoRow label="세부 분야 분류 근거" :value="categoryEvidence" />
        </InfoList>
      </SectionCard>

      <!-- 3. 우리 회사가 신청할 수 있나요? -->
      <SectionCard
        id="section-eligibility"
        title="우리 회사가 신청할 수 있나요?"
        heading-id="section-eligibility-title"
        description="공고의 자격 조건마다 충족·미충족·확인 필요를 원문 근거와 함께 보여 드립니다."
        :icon="IconCircleCheck"
      >
        <div class="verdict">
          <div class="verdict__item">
            <p class="verdict__label">신청 자격</p>
            <EligibilityBadge
              :status="eligibility?.status ?? null"
              :self-checked-count="eligibility?.selfCheckedCount ?? 0"
              :data-state="eligibility?.dataState ?? null"
            />
          </div>
          <div class="verdict__item">
            <p class="verdict__label">확인 필요 조건</p>
            <DataValue :value="eligibility?.needsCheckCount ?? null" :format="formatConditionCount" />
          </div>
          <div class="verdict__item">
            <p class="verdict__label">판정 기준일 · 버전</p>
            <DataValue :value="verdictBasis" />
          </div>
        </div>

        <template v-if="eligibility && p">
          <NoticeBanner class="mt-4" tone="neutral">
            직접 확인한 답은 이 기기에만 저장되며, 판정 결과에 '직접 확인'으로 표시됩니다. 휴·폐업·체납·신용·제재·재무
            상태는
            <RouterLink :to="{ name: 'programs-recommended', hash: '#common-checks' }">맞춤 추천의 공통 확인 사항</RouterLink>에서
            한 번에 답할 수 있습니다.
            <template v-if="selfChecks.hasAny.value" #actions>
              <button type="button" class="btn btn-secondary btn-sm" @click="clearSelfChecks">직접 확인 모두 지우기</button>
            </template>
          </NoticeBanner>
          <EligibilityConditions class="mt-4" :program-id="p.id" :result="eligibility" />
        </template>
        <EmptyState
          v-else
          class="mt-4"
          :icon="IconChecklist"
          :title="p ? '자격 조건 초안이 없습니다' : '확인할 자격 조건이 없습니다'"
          description="공고의 자격 조건과 원문 근거가 등록되면 조건별로 충족·미충족·확인 필요를 보여 드립니다. 근거 없이 판정하지 않습니다."
          compact
          :level="3"
        />

        <ul class="legend" aria-label="조건 판정 설명">
          <li><StatusBadge label="충족" tone="success" :icon="IconCircleCheck" size="sm" /> 입력한 기업정보가 조건에 맞음</li>
          <li><StatusBadge label="미충족" tone="danger" :icon="IconCircleX" size="sm" /> 입력한 기업정보가 조건에 맞지 않음</li>
          <li><StatusBadge label="확인 필요" tone="warning" :icon="IconHelpCircle" size="sm" /> 정보가 없거나 자동으로 판정할 수 없어 원문 확인 필요</li>
        </ul>
      </SectionCard>

      <!-- 4. 얼마나 잘 맞나요? -->
      <SectionCard
        id="section-fit"
        title="얼마나 잘 맞나요?"
        heading-id="section-fit-title"
        description="신청 자격과는 별개로 계산합니다. 시험용 기준으로 계산한 점수이며, 사람 평가(Precision@5)로 검증한 뒤 확정합니다."
        :icon="IconTargetArrow"
      >
        <FitBreakdownTable
          :fit="fit"
          :factors="result?.fitFactors ?? []"
          :eligibility-status="eligibility?.status ?? null"
          :basis-date="fit?.basisDate ?? evaluation.asOf"
          id-prefix="detail-fit"
        />
        <p v-if="fit" class="fs-sm text-muted-strong mt-3 mb-0">
          검수 전 초안 데이터로 계산한 점수입니다 <DraftTag :state="eligibility?.dataState ?? p?.dataState" />. 재무 상태는
          적합도에 쓰지 않습니다.
        </p>
      </SectionCard>

      <!-- 5. 신청 준비 -->
      <SectionCard
        id="section-preparation"
        title="신청 준비"
        heading-id="section-preparation-title"
        description="필요서류를 필수 → 해당 시 → 선택 순서로 보여 드립니다. 원문 서류명과 근거 쪽을 함께 표시합니다."
        :icon="IconChecklist"
      >
        <div class="prep-grid">
          <div class="prep-grid__main">
            <h3 class="sub-title">필요서류 체크리스트</h3>
            <DocumentChecklist :program="p" :record="savedRecord ?? null" />
          </div>
          <InfoList class="prep-grid__side">
            <InfoRow label="준비도" :value="null" />
            <InfoRow label="서류함에서 연결된 서류" :value="null" hint="서류함이 연결되면 표시합니다." />
            <InfoRow label="연결된 사업계획서" :value="null" />
          </InfoList>
        </div>
      </SectionCard>

      <!-- 6. 기회비용 -->
      <SectionCard
        id="section-cost"
        title="기회비용"
        heading-id="section-cost-title"
        description="신청을 준비하는 데 드는 시간·서류·비용·의무를 정리합니다. 원문에 근거가 있는 값만 표시합니다."
        :icon="IconScale"
      >
        <OpportunityCostGrid :program="p" :opportunity="opportunity" />
      </SectionCard>

      <!-- 7. 참여 후기 -->
      <ProgramReviewsSection v-if="p" :key="p.id" :program-id="p.id" />

      <!-- 8. 원문·출처 -->
      <SectionCard id="section-source" title="원문·출처" heading-id="section-source-title" :icon="IconFileText">
        <InfoList :columns="2">
          <InfoRow label="공고 원문">
            <a v-if="p?.sourceUrl" :href="p.sourceUrl" target="_blank" rel="noopener noreferrer">
              {{ p.sourceTitle ?? p.sourceUrl }}
              <span class="visually-hidden">(새 창)</span>
            </a>
            <span v-else>공고 원문 <DataValue :value="null" missing-label="없음" /></span>
          </InfoRow>
          <InfoRow label="원문 파일" :value="p?.sourceFile ?? null" />
          <InfoRow label="원문 게시일" :value="p?.sourcePublishedAt ?? null" :format="formatDate" />
          <InfoRow label="내용 확인일 (검수)" :value="p?.verifiedAt ?? null" :format="formatDate" />
          <InfoRow label="데이터 상태" :value="dataStateText(p)" />
          <InfoRow label="공고 ID" :value="p?.id ?? null" />
          <InfoRow label="중복수혜 관련 원문" :value="duplicateText" />
        </InfoList>
        <details v-if="p?.draftNotes" class="draft-notes">
          <summary>작성 메모 (검수용)</summary>
          <p>{{ p.draftNotes }}</p>
        </details>
        <p class="fs-sm text-muted-strong mt-3 mb-0">
          중복수혜나 다른 사업과의 충돌은 시스템이 단정하지 않습니다. 원문 근거를 보여 드리고, 직접 확인이 필요한 조건을
          구분해 안내합니다.
        </p>
      </SectionCard>

      <!-- 같은 그룹의 공고 -->
      <SectionCard
        v-if="relatedPrograms.length > 0"
        title="같은 그룹의 공고"
        heading-id="section-related-title"
        description="정답 세트에서 같은 공고 그룹으로 묶인 공고입니다 (추가모집·재공고·연계 사업 등)."
      >
        <ul class="related-list">
          <li v-for="related in relatedPrograms" :key="related.id">
            <RouterLink v-if="related.program" :to="{ name: 'program-detail', params: { id: related.id } }">
              {{ programTitleText(related.program) ?? related.id }}
            </RouterLink>
            <span v-else>{{ related.id }} <span class="text-muted-strong">(찾을 수 없는 공고)</span></span>
          </li>
        </ul>
      </SectionCard>
    </div>

    <CompareDock />
  </div>
</template>

<style scoped>
.loading-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.request-id {
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
  word-break: break-all;
}

.section-nav {
  position: sticky;
  top: calc(var(--header-height) + 8px);
  z-index: 5;
  padding: 6px;
}

.section-nav__list {
  position: relative;
  display: flex;
  gap: 4px;
  margin: 0;
  padding: 0;
  overflow-x: auto;
  list-style: none;
  scrollbar-width: thin;
}

.section-nav__link {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  text-decoration: none;
  white-space: nowrap;
}

.section-nav__link:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.verdict {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
}

.verdict__label {
  margin-bottom: 6px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-5);
  margin: var(--space-4) 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-xs);
}

.legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sub-title {
  margin: 0 0 var(--space-3);
  font-size: var(--fs-base);
}

.prep-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: var(--space-6);
}

.draft-notes {
  margin-top: var(--space-3);
  font-size: var(--fs-sm);
}

.draft-notes summary {
  font-weight: var(--fw-semibold);
  cursor: pointer;
}

.draft-notes p {
  margin: var(--space-2) 0 0;
  white-space: pre-line;
}

.related-list {
  margin: 0;
  padding-left: var(--space-5);
}

@media (max-width: 767.98px) {
  .verdict {
    grid-template-columns: minmax(0, 1fr);
  }
  .prep-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

<script setup lang="ts">
/**
 * 공고 상세. 공고가 조회되지 않아도 상세 화면의 틀과 '-' 슬롯을 보여 주고,
 * 공고가 필요한 동작(신청·원문 보기·서류 체크·저장·비교)은 이유와 함께 비활성화한다.
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
import EligibilityBadge from '@/components/programs/EligibilityBadge.vue'
import ConditionBadge from '@/components/programs/ConditionBadge.vue'
import { programRepository } from '@/repositories'
import { useProfileStore } from '@/stores/profileStore'
import { useApplicationStore } from '@/stores/applicationStore'
import { useAuth } from '@/stores/authStore'
import { useToast } from '@/stores/toastStore'
import { COMPARE_FULL_MESSAGE, useCompareSelection } from '@/composables/useCompareSelection'
import { evaluateEligibility } from '@/lib/engine/eligibility'
import { evaluateFit } from '@/lib/engine/fit'
import { evaluateOpportunityCost } from '@/lib/engine/opportunityCost'
import { formatDate, formatKrw } from '@/lib/display'
import {
  agencyTypeText,
  applyPeriodText,
  maxAmountText,
  receptionStatusText,
  regionsText,
  stageText,
  supportAreasText,
  supportTypesText,
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

/** 들어온 화면(from)으로 돌아가는 '목록으로' 링크. 없으면 전체 공고 */
const backLink = computed<{ to: RouteLocationRaw; label: string }>(() => {
  if (route.query.from === 'recommended') return { to: { name: 'programs-recommended' }, label: '맞춤 추천' }
  if (route.query.from === 'calendar') return { to: { name: 'programs-calendar' }, label: '공고 달력' }
  return { to: { name: 'programs' }, label: '전체 공고' }
})

const store = useProfileStore()
const program = ref<Program | null>(null)
const status = ref<LoadStatus>('loading')

async function load() {
  status.value = 'loading'
  try {
    program.value = await programRepository.getById(props.id)
    status.value = 'ready'
  } catch {
    program.value = null
    status.value = 'error'
  }
}

watch(() => props.id, load, { immediate: true })

const notFound = computed(() => status.value === 'ready' && program.value === null)
const p = computed(() => program.value)

const eligibility = computed(() => (p.value ? evaluateEligibility(store.state.profile, p.value) : null))
const fit = computed(() => (p.value ? evaluateFit(store.state.profile, p.value) : null))
const opportunity = computed(() =>
  p.value ? evaluateOpportunityCost(p.value, { ownedDocumentTypes: null, today: null }) : null,
)

const pageTitle = computed(() => p.value?.title ?? '공고 상세')

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
  { id: 'section-source', label: '원문·출처' },
]

const savedRecord = computed(() =>
  p.value ? applications.records.value.find((r) => r.programId === p.value?.id) : undefined,
)

function addToCompare() {
  if (!p.value) return
  if (selection.add(p.value.id) === 'full') toast.show(COMPARE_FULL_MESSAGE, 'warning')
  void router.push(selection.compareLocation())
}

async function saveInterested() {
  if (!p.value) return
  if (auth.state.status !== 'authenticated') {
    await router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  const result = applications.saveInterested(p.value.id)
  toast.show(result === 'added' ? '관심 사업으로 저장했습니다.' : '이미 관리 기록에 있는 사업입니다.', 'info')
}

const formatHours = (value: { value: number; basis: string }) => `약 ${value.value}시간 (근거: ${value.basis})`
const formatDays = (days: number) => (days >= 0 ? `마감까지 ${days}일` : '접수 마감')
const formatCountDocs = (n: number) => `${n}건`
const formatPercent = (n: number) => `${n}%`
</script>

<template>
  <div class="page">
    <PageHeader :title="pageTitle" description="지원 내용, 신청 자격, 적합도, 신청 준비, 기회비용을 순서대로 확인합니다.">
      <template #meta>
        <span class="fs-sm text-muted-strong">접수상태</span>
        <strong class="text-heading"><DataValue :value="receptionStatusText(p)" /></strong>
        <span class="fs-sm text-muted-strong ms-2">신청 자격</span>
        <EligibilityBadge :status="eligibility?.status ?? null" size="sm" />
      </template>
      <template #actions>
        <RouterLink :to="backLink.to" class="btn btn-secondary">
          <IconArrowLeft :size="18" stroke-width="2" aria-hidden="true" />
          목록으로<span class="visually-hidden"> ({{ backLink.label }})</span>
        </RouterLink>
      </template>
    </PageHeader>

    <div class="stack">
      <p v-if="status === 'loading'" class="loading-line" role="status">
        <span class="spinner-border spinner-border-sm" aria-hidden="true" />
        공고를 불러오는 중입니다.
      </p>

      <NoticeBanner v-if="status === 'error'" tone="danger" title="공고를 불러오지 못했습니다" alert>
        공고 API에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.
        <template #actions>
          <button type="button" class="btn btn-secondary btn-sm" @click="load">다시 시도</button>
        </template>
      </NoticeBanner>

      <NoticeBanner v-if="notFound" tone="warning" title="해당 공고를 찾을 수 없습니다." alert>
        <p>
          요청한 공고가 등록되어 있지 않거나 삭제되었을 수 있습니다. 현재는 등록된 공고가 없어, 아래에는 공고 상세
          화면의 구성만 '-'로 보여 드립니다.
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
            <RouterLink :to="{ hash: `#${section.id}` }" class="section-nav__link">{{ section.label }}</RouterLink>
          </li>
        </ul>
      </nav>

      <!-- 1. 공고 요약 -->
      <SectionCard
        id="section-summary"
        title="공고 요약"
        heading-id="section-summary-title"
        :icon="IconListDetails"
      >
        <InfoList :columns="2">
          <InfoRow label="공고명" :value="p?.title ?? null" />
          <InfoRow label="접수상태" :value="receptionStatusText(p)" />
          <InfoRow label="접수기간" :value="applyPeriodText(p)" />
          <InfoRow label="지원분야" :value="stageText(p)" />
          <InfoRow label="주관부서" :value="p?.ministry ?? null" />
          <InfoRow label="수행기관" :value="p?.agency ?? null" />
          <InfoRow label="기관 유형" :value="agencyTypeText(p)" />
          <InfoRow label="대상 지역" :value="regionsText(p)" />
          <InfoRow label="지원방식" :value="supportTypesText(p)" />
          <InfoRow label="지원규모" :value="maxAmountText(p)" />
          <InfoRow label="공고 원문">
            <a v-if="p?.sourceUrl" :href="p.sourceUrl" target="_blank" rel="noopener noreferrer">
              {{ p.sourceTitle ?? '공고 원문' }}
              <IconExternalLink :size="14" stroke-width="2" aria-hidden="true" />
              <span class="visually-hidden">(새 창)</span>
            </a>
            <DataValue v-else :value="null" missing-label="원문 링크 없음" />
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
              :describedby="p ? undefined : 'detail-action-reason'"
              @click="addToCompare"
            >
              비교에 추가
            </ActionButton>
          </div>
          <DisabledReason v-if="!p" id="detail-action-reason">
            공고 정보가 없어 신청하기, 원문 보기, 관심사업 저장, 비교에 추가를 사용할 수 없습니다.
          </DisabledReason>
          <template v-else>
            <DisabledReason v-if="!p.sourceUrl" id="detail-source-reason">
              공고 원문 링크가 확인되지 않아 신청하기와 원문 보기를 사용할 수 없습니다.
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
        description="공고 내용을 쉬운 말로 풀어 설명합니다."
        :icon="IconFileText"
      >
        <InfoList>
          <InfoRow label="쉬운 설명" :value="p?.summaryEasy ?? null" />
          <InfoRow label="지원 대상" :value="p?.targetDescription ?? null" />
          <InfoRow label="활용 예" :value="p?.useExamples ? p.useExamples.join(' / ') : null" />
          <InfoRow label="지원 내용 분야" :value="supportAreasText(p)" />
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
            <EligibilityBadge :status="eligibility?.status ?? null" />
          </div>
          <div class="verdict__item">
            <p class="verdict__label">판정 기준일</p>
            <DataValue :value="eligibility?.basisDate ?? null" :format="formatDate" />
          </div>
          <div class="verdict__item">
            <p class="verdict__label">판정 기준 버전</p>
            <DataValue :value="eligibility?.engineVersion ?? null" />
          </div>
        </div>

        <div v-if="eligibility && eligibility.conditions.length > 0" class="scroll-x mt-4">
          <table class="data-table">
            <caption class="visually-hidden">자격 조건별 판정</caption>
            <thead>
              <tr>
                <th scope="col">조건</th>
                <th scope="col">우리 회사 정보</th>
                <th scope="col">판정</th>
                <th scope="col">원문 근거</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="condition in eligibility.conditions" :key="condition.ruleId">
                <th scope="row">{{ condition.label }}</th>
                <td><DataValue :value="condition.companyValue" /></td>
                <td>
                  <ConditionBadge :status="condition.status" />
                  <p class="fs-sm mt-1 mb-0">{{ condition.reason }}</p>
                </td>
                <td class="fs-sm">“{{ condition.source.quote }}”</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState
          v-else
          class="mt-4"
          :icon="IconChecklist"
          title="확인할 자격 조건이 없습니다"
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
        description="신청 자격과는 별개로 계산하는 적합도입니다."
        :icon="IconTargetArrow"
      >
        <InfoList>
          <InfoRow label="적합도" :value="fit?.score ?? null" :format="(n: number) => `${n}점 / 100점`" />
          <InfoRow label="계산 요소" :value="fit ? fit.factors.map((f) => `${f.label}(가중치 ${f.weight})`).join(', ') : null" />
          <InfoRow label="추천 근거" :value="fit ? fit.reasons.join(' / ') : null" />
          <InfoRow label="산정 기준 버전" :value="fit?.criteriaVersion ?? null" />
        </InfoList>
        <NoticeBanner class="mt-4" tone="neutral">
          적합도 산정 기준(요소·가중치)이 아직 확정되지 않아 점수를 계산하지 않습니다. 근거 없는 점수나 선정 가능성은
          표시하지 않습니다.
        </NoticeBanner>
      </SectionCard>

      <!-- 5. 신청 준비 -->
      <SectionCard
        id="section-preparation"
        title="신청 준비"
        heading-id="section-preparation-title"
        description="필요서류를 확인하고 서류함·사업계획서와 연결합니다."
        :icon="IconChecklist"
      >
        <div class="prep-grid">
          <div class="prep-grid__main">
            <h3 class="sub-title">필요서류 체크리스트</h3>
            <ul v-if="p?.requiredDocs && p.requiredDocs.length > 0" class="checklist">
              <li v-for="doc in p.requiredDocs" :key="doc.id" class="form-check">
                <input :id="`doc-${doc.id}`" class="form-check-input" type="checkbox" disabled aria-describedby="checklist-reason" />
                <label class="form-check-label" :for="`doc-${doc.id}`">{{ doc.name }}</label>
              </li>
            </ul>
            <EmptyState
              v-else
              :icon="IconChecklist"
              title="필요서류 정보가 없습니다"
              description="공고의 필요서류가 등록되면 체크리스트로 준비 상황을 관리할 수 있습니다."
              compact
              :level="4"
            />
            <DisabledReason id="checklist-reason">
              {{
                p
                  ? '서류 체크 기록은 준비 중 사업 기능이 연결된 후 사용할 수 있습니다.'
                  : '공고 정보가 없어 서류를 체크할 수 없습니다.'
              }}
            </DisabledReason>
          </div>
          <InfoList class="prep-grid__side">
            <InfoRow label="준비도" :value="null" />
            <InfoRow label="서류함에서 연결된 서류" :value="null" />
            <InfoRow label="연결된 사업계획서" :value="null" />
          </InfoList>
        </div>
      </SectionCard>

      <!-- 6. 기회비용 -->
      <SectionCard
        id="section-cost"
        title="기회비용"
        heading-id="section-cost-title"
        description="신청을 준비하는 데 드는 시간·서류·비용·의무를 정리합니다. 근거가 확인된 값만 표시합니다."
        :icon="IconScale"
      >
        <ul class="cost-grid">
          <li class="cost-item">
            <p class="cost-item__label">예상 준비 시간</p>
            <p class="cost-item__value"><DataValue :value="opportunity?.prepHours ?? null" :format="formatHours" /></p>
            <StatusBadge v-if="!opportunity?.prepHours" label="산정 전" size="sm" />
          </li>
          <li class="cost-item">
            <p class="cost-item__label">새로 필요한 서류 수</p>
            <p class="cost-item__value">
              <DataValue :value="opportunity?.newDocumentCount ?? null" :format="formatCountDocs" />
            </p>
            <StatusBadge v-if="(opportunity?.newDocumentCount ?? null) === null" label="산정 전" size="sm" />
          </li>
          <li class="cost-item">
            <p class="cost-item__label">자기부담금</p>
            <p class="cost-item__value">
              <DataValue :value="opportunity?.selfPaymentRatioPercent ?? null" :format="formatPercent" />
            </p>
            <StatusBadge v-if="(opportunity?.selfPaymentRatioPercent ?? null) === null" label="산정 전" size="sm" />
          </li>
          <li class="cost-item">
            <p class="cost-item__label">선정 후 의무사항</p>
            <p class="cost-item__value">
              <DataValue :value="opportunity?.obligations ? opportunity.obligations.join(', ') : null" />
            </p>
            <StatusBadge v-if="!opportunity?.obligations" label="산정 전" size="sm" />
          </li>
          <li class="cost-item">
            <p class="cost-item__label">마감 여유</p>
            <p class="cost-item__value">
              <DataValue :value="opportunity?.daysUntilDeadline ?? null" :format="formatDays" />
            </p>
            <StatusBadge v-if="(opportunity?.daysUntilDeadline ?? null) === null" label="산정 전" size="sm" />
          </li>
        </ul>
        <p class="fs-sm text-muted-strong mt-3 mb-0">
          이 값들은 사업이 더 좋거나 나쁘다는 판단이 아닙니다. 준비에 드는 부담을 미리 가늠하는 참고 정보이며, 산정
          근거와 기준일을 함께 표시합니다.
        </p>
      </SectionCard>

      <!-- 7. 원문·출처 -->
      <SectionCard id="section-source" title="원문·출처" heading-id="section-source-title" :icon="IconFileText">
        <InfoList :columns="2">
          <InfoRow label="공고 원문">
            <a v-if="p?.sourceUrl" :href="p.sourceUrl" target="_blank" rel="noopener noreferrer">
              {{ p.sourceTitle ?? p.sourceUrl }}
              <span class="visually-hidden">(새 창)</span>
            </a>
            <span v-else>공고 원문 <DataValue :value="null" missing-label="없음" /></span>
          </InfoRow>
          <InfoRow label="원문 제목" :value="p?.sourceTitle ?? null" />
          <InfoRow label="원문 게시일" :value="p?.sourcePublishedAt ?? null" :format="formatDate" />
          <InfoRow label="내용 확인일" :value="p?.verifiedAt ?? null" :format="formatDate" />
          <InfoRow label="최대 지원금" :value="p?.maxAmountKrw ?? null" :format="formatKrw" />
          <InfoRow
            label="중복수혜 관련 원문"
            :value="p?.duplicateSupportNotes ? p.duplicateSupportNotes.map((n) => `“${n.quote}”`).join(' ') : null"
          />
        </InfoList>
        <p class="fs-sm text-muted-strong mt-3 mb-0">
          중복수혜나 다른 사업과의 충돌은 시스템이 단정하지 않습니다. 원문 근거를 보여 드리고, 직접 확인이 필요한 조건을
          구분해 안내합니다.
        </p>
      </SectionCard>
    </div>
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

.checklist {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.cost-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.cost-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.cost-item__label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-text);
}

.cost-item__value {
  font-size: var(--fs-xl);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

@media (max-width: 1199.98px) {
  .cost-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 767.98px) {
  .verdict {
    grid-template-columns: minmax(0, 1fr);
  }
  .prep-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .cost-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

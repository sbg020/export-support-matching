<script setup lang="ts">
/**
 * 공고 비교. URL의 ids(쉼표 구분, 최대 4개)로 공고를 불러온다.
 * 선택한 공고가 없으면 열 제목부터 값까지 '-'인 빈 비교 상태를 보여 준다.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { IconCopy, IconLayoutGrid, IconListDetails, IconScale, IconTable, IconTargetArrow } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import ActionButton from '@/components/common/ActionButton.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import CompareTable from '@/components/programs/CompareTable.vue'
import type { CompareRowKey, CompareSlot } from '@/components/programs/compareRows'
import { programRepository } from '@/repositories'
import { useProfileStore } from '@/stores/profileStore'
import { evaluateEligibility } from '@/lib/engine/eligibility'
import { evaluateFit } from '@/lib/engine/fit'
import { evaluateOpportunityCost } from '@/lib/engine/opportunityCost'
import {
  applyPeriodText,
  requiredDocsText,
  stageText,
  supportSummaryText,
} from '@/lib/programDisplay'
import type { Program } from '@/types/program'
import type { LoadStatus } from '@/composables/useProgramList'

const MAX_SLOTS = 4
const route = useRoute()
const store = useProfileStore()

const requestedIds = computed(() => {
  const raw = Array.isArray(route.query.ids) ? route.query.ids[0] : route.query.ids
  if (typeof raw !== 'string') return []
  return Array.from(new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))).slice(0, MAX_SLOTS)
})

const programs = ref<Program[]>([])
const status = ref<LoadStatus>('loading')

async function load() {
  status.value = 'loading'
  try {
    programs.value = requestedIds.value.length > 0 ? await programRepository.getByIds(requestedIds.value) : []
    status.value = 'ready'
  } catch {
    programs.value = []
    status.value = 'error'
  }
}

watch(requestedIds, load, { immediate: true })

const missingIds = computed(() =>
  status.value === 'ready' ? requestedIds.value.filter((id) => !programs.value.some((p) => p.id === id)) : [],
)

type SlotCount = '2' | '3' | '4'
const slotCount = ref<SlotCount>('2')
watch(
  programs,
  (list) => {
    if (list.length > Number(slotCount.value)) slotCount.value = String(Math.min(MAX_SLOTS, list.length)) as SlotCount
  },
  { immediate: true },
)

const slots = computed<CompareSlot[]>(() =>
  Array.from({ length: Number(slotCount.value) }, (_, index) => {
    const program = programs.value[index] ?? null
    return {
      index,
      program,
      eligibility: program ? evaluateEligibility(store.state.profile, program) : null,
      fit: program ? evaluateFit(store.state.profile, program) : null,
      opportunity: program ? evaluateOpportunityCost(program, { ownedDocumentTypes: null, today: null }) : null,
    }
  }),
)

const view = ref<'table' | 'cards'>('table')
onMounted(() => {
  if (window.matchMedia('(max-width: 767.98px)').matches) view.value = 'cards'
})

function valueOf(key: CompareRowKey, slot: CompareSlot): string | null {
  const p = slot.program
  if (!p) return null
  switch (key) {
    case 'fit':
      return slot.fit ? `${slot.fit.score}점` : null
    case 'period':
      return applyPeriodText(p)
    case 'support':
      return supportSummaryText(p)
    case 'stage':
      return stageText(p)
    case 'requiredDocs':
      return requiredDocsText(p)
    case 'prepHours':
      return slot.opportunity?.prepHours
        ? `약 ${slot.opportunity.prepHours.value}시간 (근거: ${slot.opportunity.prepHours.basis})`
        : null
    case 'newDocs':
      return (slot.opportunity?.newDocumentCount ?? null) !== null
        ? `${slot.opportunity?.newDocumentCount}건`
        : null
    case 'selfPayment':
      return (p.selfPayment?.ratioPercent ?? null) !== null
        ? `${p.selfPayment?.ratioPercent}%`
        : (p.selfPayment?.note ?? null)
    case 'obligations':
      return p.obligations ? (p.obligations.length > 0 ? p.obligations.join(', ') : '없음') : null
    case 'duplicate':
      return p.duplicateSupportNotes ? p.duplicateSupportNotes.map((n) => `“${n.quote}”`).join(' ') : null
    case 'source':
      return p.sourceUrl
    default:
      return null
  }
}

const hasSelection = computed(() => programs.value.length > 0)

const slotOptions = [
  { value: '2' as const, label: '2개' },
  { value: '3' as const, label: '3개' },
  { value: '4' as const, label: '4개' },
]
const viewOptions = [
  { value: 'table' as const, label: '표 보기', icon: IconTable },
  { value: 'cards' as const, label: '카드 보기', icon: IconLayoutGrid },
]
</script>

<template>
  <div class="page">
    <PageHeader
      title="공고 비교"
      description="공고 2~4개를 같은 항목으로 나란히 비교합니다. 어떤 공고가 더 좋다고 판단하지 않고, 근거가 있는 값만 보여 드립니다."
    />

    <div class="stack">
      <NoticeBanner v-if="missingIds.length > 0" tone="warning" title="찾을 수 없는 공고가 있습니다">
        주소에 포함된 공고 {{ missingIds.length }}개를 찾을 수 없어 비교에서 제외했습니다.
      </NoticeBanner>
      <NoticeBanner v-if="status === 'error'" tone="danger" title="공고를 불러오지 못했습니다" alert>
        공고 API에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.
      </NoticeBanner>

      <section class="compare-controls surface-card" aria-label="비교 설정">
        <div class="compare-controls__group">
          <span class="compare-controls__label">비교 칸 수</span>
          <SegmentedControl v-model="slotCount" :options="slotOptions" label="비교 칸 수" />
        </div>
        <div class="compare-controls__group">
          <span class="compare-controls__label">보기 방식</span>
          <SegmentedControl v-model="view" :options="viewOptions" label="보기 방식" />
        </div>
        <div class="compare-controls__group compare-controls__actions">
          <RouterLink :to="{ name: 'programs' }" class="btn btn-secondary">
            <IconListDetails :size="18" stroke-width="2" aria-hidden="true" />
            비교할 공고 고르기
          </RouterLink>
          <ActionButton :icon="IconCopy" disabled describedby="compare-select-reason">비교 결과 저장</ActionButton>
        </div>
        <DisabledReason id="compare-select-reason" class="compare-controls__reason">
          {{
            hasSelection
              ? '비교 결과 저장 기능은 아직 연결되지 않았습니다.'
              : '선택한 공고가 없습니다. 공고가 등록되면 전체 공고나 맞춤 추천에서 2~4개를 골라 비교할 수 있습니다.'
          }}
        </DisabledReason>
      </section>

      <CompareTable :slots="slots" :view="view" :value-of="valueOf" />

      <div class="grid-12">
        <SectionCard
          class="col-span-12 lg-span-6"
          title="중복수혜·유사사업 확인"
          heading-id="duplicate-title"
          :icon="IconTargetArrow"
          description="같은 기간에 함께 받을 수 없는 지원이 있는지 공고 원문을 근거로 확인합니다."
        >
          <InfoList>
            <InfoRow label="중복수혜 제한 원문" :value="null" />
            <InfoRow label="비슷한 목적의 사업" :value="null" />
            <InfoRow label="직접 확인이 필요한 조건" :value="null" />
          </InfoList>
          <p class="fs-sm text-muted-strong mt-3 mb-0">
            중복수혜나 사업 간 충돌은 시스템이 단정하지 않습니다. 원문의 근거 문구와 출처를 보여 드리고, 직접 확인이
            필요한 조건을 따로 표시합니다.
          </p>
        </SectionCard>

        <SectionCard
          class="col-span-12 lg-span-6"
          title="준비 부담·기회비용을 볼 때"
          heading-id="cost-title"
          :icon="IconScale"
          description="준비 시간, 새로 준비할 서류, 자기부담금, 수행 후 의무를 함께 비교합니다."
        >
          <ul class="notes">
            <li>값마다 산정 근거와 기준일을 함께 표시하며, 근거가 없는 값은 '-'로 둡니다.</li>
            <li>예상 준비 시간 같은 추정치는 불확실성이 있으므로 참고용으로만 보여 드립니다.</li>
            <li>
              사업마다 목적과 지원 방식이 다르기 때문에 '더 좋다', '가성비가 높다'고 판단하지 않습니다. 우리 회사의 수출
              계획에 맞는지를 함께 살펴보세요.
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compare-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4) var(--space-6);
  padding: var(--space-4) var(--space-5);
}

.compare-controls__group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.compare-controls__label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.compare-controls__actions {
  margin-left: auto;
}

.compare-controls__reason {
  flex-basis: 100%;
  margin-top: 0;
}

.notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--fs-sm);
}

@media (max-width: 767.98px) {
  .compare-controls__actions {
    margin-left: 0;
  }
}
</style>

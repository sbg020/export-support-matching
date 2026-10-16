<script setup lang="ts">
/**
 * 전체 공고 하단의 공고 비교 영역 (기존 공고 비교 화면을 옮겨 재사용).
 * 선택은 useCompareSelection 하나로 관리하며, 이 화면에서는 URL 쿼리 compare 와 동기화한다.
 * 선택한 공고가 없으면 열 제목부터 값까지 '-'인 빈 비교 표를 보여 준다. 어떤 공고가 더 좋다고 판단하지 않는다.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconCopy, IconLayoutColumns, IconLayoutGrid, IconScale, IconTable, IconTargetArrow, IconX } from '@tabler/icons-vue'
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
import { MAX_COMPARE, parseCompareQuery, useCompareSelection } from '@/composables/useCompareSelection'
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

const route = useRoute()
const router = useRouter()
const store = useProfileStore()
const selection = useCompareSelection()

/* ── 선택 ↔ URL 쿼리 동기화 (히스토리를 쌓지 않음) ── */
function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

function syncQueryFromSelection() {
  const ids = selection.ids.value
  if (sameList(parseCompareQuery(route.query.compare), ids)) return
  void router.replace({
    query: { ...route.query, compare: ids.length > 0 ? ids.join(',') : undefined },
    hash: route.hash,
  })
}

watch(
  () => route.query.compare,
  (value) => {
    if (value !== undefined) selection.setAll(parseCompareQuery(value))
  },
  { immediate: true },
)
watch(selection.ids, syncQueryFromSelection)

/* ── 공고 불러오기 ── */
const programs = ref<Program[]>([])
const status = ref<LoadStatus>('loading')

async function load() {
  status.value = 'loading'
  try {
    const ids = selection.ids.value
    programs.value = ids.length > 0 ? await programRepository.getByIds([...ids]) : []
    status.value = 'ready'
  } catch {
    programs.value = []
    status.value = 'error'
  }
}
watch(selection.ids, load, { immediate: true })

const programById = computed(() => new Map(programs.value.map((p) => [p.id, p])))
/** 선택 순서대로 조회된 공고 */
const selectedPrograms = computed(() =>
  selection.ids.value.map((id) => programById.value.get(id)).filter((p): p is Program => p !== undefined),
)
const chips = computed(() =>
  selection.ids.value.map((id) => {
    const program = programById.value.get(id)
    return {
      id,
      label: program?.title ?? (status.value === 'ready' ? '찾을 수 없는 공고' : id),
      missing: !program && status.value === 'ready',
    }
  }),
)
const noProgramSource = programRepository.source.kind === 'not-connected'

/* ── 비교 표 (기존 비교 화면 로직) ── */
type SlotCount = '2' | '3' | '4'
const slotCount = ref<SlotCount>('2')
watch(
  selectedPrograms,
  (list) => {
    if (list.length > Number(slotCount.value)) slotCount.value = String(Math.min(MAX_COMPARE, list.length)) as SlotCount
  },
  { immediate: true },
)

const slots = computed<CompareSlot[]>(() =>
  Array.from({ length: Number(slotCount.value) }, (_, index) => {
    const program = selectedPrograms.value[index] ?? null
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

const slotOptions = [
  { value: '2' as const, label: '2개' },
  { value: '3' as const, label: '3개' },
  { value: '4' as const, label: '4개' },
]
const viewOptions = [
  { value: 'table' as const, label: '표 보기', icon: IconTable },
  { value: 'cards' as const, label: '카드 보기', icon: IconLayoutGrid },
]

/* ── 펼치기, 해시 도착, 하단 고정 바 ── */
const expanded = ref(false)
const sectionRef = ref<HTMLElement | null>(null)
const sectionVisible = ref(false)
let observer: IntersectionObserver | null = null

onMounted(async () => {
  if (window.matchMedia('(max-width: 767.98px)').matches) view.value = 'cards'
  syncQueryFromSelection()
  if (route.hash === '#compare') {
    if (selection.count.value >= 2) expanded.value = true
    await nextTick()
    sectionRef.value?.scrollIntoView({ block: 'start' })
  }
  if ('IntersectionObserver' in window && sectionRef.value) {
    observer = new IntersectionObserver((entries) => {
      sectionVisible.value = entries.some((entry) => entry.isIntersecting)
    })
    observer.observe(sectionRef.value)
  }
})

onBeforeUnmount(() => observer?.disconnect())

function scrollToCompare() {
  void router.replace({ query: route.query, hash: '#compare' })
  sectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  sectionRef.value?.querySelector<HTMLElement>('.compare-section__title')?.focus({ preventScroll: true })
}
</script>

<template>
  <section id="compare" ref="sectionRef" class="compare-section surface-card" aria-labelledby="compare-title">
    <header class="compare-section__header">
      <div>
        <h2 id="compare-title" class="compare-section__title" tabindex="-1">
          <IconLayoutColumns :size="20" stroke-width="2" aria-hidden="true" />
          공고 비교
        </h2>
        <p class="compare-section__count">
          선택한 공고 <strong>{{ selection.count.value }}</strong>/{{ MAX_COMPARE }}
        </p>
      </div>
      <button
        type="button"
        class="btn btn-outline-primary"
        :aria-expanded="expanded"
        aria-controls="compare-content"
        @click="expanded = !expanded"
      >
        {{ expanded ? '비교 내용 접기' : '비교 내용 펼치기' }}
      </button>
    </header>

    <div class="compare-section__selection">
      <ul v-if="chips.length > 0" class="compare-chips" aria-label="선택한 공고">
        <li v-for="chip in chips" :key="chip.id" class="compare-chip" :class="{ 'is-missing': chip.missing }">
          <span>
            {{ chip.label }}
            <span v-if="chip.missing" class="compare-chip__id">({{ chip.id }})</span>
          </span>
          <button
            type="button"
            class="compare-chip__remove"
            :aria-label="`${chip.missing ? '찾을 수 없는 공고 ' + chip.id : chip.label} 비교에서 빼기`"
            @click="selection.remove(chip.id)"
          >
            <IconX :size="14" stroke-width="2.2" aria-hidden="true" />
          </button>
        </li>
        <li>
          <button type="button" class="btn btn-ghost btn-sm" @click="selection.clear()">모두 지우기</button>
        </li>
      </ul>
      <template v-else>
        <p class="compare-section__empty">아직 선택한 공고가 없습니다.</p>
        <DisabledReason id="compare-select-reason">
          {{
            noProgramSource
              ? "현재 등록된 공고가 없어 비교할 공고를 선택할 수 없습니다. 공고가 등록되면 목록의 '비교에 추가'로 2~4개를 고를 수 있습니다."
              : "목록에서 '비교에 추가'를 눌러 공고를 2~4개 고르세요."
          }}
        </DisabledReason>
      </template>
    </div>

    <div v-show="expanded" id="compare-content" class="compare-section__content">
      <NoticeBanner v-if="status === 'error'" tone="danger" title="공고를 불러오지 못했습니다" alert>
        공고 API에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.
      </NoticeBanner>
      <p v-if="selectedPrograms.length < 2" class="compare-section__min" role="status">
        비교하려면 공고를 2개 이상 선택하세요.
      </p>

      <div class="compare-controls">
        <div class="compare-controls__group">
          <span class="compare-controls__label">비교 칸 수</span>
          <SegmentedControl v-model="slotCount" :options="slotOptions" label="비교 칸 수" />
        </div>
        <div class="compare-controls__group">
          <span class="compare-controls__label">보기 방식</span>
          <SegmentedControl v-model="view" :options="viewOptions" label="보기 방식" />
        </div>
        <div class="compare-controls__group compare-controls__actions">
          <ActionButton :icon="IconCopy" size="sm" disabled describedby="compare-save-reason">
            비교 결과 저장
          </ActionButton>
        </div>
        <DisabledReason id="compare-save-reason" class="compare-controls__reason">
          비교 결과 저장 기능은 아직 연결되지 않았습니다.
        </DisabledReason>
      </div>

      <CompareTable :slots="slots" :view="view" :value-of="valueOf" />

      <div class="grid-12">
        <SectionCard
          class="col-span-12 lg-span-6"
          title="중복수혜·유사사업 확인"
          heading-id="duplicate-title"
          :level="3"
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
          :level="3"
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
  </section>

  <div v-if="selection.count.value > 0 && !sectionVisible" class="compare-dock" role="region" aria-label="공고 비교 바로가기">
    <a href="#compare" class="compare-dock__link" @click.prevent="scrollToCompare">
      비교 {{ selection.count.value }}/{{ MAX_COMPARE }} · 비교 영역으로 이동
    </a>
  </div>
</template>

<style scoped>
.compare-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--card-padding);
  scroll-margin-top: calc(var(--header-height) + 16px);
}

.compare-section__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.compare-section__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--fs-lg);
}

.compare-section__title:focus {
  outline: none;
}

.compare-section__count {
  margin-top: 4px;
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.compare-section__count strong {
  color: var(--color-primary-strong);
}

.compare-section__empty {
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.compare-section__selection :deep(.disabled-reason) {
  margin-top: 4px;
}

.compare-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.compare-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 4px 6px 4px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid #cfe0fd;
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}

.compare-chip.is-missing {
  border-color: #fbdca5;
  background: var(--color-warning-soft);
  color: var(--color-warning-strong);
}

.compare-chip__id {
  font-weight: var(--fw-regular);
}

.compare-chip__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.compare-chip__remove:hover {
  background: rgba(0, 0, 0, 0.06);
}

.compare-section__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.compare-section__min {
  font-weight: var(--fw-semibold);
  color: var(--color-warning-strong);
}

.compare-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4) var(--space-6);
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

.compare-dock {
  position: fixed;
  right: var(--space-5);
  bottom: var(--space-5);
  z-index: 1020;
}

.compare-dock__link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 var(--space-5);
  border-radius: var(--radius-pill);
  background: var(--color-heading);
  color: #fff;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  text-decoration: none;
  box-shadow: var(--shadow-lg);
}

.compare-dock__link:hover {
  color: #fff;
  background: var(--color-primary-strong);
}

@media (max-width: 767.98px) {
  .compare-controls__actions {
    margin-left: 0;
  }
  .compare-dock {
    right: var(--space-4);
    left: var(--space-4);
    bottom: var(--space-4);
  }
  .compare-dock__link {
    justify-content: center;
    width: 100%;
  }
}
</style>

<script setup lang="ts">
/**
 * 공고 목록 본체: 검색, 필터, 정렬, 결과.
 * 공고가 없으면 가짜 카드 대신 빈 상태를 보여 주고, 정렬은 이유와 함께 비활성화한다.
 * 비교 선택은 모든 화면이 공유하는 useCompareSelection으로 관리한다 (비교 영역은 전체 공고 하단).
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { IconAdjustmentsHorizontal, IconRefresh, IconSearch, IconX } from '@tabler/icons-vue'
import type { ProgramSort } from '@/types/program'
import type { EligibilityStatus } from '@/types/results'
import { SORT_OPTIONS, ELIGIBILITY_STATUS_OPTIONS } from '@/constants/options'
import { useProgramFilters } from '@/composables/useProgramFilters'
import { useProgramList } from '@/composables/useProgramList'
import { COMPARE_FULL_MESSAGE, useCompareSelection } from '@/composables/useCompareSelection'
import { evaluateEligibility } from '@/lib/engine/eligibility'
import { useProfileStore } from '@/stores/profileStore'
import { useToast } from '@/stores/toastStore'
import DataValue from '@/components/common/DataValue.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import AppModal from '@/components/common/AppModal.vue'
import TabNav from '@/components/common/TabNav.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import type { TabItem } from '@/components/common/types'
import ProgramFilters from './ProgramFilters.vue'
import ProgramCard from './ProgramCard.vue'
import RecommendationCard from './RecommendationCard.vue'
import ProgramCardFieldGuide from './ProgramCardFieldGuide.vue'

const props = defineProps<{ mode: 'all' | 'recommended' }>()

const router = useRouter()
const store = useProfileStore()
const toast = useToast()
const selection = useCompareSelection()
const idPrefix = computed(() => `browser-${props.mode}`)

const defaultSort: ProgramSort = props.mode === 'recommended' ? 'recommended' : 'deadline'
const filters = useProgramFilters(defaultSort)
const { status, items, total, showLoading, reload, sourceConnected } = useProgramList(filters.query)

const keywordDraft = ref(filters.query.value.keyword ?? '')
watch(
  () => filters.query.value.keyword,
  (keyword) => {
    keywordDraft.value = keyword ?? ''
  },
)

const filtersOpen = ref(false)
const hasPrograms = computed(() => items.value.length > 0)

/* 맞춤 추천: 신청 자격 상태별 탭 */
type EligibilityTab = 'all' | EligibilityStatus
const eligibilityTab = ref<EligibilityTab>('all')
const eligibilityById = computed(() => {
  const map = new Map<string, EligibilityStatus | null>()
  for (const program of items.value) {
    map.set(program.id, evaluateEligibility(store.state.profile, program)?.status ?? null)
  }
  return map
})

function countFor(tab: EligibilityTab): number | null {
  if (!hasPrograms.value) return null
  if (tab === 'all') return items.value.length
  return items.value.filter((p) => eligibilityById.value.get(p.id) === tab).length
}

const eligibilityTabs = computed<TabItem<EligibilityTab>[]>(() => [
  { key: 'all', label: '전체', count: countFor('all') },
  ...ELIGIBILITY_STATUS_OPTIONS.map((option) => ({
    key: option.value,
    label: option.label,
    count: countFor(option.value),
  })),
])

const visibleItems = computed(() => {
  if (props.mode !== 'recommended') return items.value
  const filtered =
    eligibilityTab.value === 'all'
      ? items.value
      : items.value.filter((p) => eligibilityById.value.get(p.id) === eligibilityTab.value)
  // 신청 불가 공고는 다른 공고 뒤에 둔다 (순서는 그대로 유지).
  const ineligible = (id: string) => (eligibilityById.value.get(id) === 'ineligible' ? 1 : 0)
  return [...filtered].sort((a, b) => ineligible(a.id) - ineligible(b.id))
})

/* 비교 선택 (공통) */
function toggleCompare(id: string, checked: boolean): boolean {
  if (!checked) {
    selection.remove(id)
    return true
  }
  if (selection.add(id) === 'full') {
    toast.show(COMPARE_FULL_MESSAGE, 'warning')
    return false
  }
  return true
}

function addToCompareAndGo(id: string) {
  if (selection.add(id) === 'full') toast.show(COMPARE_FULL_MESSAGE, 'warning')
  void router.push(selection.compareLocation())
}

function onSortChange(event: Event) {
  filters.setSort((event.target as HTMLSelectElement).value as ProgramSort)
}

function submitSearch() {
  filters.setKeyword(keywordDraft.value)
}

const resultCountFormat = (n: number) => `${n}건`
</script>

<template>
  <div class="browser">
    <form class="browser__search surface-card" role="search" @submit.prevent="submitSearch">
      <label :for="`${idPrefix}-keyword`" class="visually-hidden">지원사업 검색어</label>
      <div class="search-field">
        <IconSearch :size="20" stroke-width="2" aria-hidden="true" class="search-field__icon" />
        <input
          :id="`${idPrefix}-keyword`"
          v-model="keywordDraft"
          type="search"
          class="form-control search-field__input"
          placeholder="사업명, 기관명, 지원 내용으로 검색"
          autocomplete="off"
        />
      </div>
      <button type="submit" class="btn btn-primary">검색</button>
      <button
        type="button"
        class="btn btn-secondary d-lg-none"
        aria-haspopup="dialog"
        :aria-expanded="filtersOpen"
        @click="filtersOpen = true"
      >
        <IconAdjustmentsHorizontal :size="18" stroke-width="2" aria-hidden="true" />
        필터<span v-if="filters.activeCount.value > 0"> {{ filters.activeCount.value }}</span>
      </button>
    </form>

    <div class="browser__layout">
      <aside class="browser__filters surface-card d-none d-lg-block" aria-label="공고 필터">
        <ProgramFilters
          :query="filters.query.value"
          :id-prefix="`${idPrefix}-desktop`"
          :active-count="filters.activeCount.value"
          @toggle="filters.toggle"
          @single="filters.setSingle"
          @reset="filters.reset"
        />
      </aside>

      <section class="browser__results" :aria-labelledby="`${idPrefix}-results-title`">
        <div class="results-bar surface-card">
          <div class="results-bar__top">
            <h2 :id="`${idPrefix}-results-title`" class="results-bar__title">
              {{ mode === 'recommended' ? '추천 결과' : '검색 결과' }}
              <span class="results-bar__count"><DataValue :value="total" :format="resultCountFormat" missing-label="건수 없음" /></span>
            </h2>
            <div class="results-bar__sort">
              <label :for="`${idPrefix}-sort`" class="results-bar__sort-label">정렬</label>
              <select
                :id="`${idPrefix}-sort`"
                class="form-select form-select-sm"
                :value="filters.query.value.sort"
                :disabled="!hasPrograms"
                :aria-describedby="!hasPrograms ? `${idPrefix}-sort-reason` : undefined"
                @change="onSortChange"
              >
                <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>
          <DisabledReason v-if="!hasPrograms" :id="`${idPrefix}-sort-reason`">
            정렬할 공고가 없어 정렬을 사용할 수 없습니다.
          </DisabledReason>

          <div v-if="filters.chips.value.length > 0" class="chips" aria-label="적용한 조건">
            <span class="chips__label">적용한 조건</span>
            <ul class="chips__list">
              <li v-for="chip in filters.chips.value" :key="chip.id">
                <button type="button" class="chip" :aria-label="`${chip.label} 조건 삭제`" @click="chip.remove">
                  {{ chip.label }}
                  <IconX :size="14" stroke-width="2.2" aria-hidden="true" />
                </button>
              </li>
            </ul>
            <button type="button" class="btn btn-ghost btn-sm" @click="filters.reset">
              <IconRefresh :size="16" stroke-width="2" aria-hidden="true" />
              필터 초기화
            </button>
          </div>
        </div>

        <TabNav
          v-if="mode === 'recommended'"
          v-model="eligibilityTab"
          :tabs="eligibilityTabs"
          label="신청 자격 상태별 보기"
          :id-prefix="`${idPrefix}-eligibility`"
        />

        <div
          :id="mode === 'recommended' ? `${idPrefix}-eligibility-panel` : undefined"
          :role="mode === 'recommended' ? 'tabpanel' : undefined"
          :aria-labelledby="mode === 'recommended' ? `${idPrefix}-eligibility-tab-${eligibilityTab}` : undefined"
          class="browser__list"
          :aria-busy="status === 'loading' ? 'true' : 'false'"
        >
          <p v-if="status === 'loading' && showLoading" class="loading-line" role="status">
            <span class="spinner-border spinner-border-sm" aria-hidden="true" />
            공고를 불러오는 중입니다.
          </p>

          <NoticeBanner v-else-if="status === 'error'" tone="danger" title="공고를 불러오지 못했습니다" alert>
            공고 API에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.
            <template #actions>
              <button type="button" class="btn btn-secondary btn-sm" @click="reload">다시 시도</button>
            </template>
          </NoticeBanner>

          <template v-else-if="status === 'ready'">
            <EmptyState
              v-if="!hasPrograms && (!sourceConnected || filters.activeCount.value === 0)"
              title="현재 등록된 지원사업 공고가 없습니다."
              :description="
                filters.activeCount.value > 0
                  ? '공고가 수집·검증되면 이곳에 표시됩니다. 지금 선택한 검색어와 필터는 공고가 등록된 후 적용됩니다.'
                  : '공고가 수집·검증되면 이곳에 표시됩니다. 검색어와 필터는 미리 설정해 볼 수 있습니다.'
              "
            >
              <ProgramCardFieldGuide :recommended="mode === 'recommended'" />
              <template #actions>
                <RouterLink
                  v-if="mode === 'recommended'"
                  :to="{ name: 'diagnose-input' }"
                  class="btn btn-secondary"
                >
                  기업정보 확인하기
                </RouterLink>
                <RouterLink v-else :to="{ name: 'programs-recommended' }" class="btn btn-secondary">
                  맞춤 추천 화면 보기
                </RouterLink>
              </template>
            </EmptyState>

            <EmptyState
              v-else-if="!hasPrograms"
              title="조건에 맞는 공고가 없습니다."
              description="검색어나 필터를 바꾸어 다시 찾아보세요."
            >
              <template #actions>
                <button type="button" class="btn btn-secondary" @click="filters.reset">필터 초기화</button>
              </template>
            </EmptyState>

            <EmptyState
              v-else-if="visibleItems.length === 0"
              title="이 상태에 해당하는 공고가 없습니다."
              description="다른 자격 상태 탭을 선택해 보세요."
              compact
            />

            <ul v-else class="program-list">
              <li v-for="program in visibleItems" :key="program.id">
                <RecommendationCard
                  v-if="mode === 'recommended'"
                  :program="program"
                  :in-compare="selection.has(program.id)"
                  @compare="addToCompareAndGo"
                />
                <ProgramCard
                  v-else
                  :program="program"
                  :selected="selection.has(program.id)"
                  :toggle-compare="toggleCompare"
                />
              </li>
            </ul>
          </template>
        </div>

      </section>
    </div>

    <AppModal v-model:open="filtersOpen" title="필터" placement="bottom">
      <ProgramFilters
        :query="filters.query.value"
        :id-prefix="`${idPrefix}-mobile`"
        :active-count="filters.activeCount.value"
        @toggle="filters.toggle"
        @single="filters.setSingle"
        @reset="filters.reset"
      />
      <template #footer>
        <button type="button" class="btn btn-primary w-100" @click="filtersOpen = false">
          필터 적용하고 닫기
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.browser {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
}

.browser__search {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-4);
}

.search-field {
  position: relative;
  flex: 1 1 260px;
}

.search-field__icon {
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  color: var(--color-muted);
  pointer-events: none;
}

.search-field__input {
  padding-left: 42px;
}

.browser__layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: var(--card-gap);
  align-items: start;
}

.browser__filters {
  position: sticky;
  top: calc(var(--header-height) + var(--space-5));
  padding: var(--space-5);
}

.browser__results {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.results-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
}

.results-bar__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.results-bar__title {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--fs-lg);
}

.results-bar__count {
  font-size: var(--fs-lg);
  color: var(--color-primary-strong);
}

.results-bar__sort {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.results-bar__sort-label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
  white-space: nowrap;
}

.results-bar__sort .form-select {
  min-height: 36px;
  min-width: 140px;
}

.results-bar :deep(.disabled-reason) {
  margin-top: 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.chips__label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-text);
}

.chips__list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 30px;
  padding: 0 8px 0 12px;
  border: 1px solid #cfe0fd;
  border-radius: var(--radius-pill);
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  cursor: pointer;
}

.chip:hover {
  border-color: var(--color-primary-strong);
}

.browser__list {
  min-height: 120px;
}

.loading-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  color: var(--color-text);
}

.program-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 991.98px) {
  .browser__layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 575.98px) {
  .browser__search .btn {
    flex: 1 1 auto;
  }
  .results-bar {
    padding: var(--space-4);
  }
  .results-bar__sort {
    width: 100%;
  }
  .results-bar__sort .form-select {
    flex: 1;
  }
}
</style>

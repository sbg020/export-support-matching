<script setup lang="ts">
/**
 * 맞춤 추천 목록 (REVISION_04 §4.4).
 * 검색·필터·정렬 없이, 전체 공고를 신청 자격 상태 탭 3개(신청 가능 · 확인 필요 · 신청 불가)로 나눈다.
 * 탭 안에서는 적합도 높은 순 → 마감 빠른 순 → ID 순이다. 탭은 주소의 ?tab=과 맞물린다.
 * 판정 결과가 없는 공고(자격 규칙 없음)는 어느 탭에도 넣지 않고 따로 알린다 (CLAUDE.md §2-1).
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { EligibilityStatus } from '@/types/results'
import { ELIGIBILITY_STATUS_OPTIONS } from '@/constants/options'
import { useProgramEvaluations } from '@/composables/useProgramEvaluations'
import { compareToggleMessage, useCompareSelection } from '@/composables/useCompareSelection'
import { compareRecommended } from '@/lib/engine/evaluateAll'
import { compareProgramIds } from '@/lib/programQuery'
import { isSourceConnected, programRepository } from '@/repositories'
import { useToast } from '@/stores/toastStore'
import { useProfileStore } from '@/stores/profileStore'
import EmptyState from '@/components/common/EmptyState.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import { financeSummary } from '@/lib/finance'
import TabNav from '@/components/common/TabNav.vue'
import type { TabItem } from '@/components/common/types'
import ProgramCardFieldGuide from './ProgramCardFieldGuide.vue'
import RecommendationCard from './RecommendationCard.vue'

const ID_PREFIX = 'recommend'
const TAB_KEYS: EligibilityStatus[] = ELIGIBILITY_STATUS_OPTIONS.map((option) => option.value)

const route = useRoute()
const router = useRouter()
const toast = useToast()
const selection = useCompareSelection()
const evaluation = useProgramEvaluations()
const profileStore = useProfileStore()
const sourceConnected = isSourceConnected(programRepository.source)
/** 기업 프로필을 하나도 입력하지 않았으면 탭 대신 입력 안내 (REVISION_05 §5.1) */
const profileEmpty = computed(() => profileStore.assessment.value.status === 'empty')
/** 마감이 지난 공고는 기본으로 숨긴다 */
const includeClosed = ref(false)
const closedCount = computed(() =>
  hasPrograms.value ? evaluation.programs.value.filter((p) => p.receptionStatus === 'closed').length : 0,
)
function visible(p: { receptionStatus: string | null }): boolean {
  return includeClosed.value || p.receptionStatus !== 'closed'
}

const loading = computed(() => sourceConnected && !evaluation.ready.value)
/** 보여 줄 공고가 있는지 (연결되어 있고, 다 읽었고, 1건 이상) */
const hasPrograms = computed(() => sourceConnected && evaluation.ready.value && evaluation.programs.value.length > 0)

function statusOf(id: string): EligibilityStatus | null {
  return evaluation.get(id)?.eligibility?.status ?? null
}

/** 탭별 건수. 공고가 없거나 계산 전이면 null (화면 '-', 0으로 표시하지 않는다) */
const counts = computed<Record<EligibilityStatus, number> | null>(() => {
  if (!hasPrograms.value) return null
  const result: Record<EligibilityStatus, number> = { eligible: 0, 'needs-check': 0, ineligible: 0 }
  for (const program of evaluation.programs.value) {
    if (!visible(program)) continue
    const status = statusOf(program.id)
    if (status) result[status] += 1
  }
  return result
})

/** 자격 규칙이 없어 판정하지 않은 공고 수 */
const unjudgedCount = computed(() =>
  hasPrograms.value ? evaluation.programs.value.filter((p) => statusOf(p.id) === null).length : 0,
)

function isTab(value: unknown): value is EligibilityStatus {
  return typeof value === 'string' && (TAB_KEYS as string[]).includes(value)
}

/** 기본 탭: 1건 이상인 첫 탭, 모두 0건이거나 '-'이면 신청 가능 */
const defaultTab = computed<EligibilityStatus>(() => {
  const c = counts.value
  return (c && TAB_KEYS.find((key) => c[key] > 0)) || 'eligible'
})

const activeTab = computed<EligibilityStatus>({
  get: () => (isTab(route.query.tab) ? route.query.tab : defaultTab.value),
  set: (tab) => {
    // 쿼리만 바꾸므로 스크롤 위치는 유지된다 (router scrollBehavior)
    // 탭을 바꾸면 첫 페이지로
    void router.replace({ query: { ...route.query, tab, page: undefined } })
  },
})

const tabs = computed<TabItem<EligibilityStatus>[]>(() =>
  ELIGIBILITY_STATUS_OPTIONS.map((option) => ({
    key: option.value,
    label: option.label,
    count: counts.value ? counts.value[option.value] : null,
  })),
)

const visibleItems = computed(() => {
  if (!hasPrograms.value) return []
  const evaluations = evaluation.evaluations.value
  return evaluation.programs.value
    .filter((p) => visible(p) && statusOf(p.id) === activeTab.value)
    .sort((a, b) => compareRecommended(a, b, evaluations, compareProgramIds))
})

/* 탭마다 10개씩 페이지로 나눈다 (?page=) */
const PAGE_SIZE = 10
const pageCount = computed(() => Math.max(1, Math.ceil(visibleItems.value.length / PAGE_SIZE)))
const page = computed(() => {
  const n = Number(Array.isArray(route.query.page) ? route.query.page[0] : route.query.page)
  return Number.isInteger(n) && n >= 1 ? Math.min(n, pageCount.value) : 1
})
const pageItems = computed(() => visibleItems.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
/** 보여 줄 페이지 번호 (최대 5개, 지금 페이지를 가운데로) */
const pageNumbers = computed(() => {
  const total = pageCount.value
  const start = Math.max(1, Math.min(page.value - 2, total - 4))
  return Array.from({ length: Math.min(5, total) }, (_, i) => start + i)
})
const listTop = ref<HTMLElement | null>(null)
function goPage(n: number) {
  if (n < 1 || n > pageCount.value || n === page.value) return
  void router.replace({ query: { ...route.query, page: n === 1 ? undefined : String(n) } })
  listTop.value?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
}

const SORT_NOTES: Record<EligibilityStatus, string> = {
  eligible: '적합도가 높은 순으로, 같으면 마감이 가까운 순으로 보여 드립니다.',
  'needs-check': '확인할 주요 조건이 적은 순으로, 같으면 마감이 가까운 순으로 보여 드립니다.',
  ineligible: '마감이 가까운 순으로 보여 드립니다.',
}
const sortNote = computed(() => SORT_NOTES[activeTab.value])

/** 재무제표 금액(6개) 중 빠진 것이 있으면 적합도의 재무 요소가 0점이라 알린다 */
const financeMissing = computed(() => financeSummary(profileStore.state.profile).status !== 'complete')

/** 카드의 '비교에 추가': 화면을 이동하지 않고 선택만 바꾼다 */
function toggleCompare(id: string) {
  const result = selection.toggle(id)
  toast.show(compareToggleMessage(result, selection.count.value), result === 'full' ? 'warning' : 'success')
}
</script>

<template>
  <section class="recommend" aria-labelledby="recommend-title">
    <h2 id="recommend-title" class="visually-hidden">추천 공고</h2>

    <EmptyState
      v-if="profileEmpty && hasPrograms"
      title="기업 정보를 입력하면 공고를 신청 자격별로 나눠 보여 드립니다."
      description="업종·소재지·매출액·수출실적을 입력하면 게시된 공고를 신청 가능 · 확인 필요 · 신청 불가로 나눕니다."
    >
      <template #actions>
        <RouterLink :to="{ name: 'company-profile' }" class="btn btn-primary">기업정보 입력하기</RouterLink>
      </template>
    </EmptyState>

    <template v-else>
    <NoticeBanner v-if="financeMissing" tone="warning" title="재무 정보를 입력하지 않았습니다">
      전기 매출액·영업이익·당기순이익·부채총계·자본총계를 입력하지 않아 적합도의 재무 요소(비중 25%)가 0점으로 계산됩니다.
      기업 프로필의 '기업 규모' 단계에서 입력하면 재무 유형에 맞춰 적합도를 다시 계산합니다.
      <template #actions>
        <RouterLink :to="{ name: 'company-profile', query: { step: '2' } }" class="btn btn-secondary btn-sm">재무 정보 입력하기</RouterLink>
      </template>
    </NoticeBanner>
    <TabNav v-model="activeTab" :tabs="tabs" label="신청 자격 상태별 보기" :id-prefix="ID_PREFIX" />
    <div v-if="hasPrograms" class="recommend__options">
      <label class="form-check recommend__closed">
        <input v-model="includeClosed" type="checkbox" class="form-check-input" />
        <span class="form-check-label">마감 공고 포함</span>
      </label>
      <span class="fs-sm text-muted-strong">
        게시 공고 {{ evaluation.programs.value.length }}건 중 마감 {{ closedCount }}건{{ includeClosed ? ' 포함' : '은 숨김' }}
      </span>
    </div>

    <p v-if="unjudgedCount > 0" class="recommend__unjudged">
      자격 조건이 등록되지 않아 판정하지 않은 공고 {{ unjudgedCount }}건이 있습니다.
      <RouterLink :to="{ name: 'programs' }">전체 공고에서 보기</RouterLink>
    </p>

    <p class="recommend__sort-note">{{ sortNote }}</p>

    <div
      :id="`${ID_PREFIX}-panel`"
      role="tabpanel"
      :aria-labelledby="`${ID_PREFIX}-tab-${activeTab}`"
      class="recommend__panel"
      :aria-busy="loading ? 'true' : 'false'"
    >
      <p v-if="loading" class="recommend__loading" role="status">
        <span class="spinner-border spinner-border-sm" aria-hidden="true" />
        공고를 불러오는 중입니다.
      </p>

      <EmptyState
        v-else-if="!hasPrograms"
        title="현재 등록된 지원사업 공고가 없습니다."
        description="공고가 등록되면 입력한 기업정보를 기준으로 이곳에 추천합니다."
      >
        <ProgramCardFieldGuide recommended />
        <template #actions>
          <RouterLink :to="{ name: 'company-profile' }" class="btn btn-secondary">기업정보 확인하기</RouterLink>
        </template>
      </EmptyState>

      <EmptyState
        v-else-if="visibleItems.length === 0"
        title="이 상태에 해당하는 공고가 없습니다."
        description="다른 신청 자격 탭을 선택해 보세요."
        compact
      />

      <ul v-else ref="listTop" class="recommend__list">
        <li v-for="program in pageItems" :key="program.id">
          <RecommendationCard
            :program="program"
            :evaluation="evaluation.get(program.id)"
            :as-of="evaluation.asOf"
            :in-compare="selection.has(program.id)"
            @compare="toggleCompare"
          />
        </li>
      </ul>
      <nav v-if="visibleItems.length > PAGE_SIZE" class="recommend__pager" aria-label="공고 목록 페이지">
        <button type="button" class="recommend__page-btn" :disabled="page === 1" @click="goPage(page - 1)">&lt; 이전</button>
        <button
          v-for="n in pageNumbers"
          :key="n"
          type="button"
          class="recommend__page-btn recommend__page-num"
          :class="{ 'is-current': n === page }"
          :aria-current="n === page ? 'page' : undefined"
          :aria-label="`${n}쪽`"
          @click="goPage(n)"
        >
          {{ n }}
        </button>
        <button type="button" class="recommend__page-btn" :disabled="page === pageCount" @click="goPage(page + 1)">다음 &gt;</button>
      </nav>
    </div>
    </template>
  </section>
</template>

<style scoped>
.recommend {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.recommend__unjudged {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.recommend__unjudged a {
  margin-left: var(--space-2);
  font-weight: var(--fw-semibold);
}

.recommend__options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.recommend__closed {
  margin: 0;
}

.recommend__sort-note {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.recommend__panel {
  min-height: 120px;
}

.recommend__loading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  color: var(--color-text);
}

.recommend__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}
.recommend__pager {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: var(--space-5);
}

.recommend__page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-heading);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}

.recommend__page-btn:hover:not(:disabled) {
  border-color: var(--color-heading);
}

.recommend__page-btn:disabled {
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.recommend__page-num.is-current {
  border-color: var(--color-heading);
  background: var(--color-heading);
  color: #fff;
}
</style>

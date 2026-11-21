<script setup lang="ts">
/**
 * 공고 관리 (REVISION_04 §11). 출처·상태 필터와 검색은 주소 쿼리(source, status, q, page)와 맞물리고 실제로 동작한다.
 * 목록·중복 병합·수정공고 버전은 저장소 연결 후 채워진다. 맨 아래 검수 완료 데이터 일괄 반영(#bulk).
 */
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconSearch, IconUpload } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import DataValue from '@/components/common/DataValue.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import StoreButton from '@/components/admin/StoreButton.vue'
import AnswerSetSection from '@/components/admin/AnswerSetSection.vue'
import {
  ADMIN_NOTICE_PAGE_SIZE,
  ADMIN_SOURCE_FILTERS,
  ADMIN_STATUS_FILTERS,
  adminSourceLabel,
  adminStatusLabel,
  type AdminSourceFilter,
  type AdminStatusFilter,
} from '@/constants/adminOptions'
import { formatDateTime } from '@/lib/display'
import { adminRepository } from '@/repositories/admin'
import type { AdminNoticeList, AdminNoticeQuery, AdminNoticeSummary, DuplicateGroup } from '@/types/admin'

const route = useRoute()
const router = useRouter()

function queryString(key: string): string | null {
  const value = route.query[key]
  return typeof value === 'string' && value !== '' ? value : null
}

const source = computed<AdminSourceFilter>({
  get: () => (ADMIN_SOURCE_FILTERS.find((o) => o.value === queryString('source'))?.value ?? 'all'),
  set: (value) => setQuery({ source: value === 'all' ? undefined : value, page: undefined }),
})
const status = computed<AdminStatusFilter>({
  get: () => (ADMIN_STATUS_FILTERS.find((o) => o.value === queryString('status'))?.value ?? 'all'),
  set: (value) => setQuery({ status: value === 'all' ? undefined : value, page: undefined }),
})
const page = computed(() => Math.max(1, Number.parseInt(queryString('page') ?? '1', 10) || 1))
const keywordDraft = ref(queryString('q') ?? '')
watch(
  () => route.query.q,
  () => {
    keywordDraft.value = queryString('q') ?? ''
  },
)

function setQuery(patch: Record<string, string | undefined>) {
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries({ ...route.query, ...patch })) {
    if (typeof value === 'string' && value !== '') next[key] = value
  }
  void router.replace({ query: next, hash: route.hash })
}

function submitSearch() {
  setQuery({ q: keywordDraft.value.trim() || undefined, page: undefined })
}

const query = computed<AdminNoticeQuery>(() => ({
  source: source.value === 'all' ? null : source.value,
  status: status.value === 'all' ? null : status.value,
  keyword: queryString('q'),
  page: page.value,
}))

/** 일괄 게시 대상 수 (검수 대기 자동 추출 공고) */
const pendingCount = ref<number | null>(null)
void adminRepository.getDashboard().then((d) => {
  pendingCount.value = d.pendingReview
})

const list = shallowRef<AdminNoticeList>({ items: [], total: null })
watch(
  query,
  async (value) => {
    list.value = await adminRepository.listNotices(value)
  },
  { immediate: true, deep: true },
)

const duplicates = shallowRef<DuplicateGroup[]>([])
void adminRepository.listDuplicateGroups().then((groups) => {
  duplicates.value = groups
})

const selectedNotice = ref<AdminNoticeSummary | null>(null)
const pageCount = computed(() =>
  list.value.total === null ? null : Math.max(1, Math.ceil(list.value.total / ADMIN_NOTICE_PAGE_SIZE)),
)
/** 건수 숫자 (단위 '건'은 템플릿에 붙인다: 저장소 연결 전 '전체 -건 중 -건 표시') */
const countNumber = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="page">
    <PageHeader
      title="공고 관리"
      description="수집한 모든 공고를 출처와 상태별로 관리합니다. 중복 공고를 합치고, 수정공고의 버전을 확인합니다."
    >
      <template #actions>
        <RouterLink :to="{ hash: '#bulk', query: route.query }" class="btn btn-secondary">
          <IconUpload :size="18" stroke-width="2" aria-hidden="true" />
          검수 완료 데이터 올리기
        </RouterLink>
      </template>
    </PageHeader>

    <div class="stack">
      <SectionCard
        title="자동 추출 공고 일괄 게시"
        heading-id="notices-bulk-publish-title"
        description="공고 폴더 적재·수집으로 들어온 '검수 대기' 자동 추출 공고를 한꺼번에 게시합니다. 게시된 공고에는 '자동 추출 · 검수 전' 배지가 붙고, 개별 검수해 승인하면 배지가 사라집니다."
      >
        <p class="mb-2">
          게시 대상: 자동 추출 · 검수 대기 공고 <strong><DataValue :value="pendingCount" :format="(n: number) => `${n}건`" /></strong>
          (텍스트 추출 불가 공고는 게시하지 않습니다)
        </p>
        <StoreButton
          label="자동 추출 공고 일괄 게시"
          variant="primary"
          reason="서버 저장소가 없어 화면에서 게시할 수 없습니다. 로컬에서 'python manage.py publish_auto_extracted'(대상 건수 확인 후 실행)로 게시하고 스냅샷을 다시 배포합니다."
        />
      </SectionCard>

      <SectionCard title="공고 목록" heading-id="notices-list-title">
        <div class="filters">
          <div class="filters__group">
            <span class="filters__label" aria-hidden="true">출처</span>
            <SegmentedControl v-model="source" :options="ADMIN_SOURCE_FILTERS" label="출처" />
          </div>
          <div class="filters__group">
            <span class="filters__label" aria-hidden="true">상태</span>
            <SegmentedControl v-model="status" :options="ADMIN_STATUS_FILTERS" label="상태" />
          </div>
          <form class="filters__search" role="search" @submit.prevent="submitSearch">
            <label for="notices-keyword" class="visually-hidden">공고명 또는 주관기관 검색</label>
            <input
              id="notices-keyword"
              v-model="keywordDraft"
              type="search"
              class="form-control"
              placeholder="공고명 또는 주관기관"
              autocomplete="off"
            />
            <button type="submit" class="btn btn-primary">
              <IconSearch :size="18" stroke-width="2" aria-hidden="true" />
              검색
            </button>
          </form>
        </div>
        <p class="list-count" role="status">
          전체 <DataValue :value="list.total" :format="countNumber" />건 중
          <DataValue :value="list.total === null ? null : list.items.length" :format="countNumber" />건 표시
        </p>
        <AdminTable
          label="공고 목록"
          :columns="['공고', '출처', '상태', '마감', '버전', '검토일', '동작']"
          :row-count="list.items.length"
          empty-title="표시할 공고가 없습니다."
        >
          <tr v-for="notice in list.items" :key="notice.id">
            <th scope="row"><DataValue :value="notice.title" missing-label="공고명 없음" /></th>
            <td>{{ adminSourceLabel(notice.source) }}</td>
            <td><StatusBadge :label="adminStatusLabel(notice.status)" size="sm" /></td>
            <td><DataValue :value="notice.applyEnd ?? notice.applyPeriodNote" /></td>
            <td>
              <button type="button" class="btn btn-ghost btn-sm" @click="selectedNotice = notice">v{{ notice.version }}</button>
            </td>
            <td><DataValue :value="notice.reviewedAt" :format="formatDateTime" /></td>
            <td>
              <RouterLink
                v-if="notice.status === 'pending-review'"
                :to="{ name: 'admin-review', query: { id: notice.id } }"
                class="btn btn-ghost btn-sm"
              >
                검수
              </RouterLink>
              <StoreButton v-else-if="notice.status === 'published'" label="게시 중지" size="sm" quiet-reason />
              <StoreButton v-else-if="notice.status === 'suspended'" label="다시 게시" size="sm" quiet-reason />
            </td>
          </tr>
        </AdminTable>
        <p v-if="pageCount !== null && pageCount > 1" class="fs-sm mt-2 mb-0">{{ page }} / {{ pageCount }}쪽</p>
        <p class="fs-sm text-muted-strong mt-3 mb-0">
          게시 중지한 공고는 사용자 맞춤 추천과 전체 공고에서 바로 빠집니다. 관심 공고로 저장한 기업은 그 공고를 다시 열 때
          게시 중지 안내를 봅니다.
        </p>
      </SectionCard>

      <div class="grid-12">
        <SectionCard class="col-span-12 lg-span-6" title="중복 병합" heading-id="notices-duplicates-title">
          <EmptyState v-if="duplicates.length === 0" title="중복 의심 공고가 없습니다." compact :level="3" />
          <ul v-else class="dup-list">
            <li v-for="group in duplicates" :key="group.id" class="dup-list__item">
              <ul>
                <li v-for="notice in group.notices" :key="notice.id">
                  {{ adminSourceLabel(notice.source) }} · {{ formatDateTime(notice.collectedAt) }} ·
                  <DataValue :value="notice.title" />
                </li>
              </ul>
              <p class="fs-sm mb-2">{{ group.reason }}</p>
              <div class="action-row">
                <StoreButton label="다른 공고로 유지" size="sm" quiet-reason />
                <StoreButton label="하나로 병합" size="sm" variant="primary" quiet-reason />
              </div>
            </li>
          </ul>
        </SectionCard>
        <SectionCard class="col-span-12 lg-span-6" title="수정공고 버전" heading-id="notices-versions-title">
          <p class="fs-sm">
            {{ selectedNotice ? '선택한 공고의 버전 이력입니다.' : '공고를 선택하면 버전 이력을 보여 드립니다.' }}
            사용자에게는 최신 버전만 보입니다.
          </p>
          <div class="action-row">
            <StoreButton label="두 버전 비교" size="sm" :blocked="!selectedNotice" reason="공고를 선택하면 사용할 수 있습니다." />
            <StoreButton label="원문 보기" size="sm" :blocked="!selectedNotice" reason="공고를 선택하면 사용할 수 있습니다." />
          </div>
        </SectionCard>
      </div>

      <AnswerSetSection />
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.filters__group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
}

.filters__label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.filters__group :deep(.segmented) {
  overflow-x: auto;
}

.filters__search {
  display: flex;
  gap: var(--space-2);
  flex: 1 1 260px;
}

.list-count {
  margin: 0 0 var(--space-3);
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.dup-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.dup-list__item {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
</style>

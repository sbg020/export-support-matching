<script setup lang="ts">
/**
 * 기업마당 API에서 받아 둔 수출 분야 공고 목록 (src/data/published/bizinfo-collection.json).
 * 검색·분야 필터·쪽 나눔은 브라우저 안에서만 하고 서버나 기업마당을 다시 부르지 않는다.
 * API가 준 값만 보여 주며, 없는 값은 '-'로 둔다.
 */
import { computed, ref, watch } from 'vue'
import { IconChevronDown, IconChevronUp, IconSearch } from '@tabler/icons-vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import DataValue from '@/components/common/DataValue.vue'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import { formatDate, formatDateTime } from '@/lib/display'
import type { BizinfoCollectedNotice } from '@/types/admin'

const props = defineProps<{ items: BizinfoCollectedNotice[] }>()

const PAGE_SIZE = 20
const ALL = '__all__'

const subcategory = ref<string>(ALL)
const keywordDraft = ref('')
const keyword = ref('')
const page = ref(1)
const openId = ref<string | null>(null)

const subcategoryOptions = computed(() => {
  const names = [...new Set(props.items.map((n) => n.subcategory).filter((v): v is string => v !== null))]
  return [{ value: ALL, label: '전체' }, ...names.map((name) => ({ value: name, label: name }))]
})

function haystack(n: BizinfoCollectedNotice): string {
  return [n.title, n.ministry, n.agency, n.target, n.summaryText, ...(n.hashtags ?? [])]
    .filter((v): v is string => v !== null)
    .join('\n')
    .toLowerCase()
}

const filtered = computed(() => {
  const words = keyword.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return props.items.filter((n) => {
    if (subcategory.value !== ALL && n.subcategory !== subcategory.value) return false
    if (words.length === 0) return true
    const text = haystack(n)
    return words.every((w) => text.includes(w))
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const pageItems = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))

watch([subcategory, keyword], () => {
  page.value = 1
  openId.value = null
})

function submitSearch() {
  keyword.value = keywordDraft.value
}

function goPage(n: number) {
  page.value = Math.min(pageCount.value, Math.max(1, n))
  openId.value = null
}

function toggle(id: string) {
  openId.value = openId.value === id ? null : id
}

function periodText(n: BizinfoCollectedNotice): string | null {
  if (n.applyStart && n.applyEnd) return `${formatDate(n.applyStart)} ~ ${formatDate(n.applyEnd)}`
  return n.applyPeriodText
}

function institutionText(n: BizinfoCollectedNotice): string | null {
  const parts = [n.ministry, n.agency].filter((v): v is string => v !== null)
  return parts.length > 0 ? parts.join(' · ') : null
}

function categoryText(n: BizinfoCollectedNotice): string | null {
  const parts = [n.category, n.subcategory].filter((v): v is string => v !== null)
  return parts.length > 0 ? parts.join(' · ') : null
}

function attachmentsText(n: BizinfoCollectedNotice): string | null {
  const names = [n.printFileName, ...(n.attachmentNames ?? [])].filter((v): v is string => v !== null)
  return names.length > 0 ? [...new Set(names)].join(', ') : null
}

const countNumber = (n: number) => n.toLocaleString('ko-KR')
</script>

<template>
  <div class="bizinfo-collected">
    <div class="filters">
      <div class="filters__group">
        <span class="filters__label" aria-hidden="true">지원분야(중분류)</span>
        <SegmentedControl v-model="subcategory" :options="subcategoryOptions" label="지원분야(중분류)" />
      </div>
      <form class="filters__search" role="search" @submit.prevent="submitSearch">
        <label for="bizinfo-collected-keyword" class="visually-hidden">공고명·기관·해시태그 검색</label>
        <input
          id="bizinfo-collected-keyword"
          v-model="keywordDraft"
          type="search"
          class="form-control"
          placeholder="공고명, 기관, 해시태그"
          autocomplete="off"
        />
        <button type="submit" class="btn btn-primary">
          <IconSearch :size="18" stroke-width="2" aria-hidden="true" />
          검색
        </button>
      </form>
    </div>

    <p class="list-count" role="status">
      전체 {{ countNumber(items.length) }}건 중 {{ countNumber(filtered.length) }}건
    </p>

    <AdminTable
      label="수집한 공고"
      :columns="['공고명', '소관·수행기관', '지원분야', '신청기간', '기업마당 등록일', '상세']"
      :row-count="pageItems.length"
      empty-title="조건에 맞는 공고가 없습니다."
      empty-description="검색어나 지원분야를 바꿔 보세요."
    >
      <template v-for="notice in pageItems" :key="notice.id">
        <tr>
          <th scope="row">
            <a v-if="notice.sourceUrl" :href="notice.sourceUrl" target="_blank" rel="noopener noreferrer">
              <DataValue :value="notice.title" missing-label="공고명 없음" />
              <span class="visually-hidden">(기업마당 원문, 새 창)</span>
            </a>
            <DataValue v-else :value="notice.title" missing-label="공고명 없음" />
          </th>
          <td><DataValue :value="institutionText(notice)" /></td>
          <td><DataValue :value="notice.subcategory" /></td>
          <td><DataValue :value="periodText(notice)" /></td>
          <td><DataValue :value="notice.registeredAt" :format="formatDate" /></td>
          <td>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              :aria-expanded="openId === notice.id"
              :aria-controls="`bizinfo-detail-${notice.id}`"
              @click="toggle(notice.id)"
            >
              <component :is="openId === notice.id ? IconChevronUp : IconChevronDown" :size="16" stroke-width="2" aria-hidden="true" />
              {{ openId === notice.id ? '접기' : '보기' }}
            </button>
          </td>
        </tr>
        <tr v-if="openId === notice.id" :id="`bizinfo-detail-${notice.id}`" class="detail-row">
          <td colspan="6">
            <InfoList :columns="2" compact>
              <InfoRow label="기업마당 공고 ID" :value="notice.id" />
              <InfoRow label="지원분야" :value="categoryText(notice)" />
              <InfoRow label="지원 대상" :value="notice.target" />
              <InfoRow label="신청기간(원문)" :value="notice.applyPeriodText" />
              <InfoRow label="접수 사이트">
                <a v-if="notice.applicationUrl" :href="notice.applicationUrl" target="_blank" rel="noopener noreferrer">
                  {{ notice.applicationUrl }}
                  <span class="visually-hidden">(새 창)</span>
                </a>
                <DataValue v-else :value="null" />
              </InfoRow>
              <InfoRow label="문의처" :value="notice.contact" />
              <InfoRow label="기업마당 수정 시각" :value="notice.updatedAt" :format="formatDateTime" />
              <InfoRow label="조회수" :value="notice.viewCount" :format="countNumber" />
            </InfoList>
            <InfoList compact>
              <InfoRow label="사업개요" stacked>
                <span class="pre-line"><DataValue :value="notice.summaryText" /></span>
              </InfoRow>
              <InfoRow label="신청방법" stacked>
                <span class="pre-line"><DataValue :value="notice.applicationMethod" /></span>
              </InfoRow>
              <InfoRow label="해시태그" :value="notice.hashtags ? notice.hashtags.join(', ') : null" />
              <InfoRow label="첨부파일" :value="attachmentsText(notice)" hint="파일은 기업마당 원문 페이지에서 내려받습니다." />
            </InfoList>
          </td>
        </tr>
      </template>
    </AdminTable>

    <nav v-if="pageCount > 1" class="pager" aria-label="수집한 공고 페이지">
      <button type="button" class="btn btn-ghost btn-sm" :disabled="page === 1" @click="goPage(page - 1)">&lt; 이전</button>
      <span class="fs-sm">{{ page }} / {{ pageCount }}쪽</span>
      <button type="button" class="btn btn-ghost btn-sm" :disabled="page === pageCount" @click="goPage(page + 1)">다음 &gt;</button>
    </nav>
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

.detail-row td {
  background: var(--color-surface-sunken);
}

.pre-line {
  white-space: pre-line;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
</style>

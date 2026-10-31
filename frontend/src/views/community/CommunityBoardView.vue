<script setup lang="ts">
/**
 * 커뮤니티 게시판 목록 (지원사업 후기 · 지원사업 정보방). REVISION_02 §10.2~10.7
 *
 * 게시글을 저장할 서버와 회원 DB가 아직 없어 목록은 빈 상태다. 예시 글이나 가짜 글을 만들지 않는다.
 * 검색·정렬·말머리·연결 공고는 주소(쿼리)에 담아 서버가 연결되면 그대로 쓰게 한다.
 * 글쓰기: 비로그인이면 로그인 화면으로 갔다가 같은 게시판으로 돌아온다. 로그인 회원에게는 이유와 함께 비활성이다.
 */
import { computed, ref, useId, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { IconPencil, IconSearch, IconX } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import CommunityPostList from '@/components/community/CommunityPostList.vue'
import {
  COMMUNITY_BOARDS,
  COMMUNITY_PAGE_SIZE,
  COMMUNITY_SORT_OPTIONS,
  COMMUNITY_WRITE_DISABLED_REASON,
  REVIEW_WRITE_RULE,
  WEEKLY_POPULAR_MIN_POSTS,
} from '@/constants/community'
import { communityRepository } from '@/repositories/communityRepository'
import { programRepository } from '@/repositories'
import { useAuth } from '@/stores/authStore'
import { programTitleText } from '@/lib/programDisplay'
import type { CommunityBoard, CommunityListResult, CommunityQuery, CommunitySort } from '@/types/community'

const props = defineProps<{ board: CommunityBoard }>()

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const definition = computed(() => COMMUNITY_BOARDS[props.board])
const authenticated = computed(() => auth.state.status === 'authenticated')
const uid = useId()

function firstString(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null
}

const query = computed<CommunityQuery>(() => {
  const sort = firstString(route.query.sort)
  const category = firstString(route.query.cat)
  const page = Number(firstString(route.query.page) ?? '1')
  return {
    board: props.board,
    keyword: firstString(route.query.q),
    searchScope: firstString(route.query.scope) === 'title-body' ? 'title-body' : 'title',
    sort: COMMUNITY_SORT_OPTIONS.some((o) => o.value === sort) ? (sort as CommunitySort) : 'latest',
    category: definition.value.categories.some((c) => c.value === category) ? category : null,
    programId: firstString(route.query.program),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
})

function write(patch: Partial<Record<'q' | 'scope' | 'sort' | 'cat' | 'program' | 'page', string | null>>) {
  const next: LocationQueryRaw = { ...route.query }
  for (const [key, value] of Object.entries(patch)) next[key] = value ?? undefined
  if (!('page' in patch)) next.page = undefined
  void router.replace({ query: next })
}

const keywordDraft = ref(query.value.keyword ?? '')
watch(
  () => query.value.keyword,
  (keyword) => {
    keywordDraft.value = keyword ?? ''
  },
)

const result = ref<CommunityListResult | null>(null)
watch(
  query,
  async (current) => {
    result.value = await communityRepository.list(current)
  },
  { immediate: true },
)

/** 연결 공고 필터의 공고 이름 */
const programTitle = ref<string | null>(null)
watch(
  () => query.value.programId,
  async (id) => {
    programTitle.value = null
    if (!id) return
    try {
      programTitle.value = programTitleText(await programRepository.getById(id))
    } catch {
      programTitle.value = null
    }
  },
  { immediate: true },
)

const showPopular = computed(() => (result.value?.weeklyPopular.length ?? 0) >= WEEKLY_POPULAR_MIN_POSTS)
const pageCount = computed(() => {
  const total = result.value?.total ?? null
  return total === null ? null : Math.max(1, Math.ceil(total / COMMUNITY_PAGE_SIZE))
})
const firstNumber = computed(() => {
  const total = result.value?.total ?? null
  return total === null ? null : total - (query.value.page - 1) * COMMUNITY_PAGE_SIZE
})

const writeReasonId = `${uid}-write-reason`
const writeDisabled = computed(() => authenticated.value && !communityRepository.connected)

async function onWrite() {
  if (!authenticated.value) {
    await router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  if (communityRepository.connected) await router.push({ name: 'community-write', params: { board: props.board } })
}
</script>

<template>
  <div class="page">
    <PageHeader :title="definition.label" :description="definition.description" />

    <div class="stack">
      <NoticeBanner v-if="!communityRepository.connected" tone="neutral" title="커뮤니티는 화면만 준비되어 있습니다">
        {{ COMMUNITY_WRITE_DISABLED_REASON }} 글은 서버가 연결된 뒤 모든 방문자에게 같은 목록으로 보입니다.
        <template v-if="board === 'reviews'"> {{ REVIEW_WRITE_RULE }}</template>
      </NoticeBanner>

      <div class="board-tools surface-card">
        <form class="board-tools__search" role="search" @submit.prevent="write({ q: keywordDraft.trim() || null })">
          <label :for="`${uid}-scope`" class="visually-hidden">검색 범위</label>
          <select
            :id="`${uid}-scope`"
            class="form-select board-tools__scope"
            :value="query.searchScope"
            @change="write({ scope: ($event.target as HTMLSelectElement).value === 'title-body' ? 'title-body' : null })"
          >
            <option value="title">제목</option>
            <option value="title-body">제목+내용</option>
          </select>
          <label :for="`${uid}-keyword`" class="visually-hidden">검색어</label>
          <input
            :id="`${uid}-keyword`"
            v-model="keywordDraft"
            type="search"
            class="form-control"
            placeholder="검색어를 입력하세요"
            autocomplete="off"
          />
          <button type="submit" class="btn btn-secondary">
            <IconSearch :size="18" stroke-width="2" aria-hidden="true" />
            검색
          </button>
        </form>
        <div class="board-tools__filters">
          <label :for="`${uid}-sort`" class="visually-hidden">정렬</label>
          <select
            :id="`${uid}-sort`"
            class="form-select form-select-sm"
            :value="query.sort"
            @change="write({ sort: ($event.target as HTMLSelectElement).value === 'latest' ? null : ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="option in COMMUNITY_SORT_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <label :for="`${uid}-cat`" class="visually-hidden">말머리</label>
          <select
            :id="`${uid}-cat`"
            class="form-select form-select-sm"
            :value="query.category ?? ''"
            @change="write({ cat: ($event.target as HTMLSelectElement).value || null })"
          >
            <option value="">전체 말머리</option>
            <option v-for="option in definition.categories" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <div class="board-tools__write">
            <button
              type="button"
              class="btn btn-primary btn-sm"
              :aria-disabled="writeDisabled ? 'true' : undefined"
              :aria-describedby="writeDisabled ? writeReasonId : undefined"
              @click="onWrite"
            >
              <IconPencil :size="16" stroke-width="2" aria-hidden="true" />
              글쓰기
            </button>
          </div>
        </div>
        <DisabledReason v-if="writeDisabled" :id="writeReasonId">
          {{ COMMUNITY_WRITE_DISABLED_REASON }}<template v-if="board === 'reviews'"> {{ REVIEW_WRITE_RULE }}</template>
          <RouterLink :to="{ name: 'community-write', params: { board } }" class="ms-1">글쓰기 양식 미리 보기</RouterLink>
        </DisabledReason>
        <p v-else-if="!authenticated" class="board-tools__note">글쓰기는 로그인한 회원만 할 수 있습니다. 읽기는 로그인 없이 할 수 있습니다.</p>

        <p v-if="query.programId" class="board-tools__program">
          연결 공고: <strong>{{ programTitle ?? query.programId }}</strong>
          <button type="button" class="btn btn-ghost btn-sm" @click="write({ program: null })">
            <IconX :size="14" stroke-width="2" aria-hidden="true" />
            공고 조건 지우기
          </button>
        </p>
      </div>

      <section v-if="showPopular && result" class="surface-card board-section" aria-labelledby="popular-title">
        <h2 id="popular-title" class="board-section__title">주간 인기글</h2>
        <CommunityPostList :board="board" :posts="result.weeklyPopular.slice(0, 5)" compact />
      </section>

      <section class="surface-card board-section" aria-labelledby="posts-title">
        <h2 id="posts-title" class="board-section__title">글 목록</h2>
        <CommunityPostList
          :board="board"
          :posts="result?.items ?? []"
          :notices="result?.notices ?? []"
          :first-number="firstNumber"
        />
        <nav v-if="pageCount !== null && pageCount > 1" class="pager" aria-label="페이지">
          <button
            v-for="page in pageCount"
            :key="page"
            type="button"
            class="btn btn-sm"
            :class="page === query.page ? 'btn-primary' : 'btn-secondary'"
            :aria-current="page === query.page ? 'page' : undefined"
            @click="write({ page: page === 1 ? null : String(page) })"
          >
            {{ page }}
          </button>
        </nav>
        <p class="board-section__rule">{{ definition.authorRule }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.board-tools {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
}

.board-tools__search {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.board-tools__search .form-control {
  flex: 1 1 200px;
}

.board-tools__scope {
  width: auto;
}

.board-tools__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.board-tools__filters .form-select {
  width: auto;
  min-height: 36px;
}

.board-tools__write {
  margin-left: auto;
}

.board-tools__note,
.board-tools__program {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.board-tools__program {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.board-tools :deep(.disabled-reason) {
  margin-top: 0;
}

.board-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--card-padding);
}

.board-section__title {
  margin: 0;
  font-size: var(--fs-lg);
}

.board-section__rule {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.pager {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}

@media (max-width: 575.98px) {
  .board-tools__write {
    width: 100%;
    margin-left: 0;
  }
  .board-tools__write .btn {
    width: 100%;
  }
}
</style>

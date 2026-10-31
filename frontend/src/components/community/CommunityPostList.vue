<script setup lang="ts">
/**
 * 게시판 글 목록 (REVISION_02 §10.2). 데스크톱은 표, 모바일은 카드로 보여 준다.
 * 공지(운영자 글)를 맨 위에 고정한다. 글이 없으면 빈 상태 문구만 보여 주고 예시 글을 만들지 않는다.
 * 공고 상세의 '참여 후기'도 이 목록을 그대로 쓴다.
 */
import { computed } from 'vue'
import { IconMessages } from '@tabler/icons-vue'
import type { CommunityBoard, CommunityPost } from '@/types/community'
import { COMMUNITY_BOARDS } from '@/constants/community'
import { formatPostDate } from '@/lib/communityDisplay'
import EmptyState from '@/components/common/EmptyState.vue'

const props = withDefaults(
  defineProps<{
    board: CommunityBoard
    posts: CommunityPost[]
    notices?: CommunityPost[]
    /** 게시판 안 순번을 매길 때 첫 글의 번호 (전체 건수 기준). 모르면 null */
    firstNumber?: number | null
    /** 등록일 표시 기준 시각. 오늘 글은 HH:mm로 보여 준다 */
    now?: Date
    compact?: boolean
  }>(),
  { notices: () => [], firstNumber: null, now: () => new Date(), compact: false },
)

const definition = computed(() => COMMUNITY_BOARDS[props.board])
const rows = computed(() => [
  ...props.notices.map((post) => ({ post, number: '공지' })),
  ...props.posts.map((post, index) => ({
    post,
    number: props.firstNumber !== null ? String(props.firstNumber - index) : '-',
  })),
])

function categoryLabel(post: CommunityPost): string {
  return definition.value.categories.find((c) => c.value === post.category)?.label ?? '-'
}
</script>

<template>
  <EmptyState
    v-if="rows.length === 0"
    :icon="IconMessages"
    title="아직 등록된 글이 없습니다."
    :compact="compact"
    :level="3"
  />
  <template v-else>
    <div class="scroll-x d-none d-md-block">
      <table class="data-table post-table">
        <caption class="visually-hidden">{{ definition.label }} 글 목록</caption>
        <thead>
          <tr>
            <th scope="col">번호</th>
            <th scope="col">분류</th>
            <th scope="col">제목</th>
            <th scope="col">작성자</th>
            <th scope="col">등록일</th>
            <th scope="col">조회 · 추천</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.post.id" :class="{ 'is-notice': row.post.isNotice }">
            <td>{{ row.number }}</td>
            <td>{{ categoryLabel(row.post) }}</td>
            <th scope="row">
              <RouterLink :to="{ name: 'community-post', params: { board, postId: row.post.id } }">
                {{ row.post.title }}
              </RouterLink>
              <span v-if="row.post.commentCount > 0" class="post-table__comments">[{{ row.post.commentCount }}]</span>
            </th>
            <td>
              {{ row.post.author.label }}
              <span v-if="row.post.author.participationVerified" class="post-badge">참여 확인</span>
              <span v-if="row.post.author.kind === 'operator'" class="post-badge">운영자</span>
            </td>
            <td>{{ formatPostDate(row.post.createdAt, now) }}</td>
            <td>{{ row.post.viewCount }} · {{ row.post.likeCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <ul class="post-cards d-md-none">
      <li v-for="row in rows" :key="row.post.id" class="post-card" :class="{ 'is-notice': row.post.isNotice }">
        <p class="post-card__meta">{{ row.number }} · {{ categoryLabel(row.post) }}</p>
        <RouterLink class="post-card__title" :to="{ name: 'community-post', params: { board, postId: row.post.id } }">
          {{ row.post.title }}
          <span v-if="row.post.commentCount > 0">[{{ row.post.commentCount }}]</span>
        </RouterLink>
        <p class="post-card__meta">
          {{ row.post.author.label }} · {{ formatPostDate(row.post.createdAt, now) }} · 조회 {{ row.post.viewCount }} ·
          추천 {{ row.post.likeCount }}
        </p>
      </li>
    </ul>
  </template>
</template>

<style scoped>
.post-table td,
.post-table th {
  vertical-align: middle;
}

.post-table .is-notice {
  background: var(--color-surface-muted);
  font-weight: var(--fw-semibold);
}

.post-table__comments {
  margin-left: 4px;
  font-size: var(--fs-xs);
  color: var(--color-primary-strong);
}

.post-badge {
  margin-left: 4px;
  padding: 0 6px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-size: var(--fs-xs);
}

.post-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.post-card.is-notice {
  background: var(--color-surface-muted);
}

.post-card__title {
  font-weight: var(--fw-semibold);
}

.post-card__meta {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}
</style>

<script setup lang="ts">
/**
 * 커뮤니티 글 보기 (REVISION_02 §10.2-6). 본문, 연결 공고 칩, 추천·신고, 댓글(답글 1단계), 목록으로.
 * 서버가 연결되지 않아 지금은 글을 찾을 수 없다는 안내만 나온다. 추천·신고·댓글은 이유와 함께 비활성이다.
 * 이전·다음 글 이동은 게시판 목록 API(서버)가 생긴 뒤 붙인다.
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconArrowLeft, IconFlag, IconMessage, IconThumbUp } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import { COMMUNITY_BOARDS, COMMUNITY_WRITE_DISABLED_REASON } from '@/constants/community'
import { communityRepository } from '@/repositories/communityRepository'
import { programRepository } from '@/repositories'
import { useAuth } from '@/stores/authStore'
import { formatPostDate } from '@/lib/communityDisplay'
import { programTitleText } from '@/lib/programDisplay'
import type { CommunityBoard, CommunityComment, CommunityPost } from '@/types/community'

const props = defineProps<{ board: CommunityBoard; postId: string }>()

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const definition = computed(() => COMMUNITY_BOARDS[props.board])
const post = ref<CommunityPost | null>(null)
const comments = ref<CommunityComment[]>([])
const programTitle = ref<string | null>(null)
const loaded = ref(false)

watch(
  () => [props.board, props.postId],
  async () => {
    loaded.value = false
    post.value = await communityRepository.getPost(props.board, props.postId)
    comments.value = post.value ? await communityRepository.listComments(post.value.id) : []
    programTitle.value = null
    if (post.value?.programId) {
      try {
        programTitle.value = programTitleText(await programRepository.getById(post.value.programId))
      } catch {
        programTitle.value = null
      }
    }
    loaded.value = true
  },
  { immediate: true },
)

const authenticated = computed(() => auth.state.status === 'authenticated')
const now = new Date()
const rootComments = computed(() => comments.value.filter((c) => c.parentId === null))
const repliesOf = (id: string) => comments.value.filter((c) => c.parentId === id)

/** 비로그인이면 로그인 화면으로 보낸다. 로그인 회원은 서버가 연결되기 전까지 비활성 */
async function requireLogin() {
  if (!authenticated.value) await router.push({ name: 'login', query: { redirect: route.fullPath } })
}
</script>

<template>
  <div class="page">
    <PageHeader :title="post?.title ?? '글 보기'" :description="definition.label">
      <template #actions>
        <RouterLink :to="{ name: definition.routeName }" class="btn btn-secondary">
          <IconArrowLeft :size="18" stroke-width="2" aria-hidden="true" />
          목록으로
        </RouterLink>
      </template>
    </PageHeader>

    <div class="stack">
      <p v-if="!loaded" class="fs-sm" role="status">글을 불러오는 중입니다.</p>

      <EmptyState
        v-else-if="!post"
        :icon="IconMessage"
        title="글을 찾을 수 없습니다."
        :description="
          communityRepository.connected
            ? '삭제되었거나 운영자 검토로 가려진 글일 수 있습니다.'
            : '게시글을 저장할 서버가 아직 연결되지 않아 등록된 글이 없습니다.'
        "
      >
        <template #actions>
          <RouterLink :to="{ name: definition.routeName }" class="btn btn-secondary">{{ definition.label }} 목록</RouterLink>
        </template>
      </EmptyState>

      <article v-else class="post surface-card" aria-labelledby="post-title">
        <header class="post__header">
          <p class="post__meta">
            {{ definition.categories.find((c) => c.value === post?.category)?.label ?? '-' }} · {{ post.author.label }}
            <span v-if="post.author.participationVerified" class="post__badge">참여 확인</span>
            <span v-if="post.author.kind === 'operator'" class="post__badge">운영자</span>
            · {{ formatPostDate(post.createdAt, now) }} · 조회 {{ post.viewCount }} · 추천 {{ post.likeCount }}
          </p>
          <h2 id="post-title" class="post__title">{{ post.title }}</h2>
          <RouterLink v-if="post.programId" class="post__program" :to="{ name: 'program-detail', params: { id: post.programId } }">
            {{ programTitle ?? post.programId }}
          </RouterLink>
        </header>
        <p class="post__body">{{ post.body }}</p>
        <div class="action-row">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            :aria-disabled="authenticated ? 'true' : undefined"
            aria-describedby="post-action-reason"
            @click="requireLogin"
          >
            <IconThumbUp :size="16" stroke-width="2" aria-hidden="true" />
            추천
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :aria-disabled="authenticated ? 'true' : undefined"
            aria-describedby="post-action-reason"
            @click="requireLogin"
          >
            <IconFlag :size="16" stroke-width="2" aria-hidden="true" />
            신고
          </button>
        </div>
        <DisabledReason id="post-action-reason">
          {{ authenticated ? COMMUNITY_WRITE_DISABLED_REASON : '추천·신고·댓글은 로그인 후 할 수 있습니다.' }}
        </DisabledReason>

        <section class="comments" aria-labelledby="comments-title">
          <h3 id="comments-title" class="comments__title">댓글 {{ comments.length }}</h3>
          <p v-if="comments.length === 0" class="fs-sm text-muted-strong">아직 댓글이 없습니다.</p>
          <ul v-else class="comments__list">
            <li v-for="comment in rootComments" :key="comment.id" class="comment">
              <p class="comment__meta">{{ comment.author.label }} · {{ formatPostDate(comment.createdAt, now) }}</p>
              <p class="comment__body">{{ comment.body }}</p>
              <ul v-if="repliesOf(comment.id).length > 0" class="comments__list comments__list--replies">
                <li v-for="reply in repliesOf(comment.id)" :key="reply.id" class="comment">
                  <p class="comment__meta">{{ reply.author.label }} · {{ formatPostDate(reply.createdAt, now) }}</p>
                  <p class="comment__body">{{ reply.body }}</p>
                </li>
              </ul>
            </li>
          </ul>
        </section>
      </article>
    </div>
  </div>
</template>

<style scoped>
.post {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--card-padding);
}

.post__meta,
.comment__meta {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.post__badge {
  margin-left: 4px;
  padding: 0 6px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
}

.post__title {
  margin: 4px 0;
  font-size: var(--fs-xl);
}

.post__program {
  display: inline-block;
  padding: 2px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: var(--fs-sm);
}

.post__body,
.comment__body {
  margin: 0;
  white-space: pre-line;
}

.comments {
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.comments__title {
  margin: 0 0 var(--space-2);
  font-size: var(--fs-base);
}

.comments__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.comments__list--replies {
  margin-top: var(--space-2);
  padding-left: var(--space-5);
}
</style>

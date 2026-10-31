<script setup lang="ts">
/**
 * 공고 상세의 '참여 후기' (REVISION_02 §10.6).
 * 별도 데이터나 폼을 만들지 않고, 지원사업 후기 게시판에서 이 공고에 연결된 글을 보여 준다.
 * 후기가 5건 미만이면 요약 값은 '-'와 '후기 5건 이상일 때 표시'다. 후기는 자격 판정·적합도에 섞지 않는다.
 */
import { onMounted, ref } from 'vue'
import { IconMessages } from '@tabler/icons-vue'
import type { CommunityPost, ReviewStats } from '@/types/community'
import { communityRepository } from '@/repositories/communityRepository'
import { REVIEW_QUESTIONS } from '@/constants/community'
import { MIN_REVIEWS_FOR_STATS } from '@/lib/reviewStats'
import SectionCard from '@/components/common/SectionCard.vue'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import CommunityPostList from '@/components/community/CommunityPostList.vue'

const props = defineProps<{ programId: string }>()

const RECENT_COUNT = 3
const recent = ref<CommunityPost[]>([])
const total = ref<number | null>(null)
const stats = ref<ReviewStats | null>(null)
const infoCount = ref<number | null>(null)

onMounted(async () => {
  const [list, summary, info] = await Promise.all([
    communityRepository.list({
      board: 'reviews',
      keyword: null,
      searchScope: 'title',
      sort: 'latest',
      category: null,
      programId: props.programId,
      page: 1,
    }),
    communityRepository.reviewStats(props.programId),
    communityRepository.countInfoPosts(props.programId),
  ])
  recent.value = list.items.slice(0, RECENT_COUNT)
  total.value = list.total
  stats.value = summary
  infoCount.value = info
})

const statsHint = `후기 ${MIN_REVIEWS_FOR_STATS}건 이상일 때 표시`
const formatCount = (n: number) => `${n}건`
const formatHours = (n: number) => `${n}시간`
const formatPercent = (n: number) => `${n}%`
const formatRate = (n: number) => `${Math.round(n * 100)}%`
</script>

<template>
  <SectionCard
    id="section-reviews"
    title="참여 후기"
    heading-id="section-reviews-title"
    description="이 사업에 참여한 기업이 지원사업 후기 게시판에 남긴 글입니다. 신청 자격과 적합도에는 반영하지 않습니다."
    :icon="IconMessages"
  >
    <InfoList :columns="2">
      <InfoRow label="후기 수" :value="total" :format="formatCount" />
      <InfoRow label="실제 준비 시간 중앙값" :value="stats?.prepHoursMedian ?? null" :format="formatHours" :hint="stats ? undefined : statsHint" />
      <InfoRow
        label="실제 자부담 비율 중앙값"
        :value="stats?.selfPaymentPercentMedian ?? null"
        :format="formatPercent"
        :hint="stats ? undefined : statsHint"
      />
      <InfoRow label="재참여 의향 비율" :value="stats?.rejoinRate ?? null" :format="formatRate" :hint="stats ? undefined : statsHint" />
    </InfoList>

    <h3 class="reviews__title">최근 후기</h3>
    <CommunityPostList board="reviews" :posts="recent" compact />
    <p v-if="!communityRepository.connected" class="fs-sm text-muted-strong mt-2 mb-0">
      게시글을 저장할 서버와 회원 정보가 아직 연결되지 않아 후기를 모으지 않고 있습니다.
    </p>

    <details class="reviews__questions">
      <summary>후기 문항 보기</summary>
      <ul>
        <li v-for="question in REVIEW_QUESTIONS" :key="question.label">
          <strong>{{ question.label }}</strong> — {{ question.format }}
        </li>
      </ul>
    </details>

    <template #footer>
      <div class="action-row">
        <RouterLink :to="{ name: 'community-reviews', query: { program: programId } }" class="btn btn-secondary btn-sm">
          지원사업 후기에서 모두 보기
        </RouterLink>
        <RouterLink
          v-if="infoCount !== null && infoCount > 0"
          :to="{ name: 'community-info', query: { program: programId } }"
          class="btn btn-ghost btn-sm"
        >
          정보방 관련 글 {{ infoCount }}개
        </RouterLink>
      </div>
    </template>
  </SectionCard>
</template>

<style scoped>
.reviews__title {
  margin: var(--space-4) 0 var(--space-2);
  font-size: var(--fs-base);
}

.reviews__questions {
  margin-top: var(--space-3);
  font-size: var(--fs-sm);
}

.reviews__questions summary {
  font-weight: var(--fw-semibold);
  cursor: pointer;
}

.reviews__questions ul {
  margin: var(--space-2) 0 0;
  padding-left: var(--space-5);
}
</style>

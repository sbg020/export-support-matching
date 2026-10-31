/*
 * 참여 후기 요약 (순수 함수). REVISION_02 §10.6
 * 후기가 5건 이상일 때만 중앙값을 만든다. 그 전에는 null(화면 '-' + '후기 5건 이상일 때 표시').
 * 후기는 자격 판정과 적합도에 섞지 않는다.
 */
import type { CommunityPost, ReviewStats } from '@/types/community'

export const MIN_REVIEWS_FOR_STATS = 5

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? (sorted[middle] ?? null) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
}

/** 게시된 후기(문항 답이 있는 글)만 집계한다 */
export function summarizeReviews(posts: readonly CommunityPost[]): ReviewStats | null {
  const reviews = posts.filter((p) => p.board === 'reviews' && p.status === 'published' && p.reviewAnswers !== null)
  if (reviews.length < MIN_REVIEWS_FOR_STATS) return null
  const answers = reviews.map((p) => p.reviewAnswers!)
  const numbers = (pick: (a: (typeof answers)[number]) => number | null) =>
    answers.map(pick).filter((v): v is number => v !== null)
  const intents = answers.map((a) => a.rejoinIntent).filter((v) => v !== null)
  const dates = reviews.map((p) => p.createdAt).sort()
  return {
    count: reviews.length,
    prepHoursMedian: median(numbers((a) => a.prepHours)),
    selfPaymentPercentMedian: median(numbers((a) => a.selfPaymentPercent)),
    settlementDifficultyMedian: median(numbers((a) => a.settlementDifficulty)),
    rejoinRate: intents.length > 0 ? intents.filter((v) => v === 'yes').length / intents.length : null,
    periodFrom: dates[0] ?? '',
    periodTo: dates[dates.length - 1] ?? '',
  }
}

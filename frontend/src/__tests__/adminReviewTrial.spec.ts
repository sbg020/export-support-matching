/*
 * 운영 확인용 검수 대기 5건 (admin-review-trial.json): 관리자 공고 검수에만 들어가고 사용자 공고에는 없다
 */
import { describe, expect, it } from 'vitest'
import trial from '@/data/published/admin-review-trial.json'
import published from '@/data/published/notices.json'
import { SnapshotAdminRepository } from '@/repositories/admin'

const publishedIds = new Set(published.notices.map((n) => n.id))

describe('운영 확인용 검수 대기', () => {
  it('게시 공고에서 고른 5건의 사본이고, 사본 ID는 게시 공고와 겹치지 않는다', () => {
    expect(trial.items).toHaveLength(5)
    for (const item of trial.items) {
      expect(publishedIds.has(item.trialOf)).toBe(true)
      expect(item.notice.id).toBe(`RV-${item.trialOf}`)
      expect(publishedIds.has(item.notice.id)).toBe(false)
      expect(item.status).toBe('pending-review')
      expect(item.pages.length).toBeGreaterThan(0)
    }
  })

  it('관리자 공고 검수 목록·상세·대시보드에 나온다', async () => {
    const repo = new SnapshotAdminRepository()
    const queue = await repo.listReviewQueue()
    expect(queue.map((n) => n.id)).toEqual(trial.items.map((i) => i.notice.id))
    const detail = await repo.getReviewItem(trial.items[0]!.notice.id)
    expect(detail?.pages.length).toBeGreaterThan(0)
    expect(detail?.extractions.length).toBeGreaterThan(0)
    expect((await repo.getDashboard()).pendingReview).toBe(5)
  })

  it('사용자 화면이 읽는 게시 공고는 그대로다 (325건, RV- 없음)', () => {
    expect(published.notices).toHaveLength(325)
    expect(published.notices.some((n) => n.id.startsWith('RV-'))).toBe(false)
  })
})

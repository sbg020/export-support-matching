/*
 * 커뮤니티 임시 예시 글: 게시판별 20개, 작성자 익명, 10개씩 페이지, 검색·말머리
 */
import { describe, expect, it } from 'vitest'
import { SampleCommunityRepository } from '@/repositories/communityRepository'
import { SAMPLE_INFO_POSTS, SAMPLE_REVIEW_POSTS } from '@/data/communitySamples'
import type { CommunityQuery } from '@/types/community'

const repo = new SampleCommunityRepository()
const query = (patch: Partial<CommunityQuery>): CommunityQuery => ({
  board: 'reviews',
  keyword: null,
  searchScope: 'title',
  sort: 'latest',
  category: null,
  programId: null,
  page: 1,
  ...patch,
})

describe('커뮤니티 예시 글', () => {
  it('게시판별 20개, 작성자는 모두 익명, ID는 겹치지 않는다', () => {
    for (const posts of [SAMPLE_REVIEW_POSTS, SAMPLE_INFO_POSTS]) {
      expect(posts).toHaveLength(20)
      expect(new Set(posts.map((p) => p.author.label))).toEqual(new Set(['익명']))
      expect(new Set(posts.map((p) => p.id)).size).toBe(20)
    }
  })

  it('10개씩 2쪽, 최신 글이 먼저', async () => {
    const first = await repo.list(query({ board: 'info' }))
    const second = await repo.list(query({ board: 'info', page: 2 }))
    expect(first.total).toBe(20)
    expect(first.items).toHaveLength(10)
    expect(second.items).toHaveLength(10)
    expect(first.items[0]!.createdAt >= first.items[9]!.createdAt).toBe(true)
    expect(new Set([...first.items, ...second.items].map((p) => p.id)).size).toBe(20)
  })

  it('말머리·검색어로 거른다', async () => {
    const settlement = await repo.list(query({ category: 'settlement' }))
    expect(settlement.items.every((p) => p.category === 'settlement')).toBe(true)
    const keyword = await repo.list(query({ keyword: '정산' }))
    expect(keyword.items.every((p) => p.title.includes('정산'))).toBe(true)
    expect(await repo.getPost('reviews', 'R01')).not.toBeNull()
    expect(await repo.getPost('info', 'R01')).toBeNull()
  })
})

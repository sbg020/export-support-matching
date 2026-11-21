import { describe, expect, it } from 'vitest'
import { EmptyAdminRepository, SnapshotAdminRepository } from '@/repositories/admin'
import collection from '@/data/published/bizinfo-collection.json'

describe('기업마당 수집 데이터 (bizinfo-collection.json)', () => {
  it('API가 준 수출 분야 공고만 담고, ID가 겹치지 않는다', () => {
    const ids = collection.items.map((n) => n.id)
    expect(collection.meta.category).toBe('04')
    expect(ids.length).toBe(collection.meta.stored)
    expect(new Set(ids).size).toBe(ids.length)
    expect(collection.items.every((n) => n.category === '수출')).toBe(true)
  })

  it('인증키·만료 토큰이 든 링크를 담지 않는다', () => {
    const text = JSON.stringify(collection)
    expect(text).not.toContain('crtfcKey')
    expect(text).not.toContain('downloadToken')
  })

  it('관리자 저장소가 수집 로그 한 줄과 목록을 돌려준다', async () => {
    const repo = new SnapshotAdminRepository()
    const runs = await repo.listCollectionRuns()
    expect(runs).toHaveLength(1)
    expect(runs[0]?.startedAt).toBe(collection.meta.fetchedAt)
    expect(runs[0]?.exportMatched).toBe(collection.items.length)
    expect(runs[0]?.revised).toBeNull()
    expect((await repo.getBizinfoCollection())?.items).toHaveLength(collection.items.length)
  })

  it('저장소가 없으면 목록도 없다', async () => {
    expect(await new EmptyAdminRepository().getBizinfoCollection()).toBeNull()
  })
})

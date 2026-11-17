/*
 * TEST 계정 임시 기록: 게시된 실제 공고만 쓰고, TEST 판정 결과·날짜 조건을 지킨다
 */
import { describe, expect, it } from 'vitest'
import { evaluateAll } from '@/lib/engine/evaluateAll'
import { createTestAccountCommonChecks, createTestAccountProfile } from '@/data/testAccountProfile'
import { createTestAccountDocuments, createTestAccountRecords } from '@/data/testAccountRecords'
import { vaultMatch } from '@/lib/documentVault'
import snapshot from '@/data/published/notices.json'
import type { Program } from '@/types/program'

const programs = snapshot.notices as unknown as Program[]
const byId = new Map(programs.map((p) => [p.id, p]))
const asOf = snapshot.meta.asOf
const set = evaluateAll(programs, createTestAccountProfile(), {
  asOf,
  selfChecks: { common: createTestAccountCommonChecks(), programs: {} },
})
const records = createTestAccountRecords()
const tabOf = (id: string) => set.byId.get(id)?.tab?.tab

describe('TEST 계정 나의 사업 관리 임시 기록', () => {
  it('모두 게시된 실제 공고이고 8건이다', () => {
    expect(records).toHaveLength(8)
    for (const r of records) expect(byId.has(r.programId)).toBe(true)
  })

  it('관심 3(신청 가능 2·확인 필요 1), 준비 중 2(신청 가능·마감 전), 마감 지난 공고의 심사·결과', () => {
    const interested = records.filter((r) => r.status === 'interested').map((r) => tabOf(r.programId))
    expect(interested.sort()).toEqual(['eligible', 'eligible', 'needs-check'])
    for (const r of records.filter((x) => x.status === 'preparing')) {
      expect(tabOf(r.programId)).toBe('eligible')
      expect(byId.get(r.programId)!.applyEnd! >= asOf).toBe(true)
      const total = byId.get(r.programId)!.requiredDocs!.length
      expect(r.checklist.length).toBeGreaterThan(0)
      expect(r.checklist.length).toBeLessThan(total)
    }
    for (const status of ['under_review', 'selected'] as const) {
      const r = records.find((x) => x.status === status)!
      expect(byId.get(r.programId)!.receptionStatus).toBe('closed')
    }
  })

  it('기록 날짜는 접수 시작 이후, 데이터 기준일 이전', () => {
    for (const r of records) {
      const start = byId.get(r.programId)!.applyStart ?? '0000-00-00'
      for (const h of r.history) {
        expect(h.changedAt.slice(0, 10) <= asOf).toBe(true)
        expect(h.changedAt.slice(0, 10) >= start).toBe(true)
      }
    }
  })

  it("준비 중 공고의 제출 서류에 '서류함에 있음'으로 연결된다", () => {
    const docs = createTestAccountDocuments()
    expect(docs).toHaveLength(7)
    const p037 = byId.get('P037')!.requiredDocs!
    expect(vaultMatch(p037.find((d) => d.id === 'P037-D07')!, docs)?.title).toBe('사업자등록증명원')
    expect(vaultMatch(p037.find((d) => d.id === 'P037-D06')!, docs)?.status).toBe('held')
    expect(vaultMatch(p037.find((d) => d.id === 'P037-D11')!, docs)).toBeNull()
  })
})

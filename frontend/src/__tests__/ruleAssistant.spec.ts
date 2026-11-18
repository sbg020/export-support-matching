/*
 * '까치에게 물어보기' 규칙 답변: 사이트 데이터(게시 공고 + TEST 판정)만으로 답한다
 */
import { describe, expect, it } from 'vitest'
import { evaluateAll } from '@/lib/engine/evaluateAll'
import { createTestAccountCommonChecks, createTestAccountProfile } from '@/data/testAccountProfile'
import { NOT_FOUND, answerQuestion, detectIntent, detectTopics } from '@/lib/assistant/ruleAssistant'
import { daysBetween } from '@/lib/engine/opportunityCost'
import snapshot from '@/data/published/notices.json'
import type { Program } from '@/types/program'

const programs = snapshot.notices as unknown as Program[]
const asOf = snapshot.meta.asOf
const set = evaluateAll(programs, createTestAccountProfile(), {
  asOf,
  selfChecks: { common: createTestAccountCommonChecks(), programs: {} },
})
const ctx = { programs, evaluations: set.byId, asOf, profileEmpty: false }
const byId = new Map(programs.map((p) => [p.id, p]))

describe('의도·주제', () => {
  it('질문에서 의도와 사업 분류를 찾는다', () => {
    expect(detectIntent('안녕')).toBe('help')
    expect(detectIntent('이번 주 마감 공고')).toBe('deadline')
    expect(detectIntent('수출 패키지 제출 서류')).toBe('documents')
    expect(detectIntent('지원금 얼마야')).toBe('amount')
    expect(detectTopics('해외 전시회와 통번역')).toEqual(['C01', 'C12'])
  })
})

describe('답변', () => {
  it('추천: 접수 중인 신청 가능·확인 필요 공고만, 신청 가능 먼저', () => {
    const a = answerQuestion('우리 회사가 신청할 수 있는 공고 추천해 줘', ctx)
    expect(a.intent).toBe('recommend')
    expect(a.related.length).toBeGreaterThan(0)
    expect(a.related.every((r) => r.tab === 'eligible' || r.tab === 'needs-check')).toBe(true)
    expect(a.related.every((r) => byId.get(r.programId)!.receptionStatus !== 'closed')).toBe(true)
    const tabs = a.related.map((r) => r.tab)
    expect(tabs.indexOf('needs-check') === -1 || tabs.lastIndexOf('eligible') < tabs.indexOf('needs-check')).toBe(true)
  })

  it('마감: 기준일부터 7일 안에 마감되는 공고만, 마감 빠른 순', () => {
    const a = answerQuestion('이번 주에 마감되는 공고 알려 줘', ctx)
    const ends = a.related.map((r) => byId.get(r.programId)!.applyEnd!)
    expect(ends.every((e) => daysBetween(asOf, e)! >= 0 && daysBetween(asOf, e)! <= 7)).toBe(true)
    expect([...ends].sort()).toEqual(ends)
  })

  it('서류: 이름이 맞는 공고의 제출 서류를 공고 그대로', () => {
    const a = answerQuestion('수출 패키지 지원 제출 서류는 뭐야?', ctx)
    expect(a.related[0]!.programId).toBe('P037')
    expect(a.checks).toContain('사업자등록증명원 (필수)')
  })

  it('금액: 공고에 적힌 문구만 옮긴다', () => {
    const a = answerQuestion('물류바우처 지원금 얼마야?', ctx)
    expect(a.related[0]!.programId).toBe('P001')
    expect(a.summary).toContain(byId.get('P001')!.amountNote!)
  })

  it('자격: 비슷한 공고가 여럿이면 하나로 정하지 않고 탭과 함께 보여 준다', () => {
    const a = answerQuestion('해외규격인증 지원사업 신청 자격 알려 줘', ctx)
    const ids = a.related.map((r) => r.programId)
    expect(ids).toContain('P034')
    expect(a.related.find((r) => r.programId === 'P034')!.tabLabel).toBe('신청 가능')
  })

  it('자격: 공고 하나가 뚜렷하면 판정 결과와 확인할 조건', () => {
    const a = answerQuestion('화성 스마트 물류비 지원 자격은?', ctx)
    expect(a.related[0]!.programId).toBe('P036')
    expect(a.summary).toContain('신청 가능')
  })

  it('데이터에 없으면 등록된 공고에서 확인할 수 없다고 답한다', () => {
    const a = answerQuestion('우주선 발사 지원', ctx)
    expect(a.related).toEqual([])
    expect(a.summary).toContain(NOT_FOUND)
  })

  it('프로필이 비어 있으면 자격을 판정하지 않았다고 알린다', () => {
    const a = answerQuestion('추천해 줘', { ...ctx, profileEmpty: true })
    expect(a.summary).toContain('판정하지 않았어요')
  })
})

/*
 * REVISION_05 §2.6: 판정 엔진(브라우저) 테스트
 * - 엄격 판정 회귀: 정답세트 가상 기업 16곳 × 게시 세부사업 전체를 strictVerdict()로 판정해
 *   reference_eval.py 결과(backend/data/eligibility_goldset/reference_verdicts.json)와 불일치 0건
 * - 3탭 분류 단위 테스트, TEST 계정 프로필 변환이 정답세트 T01과 같은 판정을 내는지
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { NoticeCondition } from '@/types/program'
import { classifyTabs, strictVerdict, type EngineProfile } from '@/lib/engine/eligibilityV3'
import { toEngineProfile } from '@/lib/engine/engineProfile'
import { createTestAccountProfile } from '@/data/testAccountProfile'
import snapshot from '@/data/published/notices.json'

const GOLD = resolve(__dirname, '../../../backend/data/eligibility_goldset')
interface RefVerdict {
  profile_id: string
  program_id: string
  verdict: string
  fails: string[]
  unknown: string[]
}
const profiles = JSON.parse(readFileSync(resolve(GOLD, 'profiles.json'), 'utf-8')) as (EngineProfile & { profile_id: string })[]
const reference = JSON.parse(readFileSync(resolve(GOLD, 'reference_verdicts.json'), 'utf-8')) as RefVerdict[]
const notices = (snapshot as unknown as { notices: { id: string; parentId: string; conditions: NoticeCondition[] }[] }).notices

describe('엄격 판정 회귀 (reference_eval.py와 비교)', () => {
  it('가상 기업 16곳 × 게시 세부사업 전체가 불일치 0건이다', () => {
    expect(profiles).toHaveLength(16)
    expect(notices.length).toBeGreaterThan(150)
    const refMap = new Map(reference.map((r) => [`${r.profile_id}|${r.program_id}`, r]))
    const mismatches: string[] = []
    for (const p of profiles) {
      for (const n of notices) {
        const ref = refMap.get(`${p.profile_id}|${n.id}`)
        const got = strictVerdict(n.conditions, p, n.id, n.parentId)
        const same =
          ref &&
          ref.verdict === got.verdict &&
          JSON.stringify([...got.fails].sort()) === JSON.stringify(ref.fails) &&
          JSON.stringify([...got.unknown].sort()) === JSON.stringify(ref.unknown)
        if (!same) mismatches.push(`${p.profile_id} ${n.id}: 기대 ${ref?.verdict} / 결과 ${got.verdict}`)
      }
    }
    expect(mismatches).toEqual([])
  })
})

function cond(condId: string, extra: Partial<NoticeCondition> = {}): NoticeCondition {
  return {
    condId, programId: 'X1', parentId: 'X1', scope: null, kind: '필수', group: 'A', condType: 'A02', condTypes: 'A02',
    affectsVerdict: true, field: null, op: null, valueRaw: null, expr: { check: '' }, exprText: null, certainty: null,
    evidence: '근거 문장', page: 1, importance: '주요', confidence: null, source: null, note: null, ...extra,
  }
}
const BASE: EngineProfile = {
  size: '소기업', attrs: [], hq: '경기 화성시', sites: [], industry: ['제조업'], product_hs: null, export_usd: 0,
  revenue_krw: null, age: 3, employees: null, certs: [], debt_ratio: null, model: '제조', issues: [],
  answered_flags: null, intent_export: null, intent_commit: null,
}

describe('3탭 분류 (§2.4)', () => {
  it('미충족 → 신청 불가, 주요 모름 → 확인 필요, 체크리스트만 모름 → 신청 가능 + N개', () => {
    const unmet = [cond('R1', { expr: { atom: 'hq_region', op: 'in', value: ['부산'] } })]
    expect(classifyTabs(unmet, BASE, 'X1').tab).toBe('ineligible')
    const major = [cond('R1', { condType: 'C01', importance: '주요' })]
    expect(classifyTabs(major, BASE, 'X1').tab).toBe('needs-check')
    const checklist = [
      cond('R1', { expr: { atom: 'hq_region', op: 'in', value: ['경기'] } }),
      cond('R2', { kind: '제외', group: null, condType: 'B06', importance: '체크리스트', expr: { flag: 'B06' }, }),
      cond('R3', { group: 'B', condType: 'C04', importance: '체크리스트' }),
    ]
    const result = classifyTabs(checklist, { ...BASE, answered_flags: [] }, 'X1')
    expect(result.tab).toBe('eligible')
    expect(result.checklist.sort()).toEqual(['R2', 'R3'])
  })

  it('확인 필요의 주요 조건을 모두 충족으로 체크하면 신청 가능, 미충족 체크는 신청 불가, 취소하면 원래대로', () => {
    const conds = [cond('R1', { condType: 'C01' }), cond('R2', { group: 'B', condType: 'C05' })]
    expect(classifyTabs(conds, BASE, 'X1', null, { R1: 'met', R2: 'met' }).tab).toBe('eligible')
    expect(classifyTabs(conds, BASE, 'X1', null, { R1: 'unmet' }).tab).toBe('ineligible')
    expect(classifyTabs(conds, BASE, 'X1', null, {}).tab).toBe('needs-check')
  })
})

describe('TEST 계정 프로필', () => {
  it('정답세트 T01(TEST 계정)과 같은 판정: 기대 신청 불가는 불가, 기대 신청 가능은 신청 가능 탭', () => {
    const profile = toEngineProfile(createTestAccountProfile(), '2026-11-13')
    const t01 = reference.filter((r) => r.profile_id === 'T01')
    const wrong: string[] = []
    for (const ref of t01) {
      const n = notices.find((x) => x.id === ref.program_id)!
      const tab = classifyTabs(n.conditions, profile, n.id, n.parentId).tab
      if (ref.verdict === '신청 불가' && tab !== 'ineligible') wrong.push(`${n.id} 기대 불가 → ${tab}`)
      if (ref.verdict === '신청 가능' && tab !== 'eligible') wrong.push(`${n.id} 기대 가능 → ${tab}`)
    }
    expect(wrong).toEqual([])
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { evaluateEligibility } from '@/lib/engine/eligibility'
import { createEmptyProfile } from '@/lib/profile'
import type { CompanyProfile } from '@/types/profile'
import type { EligibilityRule, Program } from '@/types/program'
import type { SelfCheckAnswers } from '@/types/selfCheck'
import { blankProgram } from './fixtures'

/*
 * 공유 판정 사례 (docs/contracts/engine-cases.json). backend 테스트도 같은 파일을 읽는다.
 * docs/는 배포 업로드에서 빠지므로 정적 import 대신 실행 시점에 파일로 읽는다.
 */

interface ConditionExpect {
  status?: string
  reasonCode?: string | null
  selfChecked?: boolean
  selfCheckable?: boolean
  inputStep?: number | null
}

interface EngineCase {
  id: string
  title: string
  profile: Partial<CompanyProfile>
  program?: Partial<Program>
  rules: Partial<EligibilityRule>[]
  selfChecks?: SelfCheckAnswers
  expect: {
    status: string
    selfCheckedCount?: number
    conditions?: Record<string, ConditionExpect>
    groups?: Record<string, string>
    scoped?: Record<string, string>
  } | null
}

interface EngineCasesFile {
  engineVersion: string
  defaults: { asOf: string; program: Partial<Program>; rule: Partial<EligibilityRule> }
  cases: EngineCase[]
}

// vitest는 frontend/를 루트로 실행한다 (vitest.config.ts)
const path = resolve(process.cwd(), '../docs/contracts/engine-cases.json')
const file = JSON.parse(readFileSync(path, 'utf8')) as EngineCasesFile

describe('공유 판정 사례 (engine-cases.json)', () => {
  it('사례가 20개 이상이고 엔진 버전이 같다', () => {
    expect(file.cases.length).toBeGreaterThanOrEqual(20)
    expect(file.engineVersion).toBe('eligibility-0.2.1')
  })

  function run(c: EngineCase) {
    const program = blankProgram({
      ...file.defaults.program,
      ...c.program,
      eligibilityRules: c.rules.map((r) => ({ ...file.defaults.rule, ...r }) as EligibilityRule),
    })
    const profile = { ...createEmptyProfile(), ...c.profile }
    return evaluateEligibility(profile, program, { asOf: file.defaults.asOf, selfChecks: c.selfChecks ?? null })
  }

  for (const c of file.cases.filter((x) => x.expect === null)) {
    it(`${c.id} ${c.title}`, () => {
      expect(run(c)).toBeNull()
    })
  }

  for (const c of file.cases.filter((x) => x.expect !== null)) {
    it(`${c.id} ${c.title}`, () => {
      const result = run(c)
      // 기대값에 적힌 항목만 비교한다 (부분 일치)
      const actual = {
        engineVersion: result?.engineVersion,
        status: result?.status,
        selfCheckedCount: result?.selfCheckedCount,
        conditions: Object.fromEntries((result?.conditions ?? []).map((x) => [x.ruleId, x])),
        groups: Object.fromEntries((result?.groups ?? []).map((g) => [g.group, g.status])),
        scoped: Object.fromEntries((result?.scopedConditions ?? []).map((x) => [x.ruleId, x.status])),
      }
      expect(actual).toMatchObject({ engineVersion: file.engineVersion, ...c.expect })
    })
  }
})

/*
 * 적합도 계산 (순수 함수). 신청 자격과 별개로 계산한다.
 *
 * 적합도 요소와 가중치는 아직 검증되지 않았다. 검증된 기준(FitCriteria)이
 * 없으면 결과를 만들지 않고 null을 반환한다. 이전 기획의 가중치 초안은
 * 확정 기준이 아니므로 여기에 넣지 않는다.
 */
import type { CompanyProfile } from '@/types/profile'
import type { Program } from '@/types/program'
import type { FitFactorResult, FitScoreResult } from '@/types/results'
import type { IsoDate } from '@/types/common'

export const FIT_ENGINE_VERSION = 'fit-0.1.0'

export interface FitFactorDefinition {
  /** 현재 지원하는 요소: 관심 분야와 공고 지원 분야의 겹침 */
  kind: 'interest-area-overlap'
  label: string
  weight: number
}

export interface FitCriteria {
  version: string
  verifiedAt: IsoDate
  factors: FitFactorDefinition[]
}

/** 현재 적용 중인 적합도 기준. 검증된 기준이 마련되기 전까지 null이다. */
export const ACTIVE_FIT_CRITERIA: FitCriteria | null = null

function evaluateFactor(
  factor: FitFactorDefinition,
  profile: CompanyProfile,
  program: Program,
): FitFactorResult | null {
  switch (factor.kind) {
    case 'interest-area-overlap': {
      if (program.supportAreas === null || program.supportAreas.length === 0) return null
      if (profile.interestAreas.length === 0) return null
      const matched = program.supportAreas.filter((area) => profile.interestAreas.includes(area))
      return {
        key: factor.kind,
        label: factor.label,
        weight: factor.weight,
        value: matched.length / program.supportAreas.length,
        reason: `공고 지원 분야 ${program.supportAreas.length}개 중 관심 분야와 겹치는 분야 ${matched.length}개`,
      }
    }
  }
}

export function evaluateFit(
  profile: CompanyProfile,
  program: Program,
  criteria: FitCriteria | null = ACTIVE_FIT_CRITERIA,
): FitScoreResult | null {
  if (criteria === null || criteria.factors.length === 0) return null
  if (program.verifiedAt === null) return null

  const factors: FitFactorResult[] = []
  for (const factor of criteria.factors) {
    const result = evaluateFactor(factor, profile, program)
    // 한 요소라도 계산할 근거가 없으면 부분 점수를 만들지 않는다.
    if (result === null) return null
    factors.push(result)
  }
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0)
  if (totalWeight <= 0) return null
  const score = Math.round((factors.reduce((sum, f) => sum + f.weight * f.value, 0) / totalWeight) * 100)

  return {
    programId: program.id,
    score,
    factors,
    reasons: factors.map((f) => `${f.label}: ${f.reason}`),
    basisDate: program.verifiedAt,
    criteriaVersion: criteria.version,
    engineVersion: FIT_ENGINE_VERSION,
  }
}

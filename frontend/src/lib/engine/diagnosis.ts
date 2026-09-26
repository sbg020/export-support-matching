/*
 * 수출단계 진단 (순수 함수).
 *
 * 수출단계 임계치는 아직 검증되지 않았다. 검증된 진단 기준이 없으면
 * 단계를 판정하지 않고 null을 반환한다. 화면에는 '-'로 표시한다.
 */
import type { IsoDate, SourceReference } from '@/types/common'
import type { CompanyProfile } from '@/types/profile'
import type { SupportStage } from '@/types/program'
import type { ExportStageDiagnosis } from '@/types/results'

export interface ExportStageRule {
  stage: SupportStage
  /** 최근 1년 수출액 하한(USD, 포함). 제한 없으면 null */
  exportUsdMin: number | null
  /** 최근 1년 수출액 상한(USD, 미포함). 제한 없으면 null */
  exportUsdMax: number | null
  nextStageConditions: string[]
}

export interface ExportStageCriteria {
  version: string
  verifiedAt: IsoDate
  source: SourceReference
  rules: ExportStageRule[]
}

/** 현재 적용 중인 진단 기준. 검증된 기준이 마련되기 전까지 null이다. */
export const ACTIVE_EXPORT_STAGE_CRITERIA: ExportStageCriteria | null = null

export function diagnoseExportStage(
  profile: CompanyProfile,
  criteria: ExportStageCriteria | null = ACTIVE_EXPORT_STAGE_CRITERIA,
): ExportStageDiagnosis | null {
  if (criteria === null) return null
  const exportUsd = profile.exportUsdLastYear
  if (exportUsd === null) return null

  const rule = criteria.rules.find(
    (r) =>
      (r.exportUsdMin === null || exportUsd >= r.exportUsdMin) &&
      (r.exportUsdMax === null || exportUsd < r.exportUsdMax),
  )
  if (!rule) return null

  return {
    stage: rule.stage,
    reasons: [`최근 1년 수출액을 진단 기준(${criteria.version})과 비교했습니다.`],
    nextStageConditions: rule.nextStageConditions,
    source: criteria.source,
    basisDate: criteria.verifiedAt,
    criteriaVersion: criteria.version,
  }
}

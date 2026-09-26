/*
 * 준비 부담·기회비용 (순수 함수).
 *
 * 공고에 검증된 근거가 있는 값만 사용한다. 계산에 쓸 근거가 하나도 없으면
 * 결과 객체 자체가 null이며, 화면에는 각 항목을 '-'와 '산정 전'으로 표시한다.
 */
import type { IsoDate } from '@/types/common'
import type { Program } from '@/types/program'
import type { OpportunityCostResult } from '@/types/results'
import type { DocumentType } from '@/types/tracking'

export const OPPORTUNITY_COST_ENGINE_VERSION = 'opportunity-0.1.0'

export interface OpportunityCostContext {
  /** 서류함에 실제로 보관 중인 서류 유형. 서류함이 연결되지 않았으면 null */
  ownedDocumentTypes: DocumentType[] | null
  /** 마감 여유 계산 기준일. 사용자가 확인하는 날짜이며, 모르면 null */
  today: IsoDate | null
}

function daysBetween(from: IsoDate, to: string): number | null {
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(from)
  const b = /^(\d{4})-(\d{2})-(\d{2})/.exec(to)
  if (!a || !b) return null
  const start = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]))
  const end = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]))
  return Math.round((end - start) / 86_400_000)
}

export function evaluateOpportunityCost(
  program: Program,
  context: OpportunityCostContext,
): OpportunityCostResult | null {
  if (program.verifiedAt === null) return null

  const reasons: string[] = []

  const prepHours = program.prepEstimate
    ? { value: program.prepEstimate.hours, basis: program.prepEstimate.basis }
    : null
  if (prepHours) reasons.push(`예상 준비 시간 근거: ${prepHours.basis}`)

  let newDocumentCount: number | null = null
  if (program.requiredDocs !== null && context.ownedDocumentTypes !== null) {
    const owned = context.ownedDocumentTypes
    newDocumentCount = program.requiredDocs.filter(
      (doc) => doc.documentType === null || !owned.includes(doc.documentType),
    ).length
    reasons.push('필요서류 중 서류함에 없는 유형을 새로 준비할 서류로 셌습니다.')
  }

  const selfPaymentRatioPercent = program.selfPayment?.ratioPercent ?? null
  if (selfPaymentRatioPercent !== null) reasons.push('자기부담 비율은 공고 원문 기준입니다.')

  const obligations = program.obligations

  let daysUntilDeadline: number | null = null
  if (program.applyEnd !== null && context.today !== null) {
    daysUntilDeadline = daysBetween(context.today, program.applyEnd)
  }

  const hasAnyValue =
    prepHours !== null ||
    newDocumentCount !== null ||
    selfPaymentRatioPercent !== null ||
    obligations !== null ||
    daysUntilDeadline !== null
  if (!hasAnyValue) return null

  return {
    programId: program.id,
    prepHours,
    newDocumentCount,
    selfPaymentRatioPercent,
    obligations,
    daysUntilDeadline,
    reasons,
    basisDate: program.verifiedAt,
    engineVersion: OPPORTUNITY_COST_ENGINE_VERSION,
  }
}

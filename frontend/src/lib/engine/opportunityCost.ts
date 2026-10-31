/*
 * 준비 부담·기회비용 (순수 함수). REVISION_02 §8.1·§8.3
 *
 * 공고 원문(정답 세트)에 근거가 있는 값만 사용한다. 부담이 크다·작다고 판단하지 않는다.
 * - 마감 여유는 데이터 기준일(context.today)과 접수 마감일의 차이다. 시스템 날짜를 쓰지 않는다.
 * - 최대 자기부담 금액은 총사업비 한도 − 지원금 한도가 0보다 클 때만 계산한다(0원처럼 보이지 않게).
 * - 예상 준비 시간·선정 후 의무는 근거가 없으면 null('산정 전')이다.
 * 계산에 쓸 값이 하나도 없으면 결과 객체 자체가 null이다.
 */
import type { IsoDate } from '@/types/common'
import type { Program } from '@/types/program'
import type { DocumentCounts, OpportunityCostResult, ValueWithBasis } from '@/types/results'
import type { DocumentType } from '@/types/tracking'
import { formatKrw } from '@/lib/display'

export const OPPORTUNITY_COST_ENGINE_VERSION = 'opportunity-0.2.0'

export interface OpportunityCostContext {
  /** 서류함에 실제로 보관 중인 서류 유형. 서류함이 연결되지 않았으면 null */
  ownedDocumentTypes: DocumentType[] | null
  /** 마감 여유 계산 기준일. 테스트 데이터는 데이터 기준일, 모르면 null */
  today: IsoDate | null
}

export function daysBetween(from: IsoDate, to: string): number | null {
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(from)
  const b = /^(\d{4})-(\d{2})-(\d{2})/.exec(to)
  if (!a || !b) return null
  const start = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]))
  const end = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]))
  return Math.round((end - start) / 86_400_000)
}

function documentCounts(program: Program): DocumentCounts | null {
  if (program.requiredDocs === null) return null
  const docs = program.requiredDocs
  const locators = Array.from(
    new Set(docs.map((d) => d.source?.locator).filter((l): l is string => typeof l === 'string')),
  ).sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }))
  return {
    required: docs.filter((d) => d.requirement === 'required').length,
    conditional: docs.filter((d) => d.requirement === 'conditional').length,
    optional: docs.filter((d) => d.requirement === 'optional').length,
    programForms: docs.filter((d) => d.isProgramForm).length,
    locators,
  }
}

/** 총사업비 한도 − 지원금 한도 (둘 다 숫자이고 차액이 0보다 클 때만) */
export function selfPaymentMax(program: Program): ValueWithBasis<number> | null {
  const total = program.totalBudgetMaxKrw
  const subsidy = program.maxAmountKrw
  if (total === null || subsidy === null) return null
  const diff = total - subsidy
  if (diff <= 0) return null
  return { value: diff, basis: `총사업비 한도 ${formatKrw(total)} − 지원금 한도 ${formatKrw(subsidy)}` }
}

export function evaluateOpportunityCost(
  program: Program,
  context: OpportunityCostContext,
): OpportunityCostResult | null {
  // 근거·검수 정보가 없는 공고는 계산하지 않는다 (테스트 데이터는 dataState로 계산한다)
  if (program.dataState === null && program.verifiedAt === null) return null

  const reasons: string[] = []

  const prepHours = program.prepEstimate
    ? { value: program.prepEstimate.hours, basis: program.prepEstimate.basis }
    : null
  if (prepHours) reasons.push(`예상 준비 시간 근거: ${prepHours.basis}`)

  const counts = documentCounts(program)
  let newDocumentCount: number | null = null
  if (program.requiredDocs !== null && context.ownedDocumentTypes !== null) {
    const owned = context.ownedDocumentTypes
    newDocumentCount = program.requiredDocs.filter(
      (doc) => doc.documentType === null || !owned.includes(doc.documentType),
    ).length
    reasons.push('필요서류 중 서류함에 없는 유형을 새로 준비할 서류로 셌습니다.')
  }

  const selfPaymentRatioPercent = program.selfPayment?.ratioPercent ?? null
  const selfPaymentNote = program.selfPayment?.note ?? null
  if (selfPaymentRatioPercent !== null) reasons.push('자기부담 비율은 공고 원문 기준입니다.')
  const selfPaymentMaxKrw = selfPaymentMax(program)

  let daysUntilDeadline: number | null = null
  if (program.applyEnd !== null && context.today !== null) {
    daysUntilDeadline = daysBetween(context.today, program.applyEnd)
    reasons.push(`마감 여유는 기준일 ${context.today} 대비입니다.`)
  }

  const values = [
    prepHours,
    newDocumentCount,
    counts,
    selfPaymentRatioPercent,
    selfPaymentNote,
    selfPaymentMaxKrw,
    program.settlement,
    program.maxAmountKrw,
    program.totalBudgetMaxKrw,
    program.amountNote,
    program.obligations,
    daysUntilDeadline,
  ]
  if (values.every((value) => value === null)) return null

  return {
    programId: program.id,
    prepHours,
    newDocumentCount,
    documentCounts: counts,
    selfPaymentRatioPercent,
    selfPaymentNote,
    selfPaymentMaxKrw,
    settlement: program.settlement,
    maxAmountKrw: program.maxAmountKrw,
    totalBudgetMaxKrw: program.totalBudgetMaxKrw,
    amountNote: program.amountNote,
    obligations: program.obligations,
    daysUntilDeadline,
    reasons,
    basisDate: context.today ?? program.verifiedAt,
    engineVersion: OPPORTUNITY_COST_ENGINE_VERSION,
  }
}

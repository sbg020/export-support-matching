/*
 * 재무 입력값에서 매번 계산하는 비율 (REVISION_05 §3.1). 계산값은 저장하지 않는다.
 * - 6개 금액(당기 매출액·전기 매출액·영업이익·당기순이익·부채총계·자본총계)이 모두 있어야 '재무 입력 완료'
 * - 전기 매출액이 0이면 매출액증가율 '-', 자본총계가 0 이하이면 부채비율·ROE·SGR '-' 와 '자본잠식'
 * - 지속가능성장률(SGR) = ROE × 유보율, 유보율은 1로 가정 (비상장 중소기업은 배당이 거의 없음)
 */
import type { CompanyProfile } from '@/types/profile'

export const RETENTION_NOTE = '비상장 중소기업은 배당이 거의 없어 유보율을 1로 가정'

export interface FinanceSummary {
  status: 'complete' | 'missing'
  capitalImpaired: boolean
  /** 소수 (0.18 = 18%). 계산할 수 없으면 null */
  revenueGrowth: number | null
  operatingMargin: number | null
  netMargin: number | null
  /** 부채비율 (1.35 = 135%) */
  debtRatio: number | null
  roe: number | null
  sgr: number | null
}

const AMOUNT_FIELDS = [
  'revenueKrw',
  'revenuePrevKrw',
  'operatingIncomeKrw',
  'netIncomeKrw',
  'totalLiabilitiesKrw',
  'totalEquityKrw',
] as const

export function financeSummary(p: CompanyProfile): FinanceSummary {
  const complete = AMOUNT_FIELDS.every((field) => p[field] !== null)
  const rev = p.revenueKrw
  const prev = p.revenuePrevKrw
  const equity = p.totalEquityKrw
  const capitalImpaired = equity !== null && equity <= 0
  const div = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : a / b)
  const roe = capitalImpaired ? null : div(p.netIncomeKrw, equity)
  return {
    status: complete ? 'complete' : 'missing',
    capitalImpaired,
    revenueGrowth: prev === 0 ? null : div(rev !== null && prev !== null ? rev - prev : null, prev),
    operatingMargin: div(p.operatingIncomeKrw, rev),
    netMargin: div(p.netIncomeKrw, rev),
    debtRatio: capitalImpaired ? null : div(p.totalLiabilitiesKrw, equity),
    roe,
    sgr: roe === null ? null : roe * 1,
  }
}

/** 0.18 → '18.0%'. null → null */
export function percentText(value: number | null): string | null {
  return value === null ? null : `${(Math.round(value * 1000) / 10).toFixed(1)}%`
}

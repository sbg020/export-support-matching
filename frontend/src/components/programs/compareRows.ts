import type { Program } from '@/types/program'
import type { EligibilityResult, FitScoreResult, OpportunityCostResult } from '@/types/results'

export interface CompareSlot {
  index: number
  program: Program | null
  eligibility: EligibilityResult | null
  fit: FitScoreResult | null
  opportunity: OpportunityCostResult | null
}

export type CompareRowKey =
  | 'eligibility'
  | 'fit'
  | 'period'
  | 'support'
  | 'stage'
  | 'requiredDocs'
  | 'prepHours'
  | 'newDocs'
  | 'selfPayment'
  | 'obligations'
  | 'duplicate'
  | 'source'

export interface CompareRow {
  key: CompareRowKey
  label: string
  note?: string
}

/** 비교 행. 신청 자격 → 적합도 → 기본 정보 → 준비 부담 순서로 보여 준다. */
export const COMPARE_ROW_GROUPS: { label: string; rows: CompareRow[] }[] = [
  {
    label: '판정',
    rows: [
      { key: 'eligibility', label: '신청 자격', note: '원문 근거 기준' },
      { key: 'fit', label: '적합도', note: '신청 자격과 별개' },
    ],
  },
  {
    label: '기본 정보',
    rows: [
      { key: 'period', label: '접수기간' },
      { key: 'support', label: '지원규모·방식' },
      { key: 'stage', label: '지원분야' },
      { key: 'requiredDocs', label: '필요서류' },
    ],
  },
  {
    label: '준비 부담·기회비용',
    rows: [
      { key: 'prepHours', label: '예상 준비 시간', note: '산정 근거 함께 표시' },
      { key: 'newDocs', label: '새로 준비할 문서' },
      { key: 'selfPayment', label: '자기부담금' },
      { key: 'obligations', label: '수행 후 의무' },
      { key: 'duplicate', label: '중복수혜·유사사업', note: '원문 근거만 표시' },
      { key: 'source', label: '공고 원문' },
    ],
  },
]

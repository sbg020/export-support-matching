import type { IsoDate } from '@/types/common'
import type { CompanyProfile } from '@/types/profile'
import type { Program } from '@/types/program'
import type { EligibilityResult, FitScoreResult, OpportunityCostResult } from '@/types/results'
import { ACTIVE_FIT_CRITERIA, bonusAdjustment } from '@/lib/engine/fit'
import { formatKrw } from '@/lib/display'
import {
  amountsText,
  applyPeriodText,
  deadlineText,
  requiredDocsText,
  settlementText,
  supportCategoriesText,
  supportPhasesText,
  supportTypesWithNoteText,
} from '@/lib/programDisplay'

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
  | 'checksLeft'
  | 'bonuses'
  | 'period'
  | 'deadline'
  | 'support'
  | 'amounts'
  | 'stage'
  | 'requiredDocs'
  | 'prepHours'
  | 'newDocs'
  | 'selfPayment'
  | 'settlement'
  | 'obligations'
  | 'reviews'
  | 'duplicate'
  | 'source'

export interface CompareRow {
  key: CompareRowKey
  label: string
  note?: string
}

/**
 * 비교 행. 신청 자격 → 적합도 → 기본 정보 → 준비 부담 순서로 보여 준다.
 * 기존 행은 지우지 않고(REVISION_02 §8.4.2) 6개 행을 더했다. 값이 없으면 '-'다.
 */
export const COMPARE_ROW_GROUPS: { label: string; rows: CompareRow[] }[] = [
  {
    label: '판정',
    rows: [
      { key: 'eligibility', label: '신청 자격', note: '원문 근거 기준' },
      { key: 'fit', label: '적합도', note: '신청 자격과 별개 · 시험용 v0' },
      { key: 'checksLeft', label: '확인할 조건', note: '직접 확인 답 반영' },
      { key: 'bonuses', label: '해당 가점·감점', note: '프로필로 확인된 항목만' },
    ],
  },
  {
    label: '기본 정보',
    rows: [
      { key: 'period', label: '접수기간' },
      { key: 'deadline', label: '마감까지', note: '데이터 기준일 기준' },
      { key: 'support', label: '지원방식', note: '원문 표현 병기' },
      { key: 'amounts', label: '지원금·총사업비 한도' },
      { key: 'stage', label: '지원 단계·세부 분야' },
      { key: 'requiredDocs', label: '필요서류' },
    ],
  },
  {
    label: '준비 부담·기회비용',
    rows: [
      { key: 'prepHours', label: '예상 준비 시간', note: '산정 근거 함께 표시' },
      { key: 'newDocs', label: '새로 준비할 문서' },
      { key: 'selfPayment', label: '자기부담금', note: '비율 · 최대 금액 · 원문' },
      { key: 'settlement', label: '정산 방식', note: '원문 표현 병기' },
      { key: 'obligations', label: '수행 후 의무' },
      { key: 'reviews', label: '참여 후기', note: '후기 5건 이상일 때 표시' },
      { key: 'duplicate', label: '중복수혜·유사사업', note: '원문 근거만 표시' },
      { key: 'source', label: '공고 원문' },
    ],
  },
]

export interface CompareContext {
  /** 데이터 기준일 (마감까지 계산). 모르면 null */
  asOf: IsoDate | null
  /** 해당 가점·감점을 확인할 기업 프로필 */
  profile: CompanyProfile
}

function checksLeftText(slot: CompareSlot): string | null {
  const result = slot.eligibility
  if (!result) return null
  const self = result.selfCheckedCount
  if (result.needsCheckCount === 0) return self > 0 ? `없음 (직접 확인 ${self}개 반영)` : '없음'
  return `확인 필요 ${result.needsCheckCount}개 · 직접 확인 ${self}개 반영`
}

function bonusesText(p: Program, ctx: CompareContext): string | null {
  if (!p.bonusItems || p.bonusItems.length === 0) return null
  const { applied, toCheck } = bonusAdjustment(ctx.profile, p, ACTIVE_FIT_CRITERIA.bonusCap)
  const head = applied.length > 0 ? applied.map((b) => `${b.item} (${b.effectText})`).join('; ') : '해당 없음'
  return toCheck.length > 0 ? `${head} · 확인 필요 가점 ${toCheck.length}개` : head
}

function selfPaymentCompareText(slot: CompareSlot, p: Program): string | null {
  const ratio = p.selfPayment?.ratioPercent ?? null
  const max = slot.opportunity?.selfPaymentMaxKrw ?? null
  const note = p.selfPayment?.note ?? null
  const parts = [
    ratio !== null ? `비율 ${ratio}%` : null,
    max ? `최대 ${formatKrw(max.value)} (${max.basis})` : null,
    note ? `원문: ${note}` : null,
  ].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(' · ') : null
}

function requiredDocsCompareText(slot: CompareSlot, p: Program): string | null {
  const counts = slot.opportunity?.documentCounts
  if (!counts) return requiredDocsText(p)
  const optional = counts.optional > 0 ? ` · 선택 ${counts.optional}개` : ''
  return `필수 ${counts.required}개 · 해당 시 ${counts.conditional}개${optional} (공고 전용 서식 ${counts.programForms}개)`
}

/**
 * 비교 표 칸의 표시 문구. 값이 없으면 null('-')이다. 값의 우열을 판단하지 않는다.
 * 마감까지는 데이터 기준일(ctx.asOf) 기준이다.
 */
export function compareCellText(key: CompareRowKey, slot: CompareSlot, ctx: CompareContext): string | null {
  const p = slot.program
  if (!p) return null
  switch (key) {
    case 'fit':
      return slot.fit ? `${slot.fit.score}점 (시험용 기준 v0 · 검증 전)` : null
    case 'checksLeft':
      return checksLeftText(slot)
    case 'bonuses':
      return bonusesText(p, ctx)
    case 'period':
      return applyPeriodText(p) ?? p.applyPeriodNote
    case 'deadline':
      if (p.applyEnd === null) return p.applyPeriodNote ? `- (기간 메모: ${p.applyPeriodNote})` : null
      return deadlineText(p, ctx.asOf)
    case 'support':
      return supportTypesWithNoteText(p)
    case 'amounts':
      return amountsText(p)
    case 'stage': {
      const parts = [supportPhasesText(p), supportCategoriesText(p)].filter((part): part is string => part !== null)
      return parts.length > 0 ? parts.join(' / ') : null
    }
    case 'requiredDocs':
      return requiredDocsCompareText(slot, p)
    case 'prepHours':
      return slot.opportunity?.prepHours
        ? `약 ${slot.opportunity.prepHours.value}시간 (근거: ${slot.opportunity.prepHours.basis})`
        : null
    case 'newDocs':
      return (slot.opportunity?.newDocumentCount ?? null) !== null
        ? `${slot.opportunity?.newDocumentCount}건`
        : null
    case 'selfPayment':
      return selfPaymentCompareText(slot, p)
    case 'settlement': {
      const label = settlementText(p)
      return label && p.settlement ? `${label} (원문: ${p.settlement.source.quote})` : null
    }
    case 'obligations':
      return p.obligations ? (p.obligations.length > 0 ? p.obligations.join(', ') : '없음') : null
    case 'reviews':
      // 참여 후기 값은 커뮤니티 서버가 생긴 뒤 5건 이상일 때만 채운다 (§10.6)
      return null
    case 'duplicate':
      return p.duplicateSupportNotes ? p.duplicateSupportNotes.map((n) => `“${n.quote}”`).join(' ') : null
    case 'source':
      return p.sourceUrl
    default:
      return null
  }
}

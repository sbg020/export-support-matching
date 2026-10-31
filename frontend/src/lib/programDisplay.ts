/*
 * 공고 표시용 도우미. 값이 없으면 null(화면 표시 '-')을 반환한다.
 */
import type { IsoDate } from '@/types/common'
import type { ExportStage, Program, SupportStage } from '@/types/program'
import {
  AGENCY_TYPE_OPTIONS,
  DATA_STATE_LABEL,
  EXPORT_STAGE_OPTIONS,
  INTEREST_AREA_OPTIONS,
  PROGRAM_REGION_OPTIONS,
  RECEPTION_STATUS_OPTIONS,
  SETTLEMENT_LABEL,
  STAGE_OPTIONS,
  SUPPORT_METHOD_OPTIONS,
  optionLabel,
} from '@/constants/options'
import { categoryName } from '@/constants/categories'
import { daysBetween } from '@/lib/engine/opportunityCost'
import { formatDate, formatKrw } from './display'

/** 화면 제목: '공고명 · 세부사업명' */
export function programTitleText(p: Program | null): string | null {
  if (!p || p.title === null) return null
  return p.subProgramName ? `${p.title} · ${p.subProgramName}` : p.title
}

export function receptionStatusText(p: Program | null): string | null {
  return p ? optionLabel(RECEPTION_STATUS_OPTIONS, p.receptionStatus) : null
}

/** 접수상태와 계산 기준일. 예: '접수중 (기준일 2026-10-30)' */
export function receptionStatusWithBasisText(p: Program | null): string | null {
  const status = receptionStatusText(p)
  if (!p || status === null) return null
  return p.receptionStatusAsOf ? `${status} (기준일 ${p.receptionStatusAsOf})` : status
}

export function applyPeriodText(p: Program | null): string | null {
  if (!p || (p.applyStart === null && p.applyEnd === null)) return null
  return `${formatDate(p.applyStart)} ~ ${formatDate(p.applyEnd)}`
}

export function agencyText(p: Program | null): string | null {
  if (!p) return null
  const parts = [p.ministry, p.agency].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(' · ') : null
}

export function agencyTypeText(p: Program | null): string | null {
  return p ? optionLabel(AGENCY_TYPE_OPTIONS, p.agencyType) : null
}

export function supportTypesText(p: Program | null): string | null {
  if (!p || p.supportTypes === null) return null
  if (p.supportTypes.length === 0) return '해당 없음'
  return p.supportTypes.map((t) => optionLabel(SUPPORT_METHOD_OPTIONS, t) ?? t).join(', ')
}

/** 지원방식과 원문 표현. 예: '바우처 (원문: 바우처(지정수행기관 이용 또는 사후정산))' */
export function supportTypesWithNoteText(p: Program | null): string | null {
  const types = supportTypesText(p)
  const note = p?.supportTypesNote ?? null
  if (types === null) return note ? `원문: ${note}` : null
  return note ? `${types} (원문: ${note})` : types
}

/** 표시용 관심 분야 (세부 분야에서 역매핑) */
export function supportAreasLabelText(p: Program | null): string | null {
  if (!p || p.supportAreas === null) return null
  if (p.supportAreas.length === 0) return '해당 없음'
  return p.supportAreas.map((a) => optionLabel(INTEREST_AREA_OPTIONS, a) ?? a).join(', ')
}

/** 지원 단계 이름 목록. 비어 있으면 null */
export function phaseListText(phases: readonly SupportStage[]): string | null {
  return phases.length > 0 ? phases.map((s) => optionLabel(STAGE_OPTIONS, s) ?? s).join(', ') : null
}

/** 지원 단계 (세부 분야에서 파생, 여러 개) */
export function supportPhasesText(p: Program | null): string | null {
  if (!p || p.supportPhases === null) return null
  return phaseListText(p.supportPhases)
}

/** 기업 수출단계 이름 (내수 · 초보 · 유망 · 성장 · 강소) */
export function exportStageText(stage: ExportStage | null | undefined): string | null {
  return optionLabel(EXPORT_STAGE_OPTIONS, stage ?? null)
}

/** 세부 분야. 예: 'C01 전시회/행사/해외영업지원, C12 통번역' */
export function supportCategoriesText(p: Program | null): string | null {
  if (!p || p.supportCategories === null) return null
  if (p.supportCategories.length === 0) return p.outOfCategoryScope ? '15개 분류 밖' : '해당 없음'
  return p.supportCategories.map((code) => `${code} ${categoryName(code)}`).join(', ')
}

export function regionsText(p: Program | null): string | null {
  if (!p || p.regions === null) return null
  if (p.regions.length === 0) return '해당 없음'
  const names = p.regions.map((r) => optionLabel(PROGRAM_REGION_OPTIONS, r) ?? r).join(', ')
  const districts = p.regionDistricts && p.regionDistricts.length > 0 ? ` ${p.regionDistricts.join(', ')}` : ''
  const note = p.regionNote ? ` (${p.regionNote})` : ''
  return `${names}${districts}${note}`
}

export function maxAmountText(p: Program | null): string | null {
  return p && p.maxAmountKrw !== null ? `최대 ${formatKrw(p.maxAmountKrw)}` : null
}

/** 지원금·총사업비 한도. 숫자가 없으면 금액 메모 원문 */
export function amountsText(p: Program | null): string | null {
  if (!p) return null
  if (p.maxAmountKrw === null && p.totalBudgetMaxKrw === null) return p.amountNote
  return `지원금 ${formatKrw(p.maxAmountKrw)} · 총사업비 ${formatKrw(p.totalBudgetMaxKrw)}`
}

export function supportSummaryText(p: Program | null): string | null {
  const parts = [maxAmountText(p), supportTypesText(p)].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(' · ') : null
}

export function requiredDocsText(p: Program | null): string | null {
  if (!p || p.requiredDocs === null) return null
  if (p.requiredDocs.length === 0) return '없음'
  return p.requiredDocs.map((d) => d.name).join(', ')
}

/** 정산 방식 화면 문구. 원문에 사후 정산류 표현이 없으면 null('-') */
export function settlementText(p: Program | null): string | null {
  return p?.settlement ? SETTLEMENT_LABEL[p.settlement.type] : null
}

/** 자기부담 비율과 원문 표현 */
export function selfPaymentText(p: Program | null): string | null {
  if (!p?.selfPayment) return null
  const { ratioPercent, note } = p.selfPayment
  if (ratioPercent === null) return note
  return note ? `${ratioPercent}% (원문: ${note})` : `${ratioPercent}%`
}

/** 마감까지. 예: 'D-12 (기준일 2026-10-30)', 지났으면 '마감' */
export function deadlineText(p: Program | null, asOf: IsoDate | null): string | null {
  if (!p || p.applyEnd === null || asOf === null) return null
  const days = daysBetween(asOf, p.applyEnd)
  if (days === null) return null
  if (days < 0) return '마감'
  return `${days === 0 ? 'D-day' : `D-${days}`} (기준일 ${asOf})`
}

export function dataStateText(p: Program | null): string | null {
  return p?.dataState ? DATA_STATE_LABEL[p.dataState] : null
}

/** 원문 쪽 번호: 기간 → 금액 → 분류 근거 중 처음 있는 값 */
export function sourcePageText(p: Program | null): string | null {
  if (!p) return null
  return p.applyPeriodSource?.locator ?? p.amountSource?.locator ?? p.categorySource?.locator ?? null
}

/** 원문 링크가 없을 때의 이유 */
export function sourceUnavailableReason(p: Program | null): string {
  if (!p?.sourceFile) return '공고 원문 링크가 확인되지 않았습니다.'
  const page = sourcePageText(p)
  return `원문 링크는 검수 과정에서 등록됩니다. 원문 파일: ${p.sourceFile}${page ? ` (${page})` : ''}`
}

/*
 * 공고 표시용 도우미. 값이 없으면 null(화면 표시 '-')을 반환한다.
 */
import type { Program } from '@/types/program'
import {
  AGENCY_TYPE_OPTIONS,
  INTEREST_AREA_OPTIONS,
  PROGRAM_REGION_OPTIONS,
  RECEPTION_STATUS_OPTIONS,
  STAGE_OPTIONS,
  SUPPORT_METHOD_OPTIONS,
  optionLabel,
} from '@/constants/options'
import { formatDate, formatKrw } from './display'

export function receptionStatusText(p: Program | null): string | null {
  return p ? optionLabel(RECEPTION_STATUS_OPTIONS, p.receptionStatus) : null
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

export function supportAreasText(p: Program | null): string | null {
  if (!p || p.supportAreas === null) return null
  if (p.supportAreas.length === 0) return '해당 없음'
  return p.supportAreas.map((a) => optionLabel(INTEREST_AREA_OPTIONS, a) ?? a).join(', ')
}

export function stageText(p: Program | null): string | null {
  return p ? optionLabel(STAGE_OPTIONS, p.stage) : null
}

export function regionsText(p: Program | null): string | null {
  if (!p || p.regions === null) return null
  return p.regions.map((r) => optionLabel(PROGRAM_REGION_OPTIONS, r) ?? r).join(', ')
}

export function maxAmountText(p: Program | null): string | null {
  return p && p.maxAmountKrw !== null ? `최대 ${formatKrw(p.maxAmountKrw)}` : null
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

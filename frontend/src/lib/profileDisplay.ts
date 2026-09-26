/*
 * 기업 프로필 표시용 도우미. 사용자가 입력한 값만 문자열로 바꾸고,
 * 입력하지 않은 값은 null(화면 표시 '-')을 반환한다.
 */
import type { CompanyProfile, HoldingStatus, RegionCode } from '@/types/profile'
import {
  CERTIFICATION_OPTIONS,
  COMPANY_TYPE_OPTIONS,
  HS_STATUS_OPTIONS,
  INDUSTRY_MODE_OPTIONS,
  INTEREST_AREA_OPTIONS,
  IP_OPTIONS,
  REGION_OPTIONS,
  optionLabel,
} from '@/constants/options'
import { formatBusinessNumber } from './display'

export function regionText(region: RegionCode | null, district: string | null): string | null {
  const label = optionLabel(REGION_OPTIONS, region)
  if (label === null) return null
  return district ? `${label} ${district}` : label
}

export function companyTypeText(p: CompanyProfile): string | null {
  return optionLabel(COMPANY_TYPE_OPTIONS, p.companyType)
}

export function businessNumberText(p: CompanyProfile): string | null {
  return p.businessNumber === null ? null : formatBusinessNumber(p.businessNumber)
}

export function factoryText(p: CompanyProfile): string | null {
  if (p.hasFactory === null) return null
  if (!p.hasFactory) return '없음'
  return `있음 · ${regionText(p.factoryRegion, p.factoryDistrict) ?? '소재지 미입력'}`
}

export function industryModeText(p: CompanyProfile): string | null {
  return optionLabel(INDUSTRY_MODE_OPTIONS, p.industryInputMode)
}

export function hsStatusText(p: CompanyProfile): string | null {
  return optionLabel(HS_STATUS_OPTIONS, p.hsCodeStatus)
}

function holdingText(
  status: HoldingStatus | null,
  values: string[],
  options: { value: string; label: string }[],
  other: string | null,
): string | null {
  if (status === null) return null
  if (status === 'none') return '보유하지 않음'
  const labels = values.map((value) => options.find((o) => o.value === value)?.label ?? value)
  if (other) labels.push(other)
  return labels.length > 0 ? labels.join(', ') : '보유 (항목 미입력)'
}

export function certificationText(p: CompanyProfile): string | null {
  return holdingText(p.certificationStatus, p.certifications, CERTIFICATION_OPTIONS, p.certificationOther)
}

export function ipText(p: CompanyProfile): string | null {
  return holdingText(p.ipStatus, p.ipTypes, IP_OPTIONS, p.ipOther)
}

export function interestText(p: CompanyProfile): string | null {
  if (p.interestUnsure) return '잘 모르겠어요'
  if (p.interestAreas.length === 0) return null
  return p.interestAreas.map((area) => optionLabel(INTEREST_AREA_OPTIONS, area) ?? area).join(', ')
}

export function countriesText(p: CompanyProfile): string | null {
  return p.exportCountries.length > 0 ? p.exportCountries.join(', ') : null
}

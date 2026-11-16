/*
 * 기업 프로필 → 판정식 프로필 (REVISION_05 §2.3-7).
 * - KSIC → 업종 태그는 constants/ksicIndustryTags.ts (표에 없으면 업종 모름)
 * - model: KSIC 중분류 10~34(제조업)이면 '제조'
 * - issues: 신청 전 확인 '해당' 코드 + 자본잠식이면 A11. 답하지 않은 코드는 모름
 * - intent_export / intent_commit: ⑦ 단계 답
 * - 업력: 데이터 기준일 기준 (시스템 날짜를 쓰지 않는다)
 */
import type { IsoDate } from '@/types/common'
import type { CompanyProfile, PreApplyCode, RegionCode } from '@/types/profile'
import type { CommonCheckKey } from '@/types/program'
import type { CommonCheckAnswer } from '@/types/selfCheck'
import { CERTIFICATION_OPTIONS, optionLabel } from '@/constants/options'
import { COMMON_CHECK_TO_PRE_APPLY } from '@/constants/preApply'
import { industryTagsForKsic, isManufacturingKsic } from '@/constants/ksicIndustryTags'
import type { EngineProfile } from './eligibilityV3'

export const REGION_SHORT: Record<RegionCode, string> = {
  seoul: '서울', busan: '부산', daegu: '대구', incheon: '인천', gwangju: '광주', daejeon: '대전', ulsan: '울산',
  sejong: '세종', gyeonggi: '경기', gangwon: '강원', chungbuk: '충북', chungnam: '충남', jeonbuk: '전북', jeonnam: '전남',
  gyeongbuk: '경북', gyeongnam: '경남', jeju: '제주',
}

const SIZE_TOKEN: Record<string, string | null> = {
  'small-business': '소상공인',
  sme: '중소기업',
  'mid-sized': '중견기업',
  large: '대기업',
  unknown: null,
}

function location(region: RegionCode | null, district: string | null): string | null {
  if (!region) return null
  const sido = REGION_SHORT[region]
  return district ? `${sido} ${district.trim()}` : sido
}

/** 설립일부터 기준일까지 연수 (소수). 둘 중 하나라도 없으면 null */
export function businessAgeYears(foundedAt: IsoDate | null, asOf: IsoDate | null): number | null {
  if (!foundedAt || !asOf) return null
  const a = Date.parse(foundedAt)
  const b = Date.parse(asOf)
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null
  return Math.round(((b - a) / (365.25 * 24 * 3600 * 1000)) * 10) / 10
}

/** 신청 전 확인 답 (예전 공통 확인 답은 신청 전 확인이 비어 있을 때만 참고한다) */
export function preApplyAnswers(
  p: CompanyProfile,
  common: Partial<Record<CommonCheckKey, CommonCheckAnswer>> = {},
): Partial<Record<PreApplyCode, 'no' | 'yes' | 'unknown'>> {
  if (Object.keys(p.preApplyChecks).length > 0) return p.preApplyChecks
  const out: Partial<Record<PreApplyCode, 'no' | 'yes' | 'unknown'>> = {}
  for (const [key, code] of Object.entries(COMMON_CHECK_TO_PRE_APPLY) as [CommonCheckKey, PreApplyCode][]) {
    const answer = common[key]
    if (answer) out[code] = answer
  }
  return out
}

export function toEngineProfile(
  p: CompanyProfile,
  asOf: IsoDate | null,
  common: Partial<Record<CommonCheckKey, CommonCheckAnswer>> = {},
): EngineProfile {
  const hq = location(p.hqRegion, p.hqDistrict)
  const site = p.hasFactory ? location(p.factoryRegion, p.factoryDistrict) : null
  const certs =
    p.certificationStatus === null
      ? null
      : p.certificationStatus === 'none'
        ? []
        : [
            ...p.certifications.map((c) => optionLabel(CERTIFICATION_OPTIONS, c) ?? c),
            ...(p.certificationOther ?? '').split(/[,·/]/).map((s) => s.trim()).filter(Boolean),
          ]
  const answers = preApplyAnswers(p, common)
  const issues = (Object.entries(answers) as [PreApplyCode, string][]).filter(([, a]) => a === 'yes').map(([c]) => c) as string[]
  const answered = (Object.entries(answers) as [PreApplyCode, string][]).filter(([, a]) => a === 'yes' || a === 'no').map(([c]) => c) as string[]
  const equity = p.totalEquityKrw
  if (equity !== null) {
    answered.push('A11')
    if (equity <= 0) issues.push('A11')
  }
  const debtRatio =
    equity !== null && equity > 0 && p.totalLiabilitiesKrw !== null ? (p.totalLiabilitiesKrw / equity) * 100 : null
  const manufacturing = isManufacturingKsic(p.ksicCode)
  const hs = p.hsCode ? [...new Set([p.hsCode, p.hsCode.slice(0, 4), p.hsCode.slice(0, 6)])] : null
  return {
    size: p.companySize ? (SIZE_TOKEN[p.companySize] ?? null) : null,
    attrs: p.companyType === 'corporation' ? ['법인사업자'] : p.companyType === 'sole-proprietor' ? ['개인사업자'] : [],
    hq,
    sites: site ? [site] : [],
    industry: industryTagsForKsic(p.ksicCode),
    product_hs: hs,
    export_usd: p.exportUsdLastYear,
    revenue_krw: p.revenueKrw,
    age: businessAgeYears(p.foundedAt, asOf),
    employees: p.employeeCount,
    certs,
    debt_ratio: debtRatio,
    model: manufacturing === null ? null : manufacturing ? '제조' : '기타',
    issues,
    answered_flags: answered,
    intent_export: p.intentExport,
    intent_commit: p.intentCommit,
  }
}

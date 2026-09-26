import type { IsoDate, IsoDateTime, YearMonth } from './common'

export type CompanyType = 'corporation' | 'sole-proprietor'

export type RegionCode =
  | 'seoul'
  | 'busan'
  | 'daegu'
  | 'incheon'
  | 'gwangju'
  | 'daejeon'
  | 'ulsan'
  | 'sejong'
  | 'gyeonggi'
  | 'gangwon'
  | 'chungbuk'
  | 'chungnam'
  | 'jeonbuk'
  | 'jeonnam'
  | 'gyeongbuk'
  | 'gyeongnam'
  | 'jeju'

/** 업종 입력 방식: KSIC 코드, 업종명, 또는 아직 모름 */
export type IndustryInputMode = 'ksic' | 'name' | 'unknown'

/** 코드 입력 상태: 확인됨, 임시 입력(검증 필요), 모름(미확정) */
export type CodeInputStatus = 'confirmed' | 'provisional' | 'unknown'

/** 보유 여부. null은 '아직 입력하지 않음'으로, 'none'(보유하지 않음)과 구분한다. */
export type HoldingStatus = 'has' | 'none'

export type InterestArea =
  | 'market-research'
  | 'buyer-matching'
  | 'exhibition'
  | 'marketing'
  | 'certification'
  | 'logistics'
  | 'translation'
  | 'export-finance'

/**
 * 사용자가 직접 입력한 기업 프로필.
 * 모든 값은 사용자가 입력한 경우에만 채워진다. 미입력은 null(배열은 [])이다.
 */
export interface CompanyProfile {
  // 1. 기본정보
  companyName: string | null
  /** 형식 검증만 수행하며, 이 기기에 저장하지 않는다 (현재 화면 세션에서만 보관). */
  businessNumber: string | null
  companyType: CompanyType | null
  foundedAt: IsoDate | null
  hqRegion: RegionCode | null
  hqDistrict: string | null
  /** 공장 보유 여부. null = 미입력, false = 공장 없음 */
  hasFactory: boolean | null
  factoryRegion: RegionCode | null
  factoryDistrict: string | null
  employeeCount: number | null

  // 2. 기업 규모
  industryInputMode: IndustryInputMode | null
  ksicCode: string | null
  industryName: string | null
  revenueKrw: number | null
  revenueYear: number | null

  // 3. 수출 현황
  /** 최근 1년 수출액(USD). 0은 '수출 실적 없음'을 뜻하는 유효한 값이다. */
  exportUsdLastYear: number | null
  exportPeriodStart: YearMonth | null
  exportPeriodEnd: YearMonth | null
  exportCountries: string[]

  // 4. 주력 제품
  productName: string | null
  hsCodeStatus: CodeInputStatus | null
  hsCode: string | null

  // 5. 가점 요소
  certificationStatus: HoldingStatus | null
  certifications: string[]
  certificationOther: string | null
  ipStatus: HoldingStatus | null
  ipTypes: string[]
  ipOther: string | null

  // 6. 관심 분야
  interestAreas: InterestArea[]
  interestUnsure: boolean
}

export type ProfileField = keyof CompanyProfile

export type ProfileStepId = 1 | 2 | 3 | 4 | 5 | 6

export interface ProfileMeta {
  /** 사용자가 '건너뛰기'로 넘어간 단계 */
  skippedSteps: ProfileStepId[]
  /** 사용자가 이 기기에 마지막으로 저장한 시각 */
  lastSavedAt: IsoDateTime | null
}

/** 프로필 입력 상태 */
export type ProfileStatus = 'empty' | 'in-progress' | 'complete'

export interface ProfileIssue {
  field: ProfileField
  step: ProfileStepId
  message: string
}

export interface ProfileAssessment {
  status: ProfileStatus
  /** 입력되지 않았거나 형식이 맞지 않는 필수 항목 */
  missing: ProfileIssue[]
  /** 입력은 되었으나 코드 미확정 등으로 확인이 필요한 항목 */
  needsVerification: ProfileIssue[]
}

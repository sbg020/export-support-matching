import type { IsoDate, IsoDateTime, YearMonth } from './common'

export type CompanyType = 'corporation' | 'sole-proprietor'

/** 기업 규모 구분 (중소기업확인서 기준). 소상공인도 중소기업에 포함된다. */
export type CompanySize = 'small-business' | 'sme' | 'mid-sized' | 'large' | 'unknown'

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
  | 'legal-tax'
  | 'ip'
  | 'local-registration'
  | 'export-training'
  | 'customs-fta'

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
  /** 기업 규모 구분 (선택). 예전에 저장한 프로필에는 없으며 null로 읽는다. */
  companySize: CompanySize | null
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

  // 7. 재무·신청 전 확인 (선택, REVISION_05 §3). 예전에 저장한 프로필에는 없으며 null로 읽는다.
  /** 재무 기준연도 */
  finBaseYear: number | null
  /** 전기 매출액 (원). 당기 매출액은 revenueKrw를 그대로 쓴다 */
  revenuePrevKrw: number | null
  /** 영업이익 (원, 음수 허용) */
  operatingIncomeKrw: number | null
  /** 당기순이익 (원, 음수 허용) */
  netIncomeKrw: number | null
  /** 부채총계 (원) */
  totalLiabilitiesKrw: number | null
  /** 자본총계 (원, 0 이하 = 자본잠식) */
  totalEquityKrw: number | null
  /** 신청 전 확인(공통 결격 사유 6개) 답. 답하지 않은 코드는 없다 */
  preApplyChecks: Partial<Record<PreApplyCode, PreApplyAnswer>>
  /** 신청 전 확인에 답한 날짜 */
  preApplyCheckedAt: IsoDate | null
  /** 수출 계획(희망)이 있는지 (B09 수출 의향) */
  intentExport: boolean | null
  /** 자부담·일정 참여 등 참여 조건을 받아들일 수 있는지 (B09 참여 의사) */
  intentCommit: boolean | null
  /** 준비 상태: 자부담 납부 가능 (결격 사유가 아니다) */
  selfPaymentReady: boolean | null
}

/** 신청 전 확인(공통 결격 사유) 코드: 정답세트 조건 유형 B01·B02·B03·B04·B05·B08 */
export type PreApplyCode = 'B01' | 'B02' | 'B03' | 'B04' | 'B05' | 'B08'

/** 해당 없음 · 해당 · 모르겠음 */
export type PreApplyAnswer = 'no' | 'yes' | 'unknown'

export type ProfileField = keyof CompanyProfile

export type ProfileStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7

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

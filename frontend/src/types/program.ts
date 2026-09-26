import type { IsoDate, IsoDateTime, SourceReference } from './common'
import type { CompanyType, InterestArea, RegionCode } from './profile'
import type { DocumentType } from './tracking'

/** 접수상태 — 공고 원문 기준으로만 채운다. 현재 시스템 날짜로 추정하지 않는다. */
export type ReceptionStatus = 'open' | 'upcoming' | 'closed'

/** 지원분야(수출 단계) */
export type SupportStage = 'preparation' | 'market-entry' | 'execution' | 'localization'

export type AgencyType = 'central-ministry' | 'public-agency' | 'local-government' | 'association'

/** 지원방식 */
export type SupportMethod =
  | 'voucher'
  | 'grant'
  | 'loan-guarantee'
  | 'consulting'
  | 'training'
  | 'in-kind'

/** 공고 대상 지역. 전국 대상이면 'nationwide' */
export type ProgramRegion = RegionCode | 'nationwide'

interface EligibilityRuleBase {
  id: string
  /** 화면에 표시할 조건 이름 */
  label: string
  /** 규칙의 원문 근거. 근거 없는 규칙은 등록하지 않는다. */
  source: SourceReference
}

/**
 * 공고의 신청자격 규칙.
 * 자동 비교가 가능한 규칙만 kind를 가지며, 나머지는 'manual'(수동 확인 필요)로 등록한다.
 */
export type EligibilityRule =
  | (EligibilityRuleBase & { kind: 'company-type-in'; values: CompanyType[] })
  | (EligibilityRuleBase & { kind: 'hq-region-in'; values: RegionCode[] })
  | (EligibilityRuleBase & { kind: 'revenue-krw-max' | 'revenue-krw-min'; valueKrw: number })
  | (EligibilityRuleBase & { kind: 'export-usd-max' | 'export-usd-min'; valueUsd: number })
  | (EligibilityRuleBase & {
      kind: 'years-since-founded-max' | 'years-since-founded-min'
      years: number
    })
  | (EligibilityRuleBase & { kind: 'manual' })

export type EligibilityRuleKind = EligibilityRule['kind']

export interface RequiredDocument {
  id: string
  name: string
  /** 서류함 유형과 연결할 수 있으면 지정. 판단할 수 없으면 null */
  documentType: DocumentType | null
  note: string | null
  source: SourceReference | null
}

export interface SelfPayment {
  /** 자기부담 비율(%) — 원문에 명시된 경우만 */
  ratioPercent: number | null
  note: string | null
  source: SourceReference | null
}

export interface PrepEstimate {
  hours: number
  /** 추정 근거 (측정 방법·표본 등). 근거 없는 추정치는 등록하지 않는다. */
  basis: string
}

/**
 * 지원사업 공고.
 * 아직 수집·검증되지 않은 필드는 null이다. 배열 필드의 null은 '확인 전',
 * []는 '원문상 해당 없음이 확인됨'을 뜻한다.
 */
export interface Program {
  id: string
  title: string | null
  sourceUrl: string | null
  sourceTitle: string | null
  sourcePublishedAt: IsoDate | null
  /** 사람이 원문과 대조해 검증한 날짜 */
  verifiedAt: IsoDate | null
  applyStart: IsoDateTime | null
  applyEnd: IsoDateTime | null
  receptionStatus: ReceptionStatus | null
  announcementDate: IsoDate | null
  agreementDate: IsoDate | null
  ministry: string | null
  agency: string | null
  agencyType: AgencyType | null
  regions: ProgramRegion[] | null
  stage: SupportStage | null
  supportAreas: InterestArea[] | null
  supportTypes: SupportMethod[] | null
  maxAmountKrw: number | null
  selfPayment: SelfPayment | null
  summaryEasy: string | null
  targetDescription: string | null
  useExamples: string[] | null
  eligibilityRules: EligibilityRule[] | null
  requiredDocs: RequiredDocument[] | null
  obligations: string[] | null
  duplicateSupportNotes: SourceReference[] | null
  relatedProgramIds: string[] | null
  prepEstimate: PrepEstimate | null
}

export type ProgramSort = 'recommended' | 'deadline' | 'amount'

export interface ProgramQuery {
  keyword: string | null
  receptionStatuses: ReceptionStatus[]
  stages: SupportStage[]
  agencyTypes: AgencyType[]
  regions: ProgramRegion[]
  supportTypes: SupportMethod[]
  sort: ProgramSort
}

export interface ProgramListResult {
  items: Program[]
  /**
   * 전체 건수. 데이터 소스가 연결되지 않았으면 null이며 화면에는 '-'로 표시한다.
   * null을 0으로 바꾸어 '0건 매칭'처럼 보이게 하지 않는다.
   */
  total: number | null
}

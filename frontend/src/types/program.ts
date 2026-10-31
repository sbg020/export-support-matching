import type { IsoDate, IsoDateTime, SourceReference } from './common'
import type { InterestArea, RegionCode } from './profile'
import type { DocumentType } from './tracking'

/**
 * 접수상태 — 공고 원문의 접수기간을 데이터 기준일(receptionStatusAsOf)과 비교해 정한다.
 * 현재 시스템 날짜로 추정하지 않는다.
 */
export type ReceptionStatus = 'open' | 'upcoming' | 'closed'

/** 공고의 지원 단계 (수출준비 · 시장진출 · 수출이행 · 사후관리·현지화) */
export type SupportStage = 'preparation' | 'market-entry' | 'execution' | 'localization'

/**
 * 기업의 수출단계 (직전 연도 수출액 기준): 내수 · 초보 · 유망 · 성장 · 강소.
 * 공고의 지원 단계(SupportStage)와는 다른 타입이다.
 */
export type ExportStage = 'domestic' | 'beginner' | 'promising' | 'growth' | 'strong'

/** 15개 세부 분야. C01~C14는 수출바우처 서비스 영역, C15는 팀이 추가한 분류 */
export type SupportCategoryCode =
  | 'C01'
  | 'C02'
  | 'C03'
  | 'C04'
  | 'C05'
  | 'C06'
  | 'C07'
  | 'C08'
  | 'C09'
  | 'C10'
  | 'C11'
  | 'C12'
  | 'C13'
  | 'C14'
  | 'C15'

/** 데이터 상태: 초안(사람 검수 전) · 검수 완료 · 검수 완료 + 원문 URL·검수일 */
export type DataState = 'draft' | 'reviewed' | 'verified'

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

/** 자격 규칙의 필드 (정답 세트 rules.field 그대로) */
export type RuleField =
  | 'company_type'
  | 'hq_region'
  | 'factory_region'
  | 'business_age_years'
  | 'industry'
  | 'revenue_krw'
  | 'export_usd'
  | 'employees'
  | 'certification'
  | 'product_hs'
  | 'intent'
  | 'manual_check'

/** '제한없음' → 'no-limit', '-'(값 비교 없음) → 'none' */
export type RuleOp =
  | 'in'
  | 'not_in'
  | '>='
  | '>'
  | '<='
  | '<'
  | 'between'
  | 'has'
  | 'not_has'
  | 'no-limit'
  | 'none'

/** 공통 확인 5가지: 휴·폐업, 국세·지방세 체납, 금융 연체·신용, 참여제한·제재, 재무 상태(결산 기준) */
export type CommonCheckKey = 'closure' | 'tax-arrears' | 'credit' | 'sanction' | 'financial-health'

export type RuleUnit = 'USD' | 'KRW' | '명' | '년' | 'KSIC' | 'KSIC 3자리' | 'HS 4단위'

/** 원문 해석 확실성: 명확 / 애매 */
export type RuleCertainty = 'clear' | 'ambiguous'

/** 정답 세트 행의 작성·검수 정보 */
export interface ReviewInfo {
  author: string | null
  /** 검수상태 원문 (검수대기·확인·수정·추가) */
  status: string | null
  /** 값 출처 원문 (미검수(초안)·원문 확인 …) */
  source: string | null
}

/**
 * 공고의 신청자격 규칙 (정답 세트 rules 시트 1행).
 * 필드 이름은 정답 세트를 그대로 써서 원문 근거와 추적이 끊기지 않게 한다.
 */
export interface EligibilityRule {
  /** rule_key (예: P001-R01) */
  id: string
  /** 필수 / 제외 */
  kind: 'required' | 'exclusion'
  /** 필수 조건 그룹. 같은 그룹은 OR, 다른 그룹은 AND. 제외 조건은 null */
  group: string | null
  /** 특정 지원 항목에만 붙는 조건이면 그 이름 (전체 판정에서 뺀다) */
  scope: string | null
  field: RuleField
  op: RuleOp
  value: string[] | number | [number, number] | string | null
  /** 값의 괄호 안 메모 (예: '개인사업자 포함') */
  valueNote: string | null
  unit: RuleUnit | null
  /** 판정 기준 시점 원문 표현 (신청일, 2025년 (직접 수출) …) */
  basis: string | null
  certainty: RuleCertainty
  /** 화면에 표시할 조건 문구 (변환 스크립트가 만든다) */
  label: string
  commonCheckKey: CommonCheckKey[] | null
  /** 공통 확인 키워드로 덮이지 않는 항목 (예: '4대보험 미납'). 키가 없거나 모두 덮이면 [] */
  commonCheckUncovered: string[]
  /** 값의 괄호나 메모에 있는 '예외' 문구 */
  exceptionText: string | null
  /** quote = 근거 문장, locator = 'n쪽', url = 공고 sourceUrl */
  source: SourceReference
  note: string | null
  review: ReviewInfo
}

/** 제출 구분: 필수 · 해당 시 · 선택 */
export type DocumentRequirement = 'required' | 'conditional' | 'optional'

export interface RequiredDocument {
  id: string
  /** 표준 서류명 */
  name: string
  /** 공고에 적힌 서류명 */
  originalName: string | null
  requirement: DocumentRequirement | null
  /** 서류함 유형과 연결할 수 있으면 지정. 판단할 수 없으면 null */
  documentType: DocumentType | null
  /** 사업신청서·참가신청서처럼 공고마다 서식이 다른 서류 */
  isProgramForm: boolean
  note: string | null
  source: SourceReference | null
}

/** 가점·감점 항목 (정답 세트 bonuses 시트) */
export interface BonusItem {
  id: string
  item: string | null
  /** 효과 원문 (예: '가점 1점', '5점 감점', '우선 지원') */
  effectText: string | null
  certainty: RuleCertainty
  /** 효과에서 읽은 점수. 하나로 정해지지 않으면 null */
  points: number | null
  /** 프로필로 확인할 수 있는 인증·지식재산권 코드 (하나라도 있으면 해당). 확인할 수 없으면 null */
  matchKeys: string[] | null
  source: SourceReference | null
}

/** 정산 방식: 먼저 집행하고 나중에 받음 / 수행기관 이용과 사후 정산 중 선택 */
export interface SettlementInfo {
  type: 'reimbursement' | 'mixed'
  /** quote = 찾은 원문 표현, locator = null */
  source: SourceReference
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

export interface ProgramReview extends ReviewInfo {
  reviewer: string | null
}

/**
 * 지원사업 공고 (세부사업이 있으면 세부사업 1개).
 * 아직 수집·검증되지 않은 필드는 null이다. 배열 필드의 null은 '확인 전',
 * []는 '원문상 해당 없음이 확인됨'을 뜻한다.
 */
export interface Program {
  id: string
  /** 원공고 ID. 세부사업이 아니면 id와 같다 */
  parentId: string | null
  /** 세부사업 이름. 세부사업이 아니면 null */
  subProgramName: string | null
  title: string | null
  sourceUrl: string | null
  sourceTitle: string | null
  /** 원문 파일명 */
  sourceFile: string | null
  sourcePublishedAt: IsoDate | null
  /** 사람이 원문과 대조해 검증한 날짜 */
  verifiedAt: IsoDate | null
  applyStart: IsoDateTime | null
  applyEnd: IsoDateTime | null
  /** 기간 메모 (예: '예산 소진 시까지') */
  applyPeriodNote: string | null
  applyPeriodSource: SourceReference | null
  receptionStatus: ReceptionStatus | null
  /** 접수상태를 계산한 데이터 기준일 */
  receptionStatusAsOf: IsoDate | null
  announcementDate: IsoDate | null
  agreementDate: IsoDate | null
  ministry: string | null
  agency: string | null
  agencyType: AgencyType | null
  regions: ProgramRegion[] | null
  /** 시·군·구 (예: ['성남시']) */
  regionDistricts: string[] | null
  /** 지역 범위의 괄호 메모 */
  regionNote: string | null
  /** @deprecated 지원 단계는 supportPhases를 쓴다 (세부 분야에서 파생되며 여러 개일 수 있다) */
  stage: SupportStage | null
  supportCategories: SupportCategoryCode[] | null
  /** supportCategories에서 파생한 지원 단계 (주 단계 + 함께 걸치는 단계) */
  supportPhases: SupportStage[] | null
  /** 표시용: supportCategories에서 역매핑한 관심 분야 */
  supportAreas: InterestArea[] | null
  categorySource: SourceReference | null
  /** 여러 메뉴 중 골라 쓰는 바우처형 */
  isVoucherMenu: boolean | null
  /** 15개 분류 밖 (현금 장려금 등) */
  outOfCategoryScope: boolean | null
  supportTypes: SupportMethod[] | null
  /** 지원방식 원문 표현 */
  supportTypesNote: string | null
  /** 지원금 한도 */
  maxAmountKrw: number | null
  /** 총사업비 한도 */
  totalBudgetMaxKrw: number | null
  /** 금액 메모 (숫자가 아닌 금액 표현 포함) */
  amountNote: string | null
  amountSource: SourceReference | null
  selfPayment: SelfPayment | null
  settlement: SettlementInfo | null
  /** 선정 규모 원문 */
  selectionSize: string | null
  /** 공고가 대상으로 명시한 기업 수출단계 */
  targetExportStages: ExportStage[] | null
  targetStageSource: SourceReference | null
  summaryEasy: string | null
  targetDescription: string | null
  useExamples: string[] | null
  eligibilityRules: EligibilityRule[] | null
  requiredDocs: RequiredDocument[] | null
  bonusItems: BonusItem[] | null
  obligations: string[] | null
  duplicateSupportNotes: SourceReference[] | null
  /** 정답 세트 inventory의 공고 그룹 키 */
  groupKey: string | null
  relatedProgramIds: string[] | null
  prepEstimate: PrepEstimate | null
  /** 작성 메모 (검수용). 상세의 펼침 영역에만 표시 */
  draftNotes: string | null
  review: ProgramReview | null
  dataState: DataState | null
}

export type ProgramSort = 'recommended' | 'deadline' | 'amount'

export interface ProgramQuery {
  keyword: string | null
  receptionStatuses: ReceptionStatus[]
  /** 지원 단계 — supportPhases에 하나라도 포함되면 통과 */
  stages: SupportStage[]
  /** 세부 분야 — supportCategories에 하나라도 포함되면 통과 */
  categories: SupportCategoryCode[]
  agencyTypes: AgencyType[]
  /** 선택한 지역의 공고와 함께 전국 공고도 통과 */
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

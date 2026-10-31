/*
 * 화면에서 사용하는 선택지.
 * 공고 데이터가 아니라 입력·필터 UI의 선택 항목이다.
 */
import type { Option } from '@/types/common'
import type {
  CodeInputStatus,
  CompanySize,
  CompanyType,
  HoldingStatus,
  IndustryInputMode,
  InterestArea,
  ProfileStepId,
  RegionCode,
} from '@/types/profile'
import type {
  AgencyType,
  CommonCheckKey,
  DataState,
  DocumentRequirement,
  ExportStage,
  ProgramRegion,
  ProgramSort,
  ReceptionStatus,
  SettlementInfo,
  SupportMethod,
  SupportStage,
} from '@/types/program'
import type { CalendarEventType, DocumentType } from '@/types/tracking'
import type { ConditionStatus, EligibilityStatus, NeedsCheckReason } from '@/types/results'
import type { CommonCheckAnswer } from '@/types/selfCheck'

export const COMPANY_TYPE_OPTIONS: Option<CompanyType>[] = [
  { value: 'corporation', label: '법인사업자' },
  { value: 'sole-proprietor', label: '개인사업자' },
]

export const COMPANY_SIZE_OPTIONS: Option<CompanySize>[] = [
  { value: 'small-business', label: '소상공인' },
  { value: 'sme', label: '중소기업' },
  { value: 'mid-sized', label: '중견기업' },
  { value: 'large', label: '대기업' },
  { value: 'unknown', label: '잘 모르겠어요' },
]

export const REGION_OPTIONS: Option<RegionCode>[] = [
  { value: 'seoul', label: '서울특별시' },
  { value: 'busan', label: '부산광역시' },
  { value: 'daegu', label: '대구광역시' },
  { value: 'incheon', label: '인천광역시' },
  { value: 'gwangju', label: '광주광역시' },
  { value: 'daejeon', label: '대전광역시' },
  { value: 'ulsan', label: '울산광역시' },
  { value: 'sejong', label: '세종특별자치시' },
  { value: 'gyeonggi', label: '경기도' },
  { value: 'gangwon', label: '강원특별자치도' },
  { value: 'chungbuk', label: '충청북도' },
  { value: 'chungnam', label: '충청남도' },
  { value: 'jeonbuk', label: '전북특별자치도' },
  { value: 'jeonnam', label: '전라남도' },
  { value: 'gyeongbuk', label: '경상북도' },
  { value: 'gyeongnam', label: '경상남도' },
  { value: 'jeju', label: '제주특별자치도' },
]

export const PROGRAM_REGION_OPTIONS: Option<ProgramRegion>[] = [
  { value: 'nationwide', label: '전국' },
  ...REGION_OPTIONS,
]

export const INDUSTRY_MODE_OPTIONS: Option<IndustryInputMode>[] = [
  { value: 'ksic', label: 'KSIC 코드로 입력', description: '사업자등록증 등에서 확인한 업종 코드' },
  { value: 'name', label: '업종명으로 입력', description: '코드를 모르면 업종 이름을 적어 주세요' },
  { value: 'unknown', label: '잘 모르겠어요', description: '나중에 확인할 항목으로 남겨 둡니다' },
]

export const HS_STATUS_OPTIONS: Option<CodeInputStatus>[] = [
  { value: 'confirmed', label: '확인된 코드가 있어요', description: '수출신고서 등에서 확인한 코드' },
  { value: 'provisional', label: '대략 알고 있어요', description: '임시로 입력하고 나중에 확인합니다' },
  { value: 'unknown', label: '잘 모르겠어요', description: '미확정 상태로 두고 나중에 확인합니다' },
]

export const HOLDING_STATUS_OPTIONS: Option<HoldingStatus>[] = [
  { value: 'has', label: '보유하고 있어요' },
  { value: 'none', label: '보유하지 않아요' },
]

export const CERTIFICATION_OPTIONS: Option<string>[] = [
  { value: 'venture', label: '벤처기업' },
  { value: 'innobiz', label: '이노비즈(기술혁신형 중소기업)' },
  { value: 'mainbiz', label: '메인비즈(경영혁신형 중소기업)' },
  { value: 'export-promising', label: '수출유망중소기업' },
  { value: 'women', label: '여성기업' },
  { value: 'disabled', label: '장애인기업' },
  { value: 'social', label: '사회적기업' },
  { value: 'research-institute', label: '기업부설연구소' },
]

export const IP_OPTIONS: Option<string>[] = [
  { value: 'patent', label: '특허' },
  { value: 'utility-model', label: '실용신안' },
  { value: 'design', label: '디자인권' },
  { value: 'trademark', label: '상표권' },
]

export const INTEREST_AREA_OPTIONS: Option<InterestArea>[] = [
  { value: 'market-research', label: '해외시장 조사', description: '진출할 나라의 시장 상황을 알아봐요' },
  { value: 'buyer-matching', label: '해외 바이어 찾기', description: '제품을 사 줄 해외 거래처를 찾아요' },
  { value: 'exhibition', label: '해외 전시회', description: '해외 전시회·박람회에 참가해요' },
  { value: 'marketing', label: '해외 마케팅', description: '현지 광고·홍보를 진행해요' },
  { value: 'certification', label: '해외 인증', description: '수출국의 규격·인증을 준비해요' },
  { value: 'logistics', label: '국제물류', description: '해외 운송·통관을 준비해요' },
  { value: 'translation', label: '통번역', description: '계약서·카탈로그 번역, 상담 통역' },
  { value: 'export-finance', label: '수출 자금', description: '수출에 필요한 자금·보증·보험' },
  { value: 'legal-tax', label: '법무·세무·회계', description: '해외 계약 검토, 현지 세무·회계 자문을 받아요' },
  { value: 'ip', label: '특허·지식재산권', description: '해외 특허·상표 출원이나 분쟁 대응을 준비해요' },
  { value: 'local-registration', label: '현지 등록·서류 대행', description: '해외 제품 등록, 현지 법인·지사 서류를 준비해요' },
  { value: 'export-training', label: '수출 교육', description: '무역 실무·수출 역량 교육을 받아요' },
  { value: 'customs-fta', label: '통관·원산지·FTA', description: '원산지 증명, 통관·관세 대응을 준비해요' },
]

/** 기업의 수출단계 (직전 연도 수출액 기준) */
export const EXPORT_STAGE_OPTIONS: Option<ExportStage>[] = [
  { value: 'domestic', label: '내수' },
  { value: 'beginner', label: '초보' },
  { value: 'promising', label: '유망' },
  { value: 'growth', label: '성장' },
  { value: 'strong', label: '강소' },
]

export const RECEPTION_STATUS_OPTIONS: Option<ReceptionStatus>[] = [
  { value: 'open', label: '접수중' },
  { value: 'upcoming', label: '접수예정' },
  { value: 'closed', label: '마감' },
]

export const STAGE_OPTIONS: Option<SupportStage>[] = [
  { value: 'preparation', label: '수출준비' },
  { value: 'market-entry', label: '시장진출' },
  { value: 'execution', label: '수출이행' },
  { value: 'localization', label: '사후관리·현지화' },
]

/** 로드맵에 표시하는 일반적인 탐색 단계 이름 (개별 기업의 진단 결과가 아님) */
export const ROADMAP_STAGES: { value: SupportStage; label: string }[] = [
  { value: 'preparation', label: '수출 준비' },
  { value: 'market-entry', label: '시장 진출' },
  { value: 'execution', label: '수출 이행' },
  { value: 'localization', label: '현지화' },
]

export const AGENCY_TYPE_OPTIONS: Option<AgencyType>[] = [
  { value: 'central-ministry', label: '중앙부처' },
  { value: 'public-agency', label: '공공기관·수출지원기관' },
  { value: 'local-government', label: '지방자치단체' },
  { value: 'association', label: '협회·단체' },
]

export const SUPPORT_METHOD_OPTIONS: Option<SupportMethod>[] = [
  { value: 'voucher', label: '바우처' },
  { value: 'grant', label: '보조금(현금 지원)' },
  { value: 'loan-guarantee', label: '융자·보증·보험' },
  { value: 'consulting', label: '컨설팅' },
  { value: 'training', label: '교육' },
  { value: 'in-kind', label: '서비스·현물 제공' },
]

export const SORT_OPTIONS: Option<ProgramSort>[] = [
  { value: 'recommended', label: '추천순' },
  { value: 'deadline', label: '마감 임박순' },
  { value: 'amount', label: '지원규모순' },
]

export const ELIGIBILITY_STATUS_OPTIONS: Option<EligibilityStatus>[] = [
  { value: 'eligible', label: '신청 가능', description: '공고의 자격 조건을 모두 충족' },
  { value: 'needs-check', label: '확인 필요', description: '일부 조건은 원문을 보고 직접 확인해야 함' },
  { value: 'ineligible', label: '신청 불가', description: '충족하지 못한 자격 조건이 있음' },
]

export const CONDITION_STATUS_OPTIONS: Option<ConditionStatus>[] = [
  { value: 'met', label: '충족' },
  { value: 'unmet', label: '미충족' },
  { value: 'needs-check', label: '확인 필요' },
]

/** 제외 조건의 상태 표시: 회사가 제외 대상에 해당하면 '제외 대상 해당' */
export const EXCLUSION_STATUS_OPTIONS: Option<ConditionStatus>[] = [
  { value: 'met', label: '해당 없음' },
  { value: 'unmet', label: '제외 대상 해당' },
  { value: 'needs-check', label: '확인 필요' },
]

export const NEEDS_CHECK_REASON_OPTIONS: Option<NeedsCheckReason>[] = [
  { value: 'missing-input', label: '입력 없음' },
  { value: 'not-automatable', label: '직접 확인 대상' },
  { value: 'period-mismatch', label: '기준 기간 다름' },
  { value: 'ambiguous', label: '해석 확인 필요' },
  { value: 'exception', label: '예외 있음' },
]

/** 공통 확인 5가지 (맞춤 추천 상단 `공통 확인 사항`) */
export const COMMON_CHECK_OPTIONS: Option<CommonCheckKey>[] = [
  { value: 'closure', label: '휴·폐업 상태가 아닙니다' },
  { value: 'tax-arrears', label: '국세·지방세 체납이 없습니다' },
  {
    value: 'credit',
    label: '금융기관 연체·불량거래, 부도·회생·파산·법정관리 등 신용 문제가 없습니다',
  },
  { value: 'sanction', label: '정부지원사업 참여제한·제재 중이 아닙니다' },
  {
    value: 'financial-health',
    label: '최근 결산 기준 자본잠식, 부채비율 1,000% 이상, 감사의견 거절·부적정에 해당하지 않습니다',
    description:
      "최근 결산 재무제표 기준입니다. 외부감사 대상이 아니면 감사의견은 '해당 없음'으로 답하세요. 공고마다 기준이 달라(완전자본잠식만 제외하는 공고 등) '해당 있음'을 고르면 공고마다 다시 확인합니다.",
  },
]

/** 공통 확인 키 이름 (조건 목록·보고서 표시용) */
export const COMMON_CHECK_KEY_LABEL: Record<CommonCheckKey, string> = {
  closure: '휴·폐업',
  'tax-arrears': '국세·지방세 체납',
  credit: '금융 연체·신용',
  sanction: '참여제한·제재',
  'financial-health': '재무 상태 (결산 기준)',
}

export const COMMON_CHECK_ANSWER_OPTIONS: Option<CommonCheckAnswer>[] = [
  { value: 'no', label: '해당 없음' },
  { value: 'yes', label: '해당 있음' },
  { value: 'unknown', label: '모르겠음' },
]

export const DOCUMENT_REQUIREMENT_OPTIONS: Option<DocumentRequirement>[] = [
  { value: 'required', label: '필수' },
  { value: 'conditional', label: '해당 시' },
  { value: 'optional', label: '선택' },
]

export const SETTLEMENT_LABEL: Record<SettlementInfo['type'], string> = {
  reimbursement: '먼저 집행 후 지급 (사후 정산)',
  mixed: '수행기관 이용 또는 사후 정산',
}

export const DATA_STATE_LABEL: Record<DataState, string> = {
  draft: '검수 전 초안',
  reviewed: '사람 검수 완료',
  verified: '검수 완료·원문 확인',
}

export const CALENDAR_EVENT_TYPE_OPTIONS: Option<CalendarEventType>[] = [
  { value: 'apply-start', label: '접수 시작', description: '공고 접수가 시작되는 날' },
  { value: 'apply-end', label: '접수 마감', description: '공고 접수가 끝나는 날' },
  { value: 'announcement', label: '발표일', description: '선정 결과를 발표하는 날' },
  { value: 'agreement', label: '협약일', description: '선정 후 협약을 맺는 날' },
  { value: 'personal-goal', label: '개인 준비 목표', description: '직접 정한 서류 준비 목표일' },
]

export const DOCUMENT_TYPE_OPTIONS: Option<DocumentType>[] = [
  { value: 'business-registration', label: '사업자등록증', description: '사업자 등록 사실을 증명하는 서류' },
  { value: 'financial-statements', label: '재무제표', description: '매출·자산 등 재무 상태를 보여주는 서류' },
  { value: 'export-performance', label: '수출실적증명서', description: '수출 실적을 증명하는 서류' },
  { value: 'business-plan', label: '사업계획서', description: '지원사업 신청 시 제출하는 계획서' },
  { value: 'sme-confirmation', label: '중소·중견기업 확인서', description: '기업 규모를 확인하는 서류' },
  { value: 'tax-certificate', label: '납세증명서', description: '국세·지방세 납부 사실을 증명하는 서류' },
  { value: 'certification-copy', label: '기업 인증서 사본', description: '벤처·이노비즈 등 인증 증빙' },
  { value: 'ip-evidence', label: '지식재산권 증빙', description: '특허·상표 등 등록 증빙' },
  { value: 'bank-account-copy', label: '통장 사본', description: '지원금을 받을 계좌 확인용' },
  { value: 'insurance-certificate', label: '4대보험 관련 증명', description: '가입자 명부·완납 증명 등' },
  { value: 'factory-registration', label: '공장등록증', description: '공장 등록 사실을 증명하는 서류' },
  { value: 'vat-base-certificate', label: '부가가치세 과세표준증명', description: '매출 규모를 확인하는 서류' },
  { value: 'product-brochure', label: '제품 소개 자료', description: '카탈로그·제품 설명서 등' },
  { value: 'other', label: '기타 서류', description: '위에 없는 서류' },
]

export interface ProfileStepDefinition {
  id: ProfileStepId
  title: string
  description: string
  optional: boolean
}

export const PROFILE_STEPS: ProfileStepDefinition[] = [
  {
    id: 1,
    title: '기본정보',
    description: '회사 이름과 형태, 소재지를 입력해 주세요.',
    optional: false,
  },
  {
    id: 2,
    title: '기업 규모',
    description: '업종과 최근 매출액을 입력해 주세요.',
    optional: false,
  },
  {
    id: 3,
    title: '수출 현황',
    description: '최근 1년 동안의 수출 실적을 입력해 주세요. 실적이 없으면 0을 입력하면 됩니다.',
    optional: false,
  },
  {
    id: 4,
    title: '주력 제품',
    description: '가장 많이 수출하거나 수출하려는 제품을 입력해 주세요.',
    optional: false,
  },
  {
    id: 5,
    title: '가점 요소',
    description: '보유한 기업 인증과 지식재산권을 알려 주세요. 선택 입력입니다.',
    optional: true,
  },
  {
    id: 6,
    title: '관심 분야',
    description: '도움받고 싶은 분야를 모두 골라 주세요.',
    optional: false,
  },
]

export function optionLabel<T extends string>(options: Option<T>[], value: T | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return options.find((option) => option.value === value)?.label ?? null
}

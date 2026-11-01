/*
 * 테스트 계정(TEST)의 기업 프로필 — revision_03(테스트 계정) §4.
 *
 * - 가상의 테스트 기업이다. 실제 회사 이름·사업자등록번호·인물을 쓰지 않는다.
 * - 비밀 값이 아니다(비밀번호는 서버 환경변수에만 있다). 기존 프로필 필드에 대응하는 값만 둔다.
 *   대응할 필드가 없는 항목(대표자·재무지표·수출 경험·플랫폼 입점·수출 계획·주원료 원산지·필요 지원·자부담 납부 가능)은
 *   넣지 않는다 — docs/revisions/revision_03_test_account_inventory.md §3.
 * - 사업자등록번호는 자동 저장하지 않는 정책대로 비워 둔다.
 * - 추천 결과·판정·적합도 값은 여기 두지 않는다. 화면이 현재 엔진으로 계산한다.
 */
import type { CompanyProfile } from '@/types/profile'
import type { CommonCheckKey } from '@/types/program'
import type { CommonCheckAnswer } from '@/types/selfCheck'
import { cloneProfile, createEmptyProfile } from '@/lib/profile'

const TEST_ACCOUNT_PROFILE: CompanyProfile = {
  ...createEmptyProfile(),
  // ① 기본정보
  companyName: 'EC 테스트식품(주)',
  companyType: 'corporation',
  // 소상공인(제조업, 상시근로자 10명 미만). 엔진은 소상공인을 중소기업에 포함해 판정한다.
  companySize: 'small-business',
  foundedAt: '2024-03-04',
  hqRegion: 'gyeonggi',
  hqDistrict: '화성시',
  hasFactory: true,
  factoryRegion: 'gyeonggi',
  factoryDistrict: '이천시',
  employeeCount: 7,
  // ② 기업 규모
  industryInputMode: 'ksic',
  ksicCode: 'C10',
  industryName: '식료품 제조업',
  revenueKrw: 420_000_000,
  revenueYear: 2025,
  // ③ 수출 현황 (2025년 직접·간접 모두 0달러 → 내수 단계)
  exportUsdLastYear: 0,
  exportPeriodStart: '2025-01',
  exportPeriodEnd: '2025-12',
  exportCountries: ['미국', '베트남'],
  // ④ 주력 제품
  productName: '한식 소스류(고추장 베이스 소스)',
  hsCodeStatus: 'confirmed',
  hsCode: '2103',
  // ⑤ 가점 요소 — HACCP는 선택지에 없어 '그 밖의 인증'에 적는다. 벤처·이노비즈·여성기업 등은 없음
  certificationStatus: 'has',
  certifications: [],
  certificationOther: 'HACCP',
  // ⑥ 관심 분야 — 조사/일반컨설팅(C02), 해외규격인증(C05), 홍보/광고(C06), 국제운송(C13)
  interestAreas: ['market-research', 'certification', 'marketing', 'logistics'],
  interestUnsure: false,
}

/**
 * 공통 확인(자기 신고): 휴·폐업 아님, 국세·지방세 체납 없음, 금융 신용불량 없음, 정부지원사업 참여제한 없음.
 * 재무 상태(financial-health)는 문서에 값이 없어 답하지 않는다.
 */
const TEST_ACCOUNT_COMMON_CHECKS: Partial<Record<CommonCheckKey, CommonCheckAnswer>> = {
  closure: 'no',
  'tax-arrears': 'no',
  credit: 'no',
  sanction: 'no',
}

export function createTestAccountProfile(): CompanyProfile {
  return cloneProfile(TEST_ACCOUNT_PROFILE)
}

export function createTestAccountCommonChecks(): Partial<Record<CommonCheckKey, CommonCheckAnswer>> {
  return { ...TEST_ACCOUNT_COMMON_CHECKS }
}

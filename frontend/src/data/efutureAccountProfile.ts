/*
 * 시연용 기업 계정 '이퓨쳐'(아이디 USER, 역할 test)의 기업 프로필.
 *
 * - 비밀 값이 아니다(비밀번호는 서버 환경변수 EFUTURE_LOGIN_PASSWORD에만 있다).
 * - 사용자가 준 값: 기업명, KSIC 교육 서비스업(P85), 수출 대상 국가 캄보디아, 재무제표 6개 금액(2019년),
 *   수출액(10,686,877,000원 = 9,176,436 USD). 2019년 값이므로 수출 측정 기간도 2019년 1~12월로 둔다.
 * - 그 밖의 값(기업 형태·규모·본사 지역·설립일·종업원 수·제품·HS 코드·관심 분야·신청 전 확인)은 게시 공고와 최대한 많이
 *   맞도록 정한 시연용 값이다. 실제 회사 정보로 확인한 값이 아니다.
 *   · 중소기업(교육 서비스업, 매출 약 107억 원): 공고의 '중소기업' 조건 81건·'중소기업, 중견기업' 21건
 *   · 본사 서울 + 사업장(공장 칸) 부산: 게시 공고 324건으로 17개 시·도를 모두 대 보았을 때 신청 가능 공고가 가장 많은 조합
 *     (본사 서울만 26건 → 부산 사업장을 더하면 30건, 2026-10-20 기준). 공장 칸은 교재 물류·지사 사업장으로 본 시연용 값이다
 *   · 관심 분야 13개 전부: 적합도의 관심 분야 요소는 공고 사업 분류와 하나라도 겹치면 충족이다
 * - 사업자등록번호는 자동 저장하지 않는 정책대로 비워 둔다. 판정·적합도 값은 두지 않고 화면이 현재 엔진으로 계산한다.
 */
import type { CompanyProfile } from '@/types/profile'
import type { CommonCheckKey } from '@/types/program'
import type { CommonCheckAnswer } from '@/types/selfCheck'
import { INTEREST_AREA_OPTIONS } from '@/constants/options'
import { cloneProfile, createEmptyProfile } from '@/lib/profile'

/** 수출액 원화 금액(사용자 제공, 2019년). 프로필에는 USD만 저장한다 */
export const EFUTURE_EXPORT_KRW = 10_686_877_000

const EFUTURE_PROFILE: CompanyProfile = {
  ...createEmptyProfile(),
  // ① 기본정보 (시연용 값)
  companyName: '이퓨쳐',
  companyType: 'corporation',
  companySize: 'sme',
  foundedAt: '2001-01-02',
  hqRegion: 'seoul',
  hqDistrict: '강남구',
  hasFactory: true,
  factoryRegion: 'busan',
  factoryDistrict: null,
  employeeCount: 60,
  // ② 기업 규모 — KSIC 대분류 P 교육 서비스업, 중분류 85. 저장 형식은 TEST의 'C10'과 같은 '문자+중분류'
  industryInputMode: 'ksic',
  ksicCode: 'P85',
  industryName: '교육 서비스업 (문화콘텐츠, 관광/교육/서비스)',
  revenueKrw: 10_686_877_389,
  revenueYear: 2019,
  // 재무제표 금액 (2019년). 매출액증가율 8.73% · 영업이익률 8.94% · 순이익률 16.03% · 영업외수지 +7.10%p · 부채비율 25.71%
  finBaseYear: 2019,
  revenuePrevKrw: 9_828_717_883,
  operatingIncomeKrw: 954_977_950,
  netIncomeKrw: 1_713_287_847,
  totalLiabilitiesKrw: 4_728_869_575,
  totalEquityKrw: 18_390_639_112,
  // ③ 수출 현황 — 10,686,877,000원 = 9,176,436 USD (2019년)
  exportUsdLastYear: 9_176_436,
  exportPeriodStart: '2019-01',
  exportPeriodEnd: '2019-12',
  exportCountries: ['캄보디아'],
  // ④ 주력 제품 (시연용 값). 수출 품목은 영어 교재로 보고 HS 4901(인쇄 서적)로 둔다. 'HS 모름'이면 프로필이 '입력 중'이 된다
  productName: '영어 교육 콘텐츠(교재·디지털 학습 프로그램)',
  hsCodeStatus: 'confirmed',
  hsCode: '4901',
  // ⑥ 관심 분야
  interestAreas: INTEREST_AREA_OPTIONS.map((o) => o.value),
  interestUnsure: false,
  // ⑦ 신청 전 확인 — 결격 사유 없음, 수출 의향·참여 조건 수용, 자부담 납부 가능
  preApplyChecks: { B01: 'no', B02: 'no', B03: 'no', B04: 'no', B05: 'no', B08: 'no' },
  preApplyCheckedAt: null,
  intentExport: true,
  intentCommit: true,
  selfPaymentReady: true,
}

/** 공통 확인(자기 신고): 휴·폐업·체납·신용불량·참여제한 없음 (TEST 계정과 같다) */
const EFUTURE_COMMON_CHECKS: Partial<Record<CommonCheckKey, CommonCheckAnswer>> = {
  closure: 'no',
  'tax-arrears': 'no',
  credit: 'no',
  sanction: 'no',
}

export function createEfutureProfile(): CompanyProfile {
  return cloneProfile(EFUTURE_PROFILE)
}

export function createEfutureCommonChecks(): Partial<Record<CommonCheckKey, CommonCheckAnswer>> {
  return { ...EFUTURE_COMMON_CHECKS }
}

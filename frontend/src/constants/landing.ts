/*
 * 메인 랜딩페이지 (REVISION_05) 문구·예시 화면 데이터.
 *
 * - 예시 카드(EXAMPLE_MATCHES)는 화면 구성을 보여 주기 위한 예시다. 실제 공고·기관·점수가 아니며,
 *   화면에는 항상 '예시 화면' 표시와 함께 나온다. 공고명은 실제 사업으로 오해하지 않게 '예시 공고 A'처럼
 *   쓰고, 분야·단계·자격 상태 이름만 서비스의 실제 분류(15개 분야, 지원 단계, 자격 상태)를 쓴다.
 * - 기관 목록(AGENCY_ROWS)은 수출지원사업을 공고하는 공공기관 이름이다. 로고 이미지는 쓰지 않고
 *   글자로만 보여 준다. 지금 연계를 준비 중인 곳은 기업마당·KOTRA다(관리자 수집·업로드 화면).
 */
import type { EligibilityStatus } from '@/types/results'
import type { SupportStage } from '@/types/program'

export interface ExampleMatch {
  key: string
  title: string
  agency: string
  stage: SupportStage
  /** 서비스의 실제 15개 분야 이름 */
  category: string
  status: EligibilityStatus
  /** 예시 적합도 (0~100). 신청 불가는 계산하지 않으므로 null */
  score: number | null
  requirements: string[]
}

export const EXAMPLE_LABEL = '예시 화면'
export const EXAMPLE_NOTE = '화면 구성을 보여 주는 예시입니다. 실제 공고·점수가 아닙니다.'

export const EXAMPLE_MATCHES: ExampleMatch[] = [
  {
    key: 'a',
    title: '예시 공고 A',
    agency: '지원기관 (예시)',
    stage: 'preparation',
    category: '해외규격인증',
    status: 'eligible',
    score: 86,
    requirements: ['중소기업', '제조업', '전년도 수출실적 100만 달러 이하'],
  },
  {
    key: 'b',
    title: '예시 공고 B',
    agency: '지원기관 (예시)',
    stage: 'market-entry',
    category: '전시회/행사/해외영업지원',
    status: 'needs-check',
    score: 74,
    requirements: ['본사 소재지 조건', '최근 3년 내 참가 이력 확인'],
  },
  {
    key: 'c',
    title: '예시 공고 C',
    agency: '지원기관 (예시)',
    stage: 'execution',
    category: '국제운송',
    status: 'ineligible',
    score: null,
    requirements: ['직전 연도 수출실적 필요'],
  },
]

/** 예시 기업 조건 (히어로·미리보기 화면에서 '이 조건으로 분석' 예시) */
export const EXAMPLE_COMPANY = [
  { label: '업종', value: '식료품 제조업' },
  { label: '소재지', value: '경기' },
  { label: '매출액', value: '30억 원' },
  { label: '수출실적', value: '12만 달러' },
]

export interface AgencyName {
  name: string
  /** 짧은 영문 표기 (있으면 함께 보여 준다) */
  short?: string
}

/** 로고 띠 두 줄 (코나비즈 로고 영역 구조, 내용은 수출지원 공고 기관) */
export const AGENCY_ROWS: AgencyName[][] = [
  [
    { name: '기업마당' },
    { name: 'KOTRA', short: '대한무역투자진흥공사' },
    { name: 'KITA', short: '한국무역협회' },
    { name: '무역투자24' },
    { name: '중소벤처기업부' },
    { name: '중소벤처기업진흥공단' },
    { name: '한국무역보험공사' },
    { name: '수출바우처' },
  ],
  [
    { name: '산업통상자원부' },
    { name: '관세청' },
    { name: '중소벤처24' },
    { name: 'K-Startup' },
    { name: '한국농수산식품유통공사', short: 'aT' },
    { name: '한국콘텐츠진흥원' },
    { name: '지역지식재산센터' },
    { name: '창조경제혁신센터' },
  ],
]

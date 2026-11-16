/*
 * 신청 전 확인 — 공통 결격 사유 6개 (REVISION_05 §3.2). 코드는 정답세트 조건 유형과 같다.
 * 기존 공통 확인 5개 중 4개는 아래 코드로 옮긴다(원본 저장값은 그대로 둔다).
 */
import type { CommonCheckKey } from '@/types/program'
import type { PreApplyCode } from '@/types/profile'

export const PRE_APPLY_QUESTIONS: { code: PreApplyCode; question: string }[] = [
  { code: 'B01', question: '국세·지방세·4대보험 체납이 있습니까?' },
  { code: 'B02', question: '휴업·폐업 상태이거나 어음·수표 부도 상태입니까?' },
  { code: 'B03', question: '파산·회생절차·법정관리 중입니까?' },
  { code: 'B04', question: '금융기관 신용불량·채무불이행 상태입니까?' },
  { code: 'B05', question: '정부지원사업 참여제한이나 협약 의무 불이행 상태입니까?' },
  { code: 'B08', question: '사회적 물의·법령 위반으로 제재를 받은 상태입니까?' },
]

/** 기존 공통 확인 → 신청 전 확인 코드 (재무 상태 financial-health는 결격 문항이 아니라 옮기지 않는다) */
export const COMMON_CHECK_TO_PRE_APPLY: Partial<Record<CommonCheckKey, PreApplyCode>> = {
  'tax-arrears': 'B01',
  closure: 'B02',
  credit: 'B04',
  sanction: 'B05',
}

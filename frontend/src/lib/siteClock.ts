/*
 * 사이트 시계 (고정). 사이트가 '지금'으로 쓰는 날짜·시간을 실제 시계 대신 2026-10-20(화) 09:00으로 고정한다.
 * 화면의 오늘(달력·입력 검증·연도 선택지·저장 시각)과 게시 스냅샷의 데이터 기준일이 이 값을 쓴다.
 * backend/eligibility/site_date.py 의 SITE_TODAY 와 같은 값이어야 한다.
 * (로그인 세션 만료·호출 수 제한처럼 보안에 쓰는 서버 시각은 실제 시계를 쓴다)
 */
import type { IsoDate } from '@/types/common'

export const SITE_TODAY: IsoDate = '2026-10-20'

/** 고정된 '지금' (기기 시간대와 관계없이 연·월·일이 2026-10-20이 되도록 현지 시각으로 만든다) */
export function siteNow(): Date {
  return new Date(2026, 9, 20, 9, 0, 0)
}

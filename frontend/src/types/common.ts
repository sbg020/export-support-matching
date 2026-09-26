/**
 * 공통 타입.
 *
 * 결측값 계약: 아직 확인되지 않은 값은 항상 `null`이다.
 * 빈 문자열(''), 0, 오늘 날짜, 임의 URL을 결측치 대신 저장하지 않는다.
 * 숫자 0과 false는 유효한 값이다.
 */

/** ISO 8601 날짜 (YYYY-MM-DD) */
export type IsoDate = string

/** ISO 8601 날짜·시각 */
export type IsoDateTime = string

/** 연·월 (YYYY-MM) */
export type YearMonth = string

/** 공고 원문에서 가져온 근거 */
export interface SourceReference {
  /** 원문 문구 그대로 */
  quote: string
  /** 원문 URL. 확인된 URL이 없으면 null */
  url: string | null
  /** 원문 내 위치 (페이지, 조항 등) */
  locator: string | null
}

export interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

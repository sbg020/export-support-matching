/*
 * 화면 표시용 공통 함수.
 *
 * - 결측값(null, undefined)만 '-'로 표시한다.
 * - 숫자 0, false는 유효한 값으로 그대로 표시한다.
 * - 날짜·금액 포맷은 값이 있을 때만 수행한다.
 */
import type { IsoDate, YearMonth } from '@/types/common'

export const MISSING = '-'

export function isMissing(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

/** 문자열·숫자 값을 표시용 문자열로 바꾼다. 결측이면 '-'. */
export function displayText(value: string | number | null | undefined): string {
  if (isMissing(value)) return MISSING
  return String(value)
}

const numberFormatter = new Intl.NumberFormat('ko-KR')

export function formatNumber(value: number | null | undefined): string {
  if (isMissing(value)) return MISSING
  return numberFormatter.format(value)
}

/** 원화 금액. 예: 1,500,000원 */
export function formatKrw(value: number | null | undefined): string {
  if (isMissing(value)) return MISSING
  return `${numberFormatter.format(value)}원`
}

/** 원화 금액을 읽기 쉬운 단위로 풀어 쓴다. 예: 12억 3,400만 원 */
export function formatKrwReadable(value: number | null | undefined): string {
  if (isMissing(value)) return MISSING
  if (value === 0) return '0원'
  const negative = value < 0
  let rest = Math.abs(Math.trunc(value))
  const units: [number, string][] = [
    [1_0000_0000_0000, '조'],
    [1_0000_0000, '억'],
    [1_0000, '만'],
  ]
  const parts: string[] = []
  for (const [size, unit] of units) {
    if (rest >= size) {
      parts.push(`${numberFormatter.format(Math.floor(rest / size))}${unit}`)
      rest %= size
    }
  }
  if (rest > 0) parts.push(numberFormatter.format(rest))
  return `${negative ? '-' : ''}${parts.join(' ')} 원`
}

/** 미국 달러 금액. 0도 '0 USD'로 표시한다. */
export function formatUsd(value: number | null | undefined): string {
  if (isMissing(value)) return MISSING
  return `${numberFormatter.format(value)} USD`
}

/** 인원 수 */
export function formatCount(value: number | null | undefined, unit: string): string {
  if (isMissing(value)) return MISSING
  return `${numberFormatter.format(value)}${unit}`
}

function parseIsoDateParts(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** 날짜. 시간대 변환 없이 문자열의 연·월·일을 그대로 사용한다. 예: 2025. 03. 01. */
export function formatDate(value: IsoDate | null | undefined): string {
  if (isMissing(value)) return MISSING
  const parts = parseIsoDateParts(value)
  if (!parts) return MISSING
  const [year, month, day] = parts
  return `${year}. ${String(month).padStart(2, '0')}. ${String(day).padStart(2, '0')}.`
}

/** 짧은 날짜. 예: 2025.03.01 (값이 있을 때만) */
export function formatDateCompact(value: string | null | undefined): string {
  if (isMissing(value)) return MISSING
  const parts = parseIsoDateParts(value)
  if (!parts) return MISSING
  const [year, month, day] = parts
  return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`
}

export function formatYearMonth(value: YearMonth | null | undefined): string {
  if (isMissing(value)) return MISSING
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return MISSING
  return `${match[1]}년 ${Number(match[2])}월`
}

/** 기간. 양쪽 모두 결측이면 '-' */
export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
  format: (value: string | null | undefined) => string = formatDate,
): string {
  if (isMissing(start) && isMissing(end)) return MISSING
  return `${format(start)} ~ ${format(end)}`
}

/** 시각 (사용자 동작 기록용). 예: 2025. 03. 01. 14:05 */
export function formatDateTime(value: string | null | undefined): string {
  if (isMissing(value)) return MISSING
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return MISSING
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())}. ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 목록. null(확인 전)은 '-', 빈 배열은 emptyLabel(기본 '-') */
export function formatList(
  values: readonly string[] | null | undefined,
  emptyLabel: string = MISSING,
): string {
  if (isMissing(values)) return MISSING
  if (values.length === 0) return emptyLabel
  return values.join(', ')
}

/** 참/거짓 값. null이면 '-' */
export function formatBoolean(
  value: boolean | null | undefined,
  trueLabel: string,
  falseLabel: string,
): string {
  if (isMissing(value)) return MISSING
  return value ? trueLabel : falseLabel
}

/** 사업자등록번호 표시용 하이픈 포맷 (형식만 맞춘다) */
export function formatBusinessNumber(value: string | null | undefined): string {
  if (isMissing(value)) return MISSING
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 10) return value
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

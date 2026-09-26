import { describe, expect, it } from 'vitest'
import {
  MISSING,
  displayText,
  formatBoolean,
  formatDate,
  formatKrw,
  formatKrwReadable,
  formatList,
  formatPeriod,
  formatUsd,
  formatYearMonth,
  isMissing,
} from '@/lib/display'

describe('결측값 표시', () => {
  it('null과 undefined만 결측으로 본다', () => {
    expect(isMissing(null)).toBe(true)
    expect(isMissing(undefined)).toBe(true)
    expect(isMissing(0)).toBe(false)
    expect(isMissing(false)).toBe(false)
    expect(isMissing('')).toBe(false)
  })

  it('결측값은 "-"로 표시한다', () => {
    expect(MISSING).toBe('-')
    expect(displayText(null)).toBe('-')
    expect(formatKrw(null)).toBe('-')
    expect(formatUsd(undefined)).toBe('-')
    expect(formatDate(null)).toBe('-')
  })

  it('사용자가 입력한 0 USD는 결측과 구분한다', () => {
    expect(formatUsd(0)).toBe('0 USD')
    expect(formatKrw(0)).toBe('0원')
    expect(displayText(0)).toBe('0')
  })

  it('금액은 값이 있을 때만 포맷한다', () => {
    expect(formatKrw(1500000)).toBe('1,500,000원')
    expect(formatUsd(250000)).toBe('250,000 USD')
    expect(formatKrwReadable(1_234_000_000)).toBe('12억 3,400만 원')
  })

  it('날짜는 시간대 변환 없이 표시한다', () => {
    expect(formatDate('2025-03-01')).toBe('2025. 03. 01.')
    expect(formatYearMonth('2025-01')).toBe('2025년 1월')
    expect(formatPeriod(null, null)).toBe('-')
    expect(formatPeriod('2025-01', '2025-12', formatYearMonth)).toBe('2025년 1월 ~ 2025년 12월')
  })

  it('목록의 null(확인 전)과 빈 배열을 구분할 수 있다', () => {
    expect(formatList(null)).toBe('-')
    expect(formatList([], '없음')).toBe('없음')
    expect(formatList(['가', '나'])).toBe('가, 나')
  })

  it('false는 유효한 값으로 표시한다', () => {
    expect(formatBoolean(false, '있음', '없음')).toBe('없음')
    expect(formatBoolean(null, '있음', '없음')).toBe('-')
  })
})

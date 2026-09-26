/*
 * 달력 계산 도우미. 달력 이동(오늘 보기)에만 현재 날짜를 사용하며,
 * 공고 기준일이나 D-day 계산에는 사용하지 않는다.
 */
import type { IsoDate } from '@/types/common'

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

const pad = (n: number) => String(n).padStart(2, '0')

export function toIsoDate(year: number, month: number, day: number): IsoDate {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function todayIso(): IsoDate {
  const now = new Date()
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function parseIso(date: IsoDate): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number)
  return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** 0 = 일요일 */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay()
}

export function addDays(date: IsoDate, amount: number): IsoDate {
  const { year, month, day } = parseIso(date)
  const d = new Date(year, month - 1, day + amount)
  return toIsoDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

export function addMonths(year: number, month: number, amount: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + amount, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export interface CalendarCell {
  date: IsoDate | null
  day: number | null
}

/** 달력 칸(주 단위). 앞뒤 빈칸은 date가 null이다. */
export function buildMonthWeeks(year: number, month: number): CalendarCell[][] {
  const first = weekdayOf(year, month, 1)
  const total = daysInMonth(year, month)
  const cells: CalendarCell[] = []
  for (let i = 0; i < first; i++) cells.push({ date: null, day: null })
  for (let day = 1; day <= total; day++) cells.push({ date: toIsoDate(year, month, day), day })
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null })
  const weeks: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function formatKoreanDate(date: IsoDate): string {
  const { year, month, day } = parseIso(date)
  return `${year}년 ${month}월 ${day}일 ${WEEKDAY_LABELS[weekdayOf(year, month, day)]}요일`
}

/*
 * 공고 일정 만들기. 공고의 실제 날짜 필드에서만 만든다.
 * 날짜가 없는 공고는 일정을 만들지 않는다 (가상 일정 금지). 오늘 날짜를 공고 날짜처럼 쓰지 않는다.
 */
import type { Program } from '@/types/program'
import type { CalendarEvent, CalendarEventType } from '@/types/tracking'

const DATE_FIELDS: { field: 'applyStart' | 'applyEnd' | 'announcementDate' | 'agreementDate'; type: CalendarEventType }[] = [
  { field: 'applyStart', type: 'apply-start' },
  { field: 'applyEnd', type: 'apply-end' },
  { field: 'announcementDate', type: 'announcement' },
  { field: 'agreementDate', type: 'agreement' },
]

/** ISO 날짜·시각 문자열에서 YYYY-MM-DD만 꺼낸다. 형식이 맞지 않으면 null */
function toDateOnly(value: string | null): string | null {
  if (value === null) return null
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value)
  return match ? (match[1] ?? null) : null
}

export function buildProgramEvents(programs: readonly Program[]): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (const program of programs) {
    for (const { field, type } of DATE_FIELDS) {
      const date = toDateOnly(program[field])
      if (date === null) continue
      events.push({
        id: `${program.id}:${type}`,
        type,
        date,
        title: program.title ?? program.id,
        programId: program.id,
      })
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date))
}

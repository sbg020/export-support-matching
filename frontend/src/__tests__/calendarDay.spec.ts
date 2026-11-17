/*
 * 공고 달력: 날짜마다 최대 5개 '상태 2글자 + 제목', 넘치면 '+N개', 날짜·'+N개'를 누르면 팝업을 연다.
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MonthCalendar from '@/components/calendar/MonthCalendar.vue'
import { CALENDAR_EVENT_TYPE_OPTIONS, CALENDAR_MAX_PER_DAY } from '@/constants/options'
import type { CalendarEvent } from '@/types/tracking'

/** 테스트 전용 일정 (실제 공고가 아니다) */
const events: CalendarEvent[] = [
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `E${i}`,
    type: i % 2 === 0 ? ('apply-start' as const) : ('apply-end' as const),
    date: '2030-06-10',
    title: `테스트 공고 ${i + 1}`,
    programId: `T${i}`,
  })),
  { id: 'S1', type: 'announcement', date: '2030-06-11', title: '테스트 발표', programId: 'T9' },
]

function mountCalendar() {
  return mount(MonthCalendar, {
    props: {
      year: 2030,
      month: 6,
      events,
      selectedDate: '2030-06-01',
      today: '2030-06-01',
      visibleTypes: CALENDAR_EVENT_TYPE_OPTIONS.map((o) => o.value),
    },
  })
}

const cellOf = (wrapper: ReturnType<typeof mountCalendar>, date: string) =>
  wrapper.get(`[data-date="${date}"]`).element.closest('td')!

describe('공고 달력 날짜 칸', () => {
  it(`최대 ${CALENDAR_MAX_PER_DAY}개만 보이고, 상태 2글자 뒤에 제목, 넘치면 '+N개'`, () => {
    const wrapper = mountCalendar()
    const cell = cellOf(wrapper, '2030-06-10')
    const items = [...cell.querySelectorAll('.month-calendar__event')]
    expect(items).toHaveLength(CALENDAR_MAX_PER_DAY)
    expect(items[0]!.querySelector('.month-calendar__tag')!.textContent!.trim()).toBe('시작')
    expect(items[0]!.querySelector('.month-calendar__title')!.textContent).toContain('테스트 공고')
    expect(cell.querySelector('.month-calendar__more')!.textContent!.trim()).toBe('+3개')
    // 5개 이하인 날은 '+N개'가 없다
    expect(cellOf(wrapper, '2030-06-11').querySelector('.month-calendar__more')).toBeNull()
    wrapper.unmount()
  })

  it("'+N개'와 날짜를 누르면 그날 팝업을 연다(open)", async () => {
    const wrapper = mountCalendar()
    await wrapper.get('.month-calendar__more').trigger('click')
    await wrapper.get('[data-date="2030-06-11"]').trigger('click')
    expect(wrapper.emitted('open')).toEqual([['2030-06-10'], ['2030-06-11']])
    wrapper.unmount()
  })
})

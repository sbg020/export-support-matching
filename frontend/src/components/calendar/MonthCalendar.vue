<script setup lang="ts">
/**
 * 월 달력. 날짜 버튼은 하나만 Tab으로 도달하고(roving tabindex),
 * 화살표·Home·End·PageUp·PageDown으로 날짜를 옮긴다.
 * 일정은 실제 데이터(events)가 있을 때만 표시한다.
 */
import { computed, nextTick, ref } from 'vue'
import type { CalendarEvent, CalendarEventType } from '@/types/tracking'
import { CALENDAR_EVENT_TYPE_OPTIONS, optionLabel } from '@/constants/options'
import {
  WEEKDAY_LABELS,
  addDays,
  buildMonthWeeks,
  formatKoreanDate,
  parseIso,
  weekdayOf,
} from '@/lib/calendar'

const props = defineProps<{
  year: number
  month: number
  events: CalendarEvent[]
  selectedDate: string
  today: string
  visibleTypes: CalendarEventType[]
}>()

const emit = defineEmits<{ select: [date: string] }>()

const grid = ref<HTMLElement | null>(null)
const weeks = computed(() => buildMonthWeeks(props.year, props.month))

const eventsByDate = computed(() => {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of props.events) {
    if (!props.visibleTypes.includes(event.type)) continue
    const list = map.get(event.date) ?? []
    list.push(event)
    map.set(event.date, list)
  }
  return map
})

function dayLabel(date: string): string {
  const parts = [formatKoreanDate(date)]
  if (date === props.today) parts.push('오늘')
  if (date === props.selectedDate) parts.push('선택됨')
  const count = eventsByDate.value.get(date)?.length ?? 0
  parts.push(count > 0 ? `일정 ${count}개` : '일정 없음')
  return parts.join(', ')
}

async function moveTo(date: string) {
  emit('select', date)
  await nextTick()
  await nextTick()
  grid.value?.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)?.focus()
}

function onKeydown(event: KeyboardEvent, date: string) {
  const { year, month, day } = parseIso(date)
  let target: string | null = null
  switch (event.key) {
    case 'ArrowLeft':
      target = addDays(date, -1)
      break
    case 'ArrowRight':
      target = addDays(date, 1)
      break
    case 'ArrowUp':
      target = addDays(date, -7)
      break
    case 'ArrowDown':
      target = addDays(date, 7)
      break
    case 'Home':
      target = addDays(date, -weekdayOf(year, month, day))
      break
    case 'End':
      target = addDays(date, 6 - weekdayOf(year, month, day))
      break
    case 'PageUp':
      target = addDays(date, -28)
      break
    case 'PageDown':
      target = addDays(date, 28)
      break
  }
  if (target) {
    event.preventDefault()
    void moveTo(target)
  }
}

const typeLabel = (type: CalendarEventType) => optionLabel(CALENDAR_EVENT_TYPE_OPTIONS, type) ?? type
</script>

<template>
  <div ref="grid" class="month-calendar">
    <table class="month-calendar__table">
      <caption class="visually-hidden">{{ year }}년 {{ month }}월 달력</caption>
      <thead>
        <tr>
          <th
            v-for="(label, index) in WEEKDAY_LABELS"
            :key="label"
            scope="col"
            :class="{ 'is-sun': index === 0, 'is-sat': index === 6 }"
          >
            <abbr :title="`${label}요일`">{{ label }}</abbr>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(week, weekIndex) in weeks" :key="weekIndex">
          <td v-for="(cell, dayIndex) in week" :key="dayIndex" class="month-calendar__cell">
            <button
              v-if="cell.date"
              type="button"
              class="month-calendar__day"
              :class="{
                'is-today': cell.date === today,
                'is-selected': cell.date === selectedDate,
                'is-sun': dayIndex === 0,
                'is-sat': dayIndex === 6,
              }"
              :data-date="cell.date"
              :tabindex="cell.date === selectedDate ? 0 : -1"
              :aria-label="dayLabel(cell.date)"
              :aria-current="cell.date === today ? 'date' : undefined"
              @click="emit('select', cell.date)"
              @keydown="onKeydown($event, cell.date)"
            >
              <span class="month-calendar__num" aria-hidden="true">{{ cell.day }}</span>
              <span v-if="cell.date === today" class="month-calendar__today" aria-hidden="true">오늘</span>
              <span v-if="eventsByDate.get(cell.date)?.length" class="month-calendar__events" aria-hidden="true">
                <span
                  v-for="event in eventsByDate.get(cell.date)"
                  :key="event.id"
                  class="month-calendar__event"
                  :class="`is-${event.type}`"
                >
                  {{ typeLabel(event.type) }}
                </span>
              </span>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.month-calendar__table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 4px;
}

.month-calendar__table th {
  padding: 4px 0 8px;
  text-align: center;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-text);
}

.month-calendar__table abbr {
  text-decoration: none;
}

th.is-sun {
  color: var(--color-danger-strong);
}

th.is-sat {
  color: var(--color-primary-strong);
}

.month-calendar__cell {
  padding: 0;
  vertical-align: top;
}

.month-calendar__day {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  min-height: 92px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-heading);
  text-align: left;
  cursor: pointer;
}

.month-calendar__day:hover {
  border-color: var(--color-primary);
}

.month-calendar__day.is-sun .month-calendar__num {
  color: var(--color-danger-strong);
}

.month-calendar__day.is-sat .month-calendar__num {
  color: var(--color-primary-strong);
}

.month-calendar__day.is-selected {
  border-color: var(--color-primary-strong);
  box-shadow: inset 0 0 0 1px var(--color-primary-strong);
  background: var(--color-primary-soft);
}

.month-calendar__num {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}

.month-calendar__day.is-today .month-calendar__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary-strong);
  color: #fff;
}

.month-calendar__today {
  font-size: 11px;
  font-weight: var(--fw-semibold);
  color: var(--color-primary-strong);
}

.month-calendar__events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.month-calendar__event {
  overflow: hidden;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: var(--fw-semibold);
  white-space: nowrap;
  text-overflow: ellipsis;
  background: var(--color-surface-sunken);
}

.month-calendar__event.is-apply-start {
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.month-calendar__event.is-apply-end {
  background: var(--color-danger-soft);
  color: var(--color-danger-strong);
}

.month-calendar__event.is-personal-goal {
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}

.month-calendar__event.is-announcement {
  background: var(--color-secondary-soft);
  color: var(--color-secondary-strong);
}

@media (max-width: 767.98px) {
  .month-calendar__table {
    border-spacing: 2px;
  }
  .month-calendar__day {
    align-items: center;
    min-height: 44px;
    padding: 4px 2px;
  }
  .month-calendar__today,
  .month-calendar__event {
    display: none;
  }
}
</style>

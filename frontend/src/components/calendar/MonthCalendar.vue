<script setup lang="ts">
/**
 * 월 달력. 날짜마다 일정을 최대 MAX_PER_DAY개까지 '상태 2글자 + 공고 제목'으로 보여 주고,
 * 넘치면 '+N개' 버튼을 둔다. 날짜(칸)나 '+N개'를 누르면 open(date)으로 그날의 일정 팝업을 연다.
 * 날짜 번호 버튼은 하나만 Tab으로 도달하고(roving tabindex), 화살표·Home·End·PageUp·PageDown으로 옮긴다.
 * 일정은 실제 데이터(events)가 있을 때만 표시한다.
 */
import { computed, nextTick, ref } from 'vue'
import type { CalendarEvent, CalendarEventType } from '@/types/tracking'
import { CALENDAR_EVENT_SHORT_LABEL, CALENDAR_EVENT_TYPE_OPTIONS, CALENDAR_MAX_PER_DAY as MAX_PER_DAY } from '@/constants/options'
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

const emit = defineEmits<{ select: [date: string]; open: [date: string] }>()

const grid = ref<HTMLElement | null>(null)
const weeks = computed(() => buildMonthWeeks(props.year, props.month))
const TYPE_ORDER = CALENDAR_EVENT_TYPE_OPTIONS.map((o) => o.value)

/** 날짜별 일정 (유형 순서 → 제목 순) */
const eventsByDate = computed(() => {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of props.events) {
    if (!props.visibleTypes.includes(event.type)) continue
    const list = map.get(event.date) ?? []
    list.push(event)
    map.set(event.date, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.title.localeCompare(b.title, 'ko'))
  }
  return map
})

const countOf = (date: string) => eventsByDate.value.get(date)?.length ?? 0

function dayLabel(date: string): string {
  const parts = [formatKoreanDate(date)]
  if (date === props.today) parts.push('오늘')
  if (date === props.selectedDate) parts.push('선택됨')
  const count = countOf(date)
  parts.push(count > 0 ? `일정 ${count}개, 눌러서 일정 보기` : '일정 없음')
  return parts.join(', ')
}

function openDay(date: string) {
  emit('select', date)
  emit('open', date)
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
          <td
            v-for="(cell, dayIndex) in week"
            :key="dayIndex"
            class="month-calendar__cell"
            :class="{
              'is-empty': !cell.date,
              'is-today': cell.date === today,
              'is-selected': cell.date === selectedDate,
              'is-sun': dayIndex === 0,
              'is-sat': dayIndex === 6,
            }"
            @click="cell.date && openDay(cell.date)"
          >
            <template v-if="cell.date">
              <div class="month-calendar__head">
                <button
                  type="button"
                  class="month-calendar__day"
                  :data-date="cell.date"
                  :tabindex="cell.date === selectedDate ? 0 : -1"
                  :aria-label="dayLabel(cell.date)"
                  :aria-current="cell.date === today ? 'date' : undefined"
                  aria-haspopup="dialog"
                  @click.stop="openDay(cell.date)"
                  @keydown="onKeydown($event, cell.date)"
                >
                  <span class="month-calendar__num">{{ cell.day }}</span>
                </button>
                <span v-if="cell.date === today" class="month-calendar__today" aria-hidden="true">오늘</span>
                <!-- 좁은 화면: 제목 대신 건수 -->
                <span v-if="countOf(cell.date) > 0" class="month-calendar__count" aria-hidden="true">
                  {{ countOf(cell.date) }}
                </span>
              </div>
              <ul v-if="countOf(cell.date) > 0" class="month-calendar__events" aria-hidden="true">
                <li
                  v-for="event in eventsByDate.get(cell.date)!.slice(0, MAX_PER_DAY)"
                  :key="event.id"
                  class="month-calendar__event"
                  :title="`${CALENDAR_EVENT_SHORT_LABEL[event.type]} ${event.title}`"
                >
                  <span class="month-calendar__tag" :class="`is-${event.type}`">{{ CALENDAR_EVENT_SHORT_LABEL[event.type] }}</span>
                  <span class="month-calendar__title">{{ event.title }}</span>
                </li>
              </ul>
              <button
                v-if="countOf(cell.date) > MAX_PER_DAY"
                type="button"
                class="month-calendar__more"
                tabindex="-1"
                :aria-label="`${formatKoreanDate(cell.date)} 일정 ${countOf(cell.date) - MAX_PER_DAY}개 더 보기`"
                aria-haspopup="dialog"
                @click.stop="openDay(cell.date)"
              >
                +{{ countOf(cell.date) - MAX_PER_DAY }}개
              </button>
            </template>
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
  border-collapse: collapse;
}

.month-calendar__table th {
  padding: 6px 0 10px;
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
  height: 148px;
  padding: 6px 6px 4px;
  border: 1px solid var(--color-border);
  vertical-align: top;
  background: var(--color-surface);
  cursor: pointer;
}

.month-calendar__cell.is-empty {
  background: var(--color-surface-muted);
  cursor: default;
}

.month-calendar__cell:not(.is-empty):hover {
  background: var(--color-surface-muted);
}

.month-calendar__cell.is-selected {
  box-shadow: inset 0 0 0 2px var(--color-primary-strong);
}

.month-calendar__head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.month-calendar__day {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 4px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-heading);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}

.month-calendar__cell.is-sun .month-calendar__day {
  color: var(--color-danger-strong);
}

.month-calendar__cell.is-sat .month-calendar__day {
  color: var(--color-primary-strong);
}

.month-calendar__cell.is-today .month-calendar__day {
  background: var(--color-primary-strong);
  color: #fff;
}

.month-calendar__today {
  font-size: 11px;
  font-weight: var(--fw-semibold);
  color: var(--color-primary-strong);
}

.month-calendar__count {
  display: none;
}

.month-calendar__events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.month-calendar__event {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--color-heading);
}

.month-calendar__tag {
  flex: none;
  padding: 0 4px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: var(--fw-bold);
  line-height: 16px;
  background: var(--color-surface-sunken);
}

.month-calendar__title {
  overflow: hidden;
  min-width: 0;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.month-calendar__tag.is-apply-start {
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.month-calendar__tag.is-apply-end {
  background: var(--color-danger-soft);
  color: var(--color-danger-strong);
}

.month-calendar__tag.is-personal-goal {
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}

.month-calendar__tag.is-agreement {
  background: var(--color-success-soft);
  color: var(--color-success-strong);
}

.month-calendar__tag.is-announcement {
  background: var(--color-secondary-soft);
  color: var(--color-secondary-strong);
}

.month-calendar__more {
  margin-top: 2px;
  padding: 0 6px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-heading);
  font-size: 11px;
  font-weight: var(--fw-semibold);
  line-height: 18px;
}

.month-calendar__more:hover {
  background: var(--color-ink, #111);
  border-color: var(--color-ink, #111);
  color: #fff;
}

.month-calendar__day:focus-visible,
.month-calendar__more:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 1px;
}

@media (max-width: 767.98px) {
  .month-calendar__cell {
    height: 56px;
    padding: 4px 2px;
  }

  .month-calendar__head {
    flex-direction: column;
    gap: 2px;
  }

  .month-calendar__today,
  .month-calendar__events,
  .month-calendar__more {
    display: none;
  }

  .month-calendar__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 16px;
    padding: 0 4px;
    border-radius: var(--radius-pill);
    background: var(--color-heading);
    color: #fff;
    font-size: 10px;
    font-weight: var(--fw-bold);
  }
}
</style>

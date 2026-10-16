<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IconCalendarEvent, IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import ActionButton from '@/components/common/ActionButton.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import MonthCalendar from '@/components/calendar/MonthCalendar.vue'
import { CALENDAR_EVENT_TYPE_OPTIONS } from '@/constants/options'
import { addMonths, formatKoreanDate, parseIso, todayIso } from '@/lib/calendar'
import { buildProgramEvents } from '@/lib/calendarEvents'
import { formatDate } from '@/lib/display'
import { createEmptyQuery, programRepository } from '@/repositories'
import type { Program } from '@/types/program'
import type { CalendarEventType } from '@/types/tracking'

/** 공고 저장소의 실제 날짜 필드로 만든 일정. 공고 날짜가 없으면 빈 배열이다. */
const programs = ref<Program[]>([])
const loadFailed = ref(false)
const events = computed(() => buildProgramEvents(programs.value))

onMounted(async () => {
  try {
    programs.value = (await programRepository.list(createEmptyQuery())).items
  } catch {
    loadFailed.value = true
  }
})

// 달력 이동용 오늘 날짜 (공고 기준일로 사용하지 않음)
const today = todayIso()
const initial = parseIso(today)
const year = ref(initial.year)
const month = ref(initial.month)
const selectedDate = ref(today)
const visibleTypes = ref<CalendarEventType[]>(CALENDAR_EVENT_TYPE_OPTIONS.map((o) => o.value))

function shiftMonth(amount: number) {
  const next = addMonths(year.value, month.value, amount)
  year.value = next.year
  month.value = next.month
  const { day } = parseIso(selectedDate.value)
  const lastDay = new Date(next.year, next.month, 0).getDate()
  selectedDate.value = `${next.year}-${String(next.month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

function goToday() {
  const t = parseIso(today)
  year.value = t.year
  month.value = t.month
  selectedDate.value = today
}

function onSelect(date: string) {
  selectedDate.value = date
  const { year: y, month: m } = parseIso(date)
  year.value = y
  month.value = m
}

function toggleType(type: CalendarEventType, checked: boolean) {
  visibleTypes.value = checked
    ? [...visibleTypes.value.filter((t) => t !== type), type]
    : visibleTypes.value.filter((t) => t !== type)
}

const monthEvents = computed(() =>
  events.value.filter((e) => {
    const d = parseIso(e.date)
    return d.year === year.value && d.month === month.value && visibleTypes.value.includes(e.type)
  }),
)
const selectedEvents = computed(() =>
  events.value.filter((e) => e.date === selectedDate.value && visibleTypes.value.includes(e.type)),
)
</script>

<template>
  <div class="page">
    <PageHeader title="공고 달력" description="공고의 접수 시작·마감, 발표·협약일을 달력으로 확인합니다." />

    <div class="stack">
      <NoticeBanner v-if="loadFailed" tone="danger" title="공고를 불러오지 못했습니다" alert>
        공고 API에 연결할 수 없어 일정을 표시하지 못했습니다. 잠시 후 다시 시도해 주세요.
      </NoticeBanner>
      <NoticeBanner v-else-if="events.length === 0" tone="neutral">
        공고와 연동된 일정이 없습니다. 공고 날짜가 확인되지 않으면 달력에 일정을 만들지 않습니다.
      </NoticeBanner>

      <div class="grid-12">
        <section class="col-span-12 lg-span-8 surface-card calendar-card" aria-labelledby="calendar-month-title">
          <header class="calendar-card__header">
            <h2 id="calendar-month-title" class="calendar-card__title" aria-live="polite">
              {{ year }}년 {{ month }}월
            </h2>
            <div class="calendar-card__nav">
              <button type="button" class="btn btn-secondary btn-icon btn-sm" aria-label="이전 달" @click="shiftMonth(-1)">
                <IconChevronLeft :size="18" stroke-width="2" aria-hidden="true" />
              </button>
              <button type="button" class="btn btn-secondary btn-sm" @click="goToday">오늘</button>
              <button type="button" class="btn btn-secondary btn-icon btn-sm" aria-label="다음 달" @click="shiftMonth(1)">
                <IconChevronRight :size="18" stroke-width="2" aria-hidden="true" />
              </button>
            </div>
          </header>

          <fieldset class="calendar-card__types">
            <legend class="visually-hidden">표시할 일정 유형</legend>
            <label
              v-for="option in CALENDAR_EVENT_TYPE_OPTIONS"
              :key="option.value"
              class="type-toggle"
              :class="`type-toggle--${option.value}`"
            >
              <input
                type="checkbox"
                class="form-check-input"
                :checked="visibleTypes.includes(option.value)"
                @change="toggleType(option.value, ($event.target as HTMLInputElement).checked)"
              />
              <span class="type-toggle__swatch" aria-hidden="true" />
              {{ option.label }}
            </label>
          </fieldset>

          <MonthCalendar
            :year="year"
            :month="month"
            :events="events"
            :selected-date="selectedDate"
            :today="today"
            :visible-types="visibleTypes"
            @select="onSelect"
          />
          <p class="calendar-card__help">
            날짜를 선택한 뒤 방향키로 날짜를, PageUp·PageDown으로 약 한 달씩 이동할 수 있습니다.
          </p>
        </section>

        <div class="col-span-12 lg-span-4 stack">
          <SectionCard title="선택한 날짜" heading-id="selected-date-title" :icon="IconCalendarEvent">
            <p class="selected-date">{{ formatKoreanDate(selectedDate) }}</p>
            <ul v-if="selectedEvents.length > 0" class="list-plain">
              <li v-for="event in selectedEvents" :key="event.id">
                <RouterLink
                  v-if="event.programId"
                  :to="{ name: 'program-detail', params: { id: event.programId }, query: { from: 'calendar' } }"
                >
                  {{ event.title }}
                </RouterLink>
                <span v-else>{{ event.title }}</span>
              </li>
            </ul>
            <p v-else class="fs-sm text-muted-strong mb-0">이 날짜에는 일정이 없습니다.</p>
          </SectionCard>

          <SectionCard title="이달의 일정" heading-id="month-events-title">
            <ul v-if="monthEvents.length > 0" class="list-plain">
              <li v-for="event in monthEvents" :key="event.id">
                <span class="fs-sm text-muted-strong">{{ formatDate(event.date) }}</span>
                <RouterLink
                  v-if="event.programId"
                  :to="{ name: 'program-detail', params: { id: event.programId }, query: { from: 'calendar' } }"
                >
                  {{ event.title }}
                </RouterLink>
                <span v-else>{{ event.title }}</span>
              </li>
            </ul>
            <EmptyState
              v-else
              :icon="IconCalendarEvent"
              title="공고와 연동된 일정이 없습니다"
              description="공고가 등록되면 접수 시작·마감, 발표일, 협약일이 공고의 날짜 그대로 표시됩니다."
              compact
              :level="3"
            />
            <template #footer>
              <ActionButton :icon="IconPlus" size="sm" disabled describedby="goal-reason">
                개인 준비 목표 추가
              </ActionButton>
              <DisabledReason id="goal-reason">
                준비 중인 사업이 연결된 후 서류 준비 목표일을 추가할 수 있습니다.
              </DisabledReason>
            </template>
          </SectionCard>

          <SectionCard title="일정 유형" heading-id="event-types-title">
            <dl class="type-legend">
              <div v-for="option in CALENDAR_EVENT_TYPE_OPTIONS" :key="option.value" class="type-legend__row">
                <dt>
                  <span class="type-toggle__swatch" :class="`swatch--${option.value}`" aria-hidden="true" />
                  {{ option.label }}
                </dt>
                <dd>{{ option.description }}</dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--card-padding);
}

.calendar-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.calendar-card__title {
  margin: 0;
  font-size: var(--fs-xl);
}

.calendar-card__nav {
  display: flex;
  gap: var(--space-2);
}

.calendar-card__types {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  border: 0;
}

.type-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  color: var(--color-heading);
  cursor: pointer;
}

.type-toggle .form-check-input {
  margin: 0;
}

.type-toggle__swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--color-muted);
}

.type-toggle--apply-start .type-toggle__swatch,
.swatch--apply-start {
  background: var(--color-primary);
}

.type-toggle--apply-end .type-toggle__swatch,
.swatch--apply-end {
  background: var(--color-danger);
}

.type-toggle--personal-goal .type-toggle__swatch,
.swatch--personal-goal {
  background: var(--color-accent);
}

.type-toggle--agreement .type-toggle__swatch,
.swatch--agreement {
  background: var(--color-success);
}

.type-toggle--announcement .type-toggle__swatch,
.swatch--announcement {
  background: var(--color-secondary);
}

.calendar-card__help {
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.selected-date {
  margin-bottom: var(--space-2);
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.type-legend {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
}

.type-legend__row dt {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.type-legend__row dd {
  margin: 2px 0 0 16px;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}
</style>

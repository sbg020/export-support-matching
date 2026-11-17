<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IconChevronLeft, IconChevronRight, IconInfoCircle, IconPlus } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import ActionButton from '@/components/common/ActionButton.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import MonthCalendar from '@/components/calendar/MonthCalendar.vue'
import CalendarDayDialog from '@/components/calendar/CalendarDayDialog.vue'
import { CALENDAR_EVENT_SHORT_LABEL, CALENDAR_EVENT_TYPE_OPTIONS, CALENDAR_MAX_PER_DAY } from '@/constants/options'
import { addMonths, parseIso, todayIso } from '@/lib/calendar'
import { buildProgramEvents } from '@/lib/calendarEvents'
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

/* 날짜 팝업: 날짜(칸)나 '+N개'를 누르면 그날의 일정을 연다 */
const dialogOpen = ref(false)
const dialogDate = ref(today)
const programById = computed(() => new Map(programs.value.map((p) => [p.id, p])))
const TYPE_ORDER = CALENDAR_EVENT_TYPE_OPTIONS.map((o) => o.value)
const dialogEvents = computed(() =>
  events.value
    .filter((e) => e.date === dialogDate.value && visibleTypes.value.includes(e.type))
    .sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.title.localeCompare(b.title, 'ko')),
)
function openDay(date: string) {
  dialogDate.value = date
  dialogOpen.value = true
}
</script>

<template>
  <div class="page">
    <PageHeader title="공고 달력" description="공고의 접수 시작·마감, 발표·협약일을 달력으로 확인합니다." />

    <div class="stack">
      <NoticeBanner v-if="loadFailed" tone="danger" title="공고를 불러오지 못했습니다" alert>
        공고 데이터를 불러올 수 없어 일정을 표시하지 못했습니다. 잠시 후 다시 시도해 주세요.
      </NoticeBanner>
      <NoticeBanner v-else-if="events.length === 0" tone="neutral">
        공고와 연동된 일정이 없습니다. 공고 날짜가 확인되지 않으면 달력에 일정을 만들지 않습니다.
      </NoticeBanner>

      <section class="surface-card calendar-card" aria-labelledby="calendar-month-title">
        <header class="calendar-card__header">
          <div class="calendar-card__heading">
            <h2 id="calendar-month-title" class="calendar-card__title" aria-live="polite">
              {{ year }}년 {{ month }}월
            </h2>
            <!-- 일정 유형 안내: 마우스를 올리거나 키보드로 초점을 주면 보인다 -->
            <span class="type-info">
              <button type="button" class="type-info__button" aria-label="일정 유형 안내" aria-describedby="type-info-tip">
                <IconInfoCircle :size="18" stroke-width="2" aria-hidden="true" />
              </button>
              <span id="type-info-tip" role="tooltip" class="type-info__tip">
                <span class="type-info__title">일정 유형</span>
                <span v-for="option in CALENDAR_EVENT_TYPE_OPTIONS" :key="option.value" class="type-info__row">
                  <span class="type-info__tag" :class="`is-${option.value}`">{{ CALENDAR_EVENT_SHORT_LABEL[option.value] }}</span>
                  <span>
                    <strong>{{ option.label }}</strong>
                    <span class="type-info__desc">{{ option.description }}</span>
                  </span>
                </span>
              </span>
            </span>
          </div>
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
          @open="openDay"
        />

        <footer class="calendar-card__footer">
          <p class="calendar-card__help">
            날짜를 누르면 그날의 공고를 볼 수 있습니다. 한 칸에는 최대 {{ CALENDAR_MAX_PER_DAY }}건까지 보이고, 나머지는
            '+N개'로 엽니다. 방향키로 날짜를, PageUp·PageDown으로 약 한 달씩 이동할 수 있습니다.
          </p>
          <div class="calendar-card__goal">
            <ActionButton :icon="IconPlus" size="sm" disabled describedby="goal-reason">개인 준비 목표 추가</ActionButton>
            <DisabledReason id="goal-reason">준비 중인 사업이 연결된 후 서류 준비 목표일을 추가할 수 있습니다.</DisabledReason>
          </div>
        </footer>
      </section>
    </div>

    <CalendarDayDialog v-model:open="dialogOpen" :date="dialogDate" :events="dialogEvents" :programs="programById" />
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

.calendar-card__heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.calendar-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3) var(--space-5);
}

.calendar-card__footer .calendar-card__help {
  flex: 1 1 320px;
  margin: 0;
}

.calendar-card__goal {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  max-width: 360px;
  text-align: right;
}

/* ⓘ 일정 유형 안내 (마우스 올림·초점) */
.type-info {
  position: relative;
  display: inline-flex;
}

.type-info__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted);
  cursor: help;
}

.type-info__button:hover,
.type-info__button:focus-visible {
  background: var(--color-surface-sunken);
  color: var(--color-heading);
}

.type-info__tip {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 300px;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  font-size: var(--fs-sm);
  color: var(--color-heading);
  visibility: hidden;
  opacity: 0;
  transform: translateY(-4px);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease,
    visibility 0.15s;
  pointer-events: none;
}

.type-info:hover .type-info__tip,
.type-info:focus-within .type-info__tip {
  visibility: visible;
  opacity: 1;
  transform: none;
}

.type-info__title {
  font-weight: var(--fw-bold);
}

.type-info__row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.type-info__desc {
  display: block;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.type-info__tag {
  flex: none;
  margin-top: 1px;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: var(--fw-bold);
  line-height: 18px;
}

.type-info__tag.is-apply-start {
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.type-info__tag.is-apply-end {
  background: var(--color-danger-soft);
  color: var(--color-danger-strong);
}

.type-info__tag.is-personal-goal {
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}

.type-info__tag.is-agreement {
  background: var(--color-success-soft);
  color: var(--color-success-strong);
}

.type-info__tag.is-announcement {
  background: var(--color-secondary-soft);
  color: var(--color-secondary-strong);
}

@media (max-width: 767.98px) {
  .calendar-card__goal {
    align-items: flex-start;
    text-align: left;
  }

  .type-info__tip {
    width: min(300px, calc(100vw - 48px));
  }
}
</style>

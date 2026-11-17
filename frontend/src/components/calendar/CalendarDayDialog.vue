<script setup lang="ts">
/**
 * 공고 달력의 날짜 팝업. 그날의 일정마다 상태 2글자, 공고 제목(상세 링크, 검정 글자), 주관 부처, 신청 기간, 원문 링크.
 * 원문 URL이 없으면 '공고 원문 -'로 두고 링크를 만들지 않는다.
 */
import { computed } from 'vue'
import { IconExternalLink } from '@tabler/icons-vue'
import AppModal from '@/components/common/AppModal.vue'
import DataValue from '@/components/common/DataValue.vue'
import { CALENDAR_EVENT_SHORT_LABEL, CALENDAR_EVENT_TYPE_OPTIONS, optionLabel } from '@/constants/options'
import { formatKoreanDate } from '@/lib/calendar'
import { formatDateCompact } from '@/lib/display'
import type { Program } from '@/types/program'
import type { CalendarEvent } from '@/types/tracking'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  date: string
  events: CalendarEvent[]
  programs: ReadonlyMap<string, Program>
}>()

const title = computed(() => `${formatKoreanDate(props.date)} 일정`)
const description = computed(() =>
  props.events.length > 0 ? `${props.events.length}건` : '이 날짜에는 일정이 없습니다.',
)

function programOf(event: CalendarEvent): Program | null {
  return event.programId ? (props.programs.get(event.programId) ?? null) : null
}

/**
 * 신청 기간: 시작·마감이 있으면 '시작 ~ 마감', 마감만 있으면 '~ 마감'.
 * 마감 날짜가 없으면 원문 표현(예: '공고일 ~ 예산 소진 시까지')을 60자까지, 그것도 없으면 '시작 ~ -'.
 */
const NOTE_MAX = 60
function periodText(p: Program | null): string | null {
  if (!p) return null
  const start = p.applyStart ? formatDateCompact(p.applyStart) : null
  const end = p.applyEnd ? formatDateCompact(p.applyEnd) : null
  if (end) return start ? `${start} ~ ${end}` : `~ ${end}`
  if (p.applyPeriodNote) {
    const note = p.applyPeriodNote.trim()
    return note.length > NOTE_MAX ? `${note.slice(0, NOTE_MAX)}…` : note
  }
  return start ? `${start} ~ -` : null
}

const typeName = (event: CalendarEvent) => optionLabel(CALENDAR_EVENT_TYPE_OPTIONS, event.type) ?? event.type
</script>

<template>
  <AppModal v-model:open="open" :title="title" :description="description" size="lg">
    <ul v-if="events.length > 0" class="day-list">
      <li v-for="event in events" :key="event.id" class="day-item">
        <p class="day-item__head">
          <span class="day-item__tag" :class="`is-${event.type}`" :title="typeName(event)">
            {{ CALENDAR_EVENT_SHORT_LABEL[event.type] }}
          </span>
          <span class="visually-hidden">{{ typeName(event) }}:</span>
          <RouterLink
            v-if="event.programId"
            class="day-item__title"
            :to="{ name: 'program-detail', params: { id: event.programId }, query: { from: 'calendar' } }"
            @click="open = false"
          >
            {{ event.title }}
          </RouterLink>
          <span v-else class="day-item__title">{{ event.title }}</span>
        </p>
        <dl class="day-item__facts">
          <div>
            <dt>주관 부처</dt>
            <dd><DataValue :value="programOf(event)?.ministry ?? null" /></dd>
          </div>
          <div>
            <dt>신청 기간</dt>
            <dd><DataValue :value="periodText(programOf(event))" /></dd>
          </div>
          <div>
            <dt>링크</dt>
            <dd>
              <a
                v-if="programOf(event)?.sourceUrl"
                :href="programOf(event)!.sourceUrl!"
                class="day-item__link"
                target="_blank"
                rel="noopener noreferrer"
              >
                공고 원문 보기
                <IconExternalLink :size="14" stroke-width="2" aria-hidden="true" />
                <span class="visually-hidden">(새 창)</span>
              </a>
              <span v-else class="text-muted-strong">공고 원문 -</span>
            </dd>
          </div>
        </dl>
      </li>
    </ul>
    <p v-else class="mb-0">이 날짜에는 일정이 없습니다.</p>
  </AppModal>
</template>

<style scoped>
.day-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.day-item {
  padding: var(--space-4) 0;
  border-top: 1px solid var(--color-border);
}

.day-item:first-child {
  padding-top: 0;
  border-top: 0;
}

.day-item__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 0 var(--space-2);
}

.day-item__tag {
  flex: none;
  margin-top: 2px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: var(--fw-bold);
  line-height: 20px;
  background: var(--color-surface-sunken);
}

.day-item__tag.is-apply-start {
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.day-item__tag.is-apply-end {
  background: var(--color-danger-soft);
  color: var(--color-danger-strong);
}

.day-item__tag.is-personal-goal {
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}

.day-item__tag.is-agreement {
  background: var(--color-success-soft);
  color: var(--color-success-strong);
}

.day-item__tag.is-announcement {
  background: var(--color-secondary-soft);
  color: var(--color-secondary-strong);
}

/* 공고 제목 링크는 검정 글자 */
.day-item__title {
  font-size: var(--fs-md);
  font-weight: var(--fw-bold);
  line-height: 1.45;
  color: var(--color-heading);
  text-decoration: none;
  word-break: keep-all;
}

a.day-item__title:hover,
a.day-item__title:focus-visible {
  color: var(--color-heading);
  text-decoration: underline;
}

.day-item__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2) var(--space-4);
  margin: 0;
  padding-left: 42px;
  font-size: var(--fs-sm);
}

.day-item__facts dt {
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.day-item__facts dd {
  margin: 0;
  color: var(--color-heading);
}

.day-item__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-heading);
}

@media (max-width: 767.98px) {
  .day-item__facts {
    grid-template-columns: minmax(0, 1fr);
    padding-left: 0;
  }
}
</style>

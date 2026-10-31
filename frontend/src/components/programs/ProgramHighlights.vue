<script setup lang="ts">
/**
 * 전체 공고의 '둘러보기' (REVISION_02 §9): 새로 올라온 공고 · 많이 본 공고, 각 최대 10줄.
 * 많이 본 공고는 서버 저장소가 없어 집계하지 않는다. 브라우저 저장소에 조회를 쌓아 순위처럼 보이게 하지 않는다.
 */
import { computed, ref } from 'vue'
import type { Program } from '@/types/program'
import type { TabItem } from '@/components/common/types'
import { useProgramEvaluations } from '@/composables/useProgramEvaluations'
import { useProfileStore } from '@/stores/profileStore'
import { viewEventSink } from '@/repositories/viewEventSink'
import { NEW_PROGRAM_WINDOW_DAYS, selectNewPrograms } from '@/lib/programHighlights'
import { formatDateCompact } from '@/lib/display'
import { programTitleText, receptionStatusText } from '@/lib/programDisplay'
import TabNav from '@/components/common/TabNav.vue'
import DataValue from '@/components/common/DataValue.vue'
import EligibilityBadge from './EligibilityBadge.vue'

type HighlightTab = 'new' | 'viewed'

const evaluation = useProgramEvaluations()
const profile = useProfileStore()
const tab = ref<HighlightTab>('new')
const idPrefix = 'highlights'

const newPrograms = computed(() => selectNewPrograms(evaluation.programs.value, evaluation.asOf))
const hasProfile = computed(() => profile.assessment.value.status !== 'empty')

const tabs = computed<TabItem<HighlightTab>[]>(() => [
  { key: 'new', label: '새로 올라온 공고', count: evaluation.ready.value ? newPrograms.value.items.length : null },
  { key: 'viewed', label: '많이 본 공고' },
])

function eligibilityOf(program: Program) {
  return evaluation.get(program.id)?.eligibility ?? null
}
</script>

<template>
  <section class="highlights surface-card" aria-labelledby="highlights-title">
    <h2 id="highlights-title" class="highlights__title">둘러보기</h2>
    <TabNav v-model="tab" :tabs="tabs" label="둘러보기" :id-prefix="idPrefix" />
    <div :id="`${idPrefix}-panel`" role="tabpanel" :aria-labelledby="`${idPrefix}-tab-${tab}`" class="highlights__panel">
      <template v-if="tab === 'new'">
        <p class="highlights__note">
          게시일 기준 최근 {{ NEW_PROGRAM_WINDOW_DAYS }}일 · 기준일 <DataValue :value="evaluation.asOf" /> · 접수중·접수예정만
          <template v-if="newPrograms.excludedNoDate > 0"> · 게시일 미확인 {{ newPrograms.excludedNoDate }}건 제외</template>
        </p>
        <ol v-if="newPrograms.items.length > 0" class="highlights__list">
          <li v-for="(line, index) in newPrograms.items" :key="line.program.id" class="highlight">
            <span class="highlight__rank">{{ index + 1 }}</span>
            <div class="highlight__body">
              <RouterLink :to="{ name: 'program-detail', params: { id: line.program.id } }" class="highlight__title">
                {{ programTitleText(line.program) }}
              </RouterLink>
              <span v-if="line.isAdditional" class="highlight__tag">추가모집</span>
              <span v-if="line.groupSize > 1" class="highlight__tag">관련 공고 {{ line.groupSize }}건 묶음</span>
              <p class="highlight__meta">
                <DataValue :value="line.program.ministry" /> · 게시 {{ formatDateCompact(line.program.sourcePublishedAt) }} ·
                <DataValue :value="receptionStatusText(line.program)" /> · 마감
                <DataValue :value="line.program.applyEnd" :format="formatDateCompact" />
              </p>
            </div>
            <EligibilityBadge
              v-if="hasProfile"
              class="highlight__eligibility"
              :status="eligibilityOf(line.program)?.status ?? null"
              size="sm"
              :data-state="eligibilityOf(line.program)?.dataState ?? null"
            />
          </li>
        </ol>
        <p v-else class="highlights__empty">
          {{ evaluation.ready.value ? '기간 안에 새로 올라온 공고가 없습니다.' : '공고를 불러오는 중입니다.' }}
        </p>
      </template>
      <template v-else>
        <p class="highlights__note">순 방문자 기준 최근 7일 · 같은 방문자의 같은 공고는 하루 1회만 셉니다.</p>
        <p class="highlights__empty">
          {{
            viewEventSink.connected
              ? '조회 데이터가 충분히 모이면 표시합니다.'
              : '조회 집계는 서버 저장소가 연결되면 시작합니다.'
          }}
        </p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.highlights {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--card-padding);
}

.highlights__title {
  margin: 0;
  font-size: var(--fs-lg);
}

.highlights__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.highlights__note,
.highlights__empty {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.highlights__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.highlight {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--color-border);
}

.highlight__rank {
  flex-shrink: 0;
  width: 24px;
  font-weight: var(--fw-bold);
  color: var(--color-primary-strong);
  text-align: right;
}

.highlight__body {
  flex: 1;
  min-width: 0;
}

.highlight__title {
  font-weight: var(--fw-semibold);
}

.highlight__tag {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-size: var(--fs-xs);
}

.highlight__meta {
  margin: 2px 0 0;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.highlight__eligibility {
  flex-shrink: 0;
}

@media (max-width: 575.98px) {
  .highlight {
    flex-wrap: wrap;
  }
  .highlight__eligibility {
    margin-left: calc(24px + var(--space-3));
  }
}
</style>

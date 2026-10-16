<script setup lang="ts">
/**
 * 신청완료 탭: 신청 이후 단계(신청완료·심사중·선정완료·미선정·수행중·완료)를 관리한다 (기존 지원 이력 화면).
 * '신청완료'와 '선정완료'는 서로 다른 상태 값과 배지 문구로 구분한다.
 */
import { computed, ref } from 'vue'
import { IconArrowRight, IconHistory, IconPlus } from '@tabler/icons-vue'
import SectionCard from '@/components/common/SectionCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import DataValue from '@/components/common/DataValue.vue'
import ActionButton from '@/components/common/ActionButton.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import { APPLICATION_STATUSES, statusLabel } from '@/constants/applicationStatus'
import { useApplicationStore } from '@/stores/applicationStore'
import type { ApplicationStatus } from '@/types/tracking'
import ApplicationRecordTable from './ApplicationRecordTable.vue'

const applications = useApplicationStore()
const records = computed(() => applications.byTab('applied'))

type Filter = 'all' | ApplicationStatus
const filter = ref<Filter>('all')

const filterOptions = computed<{ key: Filter; label: string }[]>(() => [
  { key: 'all', label: '전체' },
  ...APPLICATION_STATUSES.filter((s) => s.tab === 'applied').map((s) => ({ key: s.value, label: s.label })),
])

/** 실제 기록이 없으면 건수는 '-' */
function countFor(key: Filter): number | null {
  const all = applications.records.value
  if (all.length === 0) return null
  if (key === 'all') return records.value.length
  return all.filter((r) => r.status === key).length
}

const visible = computed(() =>
  filter.value === 'all' ? records.value : records.value.filter((r) => r.status === filter.value),
)
const filterLabel = computed(() => filterOptions.value.find((o) => o.key === filter.value)?.label ?? '')

/** 진행 흐름: 선정완료/미선정은 한 단계에서 갈라진다. */
const pipeline: { key: string; statuses: ApplicationStatus[] }[] = [
  { key: 'interested', statuses: ['interested'] },
  { key: 'preparing', statuses: ['preparing'] },
  { key: 'applied', statuses: ['applied'] },
  { key: 'under_review', statuses: ['under_review'] },
  { key: 'result', statuses: ['selected', 'not_selected'] },
  { key: 'in_progress', statuses: ['in_progress'] },
  { key: 'completed', statuses: ['completed'] },
]
</script>

<template>
  <div class="stack">
    <div>
      <ActionButton variant="primary" :icon="IconPlus" disabled describedby="history-new-reason">새 기록 등록</ActionButton>
      <DisabledReason id="history-new-reason">
        등록된 공고가 없어 새 기록을 등록할 수 없습니다. 기록은 실제 공고와 연결해 남깁니다.
      </DisabledReason>
    </div>

    <SectionCard title="진행 단계" heading-id="history-flow-title" description="지원사업은 보통 아래 순서로 진행됩니다.">
      <ol class="pipeline">
        <li v-for="(stage, index) in pipeline" :key="stage.key" class="pipeline__stage">
          <div class="pipeline__box">
            <span class="pipeline__num" aria-hidden="true">{{ index + 1 }}</span>
            <span class="pipeline__labels">
              <span v-for="(status, i) in stage.statuses" :key="status" class="pipeline__label">
                {{ statusLabel(status) }}<span v-if="i < stage.statuses.length - 1" aria-hidden="true"> / </span>
              </span>
            </span>
            <span class="pipeline__count">
              <span class="visually-hidden">기록 수</span>
              <DataValue :value="stage.statuses.length === 1 ? countFor(stage.statuses[0]!) : null" />
            </span>
          </div>
          <IconArrowRight
            v-if="index < pipeline.length - 1"
            class="pipeline__arrow"
            :size="18"
            stroke-width="2"
            aria-hidden="true"
          />
        </li>
      </ol>
    </SectionCard>

    <SectionCard title="신청 이후 기록" heading-id="applied-list-title" :icon="IconHistory">
      <ul class="status-filter" aria-label="상태별로 보기">
        <li v-for="option in filterOptions" :key="option.key">
          <button
            type="button"
            class="status-filter__chip"
            :aria-pressed="filter === option.key"
            @click="filter = option.key"
          >
            {{ option.label }}
            <span class="status-filter__count"><DataValue :value="countFor(option.key)" /></span>
          </button>
        </li>
      </ul>
      <EmptyState
        v-if="visible.length === 0"
        :icon="IconHistory"
        :title="filter === 'all' ? '신청 이후 기록이 없습니다' : `'${filterLabel}' 상태의 기록이 없습니다`"
        description="관심·준비 중 사업의 상태를 '신청완료'로 바꾸면 이곳에서 심사중·선정완료·미선정·수행중·완료까지 기록하고, 상태 이력과 메모를 남길 수 있습니다."
      />
      <ApplicationRecordTable v-else :records="visible" caption="신청 이후 기록 목록" />
    </SectionCard>
  </div>
</template>

<style scoped>
.pipeline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.pipeline__stage {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.pipeline__box {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.pipeline__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
}

.pipeline__label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.pipeline__count {
  padding: 0 8px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  font-size: var(--fs-xs);
}

.pipeline__arrow {
  color: var(--color-muted);
}

.status-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 var(--space-4);
  padding: 0;
  list-style: none;
}

.status-filter__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  cursor: pointer;
}

.status-filter__chip[aria-pressed='true'] {
  border-color: var(--color-primary-strong);
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.status-filter__count {
  font-size: var(--fs-xs);
}

@media (max-width: 767.98px) {
  .pipeline {
    flex-direction: column;
    align-items: stretch;
  }
  .pipeline__stage {
    flex-direction: column;
    align-items: stretch;
  }
  .pipeline__arrow {
    align-self: center;
    transform: rotate(90deg);
  }
}
</style>

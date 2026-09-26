<script setup lang="ts">
import { computed, ref } from 'vue'
import { IconArrowRight, IconHistory, IconPlus } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import TabNav from '@/components/common/TabNav.vue'
import DataValue from '@/components/common/DataValue.vue'
import ActionButton from '@/components/common/ActionButton.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import type { TabItem } from '@/components/common/types'
import { HISTORY_STATUS_OPTIONS } from '@/constants/options'
import { useTrackingStore } from '@/stores/trackingStore'
import { formatDate } from '@/lib/display'
import type { HistoryStatus } from '@/types/tracking'

const tracking = useTrackingStore()
const records = computed(() => tracking.state.history)

type Tab = 'all' | HistoryStatus
const tab = ref<Tab>('all')

/** 실제 기록이 없으면 건수는 '-' */
function countFor(status: Tab): number | null {
  if (records.value.length === 0) return null
  return status === 'all' ? records.value.length : records.value.filter((r) => r.status === status).length
}

const tabs = computed<TabItem<Tab>[]>(() => [
  { key: 'all', label: '전체', count: countFor('all') },
  ...HISTORY_STATUS_OPTIONS.map((o) => ({ key: o.value, label: o.label, count: countFor(o.value) })),
])

const visible = computed(() => (tab.value === 'all' ? records.value : records.value.filter((r) => r.status === tab.value)))

/** 진행 흐름: 선정/미선정은 한 단계에서 갈라진다. */
const pipeline: { key: string; statuses: HistoryStatus[] }[] = [
  { key: 'interested', statuses: ['interested'] },
  { key: 'preparing', statuses: ['preparing'] },
  { key: 'applied', statuses: ['applied'] },
  { key: 'reviewing', statuses: ['reviewing'] },
  { key: 'result', statuses: ['selected', 'rejected'] },
  { key: 'in-progress', statuses: ['in-progress'] },
  { key: 'completed', statuses: ['completed'] },
]
const statusLabel = (s: HistoryStatus) => HISTORY_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s
const tabLabel = computed(() => tabs.value.find((t) => t.key === tab.value)?.label ?? '')
</script>

<template>
  <div class="page">
    <PageHeader title="지원 이력" description="관심부터 완료까지 지원사업의 진행 상황과 메모를 기록합니다.">
      <template #actions>
        <ActionButton variant="primary" :icon="IconPlus" disabled describedby="history-new-reason">새 기록 등록</ActionButton>
      </template>
    </PageHeader>

    <div class="stack">
      <DisabledReason id="history-new-reason" class="mt-0">
        등록된 공고가 없어 새 기록을 등록할 수 없습니다. 지원 이력은 실제 공고와 연결해 기록합니다.
      </DisabledReason>

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

      <section class="surface-card history-list" aria-labelledby="history-list-title">
        <h2 id="history-list-title" class="section-title history-list__title">기록</h2>
        <TabNav v-model="tab" :tabs="tabs" label="상태별 지원 이력" id-prefix="history" />
        <div :id="'history-panel'" role="tabpanel" :aria-labelledby="`history-tab-${tab}`" class="history-list__panel">
          <EmptyState
            v-if="visible.length === 0"
            :icon="IconHistory"
            :title="tab === 'all' ? '기록한 지원 이력이 없습니다' : `'${tabLabel}' 상태의 기록이 없습니다`"
            description="기록마다 사업명, 현재 상태, 기록일, 메모를 남길 수 있습니다. 공고가 등록되면 관심·준비 중 사업에서 이력을 시작할 수 있습니다."
          />
          <div v-else class="scroll-x">
            <table class="data-table">
              <caption class="visually-hidden">지원 이력 목록</caption>
              <thead>
                <tr>
                  <th scope="col">사업명</th>
                  <th scope="col">현재 상태</th>
                  <th scope="col">기록일</th>
                  <th scope="col">메모</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in visible" :key="record.id">
                  <th scope="row">{{ record.programId }}</th>
                  <td>{{ statusLabel(record.status) }}</td>
                  <td>{{ formatDate(record.recordedAt) }}</td>
                  <td><DataValue :value="record.memo" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
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

.history-list {
  padding: var(--card-padding);
}

.history-list__title {
  margin-bottom: var(--space-3);
}

.history-list__panel {
  padding-top: var(--space-5);
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

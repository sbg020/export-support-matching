<script setup lang="ts">
/**
 * 관리 기록 표: 공고, 현재 상태, 상태 변경, 상태 이력, 메모.
 * 기록은 실제 공고와 연결될 때만 생기므로, 기록이 없으면 이 표 대신 빈 상태를 보여 준다.
 */
import { computed, ref, watch } from 'vue'
import type { ApplicationRecord, ApplicationStatus } from '@/types/tracking'
import type { Program } from '@/types/program'
import { APPLICATION_STATUSES, statusLabel } from '@/constants/applicationStatus'
import { programRepository } from '@/repositories'
import { useApplicationStore } from '@/stores/applicationStore'
import { formatDateTime } from '@/lib/display'
import ApplicationStatusBadge from './ApplicationStatusBadge.vue'

const props = defineProps<{ records: ApplicationRecord[]; caption: string }>()

const applications = useApplicationStore()
const programs = ref<Map<string, Program>>(new Map())

watch(
  () => props.records.map((r) => r.programId).join(','),
  async () => {
    try {
      const found = await programRepository.getByIds(props.records.map((r) => r.programId))
      programs.value = new Map(found.map((p) => [p.id, p]))
    } catch {
      programs.value = new Map()
    }
  },
  { immediate: true },
)

const rows = computed(() =>
  props.records.map((record) => ({
    record,
    title: programs.value.get(record.programId)?.title ?? null,
    lastChange: record.history[record.history.length - 1]?.changedAt ?? null,
  })),
)

function onStatusChange(programId: string, event: Event) {
  applications.changeStatus(programId, (event.target as HTMLSelectElement).value as ApplicationStatus)
}

function onMemoChange(programId: string, event: Event) {
  applications.setMemo(programId, (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <div class="scroll-x">
    <table class="data-table record-table">
      <caption class="visually-hidden">{{ caption }}</caption>
      <thead>
        <tr>
          <th scope="col">공고</th>
          <th scope="col">현재 상태</th>
          <th scope="col">상태 변경</th>
          <th scope="col">마지막 변경</th>
          <th scope="col">메모</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.record.programId">
          <th scope="row">
            <RouterLink :to="{ name: 'program-detail', params: { id: row.record.programId } }">
              {{ row.title ?? `찾을 수 없는 공고 (${row.record.programId})` }}
            </RouterLink>
          </th>
          <td><ApplicationStatusBadge :status="row.record.status" /></td>
          <td>
            <label class="visually-hidden" :for="`status-${row.record.programId}`">상태 변경</label>
            <select
              :id="`status-${row.record.programId}`"
              class="form-select form-select-sm"
              :value="row.record.status"
              @change="onStatusChange(row.record.programId, $event)"
            >
              <option v-for="option in APPLICATION_STATUSES" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <details class="record-table__history">
              <summary>상태 이력 {{ row.record.history.length }}건</summary>
              <ol>
                <li v-for="change in row.record.history" :key="`${change.status}-${change.changedAt}`">
                  {{ statusLabel(change.status) }} · {{ formatDateTime(change.changedAt) }}
                </li>
              </ol>
            </details>
          </td>
          <td class="fs-sm">{{ formatDateTime(row.lastChange) }}</td>
          <td>
            <label class="visually-hidden" :for="`memo-${row.record.programId}`">메모</label>
            <textarea
              :id="`memo-${row.record.programId}`"
              class="form-control form-control-sm"
              rows="2"
              :value="row.record.memo ?? ''"
              @change="onMemoChange(row.record.programId, $event)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.record-table {
  min-width: 720px;
}

.record-table__history {
  margin-top: 6px;
  font-size: var(--fs-xs);
}

.record-table__history ol {
  margin: 4px 0 0;
  padding-left: var(--space-4);
}
</style>

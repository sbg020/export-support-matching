<script setup lang="ts">
/** 준비 중 탭: 서류·계획서를 준비하는 사업 (기존 준비 중 사업 화면) */
import { computed, ref, watch } from 'vue'
import {
  IconCalendarDue,
  IconChecklist,
  IconFileDescription,
  IconFiles,
  IconLink,
  IconProgressCheck,
} from '@tabler/icons-vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatTile from '@/components/common/StatTile.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import ActionButton from '@/components/common/ActionButton.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import DocumentChecklist from '@/components/programs/DocumentChecklist.vue'
import { useApplicationStore } from '@/stores/applicationStore'
import { useTrackingStore } from '@/stores/trackingStore'
import { programRepository } from '@/repositories'
import { programTitleText } from '@/lib/programDisplay'
import { formatDateCompact } from '@/lib/display'
import { DOCUMENT_STATUS_LABEL } from '@/lib/documentVault'
import type { Program } from '@/types/program'
import ApplicationRecordTable from './ApplicationRecordTable.vue'

const applications = useApplicationStore()
const tracking = useTrackingStore()
const items = computed(() => applications.records.value.filter((r) => r.status === 'preparing'))
const itemCount = computed(() => (items.value.length > 0 ? `${items.value.length}건` : null))

/* 준비 중 공고 (실제 공고 데이터) */
const programs = ref<Map<string, Program>>(new Map())
watch(
  () => items.value.map((r) => r.programId).join(','),
  async () => {
    if (items.value.length === 0) return
    try {
      programs.value = new Map((await programRepository.getByIds(items.value.map((r) => r.programId))).map((p) => [p.id, p]))
    } catch {
      programs.value = new Map()
    }
  },
  { immediate: true },
)

/** 서류 준비 현황: 공고의 제출 서류 중 체크한 것 (사용자가 체크한 값으로만 계산) */
const docStats = computed(() => {
  let total = 0
  let done = 0
  for (const record of items.value) {
    const docs = programs.value.get(record.programId)?.requiredDocs ?? []
    const checked = new Set(record.checklist.filter((c) => c.checked).map((c) => c.requiredDocumentId))
    total += docs.length
    done += docs.filter((d) => checked.has(d.id)).length
  }
  return total > 0 ? { total, done } : null
})
const readiness = computed(() => (docStats.value ? `${Math.round((docStats.value.done / docStats.value.total) * 100)}%` : null))
const doneText = computed(() => (docStats.value ? `${docStats.value.done} / ${docStats.value.total}개` : null))
const remaining = computed(() => (docStats.value ? `${docStats.value.total - docStats.value.done}개` : null))
/** 가장 가까운 마감 (공고의 마감일) */
const nearestDeadline = computed(() => {
  const ends = items.value
    .map((r) => programs.value.get(r.programId)?.applyEnd ?? null)
    .filter((e): e is string => e !== null)
    .sort()
  return ends[0] ? formatDateCompact(ends[0]) : null
})

/* 사업계획서 연결 (서류함 기록) */
const planLinks = computed(() =>
  items.value
    .filter((r) => r.businessPlanDocumentId)
    .map((r) => ({
      record: r,
      document: tracking.documents.value.find((d) => d.id === r.businessPlanDocumentId) ?? null,
    }))
    .filter((x) => x.document),
)
</script>

<template>
  <div class="stack">
      <div class="tile-grid">
        <StatTile label="준비 중 사업" :value="itemCount" :icon="IconChecklist" />
        <StatTile label="준비도" :value="readiness" :icon="IconProgressCheck" tone="secondary" hint="체크한 제출 서류 비율" />
        <StatTile label="남은 서류" :value="remaining" :icon="IconFiles" tone="accent" />
        <StatTile label="가까운 마감" :value="nearestDeadline" :icon="IconCalendarDue" tone="neutral" />
      </div>

      <SectionCard title="준비 중인 사업" heading-id="prep-list-title" :icon="IconChecklist">
        <EmptyState
          v-if="items.length === 0"
          :icon="IconChecklist"
          title="준비 중인 사업이 없습니다"
          description="관심 탭의 사업을 '준비 중'으로 바꾸면 이곳에 표시됩니다. 사업마다 준비도, 남은 서류, 마감일을 함께 보여 드립니다."
        >
          <template #actions>
            <RouterLink :to="{ name: 'programs-recommended' }" class="btn btn-secondary">맞춤 추천 보기</RouterLink>
          </template>
        </EmptyState>
        <ApplicationRecordTable v-else :records="items" caption="준비 중인 사업 목록" />
      </SectionCard>

      <div class="grid-12">
        <SectionCard
          class="col-span-12 lg-span-6"
          title="필요서류 체크리스트"
          heading-id="prep-checklist-title"
          :icon="IconFiles"
          description="공고의 필요서류를 하나씩 체크하며 준비합니다."
        >
          <EmptyState
            v-if="items.length === 0"
            :icon="IconFiles"
            title="체크할 서류가 없습니다"
            description="준비 중인 사업의 필요서류가 이곳에 체크리스트로 나타납니다."
            compact
            :level="3"
          />
          <div v-for="record in items" v-else :key="record.programId" class="prep-checklist">
            <h4 class="prep-checklist__title">
              <RouterLink :to="{ name: 'program-detail', params: { id: record.programId } }">
                {{ programTitleText(programs.get(record.programId) ?? null) ?? record.programId }}
              </RouterLink>
            </h4>
            <DocumentChecklist :program="programs.get(record.programId) ?? null" :record="record" />
          </div>
          <InfoList class="mt-3" compact>
            <InfoRow label="준비를 마친 서류" :value="doneText" />
            <InfoRow label="준비도" :value="readiness" hint="공고의 제출 서류 중 체크한 비율입니다." />
          </InfoList>
        </SectionCard>

        <SectionCard
          class="col-span-12 lg-span-6"
          title="사업계획서 연결"
          heading-id="prep-plan-title"
          :icon="IconFileDescription"
          description="서류함의 사업계획서를 준비 중인 사업과 연결합니다."
        >
          <InfoList compact>
            <InfoRow
              label="연결된 사업계획서"
              :value="planLinks[0] ? `${planLinks[0].document!.title} (${DOCUMENT_STATUS_LABEL[planLinks[0].document!.status]})` : null"
            />
            <InfoRow
              label="연결된 사업"
              :value="planLinks[0] ? (programTitleText(programs.get(planLinks[0].record.programId) ?? null) ?? planLinks[0].record.programId) : null"
            />
            <InfoRow label="마지막 수정" :value="null" />
          </InfoList>
          <div class="action-row mt-4">
            <ActionButton :icon="IconLink" disabled describedby="prep-plan-reason">사업계획서 연결하기</ActionButton>
          </div>
          <DisabledReason id="prep-plan-reason">
            준비 중인 사업과 파일 저장소가 연결되지 않아 사업계획서를 연결할 수 없습니다.
          </DisabledReason>
        </SectionCard>
      </div>
  </div>
</template>

<style scoped>
.prep-checklist + .prep-checklist {
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.prep-checklist__title {
  margin: 0 0 var(--space-2);
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
}

.prep-checklist__title a {
  color: var(--color-heading);
  text-decoration: none;
}
</style>

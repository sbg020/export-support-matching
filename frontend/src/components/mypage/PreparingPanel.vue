<script setup lang="ts">
/** 준비 중 탭: 서류·계획서를 준비하는 사업 (기존 준비 중 사업 화면) */
import { computed } from 'vue'
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
import { useApplicationStore } from '@/stores/applicationStore'
import ApplicationRecordTable from './ApplicationRecordTable.vue'

const applications = useApplicationStore()
const items = computed(() => applications.records.value.filter((r) => r.status === 'preparing'))
const itemCount = computed(() => (items.value.length > 0 ? `${items.value.length}건` : null))
</script>

<template>
  <div class="stack">
      <div class="tile-grid">
        <StatTile label="준비 중 사업" :value="itemCount" :icon="IconChecklist" />
        <StatTile label="준비도" :value="null" :icon="IconProgressCheck" tone="secondary" hint="준비 중인 사업이 생기면 표시" />
        <StatTile label="남은 서류" :value="null" :icon="IconFiles" tone="accent" />
        <StatTile label="가까운 마감" :value="null" :icon="IconCalendarDue" tone="neutral" />
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
            :icon="IconFiles"
            title="체크할 서류가 없습니다"
            description="준비 중인 사업의 필요서류가 이곳에 체크리스트로 나타납니다."
            compact
            :level="3"
          />
          <InfoList class="mt-3" compact>
            <InfoRow label="준비를 마친 서류" :value="null" />
            <InfoRow label="준비도" :value="null" hint="준비도 계산 방식은 공고의 필요서류가 연결된 후 확정됩니다." />
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
            <InfoRow label="연결된 사업계획서" :value="null" />
            <InfoRow label="연결된 사업" :value="null" />
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

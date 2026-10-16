<script setup lang="ts">
/** 관심 탭: 저장만 한 사업 (기존 관심 사업 화면) */
import { computed } from 'vue'
import { IconBookmark, IconClock, IconCircleCheck, IconListDetails, IconTargetArrow } from '@tabler/icons-vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatTile from '@/components/common/StatTile.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useApplicationStore } from '@/stores/applicationStore'
import ApplicationRecordTable from './ApplicationRecordTable.vue'

const applications = useApplicationStore()
const records = computed(() => applications.records.value.filter((r) => r.status === 'interested'))
const savedCount = computed(() => (records.value.length > 0 ? `${records.value.length}건` : null))
</script>

<template>
  <div class="stack">
    <div class="tile-grid">
      <StatTile label="저장한 사업" :value="savedCount" :icon="IconBookmark" />
      <StatTile label="접수 중" :value="null" :icon="IconListDetails" tone="secondary" />
      <StatTile label="마감 임박" :value="null" :icon="IconClock" tone="accent" />
      <StatTile label="신청 가능" :value="null" :icon="IconCircleCheck" tone="neutral" />
    </div>

    <SectionCard title="저장한 사업 목록" heading-id="saved-list-title" :icon="IconBookmark">
      <EmptyState
        v-if="records.length === 0"
        :icon="IconBookmark"
        title="저장한 관심 사업이 없습니다"
        description="공고가 등록되면 맞춤 추천이나 공고 상세에서 관심사업으로 저장할 수 있습니다. 저장한 사업은 이곳에서 준비 중·신청완료로 상태를 바꿔 관리합니다."
      >
        <template #actions>
          <RouterLink :to="{ name: 'programs' }" class="btn btn-secondary">
            <IconListDetails :size="18" stroke-width="2" aria-hidden="true" />
            전체 공고 보기
          </RouterLink>
          <RouterLink :to="{ name: 'programs-recommended' }" class="btn btn-secondary">
            <IconTargetArrow :size="18" stroke-width="2" aria-hidden="true" />
            맞춤 추천 보기
          </RouterLink>
        </template>
      </EmptyState>
      <ApplicationRecordTable v-else :records="records" caption="관심 사업 목록" />
    </SectionCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconBookmark, IconClock, IconCircleCheck, IconListDetails, IconTargetArrow } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatTile from '@/components/common/StatTile.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useTrackingStore } from '@/stores/trackingStore'

const tracking = useTrackingStore()
const saved = computed(() => tracking.state.saved)
const savedCount = computed(() => (saved.value.length > 0 ? `${saved.value.length}건` : null))
</script>

<template>
  <div class="page">
    <PageHeader title="관심 사업" description="관심 있는 공고를 모아 두고 신청 자격과 마감을 한눈에 확인합니다." />

    <div class="stack">
      <div class="tile-grid">
        <StatTile label="저장한 사업" :value="savedCount" :icon="IconBookmark" />
        <StatTile label="접수 중" :value="null" :icon="IconListDetails" tone="secondary" />
        <StatTile label="마감 임박" :value="null" :icon="IconClock" tone="accent" />
        <StatTile label="신청 가능" :value="null" :icon="IconCircleCheck" tone="neutral" />
      </div>

      <SectionCard title="저장한 사업 목록" heading-id="saved-list-title" :icon="IconBookmark">
        <EmptyState
          v-if="saved.length === 0"
          :icon="IconBookmark"
          title="저장한 관심 사업이 없습니다"
          description="공고가 등록되면 목록이나 상세 화면에서 관심사업으로 저장할 수 있습니다. 저장한 사업은 공고명, 접수상태, 마감일, 신청 자격, 적합도, 저장일과 함께 보여 드립니다."
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
      </SectionCard>
    </div>
  </div>
</template>

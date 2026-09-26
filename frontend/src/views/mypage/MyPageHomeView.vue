<script setup lang="ts">
import { computed } from 'vue'
import {
  IconBookmark,
  IconCalendar,
  IconChecklist,
  IconFolder,
  IconHistory,
  IconPencil,
  IconRoute,
  IconUserCircle,
} from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import DataValue from '@/components/common/DataValue.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LocalModeNotice from '@/components/mypage/LocalModeNotice.vue'
import SummaryCard from '@/components/mypage/SummaryCard.vue'
import ProfileStatusBadge from '@/components/diagnose/ProfileStatusBadge.vue'
import { useProfileStore } from '@/stores/profileStore'
import { useTrackingStore, DOCUMENT_STORAGE_CONNECTED } from '@/stores/trackingStore'
import { formatDateTime, formatKrw, formatUsd } from '@/lib/display'
import { interestText } from '@/lib/profileDisplay'

const store = useProfileStore()
const tracking = useTrackingStore()
const profile = computed(() => store.state.profile)
const status = computed(() => store.assessment.value.status)

/** 실제 기록이 있을 때만 건수를 보여 주고, 없으면 '-' */
const countOrNull = (list: readonly unknown[]) => (list.length > 0 ? `${list.length}건` : null)
const industry = computed(() => profile.value.industryName ?? profile.value.ksicCode)
</script>

<template>
  <div class="page">
    <PageHeader title="마이페이지" description="이 브라우저에 입력한 기업정보와 지원사업 관리 기록을 한곳에서 확인합니다." />

    <div class="stack">
      <LocalModeNotice />

      <div class="grid-12">
        <SectionCard
          class="col-span-12 lg-span-8"
          title="기업 프로필"
          heading-id="mypage-profile-title"
          :icon="IconUserCircle"
        >
          <template #actions>
            <ProfileStatusBadge :status="status" size="sm" />
          </template>
          <EmptyState
            v-if="status === 'empty'"
            :icon="IconUserCircle"
            title="아직 입력한 기업정보가 없습니다"
            description="기업정보를 입력하면 이곳에 요약해 보여 드립니다."
            compact
          >
            <template #actions>
              <RouterLink :to="{ name: 'diagnose-input' }" class="btn btn-primary">기업정보 입력하기</RouterLink>
            </template>
          </EmptyState>
          <template v-else>
            <p class="company-name"><DataValue :value="profile.companyName" missing-label="기업명 미입력" /></p>
            <InfoList :columns="2" compact>
              <InfoRow label="업종" :value="industry" />
              <InfoRow label="최근 매출액" :value="profile.revenueKrw" :format="formatKrw" />
              <InfoRow label="최근 1년 수출액" :value="profile.exportUsdLastYear" :format="formatUsd" />
              <InfoRow label="관심 분야" :value="interestText(profile)" />
              <InfoRow label="마지막 저장" :value="store.state.meta.lastSavedAt" :format="formatDateTime" />
            </InfoList>
          </template>
          <template #footer>
            <div class="action-row">
              <RouterLink :to="{ name: 'mypage-profile' }" class="btn btn-secondary btn-sm">프로필 자세히 보기</RouterLink>
              <RouterLink :to="{ name: 'diagnose-input' }" class="btn btn-ghost btn-sm">
                <IconPencil :size="16" stroke-width="2" aria-hidden="true" />
                기업정보 수정
              </RouterLink>
            </div>
          </template>
        </SectionCard>

        <SummaryCard
          class="col-span-12 lg-span-4"
          title="나의 수출 로드맵"
          :icon="IconRoute"
          value-label="현재 단계"
          empty-text="검증된 진단 기준이 마련되면 현재 단계와 다음 단계를 보여 드립니다."
          :to="{ name: 'roadmap' }"
          link-label="로드맵 보기"
          tone="accent"
        />
      </div>

      <div class="summary-grid">
        <SummaryCard
          title="관심 사업"
          :icon="IconBookmark"
          value-label="저장한 사업"
          :value="countOrNull(tracking.state.saved)"
          empty-text="저장한 사업이 없습니다. 공고가 등록되면 관심 있는 사업을 저장할 수 있습니다."
          :to="{ name: 'mypage-saved' }"
          link-label="관심 사업 보기"
        />
        <SummaryCard
          title="준비 중 사업"
          :icon="IconChecklist"
          value-label="준비 중"
          :value="countOrNull(tracking.state.preparation)"
          empty-text="준비 중인 사업이 없습니다. 서류 체크리스트와 준비도를 이곳에서 관리합니다."
          :to="{ name: 'mypage-preparation' }"
          link-label="준비 현황 보기"
          tone="secondary"
        />
        <SummaryCard
          title="가까운 일정"
          :icon="IconCalendar"
          value-label="다가오는 일정"
          :value="null"
          empty-text="공고와 연동된 일정이 없습니다. 접수 시작·마감, 발표일이 생기면 알려 드립니다."
          :to="{ name: 'mypage-calendar' }"
          link-label="일정 보기"
          tone="accent"
        />
        <SummaryCard
          title="지원 이력"
          :icon="IconHistory"
          value-label="기록"
          :value="countOrNull(tracking.state.history)"
          empty-text="기록한 지원 이력이 없습니다. 신청부터 완료까지의 진행 상황을 기록할 수 있습니다."
          :to="{ name: 'mypage-history' }"
          link-label="지원 이력 보기"
        />
        <SummaryCard
          title="서류함"
          :icon="IconFolder"
          value-label="보유 서류"
          :value="DOCUMENT_STORAGE_CONNECTED ? countOrNull(tracking.state.documents) : null"
          empty-text="파일 저장소가 연결되지 않아 서류를 보관할 수 없습니다. 필요한 서류 유형은 미리 확인할 수 있습니다."
          :to="{ name: 'mypage-documents' }"
          link-label="서류함 보기"
          tone="secondary"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.company-name {
  margin-bottom: var(--space-2);
  font-size: var(--fs-xl);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--card-gap);
}

@media (max-width: 1199.98px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 575.98px) {
  .summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

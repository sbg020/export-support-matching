<script setup lang="ts">
import { computed } from 'vue'
import {
  IconCircleCheck,
  IconCircleX,
  IconHelpCircle,
  IconPencil,
  IconScale,
  IconTargetArrow,
} from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import DataValue from '@/components/common/DataValue.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ProgramBrowser from '@/components/programs/ProgramBrowser.vue'
import ProfileStatusBadge from '@/components/diagnose/ProfileStatusBadge.vue'
import { useProfileStore } from '@/stores/profileStore'
import { ACTIVE_FIT_CRITERIA } from '@/lib/engine/fit'

const store = useProfileStore()
const status = computed(() => store.assessment.value.status)
const companyName = computed(() => store.state.profile.companyName)
const fitCriteriaVersion = ACTIVE_FIT_CRITERIA?.version ?? null
</script>

<template>
  <div class="page">
    <PageHeader
      title="맞춤 추천"
      description="입력한 기업정보를 기준으로, 공고마다 신청 자격과 적합도를 나누어 보여 드립니다."
    >
      <template #meta>
        <span class="fs-sm text-muted-strong">기준 프로필</span>
        <strong class="text-heading"><DataValue :value="companyName" missing-label="기업명 미입력" /></strong>
        <ProfileStatusBadge :status="status" size="sm" />
      </template>
      <template #actions>
        <RouterLink :to="{ name: 'diagnose-input' }" class="btn btn-secondary">
          <IconPencil :size="18" stroke-width="2" aria-hidden="true" />
          기업정보 수정
        </RouterLink>
      </template>
    </PageHeader>

    <div class="stack">
      <NoticeBanner v-if="status === 'empty'" tone="warning" title="기업정보를 먼저 입력해 주세요">
        기업정보가 없으면 신청 자격을 판정할 수 없습니다. 입력한 정보는 이 기기에만 저장됩니다.
        <template #actions>
          <RouterLink :to="{ name: 'diagnose-input' }" class="btn btn-primary btn-sm">기업정보 입력하기</RouterLink>
        </template>
      </NoticeBanner>
      <NoticeBanner v-else-if="status === 'in-progress'" tone="neutral" title="프로필이 '입력 중'입니다">
        빠졌거나 확인이 필요한 항목과 관련된 자격 조건은 공고가 등록된 후 '확인 필요'로 표시됩니다.
        <template #actions>
          <RouterLink :to="{ name: 'diagnose-result' }" class="btn btn-secondary btn-sm">빠진 항목 보기</RouterLink>
        </template>
      </NoticeBanner>

      <section class="split surface-card" aria-labelledby="split-title">
        <h2 id="split-title" class="visually-hidden">신청 자격과 적합도를 나누어 보는 방법</h2>
        <div class="split__col">
          <p class="split__step">1. 먼저 확인</p>
          <h3 class="split__title">
            <IconCircleCheck :size="20" stroke-width="1.9" aria-hidden="true" />
            신청 자격
          </h3>
          <p class="split__text">공고의 자격 조건을 원문 근거와 비교해 신청할 수 있는지를 판정합니다.</p>
          <ul class="split__legend" aria-label="신청 자격 상태 설명">
            <li><StatusBadge label="신청 가능" tone="success" :icon="IconCircleCheck" size="sm" /> 모든 조건 충족</li>
            <li><StatusBadge label="확인 필요" tone="warning" :icon="IconHelpCircle" size="sm" /> 원문을 보고 직접 확인할 조건 있음</li>
            <li><StatusBadge label="신청 불가" tone="danger" :icon="IconCircleX" size="sm" /> 충족하지 못한 조건 있음</li>
          </ul>
          <p class="split__slot">판정한 공고 <strong><DataValue :value="null" /></strong></p>
        </div>
        <div class="split__col">
          <p class="split__step">2. 그다음 확인</p>
          <h3 class="split__title">
            <IconTargetArrow :size="20" stroke-width="1.9" aria-hidden="true" />
            적합도
          </h3>
          <p class="split__text">
            신청 자격과는 별개로, 관심 분야 등과 얼마나 맞는지를 계산 근거와 함께 보여 드립니다.
          </p>
          <p class="split__slot">
            적합도 산정 기준 <strong><DataValue :value="fitCriteriaVersion" /></strong>
          </p>
          <p class="split__note">산정 기준(요소·가중치)이 확정되기 전에는 점수를 표시하지 않습니다.</p>
        </div>
        <div class="split__col">
          <p class="split__step">3. 준비 전 확인</p>
          <h3 class="split__title">
            <IconScale :size="20" stroke-width="1.9" aria-hidden="true" />
            준비 부담·기회비용
          </h3>
          <p class="split__text">
            예상 준비 시간, 새로 준비할 서류, 자기부담금, 선정 후 의무를 공고 상세와 비교 화면에서 확인할 수
            있습니다.
          </p>
          <RouterLink :to="{ name: 'programs-compare' }" class="split__link">공고 비교 화면 보기</RouterLink>
        </div>
      </section>

      <ProgramBrowser mode="recommended" />

      <SectionCard title="추천 결과를 볼 때 알아 두세요" heading-id="recommend-notes">
        <ul class="notes">
          <li>근거가 확인되지 않은 선정 가능성, 확률, 점수는 표시하지 않습니다.</li>
          <li>모든 판정에는 공고 원문과 확인한 날짜, 판정 기준 버전을 함께 표시합니다.</li>
          <li>실제 신청 전에는 반드시 공고 원문으로 자격 조건을 다시 확인해 주세요.</li>
        </ul>
      </SectionCard>
    </div>
  </div>
</template>

<style scoped>
.split {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.split__col {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--card-padding);
}

.split__col + .split__col {
  border-left: 1px solid var(--color-border);
}

.split__step {
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
  color: var(--color-primary-strong);
}

.split__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--fs-md);
}

.split__text {
  font-size: var(--fs-sm);
}

.split__legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: var(--space-1) 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-xs);
  color: var(--color-text);
}

.split__legend li {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.split__slot {
  margin-top: auto;
  padding-top: var(--space-2);
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.split__note {
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.split__link {
  margin-top: auto;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}

.notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--fs-sm);
}

@media (max-width: 991.98px) {
  .split {
    grid-template-columns: minmax(0, 1fr);
  }
  .split__col + .split__col {
    border-left: 0;
    border-top: 1px solid var(--color-border);
  }
}
</style>

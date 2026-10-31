<script setup lang="ts">
import { computed } from 'vue'
import { IconCircleCheck, IconCircleX, IconHelpCircle, IconScale, IconTargetArrow } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataValue from '@/components/common/DataValue.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import DataSourceNotice from '@/components/common/DataSourceNotice.vue'
import ProgramBrowser from '@/components/programs/ProgramBrowser.vue'
import CommonChecksPanel from '@/components/programs/CommonChecksPanel.vue'
import CompareDock from '@/components/programs/CompareDock.vue'
import ProfileStatusBadge from '@/components/diagnose/ProfileStatusBadge.vue'
import { useProfileStore } from '@/stores/profileStore'
import { ACTIVE_FIT_CRITERIA } from '@/lib/engine/fit'
import { CATEGORY_PHASE_VERSION, STAGE_PHASE_VERSION } from '@/constants/categories'
import { isSourceConnected, programRepository } from '@/repositories'

const store = useProfileStore()
const status = computed(() => store.assessment.value.status)
const companyName = computed(() => store.state.profile.companyName)
const criteria = ACTIVE_FIT_CRITERIA
const weightText = `관심분야 ${criteria.weights.interest.toFixed(2)} · 단계 ${criteria.weights.stage.toFixed(2)} · 내용 유사도 ${criteria.weights.text.toFixed(2)}`
const connected = isSourceConnected(programRepository.source)
</script>

<template>
  <div class="page">
    <PageHeader title="맞춤 추천" description="입력한 기업정보를 기준으로 공고마다 신청자격과 추천 이유를 보여 드립니다.">
      <template #meta>
        <span class="fs-sm text-muted-strong">기준 프로필</span>
        <strong class="text-heading"><DataValue :value="companyName" missing-label="기업명 미입력" /></strong>
        <ProfileStatusBadge :status="status" size="sm" />
        <RouterLink :to="{ name: 'company-profile' }" class="fs-sm">
          {{ status === 'empty' ? '기업정보 입력하기' : '기업정보 수정' }}
        </RouterLink>
      </template>
    </PageHeader>

    <div class="stack">
      <DataSourceNotice />
      <CommonChecksPanel v-if="connected" />
      <!-- 추천 결과(또는 빈 상태)를 설명보다 먼저 보여 준다 -->
      <ProgramBrowser mode="recommended" />

      <details class="criteria surface-card">
        <summary class="criteria__summary">추천 기준 안내</summary>
        <div class="criteria__body">
          <p class="criteria__lead">
            신청할 수 있는지와 얼마나 잘 맞는지는 서로 다른 질문입니다. <strong>신청 자격 → 적합도 → 준비 부담</strong>
            순서로 봅니다. 목록은 신청 가능 → 확인 필요 → 신청 불가 순서이고, 같은 상태 안에서는 적합도 높은 순 → 마감
            빠른 순입니다. 선정 가능성이나 확률은 표시하지 않습니다.
          </p>
          <div class="split">
            <section class="split__col" aria-labelledby="criteria-eligibility">
              <p class="split__step">1. 먼저 확인</p>
              <h2 id="criteria-eligibility" class="split__title">
                <IconCircleCheck :size="20" stroke-width="1.9" aria-hidden="true" />
                신청 자격
              </h2>
              <p class="split__text">공고의 자격 조건을 원문 근거와 비교해 신청할 수 있는지를 판정합니다.</p>
              <ul class="split__legend" aria-label="신청 자격 상태 설명">
                <li><StatusBadge label="신청 가능" tone="success" :icon="IconCircleCheck" size="sm" /> 모든 조건 충족</li>
                <li>
                  <StatusBadge label="확인 필요" tone="warning" :icon="IconHelpCircle" size="sm" /> 원문을 보고 직접 확인할 조건 있음
                </li>
                <li><StatusBadge label="신청 불가" tone="danger" :icon="IconCircleX" size="sm" /> 충족하지 못한 조건 있음</li>
              </ul>
            </section>
            <section class="split__col" aria-labelledby="criteria-fit">
              <p class="split__step">2. 그다음 확인</p>
              <h2 id="criteria-fit" class="split__title">
                <IconTargetArrow :size="20" stroke-width="1.9" aria-hidden="true" />
                적합도
              </h2>
              <p class="split__text">
                신청 자격과는 별개로 관심분야 일치도, 단계 일치도(수출단계 × 지원 단계), 내용 유사도(시험용)를 가중
                평균하고, 공고가 인정한 가점·감점 중 프로필로 확인된 항목만 보정합니다(최대 ±{{ criteria.bonusCap }}점).
                신청 불가 공고는 계산하지 않고, 반영할 수 있는 항목이 2개 미만이면 점수를 만들지 않습니다. 재무 상태는
                쓰지 않습니다. 카드의 '계산 근거 보기'에서 항목별 근거를 확인할 수 있습니다.
              </p>
              <p class="split__slot">
                적합도 기준 <strong><DataValue :value="criteria.version" /></strong> (시험용 · 검증 전) · 가중치 {{ weightText }}
              </p>
              <p class="split__note">
                단계 매핑 {{ CATEGORY_PHASE_VERSION }}, {{ STAGE_PHASE_VERSION }} (가설). 시험용 기준으로 계산한 점수이며,
                사람 평가(Precision@5)로 검증한 뒤 확정합니다.
              </p>
            </section>
            <section class="split__col" aria-labelledby="criteria-cost">
              <p class="split__step">3. 준비 전 확인</p>
              <h2 id="criteria-cost" class="split__title">
                <IconScale :size="20" stroke-width="1.9" aria-hidden="true" />
                준비 부담·기회비용
              </h2>
              <p class="split__text">
                예상 준비 시간, 새로 준비할 서류, 자기부담금, 선정 후 의무는 공고 상세와 전체 공고 하단의 비교 영역에서
                확인할 수 있습니다.
              </p>
            </section>
          </div>
          <ul class="notes">
            <li>모든 판정에는 데이터 상태(검수 전 초안 등), 기준일, 판정 기준 버전을 함께 표시합니다.</li>
            <li>휴·폐업·체납·신용·제재·재무 상태는 위의 '공통 확인 사항'에서 직접 답할 수 있습니다.</li>
            <li>실제 신청 전에는 반드시 공고 원문으로 자격 조건을 다시 확인해 주세요.</li>
          </ul>
        </div>
      </details>
    </div>

    <CompareDock />
  </div>
</template>

<style scoped>
.criteria {
  padding: 0;
}

.criteria__summary {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 var(--card-padding);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
  cursor: pointer;
}

.criteria__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: 0 var(--card-padding) var(--card-padding);
}

.criteria__lead {
  font-size: var(--fs-sm);
}

.split {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.split__col {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
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
}

.split__legend li {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.split__slot {
  font-size: var(--fs-sm);
}

.split__note {
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
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

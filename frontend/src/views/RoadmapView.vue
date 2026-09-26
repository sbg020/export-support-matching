<script setup lang="ts">
import { computed } from 'vue'
import { IconArrowRight, IconFlag, IconMapPin, IconReportAnalytics, IconRoute, IconStack2 } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import StatTile from '@/components/common/StatTile.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import DataValue from '@/components/common/DataValue.vue'
import { ROADMAP_STAGES } from '@/constants/options'
import { diagnoseExportStage } from '@/lib/engine/diagnosis'
import { useProfileStore } from '@/stores/profileStore'

const store = useProfileStore()
/** 검증된 진단 기준이 없으면 null → 현재 위치를 표시하지 않는다. */
const diagnosis = computed(() => diagnoseExportStage(store.state.profile))
const currentIndex = computed(() =>
  diagnosis.value ? ROADMAP_STAGES.findIndex((s) => s.value === diagnosis.value?.stage) : -1,
)
const currentLabel = computed(() => (currentIndex.value >= 0 ? ROADMAP_STAGES[currentIndex.value]?.label ?? null : null))
const nextLabel = computed(() =>
  currentIndex.value >= 0 ? (ROADMAP_STAGES[currentIndex.value + 1]?.label ?? null) : null,
)
</script>

<template>
  <div class="page">
    <PageHeader
      title="나의 수출 로드맵"
      description="수출을 준비하는 기업이 일반적으로 거치는 단계를 보여 드리고, 단계별로 지원사업을 찾아볼 수 있게 합니다."
    >
      <template #actions>
        <RouterLink :to="{ name: 'diagnose-result' }" class="btn btn-secondary">
          <IconReportAnalytics :size="18" stroke-width="2" aria-hidden="true" />
          기업 진단 보기
        </RouterLink>
      </template>
    </PageHeader>

    <div class="stack">
      <NoticeBanner tone="neutral" title="기준 확정 전 안내">
        아래 로드맵은 일반적인 수출 탐색 단계를 보여 주는 틀이며, 귀사의 실제 진단 결과가 아닙니다. 검증된 수출단계
        진단 기준이 마련되면 현재 위치와 다음 단계 조건을 근거와 함께 표시합니다.
      </NoticeBanner>

      <div class="tile-grid">
        <StatTile label="현재 단계" :value="currentLabel" :icon="IconMapPin" hint="진단 기준 확정 전" />
        <StatTile label="다음 단계" :value="nextLabel" :icon="IconFlag" tone="secondary" hint="진단 기준 확정 전" />
        <StatTile label="현재 단계 추천 사업" :value="null" :icon="IconStack2" tone="accent" hint="공고 등록 전" />
        <StatTile label="진단 기준 버전" :value="diagnosis?.criteriaVersion ?? null" :icon="IconRoute" tone="neutral" />
      </div>

      <SectionCard title="수출 단계" heading-id="roadmap-stages-title" description="일반적인 탐색 단계 이름입니다.">
        <ol class="roadmap">
          <li
            v-for="(stage, index) in ROADMAP_STAGES"
            :key="stage.value"
            class="roadmap__stage"
            :class="{ 'is-current': index === currentIndex }"
            :aria-current="index === currentIndex ? 'step' : undefined"
          >
            <div class="roadmap__marker" aria-hidden="true">{{ index + 1 }}</div>
            <div class="roadmap__card">
              <p class="roadmap__num">{{ index + 1 }}단계</p>
              <h3 class="roadmap__name">{{ stage.label }}</h3>
              <dl class="roadmap__facts">
                <div>
                  <dt>현재 위치</dt>
                  <dd>
                    <span v-if="index === currentIndex" class="fw-semibold">현재 단계</span>
                    <DataValue v-else :value="null" missing-label="판정 전" />
                  </dd>
                </div>
                <div>
                  <dt>추천 사업</dt>
                  <dd><DataValue :value="null" missing-label="공고 등록 전" /></dd>
                </div>
              </dl>
              <RouterLink
                :to="{ name: 'programs', query: { stage: stage.value } }"
                class="roadmap__link"
              >
                {{ stage.label }} 공고 찾아보기
                <IconArrowRight :size="16" stroke-width="2" aria-hidden="true" />
              </RouterLink>
            </div>
            <span v-if="index < ROADMAP_STAGES.length - 1" class="roadmap__arrow" aria-hidden="true">
              <IconArrowRight :size="20" stroke-width="2" />
            </span>
          </li>
        </ol>
      </SectionCard>

      <div class="grid-12">
        <SectionCard
          class="col-span-12 lg-span-6"
          title="다음 단계로 가기 위한 조건"
          heading-id="next-conditions-title"
        >
          <p class="condition-value"><DataValue :value="diagnosis ? diagnosis.nextStageConditions.join(', ') : null" /></p>
          <p class="fs-sm text-muted-strong mb-0">
            진단 기준이 확정되면 다음 단계로 넘어가기 위해 필요한 조건과 근거를 보여 드립니다.
          </p>
        </SectionCard>
        <SectionCard class="col-span-12 lg-span-6" title="지금 할 수 있는 일" heading-id="roadmap-todo-title">
          <div class="action-row">
            <RouterLink :to="{ name: 'diagnose-input' }" class="btn btn-primary">기업정보 입력·수정</RouterLink>
            <RouterLink :to="{ name: 'programs' }" class="btn btn-secondary">전체 지원사업 보기</RouterLink>
          </div>
        </SectionCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.roadmap {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-6);
  margin: 0;
  padding: 0;
  list-style: none;
}

.roadmap__stage {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.roadmap__marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-surface-sunken);
  border: 2px solid var(--color-border);
  color: var(--color-text);
  font-weight: var(--fw-bold);
}

.is-current .roadmap__marker {
  background: var(--color-primary-strong);
  border-color: var(--color-primary-strong);
  color: #fff;
}

.roadmap__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.is-current .roadmap__card {
  border-color: var(--color-primary-strong);
  background: var(--color-primary-soft);
}

.roadmap__num {
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
  color: var(--color-primary-strong);
}

.roadmap__name {
  margin: 0;
  font-size: var(--fs-lg);
}

.roadmap__facts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  font-size: var(--fs-sm);
}

.roadmap__facts > div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
}

.roadmap__facts dt {
  font-weight: var(--fw-medium);
  color: var(--color-text);
}

.roadmap__facts dd {
  margin: 0;
}

.roadmap__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: auto;
  padding-top: var(--space-2);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}

.roadmap__arrow {
  position: absolute;
  top: 10px;
  right: calc(var(--space-6) * -1 + 2px);
  color: var(--color-muted);
}

.condition-value {
  margin-bottom: var(--space-2);
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
}

@media (max-width: 991.98px) {
  .roadmap {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-3);
  }
  .roadmap__stage {
    flex-direction: row;
    align-items: stretch;
  }
  .roadmap__marker {
    flex-shrink: 0;
  }
  .roadmap__arrow {
    display: none;
  }
  .roadmap__stage:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 44px;
    bottom: calc(var(--space-3) * -1);
    left: 19px;
    width: 2px;
    background: var(--color-border);
  }
}
</style>

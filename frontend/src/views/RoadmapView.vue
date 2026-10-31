<script setup lang="ts">
import { computed } from 'vue'
import { IconArrowRight, IconFlag, IconMapPin, IconReportAnalytics, IconRoute, IconStack2 } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import StatTile from '@/components/common/StatTile.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import DataValue from '@/components/common/DataValue.vue'
import DataSourceNotice from '@/components/common/DataSourceNotice.vue'
import ExportStageCriteriaNote from '@/components/diagnose/ExportStageCriteriaNote.vue'
import { ROADMAP_STAGES } from '@/constants/options'
import { STAGE_PHASE_VERSION } from '@/constants/categories'
import { countByPhase } from '@/lib/engine/evaluateAll'
import { exportStageText, phaseListText } from '@/lib/programDisplay'
import { useProgramEvaluations } from '@/composables/useProgramEvaluations'
import { isSourceConnected, programRepository } from '@/repositories'
import type { SupportStage } from '@/types/program'

const evaluation = useProgramEvaluations()
const sourceConnected = isSourceConnected(programRepository.source)
/** 수출액이 입력되지 않았으면 null → 권장 단계를 표시하지 않는다 */
const diagnosis = computed(() => evaluation.diagnosis.value)

/** 권장 지원 단계: ◎ 우선, ○ 함께 보기 (stage-phase-v0) */
function recommendation(stage: SupportStage): 'primary' | 'secondary' | null {
  if (!diagnosis.value) return null
  if (diagnosis.value.primaryPhases.includes(stage)) return 'primary'
  if (diagnosis.value.secondaryPhases.includes(stage)) return 'secondary'
  return null
}

/** 단계별 공고 수 (신청 불가 제외, 테스트 데이터 기준). 공고 데이터가 없으면 null */
const phaseCounts = computed(() =>
  sourceConnected && evaluation.ready.value
    ? countByPhase(evaluation.programs.value, evaluation.evaluations.value)
    : null,
)
const primaryCount = computed(() => {
  if (!diagnosis.value || !phaseCounts.value) return null
  const primary = new Set(diagnosis.value.primaryPhases)
  return evaluation.programs.value.filter(
    (p) =>
      evaluation.get(p.id)?.eligibility?.status !== 'ineligible' &&
      (p.supportPhases ?? []).some((phase) => primary.has(phase)),
  ).length
})
const countFormat = (n: number) => `${n}건`
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
      <DataSourceNotice />

      <NoticeBanner tone="neutral" title="로드맵을 볼 때">
        아래 네 단계는 일반적인 수출 탐색 단계 이름입니다. 우선·함께 보기 표시는 수출단계 진단 결과와 단계 가중치({{
          STAGE_PHASE_VERSION
        }}, 검증 전 가설)로 정한 참고 정보이며, 신청 자격 판정이 아닙니다.
      </NoticeBanner>

      <div class="tile-grid">
        <StatTile
          label="현재 수출단계"
          :value="exportStageText(diagnosis?.stage)"
          :icon="IconMapPin"
          :hint="diagnosis ? diagnosis.criteriaVersion : '수출액 미입력'"
        />
        <StatTile
          label="우선 지원 단계"
          :value="diagnosis ? phaseListText(diagnosis.primaryPhases) : null"
          :icon="IconFlag"
          tone="secondary"
          hint="◎ 표시 단계"
        />
        <StatTile
          label="우선 단계 공고"
          :value="primaryCount !== null ? countFormat(primaryCount) : null"
          :icon="IconStack2"
          tone="accent"
          :hint="sourceConnected ? '신청 불가 제외 · 테스트 데이터 기준' : '공고 등록 전'"
        />
        <StatTile label="단계 가중치 버전" :value="STAGE_PHASE_VERSION" :icon="IconRoute" tone="neutral" hint="검증 전" />
      </div>

      <SectionCard
        title="수출 단계"
        heading-id="roadmap-stages-title"
        description="일반적인 탐색 단계 이름입니다. 공고 수는 그 단계에 걸치는 공고(신청 불가 제외)를 셉니다."
      >
        <ol class="roadmap">
          <li
            v-for="(stage, index) in ROADMAP_STAGES"
            :key="stage.value"
            class="roadmap__stage"
            :class="{
              'is-current': recommendation(stage.value) === 'primary',
              'is-secondary': recommendation(stage.value) === 'secondary',
            }"
          >
            <div class="roadmap__marker" aria-hidden="true">{{ index + 1 }}</div>
            <div class="roadmap__card">
              <p class="roadmap__num">{{ index + 1 }}단계</p>
              <h3 class="roadmap__name">{{ stage.label }}</h3>
              <dl class="roadmap__facts">
                <div>
                  <dt>권장</dt>
                  <dd>
                    <span v-if="recommendation(stage.value) === 'primary'" class="fw-semibold">◎ 우선</span>
                    <span v-else-if="recommendation(stage.value) === 'secondary'" class="fw-semibold">○ 함께 보기</span>
                    <DataValue v-else :value="null" :missing-label="diagnosis ? '권장 단계 아님' : '진단 전'" />
                  </dd>
                </div>
                <div>
                  <dt>공고 수</dt>
                  <dd>
                    <DataValue
                      :value="phaseCounts ? phaseCounts[stage.value] : null"
                      :format="countFormat"
                      missing-label="공고 등록 전"
                    />
                  </dd>
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
          <p class="condition-value"><DataValue :value="diagnosis ? diagnosis.nextStageConditions.join(' ') : null" /></p>
          <p v-if="diagnosis?.periodNote" class="fs-sm mb-2">{{ diagnosis.periodNote }}</p>
          <p v-if="!diagnosis" class="fs-sm text-muted-strong mb-3">
            기업정보에 최근 1년 수출액을 입력하면 수출단계와 다음 단계 조건을 보여 드립니다.
          </p>
          <ExportStageCriteriaNote />
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

.is-secondary .roadmap__marker {
  border-color: var(--color-primary-strong);
  color: var(--color-primary-strong);
}

.is-secondary .roadmap__card {
  border-style: dashed;
  border-color: var(--color-primary-strong);
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

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  IconArrowRight,
  IconForms,
  IconPencil,
  IconReportAnalytics,
  IconRoute,
  IconStack2,
  IconTargetArrow,
  IconUserCircle,
} from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatTile from '@/components/common/StatTile.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import ProfileSummary from '@/components/diagnose/ProfileSummary.vue'
import ProfileStatusBadge from '@/components/diagnose/ProfileStatusBadge.vue'
import ExportStageCriteriaNote from '@/components/diagnose/ExportStageCriteriaNote.vue'
import { useProfileStore } from '@/stores/profileStore'
import { useProgramEvaluations } from '@/composables/useProgramEvaluations'
import { ACTIVE_EXPORT_STAGE_CRITERIA } from '@/lib/engine/diagnosis'
import { exportStageText, phaseListText } from '@/lib/programDisplay'
import { isSourceConnected, programRepository } from '@/repositories'
import { PROFILE_STEPS } from '@/constants/options'
import { PROFILE_STATUS_LABEL } from '@/lib/profile'
import type { ProfileStepId } from '@/types/profile'

const router = useRouter()
const store = useProfileStore()

/** 입력 요약의 단계별 '수정': 기업 프로필의 그 단계(?step=n)를 연다 */
function openEdit(step: ProfileStepId) {
  void router.push({ name: 'company-profile', query: { step: String(step) } })
}
const assessment = computed(() => store.assessment.value)
const profile = computed(() => store.state.profile)
const evaluation = useProgramEvaluations()
const sourceConnected = isSourceConnected(programRepository.source)

/** 수출액이 입력되지 않았으면 null → 화면 표시 '-' */
const diagnosis = computed(() => evaluation.diagnosis.value)
const stageLabel = computed(() => exportStageText(diagnosis.value?.stage))
const primaryText = computed(() => (diagnosis.value ? phaseListText(diagnosis.value.primaryPhases) : null))
const secondaryText = computed(() => (diagnosis.value ? phaseListText(diagnosis.value.secondaryPhases) : null))
const phaseSummary = computed(() => {
  if (!diagnosis.value) return null
  return [primaryText.value ? `◎ 우선: ${primaryText.value}` : null, secondaryText.value ? `○ 함께 보기: ${secondaryText.value}` : null]
    .filter(Boolean)
    .join(' · ')
})

/** 판정 대상 공고 수 (신청 불가 제외). 공고 데이터가 없으면 null */
const recommendableCount = computed(() => {
  if (!sourceConnected || !evaluation.ready.value) return null
  return evaluation.programs.value.filter((p) => evaluation.get(p.id)?.eligibility?.status !== 'ineligible').length
})
const countFormat = (n: number) => `${n}건`

const stepTitle = (step: number) => PROFILE_STEPS.find((s) => s.id === step)?.title ?? `${step}단계`
</script>

<template>
  <div class="page">
    <PageHeader
      title="기업 진단"
      description="입력한 기업정보를 요약하고, 직전 연도 수출액으로 수출단계를 진단합니다."
    >
      <template #meta>
        <span class="fs-sm text-muted-strong">프로필 상태</span>
        <ProfileStatusBadge :status="assessment.status" />
      </template>
      <template #actions>
        <RouterLink :to="{ name: 'company-profile' }" class="btn btn-secondary">
          <IconPencil :size="18" stroke-width="2" aria-hidden="true" />
          기업정보 수정하기
        </RouterLink>
        <RouterLink :to="{ name: 'programs-recommended' }" class="btn btn-primary">
          맞춤 추천 보기
          <IconArrowRight :size="18" stroke-width="2" aria-hidden="true" />
        </RouterLink>
      </template>
    </PageHeader>

    <div class="stack">
      <div class="tile-grid">
        <StatTile label="프로필 상태" :value="PROFILE_STATUS_LABEL[assessment.status]" :icon="IconUserCircle" />
        <StatTile
          label="수출단계"
          :value="stageLabel"
          :icon="IconStack2"
          tone="accent"
          :hint="diagnosis ? ACTIVE_EXPORT_STAGE_CRITERIA.version : '수출액 미입력'"
        />
        <StatTile
          label="우선 지원 단계"
          :value="primaryText"
          :icon="IconTargetArrow"
          tone="secondary"
          :hint="diagnosis ? '단계 가중치 stage-phase-v0 · 검증 전' : '수출단계 진단 후 표시'"
        />
        <StatTile
          label="판정 대상 공고"
          :value="recommendableCount !== null ? countFormat(recommendableCount) : null"
          :icon="IconReportAnalytics"
          tone="neutral"
          :hint="sourceConnected ? '신청 불가 제외 · 테스트 데이터 기준' : '공고 등록 전'"
          :to="sourceConnected ? { name: 'programs-recommended' } : undefined"
        />
      </div>

      <div class="grid-12">
        <div class="col-span-12 lg-span-7 stack">
          <SectionCard
            title="수출단계 진단"
            heading-id="diagnosis-title"
            description="직전 연도 수출액을 기준 구간과 비교합니다. 진단 결과는 지원사업 신청 자격 판정이 아닙니다."
            :icon="IconStack2"
          >
            <InfoList>
              <InfoRow label="현재 수출단계" :value="stageLabel" />
              <InfoRow
                label="판단 근거"
                :value="diagnosis ? diagnosis.reasons.join(' ') : null"
                :hint="diagnosis?.periodNote ?? undefined"
              />
              <InfoRow label="권장 지원 단계" :value="phaseSummary" />
              <InfoRow label="다음 단계 조건" :value="diagnosis ? diagnosis.nextStageConditions.join(' ') : null" />
              <InfoRow
                label="진단 기준일·버전"
                :value="diagnosis ? `${diagnosis.basisDate} · ${diagnosis.criteriaVersion}` : null"
              />
            </InfoList>
            <NoticeBanner v-if="!diagnosis" class="mt-4" tone="neutral" title="수출단계를 진단하지 않았습니다">
              기업정보 3단계의 최근 1년 수출액을 입력하면 진단합니다. 수출 실적이 없으면 0을 입력해 주세요.
              <template #actions>
                <RouterLink :to="{ name: 'company-profile', query: { step: 3 } }" class="btn btn-secondary btn-sm">
                  수출액 입력하기
                </RouterLink>
              </template>
            </NoticeBanner>
            <NoticeBanner v-else-if="diagnosis.periodNote" class="mt-4" tone="warning" title="참고용 진단입니다">
              {{ diagnosis.periodNote }} 직전 연도({{ diagnosis.referenceYear }}년) 1월~12월 수출액으로 입력하면 공고
              기준과 같은 기간으로 진단합니다.
            </NoticeBanner>
            <ExportStageCriteriaNote class="mt-4" />
          </SectionCard>

          <SectionCard title="입력한 기업정보" heading-id="summary-title" :icon="IconForms">
            <template #actions>
              <RouterLink :to="{ name: 'company-profile' }" class="btn btn-ghost btn-sm">
                기업 프로필에서 수정
              </RouterLink>
            </template>
            <EmptyState
              v-if="assessment.status === 'empty'"
              :icon="IconForms"
              title="아직 입력한 기업정보가 없습니다"
              description="기업정보를 입력하면 이곳에 입력한 내용만 요약해 보여 드립니다."
              compact
            >
              <template #actions>
                <RouterLink :to="{ name: 'company-profile' }" class="btn btn-primary">기업정보 입력하기</RouterLink>
              </template>
            </EmptyState>
            <ProfileSummary v-else :profile="profile" editable @edit="openEdit" />
          </SectionCard>
        </div>

        <div class="col-span-12 lg-span-5 stack">
          <SectionCard title="확인이 필요한 항목" heading-id="issues-title">
            <p v-if="assessment.status === 'complete'" class="fs-sm">
              필수 항목을 모두 입력했고 미확정 코드가 없습니다. 이 상태는 입력 진행 상태이며 신청 자격 판정이
              아닙니다.
            </p>
            <template v-else-if="assessment.status === 'empty'">
              <p class="fs-sm text-muted-strong">기업정보를 입력하면 빠진 항목을 알려 드립니다.</p>
            </template>
            <template v-else>
              <p class="fs-sm mb-3">
                아래 항목이 채워지기 전까지 프로필은 '입력 중'이며, 완료된 자격 판정에 사용하지 않습니다.
              </p>
              <ul class="issue-list">
                <li v-for="issue in assessment.needsVerification" :key="`v-${issue.field}`" class="issue issue--verify">
                  <span class="issue__tag">확인 필요</span>
                  <span>{{ issue.message }}</span>
                </li>
                <li v-for="issue in assessment.missing" :key="`m-${issue.field}`" class="issue">
                  <span class="issue__tag issue__tag--missing">{{ issue.step }}단계 {{ stepTitle(issue.step) }}</span>
                  <span>{{ issue.message }}</span>
                </li>
              </ul>
              <RouterLink :to="{ name: 'company-profile' }" class="btn btn-secondary btn-sm mt-3">
                빠진 항목 입력하기
              </RouterLink>
            </template>
          </SectionCard>

          <SectionCard title="다음으로 할 일" heading-id="next-title">
            <ul class="next-list">
              <li>
                <RouterLink :to="{ name: 'programs-recommended' }" class="next-link">
                  <IconTargetArrow :size="20" stroke-width="1.8" aria-hidden="true" />
                  <span>
                    <strong>맞춤 추천 보기</strong>
                    <span>신청 자격과 적합도를 나누어 보여 드립니다.</span>
                  </span>
                </RouterLink>
              </li>
              <li>
                <RouterLink :to="{ name: 'roadmap' }" class="next-link">
                  <IconRoute :size="20" stroke-width="1.8" aria-hidden="true" />
                  <span>
                    <strong>수출 로드맵 보기</strong>
                    <span>수출 단계별로 어떤 지원을 찾아볼 수 있는지 살펴봅니다.</span>
                  </span>
                </RouterLink>
              </li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.issue-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.issue {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  font-size: var(--fs-sm);
}

.issue__tag {
  align-self: flex-start;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  background: var(--color-warning-soft);
  color: var(--color-warning-strong);
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
}

.issue__tag--missing {
  background: var(--color-surface-sunken);
  color: var(--color-text);
}

.next-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.next-link {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-primary-strong);
  text-decoration: none;
}

.next-link:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.next-link > span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.next-link strong {
  font-size: var(--fs-base);
  color: var(--color-heading);
}
</style>

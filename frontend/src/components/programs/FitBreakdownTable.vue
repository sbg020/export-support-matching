<script setup lang="ts">
/**
 * 적합도 계산 근거 표 (맞춤 추천 카드 '계산 근거 보기', 공고 상세 '얼마나 잘 맞나요?').
 * 열: 항목 · 반영값 · 가중치 · 기여 점수 · 근거. 제외된 항목은 '-'와 제외 이유를 보여 준다.
 * 시험용 기준(검증 전)임을 항상 함께 표시한다 (REVISION_02 §7.6).
 */
import { computed } from 'vue'
import type { EligibilityStatus, FitFactorResult, FitScoreResult } from '@/types/results'
import { ACTIVE_FIT_CRITERIA, FIT_UNAVAILABLE_REASON } from '@/lib/engine/fit'
import { CATEGORY_PHASE_VERSION, STAGE_PHASE_VERSION } from '@/constants/categories'
import { FINANCE_ASSUMPTION_NOTE, FIT_V1_STATUS_LABEL, FIT_V1_VERSION } from '@/constants/fitV1'
import DataValue from '@/components/common/DataValue.vue'

const props = defineProps<{
  fit: FitScoreResult | null
  factors: FitFactorResult[]
  eligibilityStatus: EligibilityStatus | null
  /** 계산 기준일 */
  basisDate: string | null
  /** 표 캡션·제목 구분용 */
  idPrefix: string
}>()

/** 적합도 v1(5요소, REVISION_05) 결과인지 */
const isV1 = computed(() => props.factors.some((f) => f.key === 'finance' || f.key === 'industry'))

const usableWeight = computed(() =>
  props.factors.filter((f) => f.value !== null).reduce((sum, f) => sum + f.weight, 0),
)

function contributionPoints(factor: FitFactorResult): number | null {
  if (factor.contribution === null || usableWeight.value <= 0) return null
  return Math.round(((100 * factor.contribution) / usableWeight.value) * 10) / 10
}

const formatPercent = (value: number) => `${Math.round(value * 100)}%`
const formatPoints = (value: number) => `${value}점`
const formatSigned = (value: number) => (value > 0 ? `+${value}` : `${value}`)
</script>

<template>
  <div class="fit-breakdown">
    <p v-if="eligibilityStatus === 'ineligible' || eligibilityStatus === 'needs-check'" class="fit-breakdown__empty">
      적합도는 신청 가능 공고에만 보여 드립니다. {{ eligibilityStatus === 'ineligible' ? '신청 불가' : '확인 필요' }} 공고는 계산하지 않습니다.
    </p>
    <p v-else-if="factors.length === 0" class="fit-breakdown__empty">
      아직 계산 근거가 없습니다. 공고 규칙과 적합도 기준이 연결되면 항목별 근거가 표시됩니다.
    </p>
    <template v-else>
      <p class="fit-breakdown__score">
        적합도
        <strong><DataValue :value="fit?.score ?? null" :format="(n: number) => `${n}점 / 100점`" /></strong>
        <span v-if="!fit" class="fit-breakdown__reason">{{ FIT_UNAVAILABLE_REASON }}</span>
        <span class="fit-breakdown__tag">{{ isV1 ? `${FIT_V1_VERSION} · ${FIT_V1_STATUS_LABEL}` : '시험용 기준 v0 · 검증 전' }}</span>
      </p>
      <div class="scroll-x">
        <table class="data-table fit-breakdown__table">
          <caption class="visually-hidden">적합도 계산 근거</caption>
          <thead>
            <tr>
              <th scope="col">항목</th>
              <th scope="col">반영값</th>
              <th scope="col">가중치</th>
              <th scope="col">기여 점수</th>
              <th scope="col">근거</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="factor in factors" :key="factor.key" :class="{ 'is-excluded': factor.value === null }">
              <th scope="row">{{ factor.label }}</th>
              <td><DataValue :value="factor.value" :format="formatPercent" missing-label="제외" /></td>
              <td>{{ factor.weight.toFixed(2) }}</td>
              <td><DataValue :value="contributionPoints(factor)" :format="formatPoints" missing-label="제외" /></td>
              <td>{{ factor.reason }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <template v-if="isV1">
        <p class="fit-breakdown__meta">
          최종 점수 = Σ(비중 × 요소값) ÷ (계산된 요소의 비중 합) × 100, 반올림. 계산된 요소가 2개 미만이면 점수를 내지 않습니다.
          빠진 요소는 표에 '제외'와 사유를 적었습니다.
        </p>
        <p class="fit-breakdown__meta">{{ FINANCE_ASSUMPTION_NOTE }}</p>
        <p class="fit-breakdown__meta">
          가중치 버전 {{ fit?.criteriaVersion ?? FIT_V1_VERSION }} ({{ FIT_V1_STATUS_LABEL }}) · 매칭표
          {{ fit?.mappingVersions.join(', ') ?? 'stage-category-v1, archetype-category-v1' }} · 계산 기준일 <DataValue :value="basisDate" />
        </p>
      </template>

      <div v-if="fit && !isV1" class="fit-breakdown__bonus">
        <p class="mb-1">
          가점·감점 보정: <strong>{{ formatSigned(fit.bonusAdjustment) }}점</strong>
          <span class="fit-breakdown__muted">(보정 전 {{ fit.baseScore }}점, 최대 ±{{ ACTIVE_FIT_CRITERIA.bonusCap }}점)</span>
        </p>
        <ul v-if="fit.bonusApplied.length > 0" class="fit-breakdown__list">
          <li v-for="line in fit.bonusApplied" :key="line.id">
            해당: {{ line.item }} ({{ line.effectText }})<span v-if="line.source?.locator"> · {{ line.source.locator }}</span>
          </li>
        </ul>
        <details v-if="fit.bonusToCheck.length > 0" class="fit-breakdown__check">
          <summary>확인 필요 가점 {{ fit.bonusToCheck.length }}개 (점수에 넣지 않음)</summary>
          <ul class="fit-breakdown__list">
            <li v-for="line in fit.bonusToCheck" :key="line.id">
              {{ line.item }} — {{ line.effectText }}<span v-if="line.source?.locator"> · {{ line.source.locator }}</span>
            </li>
          </ul>
        </details>
      </div>

      <p v-if="!isV1" class="fit-breakdown__meta">
        기준 {{ fit?.criteriaVersion ?? ACTIVE_FIT_CRITERIA.version }} (검증 전) · 단계 매핑 {{ CATEGORY_PHASE_VERSION }},
        {{ STAGE_PHASE_VERSION }} · 계산 기준일 <DataValue :value="basisDate" />
      </p>
    </template>
  </div>
</template>

<style scoped>
.fit-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--fs-sm);
}

.fit-breakdown__empty {
  margin: 0;
  color: var(--color-text-muted);
}

.fit-breakdown__score {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  color: var(--color-heading);
}

.fit-breakdown__reason {
  color: var(--color-text);
}

.fit-breakdown__tag {
  padding: 0 6px;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.fit-breakdown__table td,
.fit-breakdown__table th {
  vertical-align: top;
}

.fit-breakdown__table .is-excluded {
  color: var(--color-text-muted);
}

.fit-breakdown__list {
  margin: 0;
  padding-left: var(--space-5);
}

.fit-breakdown__check summary {
  cursor: pointer;
  font-weight: var(--fw-semibold);
}

.fit-breakdown__muted,
.fit-breakdown__meta {
  color: var(--color-text-muted);
}

.fit-breakdown__meta {
  margin: 0;
  font-size: var(--fs-xs);
}
</style>

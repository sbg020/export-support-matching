<script setup lang="ts">
/**
 * 공고 카드. 실제 공고(Program)가 있을 때만 렌더링한다.
 * 순서: 신청 자격 → 적합도 → 추천 이유. 신청 불가인 공고는 적합도보다 자격 상태를 먼저 보여 준다.
 */
import { computed } from 'vue'
import { IconBookmark } from '@tabler/icons-vue'
import type { IsoDate } from '@/types/common'
import type { Program } from '@/types/program'
import type { ProgramEvaluation } from '@/lib/engine/evaluateAll'
import {
  agencyText,
  applyPeriodText,
  deadlineText,
  maxAmountText,
  programTitleText,
  receptionStatusWithBasisText,
  regionsText,
  supportPhasesText,
  supportTypesText,
} from '@/lib/programDisplay'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import DataValue from '@/components/common/DataValue.vue'
import DraftTag from '@/components/common/DraftTag.vue'
import EligibilityBadge from './EligibilityBadge.vue'
import CategoryChips from './CategoryChips.vue'

const props = defineProps<{
  program: Program
  evaluation: ProgramEvaluation | undefined
  /** 데이터 기준일 (마감까지 계산) */
  asOf: IsoDate | null
  /** 공통 비교 선택에 들어 있는지 */
  selected: boolean
  /** 비교 선택을 바꾼다. 최대 개수 초과 등으로 거절되면 false */
  toggleCompare: (id: string, checked: boolean) => boolean
}>()

function onCompareChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (!props.toggleCompare(props.program.id, input.checked)) input.checked = props.selected
}

const eligibility = computed(() => props.evaluation?.eligibility ?? null)
const fit = computed(() => props.evaluation?.fit ?? null)
const titleId = computed(() => `program-card-${props.program.id}`)
const periodText = computed(() => applyPeriodText(props.program) ?? props.program.applyPeriodNote)
</script>

<template>
  <article class="program-card surface-card" :aria-labelledby="titleId">
    <header class="program-card__header">
      <div>
        <p class="program-card__agency"><DataValue :value="agencyText(program)" /></p>
        <h3 :id="titleId" class="program-card__title">
          <RouterLink :to="{ name: 'program-detail', params: { id: program.id } }">
            <DataValue :value="programTitleText(program)" missing-label="공고명 없음" />
          </RouterLink>
        </h3>
      </div>
      <span class="program-card__reception"><DataValue :value="receptionStatusWithBasisText(program)" /></span>
    </header>

    <CategoryChips :program="program" />

    <div class="program-card__judgement">
      <div>
        <p class="program-card__label">신청 자격</p>
        <EligibilityBadge
          :status="eligibility?.status ?? null"
          :self-checked-count="eligibility?.selfCheckedCount ?? 0"
          :data-state="eligibility?.dataState ?? null"
        />
      </div>
      <div :class="{ 'is-muted': eligibility?.status === 'ineligible' }">
        <p class="program-card__label">적합도 <span class="program-card__hint">시험용 v0</span></p>
        <span class="program-card__fit">
          <DataValue :value="fit?.score ?? null" :format="(score: number) => `${score}점`" />
          <DraftTag v-if="fit" :state="eligibility?.dataState ?? program.dataState" />
        </span>
      </div>
    </div>

    <InfoList :columns="2" compact>
      <InfoRow label="접수기간" :value="periodText" />
      <InfoRow label="마감까지" :value="deadlineText(program, asOf)" />
      <InfoRow label="지원 단계" :value="supportPhasesText(program)" />
      <InfoRow label="대상 지역" :value="regionsText(program)" />
      <InfoRow label="지원방식" :value="supportTypesText(program)" />
      <InfoRow label="지원금 한도" :value="maxAmountText(program)" />
      <InfoRow label="추천 이유" :value="fit?.reasons[0] ?? null" />
    </InfoList>

    <footer class="program-card__actions">
      <RouterLink :to="{ name: 'program-detail', params: { id: program.id } }" class="btn btn-primary btn-sm">
        상세보기
      </RouterLink>
      <label class="compare-check">
        <input
          type="checkbox"
          class="form-check-input"
          :checked="selected"
          @change="onCompareChange"
        />
        비교에 추가
      </label>
      <button type="button" class="btn btn-ghost btn-sm" aria-disabled="true" :aria-describedby="`${titleId}-save`">
        <IconBookmark :size="16" stroke-width="2" aria-hidden="true" />
        관심사업 저장
      </button>
      <span :id="`${titleId}-save`" class="visually-hidden">관심사업 저장은 공고 상세 화면에서 할 수 있습니다.</span>
    </footer>
  </article>
</template>

<style scoped>
.program-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--card-padding);
}

.program-card__header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.program-card__agency {
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.program-card__title {
  margin: 4px 0 0;
  font-size: var(--fs-lg);
}

.program-card__title a {
  color: var(--color-heading);
  text-decoration: none;
}

.program-card__title a:hover {
  color: var(--color-primary-strong);
  text-decoration: underline;
}

.program-card__reception {
  flex-shrink: 0;
  max-width: 45%;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  text-align: right;
}

.program-card__judgement {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.program-card__label {
  margin-bottom: 4px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.program-card__hint {
  font-weight: var(--fw-regular, 400);
}

.program-card__fit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.is-muted {
  opacity: 0.6;
}

.program-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.compare-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
  cursor: pointer;
}

.compare-check .form-check-input {
  margin: 0;
}

@media (max-width: 575.98px) {
  .program-card__header {
    flex-direction: column;
  }
  .program-card__reception {
    max-width: none;
    text-align: left;
  }
}
</style>

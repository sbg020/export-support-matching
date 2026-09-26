<script setup lang="ts">
/**
 * 공고 카드. 실제 공고(Program)가 있을 때만 렌더링한다.
 * 순서: 신청 자격 → 적합도 → 추천 이유. 신청 불가인 공고는 적합도보다 자격 상태를 먼저 보여 준다.
 */
import { computed } from 'vue'
import { IconBookmark, IconLayoutColumns } from '@tabler/icons-vue'
import type { Program } from '@/types/program'
import { evaluateEligibility } from '@/lib/engine/eligibility'
import { evaluateFit } from '@/lib/engine/fit'
import { useProfileStore } from '@/stores/profileStore'
import {
  agencyText,
  applyPeriodText,
  maxAmountText,
  receptionStatusText,
  supportTypesText,
} from '@/lib/programDisplay'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import DataValue from '@/components/common/DataValue.vue'
import EligibilityBadge from './EligibilityBadge.vue'

const props = defineProps<{
  program: Program
  selected: boolean
  selectionDisabled: boolean
}>()

const emit = defineEmits<{ toggleCompare: [id: string] }>()

const store = useProfileStore()
const eligibility = computed(() => evaluateEligibility(store.state.profile, props.program))
const fit = computed(() => evaluateFit(store.state.profile, props.program))
const titleId = computed(() => `program-card-${props.program.id}`)
</script>

<template>
  <article class="program-card surface-card" :aria-labelledby="titleId">
    <header class="program-card__header">
      <div>
        <p class="program-card__agency"><DataValue :value="agencyText(program)" /></p>
        <h3 :id="titleId" class="program-card__title">
          <RouterLink :to="{ name: 'program-detail', params: { id: program.id } }">
            <DataValue :value="program.title" missing-label="공고명 없음" />
          </RouterLink>
        </h3>
      </div>
      <span class="program-card__reception"><DataValue :value="receptionStatusText(program)" /></span>
    </header>

    <div class="program-card__judgement">
      <div>
        <p class="program-card__label">신청 자격</p>
        <EligibilityBadge :status="eligibility?.status ?? null" />
      </div>
      <div :class="{ 'is-muted': eligibility?.status === 'ineligible' }">
        <p class="program-card__label">적합도</p>
        <DataValue :value="fit?.score ?? null" :format="(score: number) => `${score}점`" />
      </div>
    </div>

    <InfoList :columns="2" compact>
      <InfoRow label="접수기간" :value="applyPeriodText(program)" />
      <InfoRow label="지원방식" :value="supportTypesText(program)" />
      <InfoRow label="지원규모" :value="maxAmountText(program)" />
      <InfoRow label="추천 이유" :value="fit ? fit.reasons.join(' / ') : null" />
    </InfoList>

    <footer class="program-card__actions">
      <RouterLink :to="{ name: 'program-detail', params: { id: program.id } }" class="btn btn-primary btn-sm">
        상세보기
      </RouterLink>
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        :aria-pressed="selected"
        :aria-disabled="selectionDisabled && !selected ? 'true' : undefined"
        @click="(!selectionDisabled || selected) && emit('toggleCompare', program.id)"
      >
        <IconLayoutColumns :size="16" stroke-width="2" aria-hidden="true" />
        {{ selected ? '비교에서 빼기' : '비교하기' }}
      </button>
      <button type="button" class="btn btn-ghost btn-sm" aria-disabled="true" :aria-describedby="`${titleId}-save`">
        <IconBookmark :size="16" stroke-width="2" aria-hidden="true" />
        관심사업 저장
      </button>
      <span :id="`${titleId}-save`" class="visually-hidden">관심사업 저장 기능은 아직 연결되지 않았습니다.</span>
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
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
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

.is-muted {
  opacity: 0.6;
}

.program-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>

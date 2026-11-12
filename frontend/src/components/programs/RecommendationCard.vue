<script setup lang="ts">
/**
 * 맞춤 추천 카드 (REVISION_04 §4.4.3). 실제 공고(Program)가 있을 때만 렌더링한다.
 * 왼쪽 위: 신청자격·공고명·기관, 오른쪽 위: 적합도 점수(시험용 기준).
 * 정보 4칸: 신청 마감 · 지원 내용 · 지원금 · 자부담. 근거가 없으면 숫자를 만들지 않고 '-'를 보여 준다.
 * '비교에 추가'는 화면을 이동하지 않고 선택만 바꾼다 (하단 비교 바에서 비교 영역으로 간다).
 */
import { computed, ref, useId } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconBookmark, IconChevronDown, IconLayoutColumns } from '@tabler/icons-vue'
import type { IsoDate } from '@/types/common'
import type { Program } from '@/types/program'
import type { ProgramEvaluation } from '@/lib/engine/evaluateAll'
import { FIT_UNAVAILABLE_REASON } from '@/lib/engine/fit'
import {
  INELIGIBLE_FIT_REASON,
  agencyText,
  maxAmountText,
  programTitleText,
  recommendationDeadlineText,
  selfPaymentText,
  supportContentLine,
} from '@/lib/programDisplay'
import { useApplicationStore } from '@/stores/applicationStore'
import { useAuth } from '@/stores/authStore'
import { useToast } from '@/stores/toastStore'
import { statusLabel } from '@/constants/applicationStatus'
import DataValue from '@/components/common/DataValue.vue'
import EligibilityBadge from './EligibilityBadge.vue'
import FitBreakdownTable from './FitBreakdownTable.vue'

const props = defineProps<{
  program: Program
  evaluation: ProgramEvaluation | undefined
  /** 데이터 기준일 (남은 일수 계산). 없으면 남은 일수를 붙이지 않는다 */
  asOf: IsoDate | null
  /** 이미 비교 선택에 들어 있는지 */
  inCompare: boolean
}>()

const emit = defineEmits<{ compare: [id: string] }>()

const route = useRoute()
const router = useRouter()
const applications = useApplicationStore()
const auth = useAuth()
const toast = useToast()

const eligibility = computed(() => props.evaluation?.eligibility ?? null)
const fit = computed(() => props.evaluation?.fit ?? null)
const score = computed(() => (fit.value ? Math.round(fit.value.score) : null))
const fitMissingReason = computed(() =>
  eligibility.value?.status === 'ineligible' ? INELIGIBLE_FIT_REASON : FIT_UNAVAILABLE_REASON,
)
const fitSpoken = computed(() =>
  score.value !== null ? `적합도 ${score.value}점, 100점 만점, 시험용 기준` : `적합도 없음, ${fitMissingReason.value}`,
)

const deadline = computed(() => recommendationDeadlineText(props.program, props.asOf))
const content = computed(() => supportContentLine(props.program))
const amount = computed(() => maxAmountText(props.program) ?? props.program.amountNote)
const selfPayment = computed(() => selfPaymentText(props.program))
const record = computed(() => applications.records.value.find((r) => r.programId === props.program.id))
const detailTo = computed(() => ({
  name: 'program-detail',
  params: { id: props.program.id },
  query: { from: 'recommended' },
}))

const basisOpen = ref(false)
const uid = useId()
const titleId = `${uid}-title`
const basisId = `${uid}-basis`

async function saveInterested() {
  if (auth.state.status !== 'authenticated') {
    await router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  const result = applications.saveInterested(props.program.id)
  toast.show(
    result === 'added' ? '관심 사업으로 저장했습니다. 지원사업 관리에서 관리할 수 있습니다.' : '이미 관리 기록에 있는 사업입니다.',
    result === 'added' ? 'success' : 'info',
  )
}
</script>

<template>
  <article class="rec-card surface-card" :aria-labelledby="titleId">
    <div class="rec-card__head">
      <div class="rec-card__main">
        <EligibilityBadge
          :status="eligibility?.status ?? null"
          size="sm"
          :self-checked-count="eligibility?.selfCheckedCount ?? 0"
        />
        <h3 :id="titleId" class="rec-card__title">
          <RouterLink :to="detailTo">
            <DataValue :value="programTitleText(program)" missing-label="공고명 없음" />
          </RouterLink>
        </h3>
        <p class="rec-card__agency"><DataValue :value="agencyText(program)" /></p>
      </div>
      <div class="rec-card__fit">
        <span class="visually-hidden">{{ fitSpoken }}</span>
        <span class="rec-card__fit-label" aria-hidden="true">적합도</span>
        <span class="rec-card__fit-score" aria-hidden="true">
          <template v-if="score !== null">{{ score }}<small>점</small></template>
          <template v-else>-</template>
        </span>
        <span class="rec-card__fit-note" aria-hidden="true">{{ score !== null ? '시험용 기준' : fitMissingReason }}</span>
      </div>
    </div>

    <dl class="rec-card__facts">
      <div class="rec-card__fact">
        <dt>신청 마감</dt>
        <dd class="rec-card__clip" :title="deadline ?? undefined"><DataValue :value="deadline" /></dd>
      </div>
      <div class="rec-card__fact">
        <dt>지원 내용</dt>
        <dd class="rec-card__clip" :title="content ?? undefined"><DataValue :value="content" /></dd>
      </div>
      <div class="rec-card__fact">
        <dt>지원금</dt>
        <dd class="rec-card__clip" :title="amount ?? undefined"><DataValue :value="amount" /></dd>
      </div>
      <div class="rec-card__fact">
        <dt>자부담</dt>
        <dd class="rec-card__clip" :title="selfPayment ?? undefined"><DataValue :value="selfPayment" /></dd>
      </div>
    </dl>

    <div class="rec-card__basis">
      <button
        type="button"
        class="rec-card__basis-toggle"
        :aria-expanded="basisOpen"
        :aria-controls="basisId"
        @click="basisOpen = !basisOpen"
      >
        계산 근거 보기
        <IconChevronDown :size="16" stroke-width="2" aria-hidden="true" :class="{ 'is-open': basisOpen }" />
      </button>
      <div v-show="basisOpen" :id="basisId" class="rec-card__basis-body">
        <FitBreakdownTable
          :fit="fit"
          :factors="evaluation?.fitFactors ?? []"
          :eligibility-status="eligibility?.status ?? null"
          :basis-date="fit?.basisDate ?? eligibility?.basisDate ?? null"
          :id-prefix="basisId"
        />
      </div>
    </div>

    <footer class="rec-card__actions">
      <RouterLink :to="detailTo" class="btn btn-primary btn-sm">자세히 보기</RouterLink>
      <span v-if="record" class="rec-card__status">관리 상태: {{ statusLabel(record.status) }}</span>
      <button v-else type="button" class="btn btn-secondary btn-sm" @click="saveInterested">
        <IconBookmark :size="16" stroke-width="2" aria-hidden="true" />
        관심사업 저장
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :aria-pressed="inCompare"
        @click="emit('compare', program.id)"
      >
        <IconLayoutColumns :size="16" stroke-width="2" aria-hidden="true" />
        {{ inCompare ? '비교에서 빼기' : '비교에 추가' }}
      </button>
    </footer>
  </article>
</template>

<style scoped>
.rec-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--card-padding);
}

.rec-card__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-4);
  align-items: start;
}

.rec-card__main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-2);
  min-width: 0;
}

.rec-card__title {
  margin: 0;
  font-size: var(--fs-lg);
}

.rec-card__title a {
  color: var(--color-heading);
  text-decoration: none;
}

.rec-card__title a:hover {
  color: var(--color-primary-strong);
  text-decoration: underline;
}

.rec-card__agency {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.rec-card__fit {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 96px;
  max-width: 160px;
  text-align: right;
}

.rec-card__fit-label {
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.rec-card__fit-score {
  font-size: 2.125rem; /* 34px */
  font-weight: var(--fw-bold);
  line-height: 1.1;
  color: var(--color-primary-strong);
  font-variant-numeric: tabular-nums;
}

.rec-card__fit-score small {
  margin-left: 2px;
  font-size: var(--fs-md);
  font-weight: var(--fw-semibold);
}

.rec-card__fit-note {
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.rec-card__facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3) var(--space-5);
  margin: 0;
  padding: var(--space-4) 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.rec-card__fact {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.rec-card__fact dt {
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.rec-card__fact dd {
  margin: 0;
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.rec-card__clip {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.rec-card__basis-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary-strong);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  cursor: pointer;
}

.rec-card__basis-toggle svg {
  transition: transform 0.2s ease;
}

.rec-card__basis-toggle svg.is-open {
  transform: rotate(180deg);
}

.rec-card__basis-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  font-size: var(--fs-sm);
}

.rec-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.rec-card__status {
  font-size: var(--fs-sm);
  color: var(--color-text);
}

@media (max-width: 575.98px) {
  .rec-card__fit {
    min-width: 72px;
  }
  .rec-card__fit-score {
    font-size: 1.75rem; /* 28px */
  }
  .rec-card__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

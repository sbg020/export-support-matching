<script setup lang="ts">
/**
 * 맞춤 추천 카드. 실제 공고(Program)가 있을 때만 렌더링한다.
 * 기본 정보는 공고명·신청자격·마감일·추천 이유 네 가지이며, 그 밖의 지표는 상세 화면에서 본다.
 * 근거가 없으면 숫자를 만들지 않고 '-'와 안내를 보여 준다.
 */
import { computed, ref, useId } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconBookmark, IconChevronDown, IconExternalLink, IconLayoutColumns } from '@tabler/icons-vue'
import type { Program } from '@/types/program'
import { evaluateEligibility } from '@/lib/engine/eligibility'
import { evaluateFit } from '@/lib/engine/fit'
import { formatDate, formatDateCompact } from '@/lib/display'
import { useProfileStore } from '@/stores/profileStore'
import { useApplicationStore } from '@/stores/applicationStore'
import { useAuth } from '@/stores/authStore'
import { useToast } from '@/stores/toastStore'
import { statusLabel } from '@/constants/applicationStatus'
import DataValue from '@/components/common/DataValue.vue'
import EligibilityBadge from './EligibilityBadge.vue'

const props = defineProps<{
  program: Program
  /** 이미 비교 선택에 들어 있는지 */
  inCompare: boolean
}>()

const emit = defineEmits<{ compare: [id: string] }>()

const route = useRoute()
const router = useRouter()
const profileStore = useProfileStore()
const applications = useApplicationStore()
const auth = useAuth()
const toast = useToast()

const eligibility = computed(() => evaluateEligibility(profileStore.state.profile, props.program))
const fit = computed(() => evaluateFit(profileStore.state.profile, props.program))
const firstReason = computed(() => fit.value?.reasons[0] ?? null)
const hasBasis = computed(() => fit.value !== null && fit.value.factors.length > 0)
const record = computed(() => applications.records.value.find((r) => r.programId === props.program.id))

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
    result === 'added' ? '관심 사업으로 저장했습니다. 마이페이지에서 관리할 수 있습니다.' : '이미 관리 기록에 있는 사업입니다.',
    result === 'added' ? 'success' : 'info',
  )
}

const formatPercent = (value: number) => `${Math.round(value * 1000) / 10}%`
</script>

<template>
  <article class="rec-card surface-card" :aria-labelledby="titleId">
    <h3 :id="titleId" class="rec-card__title">
      <RouterLink :to="{ name: 'program-detail', params: { id: program.id }, query: { from: 'recommended' } }">
        <DataValue :value="program.title" missing-label="공고명 없음" />
      </RouterLink>
    </h3>

    <dl class="rec-card__facts">
      <div class="rec-card__fact">
        <dt>신청자격</dt>
        <dd><EligibilityBadge :status="eligibility?.status ?? null" size="sm" /></dd>
      </div>
      <div class="rec-card__fact">
        <dt>마감일</dt>
        <dd><DataValue :value="program.applyEnd" :format="formatDateCompact" /></dd>
      </div>
      <div class="rec-card__fact rec-card__fact--reason">
        <dt>추천 이유</dt>
        <dd class="rec-card__reason" :title="firstReason ?? undefined"><DataValue :value="firstReason" /></dd>
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
        <p v-if="!fit || !hasBasis" class="rec-card__basis-empty">
          아직 계산 근거가 없습니다. 공고 규칙과 적합도 기준이 연결되면 항목별 근거가 표시됩니다.
        </p>
        <template v-else>
          <p class="rec-card__score">적합도 {{ fit.score }}점 / 100점</p>
          <div class="scroll-x">
            <table class="data-table">
              <caption class="visually-hidden">적합도 계산 근거</caption>
              <thead>
                <tr>
                  <th scope="col">항목</th>
                  <th scope="col">반영값</th>
                  <th scope="col">가중치</th>
                  <th scope="col">근거</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="factor in fit.factors" :key="factor.key">
                  <th scope="row">{{ factor.label }}</th>
                  <td>{{ formatPercent(factor.value) }}</td>
                  <td>{{ factor.weight }}</td>
                  <td>{{ factor.reason }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul class="rec-card__reasons">
            <li v-for="reason in fit.reasons" :key="reason">{{ reason }}</li>
          </ul>
          <p class="fs-sm mb-0">
            원문 출처:
            <a v-if="program.sourceUrl" :href="program.sourceUrl" target="_blank" rel="noopener noreferrer">
              {{ program.sourceTitle ?? '공고 원문' }}
              <IconExternalLink :size="14" stroke-width="2" aria-hidden="true" />
              <span class="visually-hidden">(새 창)</span>
            </a>
            <DataValue v-else :value="null" />
            · 계산 기준일 {{ formatDate(fit.basisDate) }} · 기준 버전 {{ fit.criteriaVersion }} · 엔진
            {{ fit.engineVersion }}
          </p>
        </template>
      </div>
    </div>

    <footer class="rec-card__actions">
      <button type="button" class="btn btn-ghost btn-sm" @click="emit('compare', program.id)">
        <IconLayoutColumns :size="16" stroke-width="2" aria-hidden="true" />
        {{ inCompare ? '비교 영역 보기' : '비교에 추가' }}
      </button>
      <span v-if="record" class="rec-card__status">관리 상태: {{ statusLabel(record.status) }}</span>
      <button v-else type="button" class="btn btn-ghost btn-sm" @click="saveInterested">
        <IconBookmark :size="16" stroke-width="2" aria-hidden="true" />
        관심사업 저장
      </button>
    </footer>
  </article>
</template>

<style scoped>
.rec-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--card-padding);
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

.rec-card__facts {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  gap: var(--space-2) var(--space-5);
  margin: 0;
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

.rec-card__reason {
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

.rec-card__basis-empty {
  color: var(--color-text-muted);
}

.rec-card__score {
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.rec-card__reasons {
  margin: 0;
  padding-left: var(--space-5);
}

.rec-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.rec-card__status {
  font-size: var(--fs-sm);
  color: var(--color-text);
}

@media (max-width: 575.98px) {
  .rec-card__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .rec-card__fact--reason {
    grid-column: span 2;
  }
}
</style>

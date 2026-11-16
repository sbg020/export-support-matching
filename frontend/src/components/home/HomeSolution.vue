<script setup lang="ts">
/**
 * Section 3. Solution — 왼쪽 큰 제목과 이전·다음 버튼, 오른쪽 가로로 넘기는 기능 카드 4개.
 * 카드 안 작은 UI는 서비스의 실제 기준을 그대로 보여 준다:
 * 적합도 v1 가중치(FIT_V1_WEIGHTS, REVISION_05 §6.4), 조건 판정 상태 3가지, 지원 단계 4개와 세부 분야 매핑.
 * 기업 조건 값만 예시다(예시 표시).
 */
import { ref } from 'vue'
import { IconArrowLeft, IconArrowRight, IconCircleCheck, IconCircleX, IconHelpCircle } from '@tabler/icons-vue'
import { CONDITION_STATUS_OPTIONS, STAGE_OPTIONS, optionLabel } from '@/constants/options'
import { CATEGORIES_BY_PRIMARY_PHASE, categoryName } from '@/constants/categories'
import { FIT_V1_LABEL, FIT_V1_STATUS_LABEL, FIT_V1_VERSION, FIT_V1_WEIGHTS, type FitV1FactorKey } from '@/constants/fitV1'
import { EXAMPLE_COMPANY } from '@/constants/landing'
import { vReveal } from '@/composables/useReveal'

const trackRef = ref<HTMLElement | null>(null)

const features = [
  { key: 'match', label: '매칭', title: '기업정보 기반 맞춤 매칭', text: '업종, 매출액, 수출실적, 소재지를 바탕으로 관련 지원사업을 추천합니다.', tone: 'dark' },
  { key: 'eligibility', label: '자격 검토', title: '신청 자격 사전 검토', text: '사업별 필수 요건을 원문 근거와 대조해 충족 · 미충족 · 확인 필요로 나눕니다.', tone: 'yellow' },
  { key: 'fit', label: '적합도', title: '지원사업 적합도 분석', text: '기업 특성과 지원사업의 관련성을 점수로 나타내 추천 우선순위를 정합니다.', tone: 'light' },
  { key: 'insight', label: '인사이트', title: '단계별 수출 인사이트', text: '수출준비부터 사후관리까지, 단계에 맞는 지원 분야를 살펴볼 수 있습니다.', tone: 'white' },
] as const

const statusIcon = { met: IconCircleCheck, unmet: IconCircleX, 'needs-check': IconHelpCircle } as const
const eligibilityRows = [
  { condition: '중소기업 여부', status: 'met' },
  { condition: '본사 소재지', status: 'met' },
  { condition: '전년도 수출실적', status: 'unmet' },
  { condition: '업종 제외 대상', status: 'needs-check' },
] as const

const fitRows = (Object.keys(FIT_V1_WEIGHTS) as FitV1FactorKey[]).map((key) => ({
  key,
  label: FIT_V1_LABEL[key],
  weight: FIT_V1_WEIGHTS[key],
}))

const phaseRows = CATEGORIES_BY_PRIMARY_PHASE.map((row) => ({
  stage: optionLabel(STAGE_OPTIONS, row.stage),
  categories: row.codes.slice(0, 2).map(categoryName),
  more: Math.max(0, row.codes.length - 2),
}))

/** 이전·다음: 카드 하나 폭만큼 가로로 넘긴다 */
function scrollBy(direction: 1 | -1) {
  const track = trackRef.value
  if (!track) return
  const card = track.querySelector<HTMLElement>('.feature')
  const step = card ? card.offsetWidth + 20 : track.clientWidth * 0.8
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  track.scrollBy({ left: step * direction, behavior: reduce ? 'auto' : 'smooth' })
}
</script>

<template>
  <section id="solution" class="solution lp-section" aria-labelledby="solution-title">
    <div class="lp-container solution__grid">
      <div v-reveal class="solution__intro">
        <p class="lp-eyebrow">핵심 서비스</p>
        <h2 id="solution-title" class="lp-title lp-title--md">
          찾는 시간을 줄이고,<br />
          <em class="lp-mark-bar">맞는 지원사업</em>에 집중하세요.
        </h2>
        <p class="lp-lead">검색은 줄이고, 신청할 수 있는 사업과 잘 맞는 사업을 먼저 보여 드립니다.</p>
        <div class="solution__nav">
          <button type="button" class="solution__arrow" aria-label="이전 기능 보기" @click="scrollBy(-1)">
            <IconArrowLeft :size="26" stroke-width="1.8" aria-hidden="true" />
          </button>
          <button type="button" class="solution__arrow" aria-label="다음 기능 보기" @click="scrollBy(1)">
            <IconArrowRight :size="26" stroke-width="1.8" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul ref="trackRef" class="solution__track" tabindex="0" aria-label="주요 기능 4가지 (가로로 넘겨 보기)">
        <li v-for="(feature, index) in features" :key="feature.key" class="feature" :class="`is-${feature.tone}`">
          <p class="feature__label">{{ String(index + 1).padStart(2, '0') }} · {{ feature.label }}</p>
          <h3 class="feature__title">{{ feature.title }}</h3>
          <p class="feature__text">{{ feature.text }}</p>

          <div class="feature__ui">
            <template v-if="feature.key === 'match'">
              <dl class="ui-company">
                <div v-for="item in EXAMPLE_COMPANY" :key="item.label">
                  <dt>{{ item.label }}</dt>
                  <dd>{{ item.value }}</dd>
                </div>
              </dl>
              <p class="ui-caption">입력 예시</p>
            </template>

            <ul v-else-if="feature.key === 'eligibility'" class="ui-eligibility">
              <li v-for="row in eligibilityRows" :key="row.condition">
                <span>{{ row.condition }}</span>
                <span class="ui-status" :class="`is-${row.status}`">
                  <component :is="statusIcon[row.status]" :size="15" stroke-width="2.2" aria-hidden="true" />
                  {{ optionLabel(CONDITION_STATUS_OPTIONS, row.status) }}
                </span>
              </li>
            </ul>

            <template v-else-if="feature.key === 'fit'">
              <ul class="ui-fit">
                <li v-for="row in fitRows" :key="row.key">
                  <span class="ui-fit__label">{{ row.label }}</span>
                  <span class="ui-fit__bar"><span :style="{ width: `${row.weight * 100}%` }" /></span>
                  <span class="ui-fit__value">{{ row.weight.toFixed(2) }}</span>
                </li>
              </ul>
              <p class="ui-caption">
                현재 가중치 {{ FIT_V1_VERSION }} · {{ FIT_V1_STATUS_LABEL }} · 신청 가능 공고만 계산
              </p>
            </template>

            <ul v-else class="ui-phases">
              <li v-for="row in phaseRows" :key="row.stage ?? ''">
                <span class="ui-phases__stage">{{ row.stage }}</span>
                <span class="ui-phases__cats">
                  {{ row.categories.join(' · ') }}<template v-if="row.more"> 외 {{ row.more }}개</template>
                </span>
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.solution {
  background: var(--color-surface);
}

.solution__grid {
  display: grid;
  grid-template-columns: minmax(300px, 440px) minmax(0, 1fr);
  gap: clamp(32px, 5vw, 64px);
  align-items: center;
}

.solution__nav {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-8);
}

.solution__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border: 1px solid var(--color-border-strong);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-ink);
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.solution__arrow:hover {
  background: var(--color-ink);
  border-color: var(--color-ink);
  color: #fff;
}

/* 오른쪽은 화면 끝까지 이어지게 둔다 */
.solution__track {
  display: flex;
  gap: 20px;
  /* 오른쪽 여백(본문 밖 공간 + 좌우 여백)만큼 넓혀 화면 오른쪽 끝까지 */
  margin: 0 calc((min(100vw, var(--lp-max) + var(--page-gutter) * 2) - 100vw) / 2 - var(--page-gutter)) 0 0;
  padding: 4px var(--page-gutter) 16px 4px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-left: 4px;
  list-style: none;
  scrollbar-width: thin;
}

.feature {
  display: flex;
  flex: 0 0 min(380px, 82vw);
  flex-direction: column;
  min-height: 500px;
  padding: var(--space-7);
  border-radius: var(--lp-radius);
  scroll-snap-align: start;
  transition: transform 0.3s ease;
}

.feature:hover {
  transform: translateY(-6px);
}

.feature.is-dark {
  background: var(--color-ink);
  color: #fff;
}

.feature.is-yellow {
  background: var(--color-yellow);
  color: var(--color-ink);
}

.feature.is-light {
  background: var(--color-bg);
  color: var(--color-ink);
}

.feature.is-white {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-ink);
}

.feature__label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  opacity: 0.75;
}

.feature__title {
  margin: var(--space-3) 0 0;
  font-size: 1.625rem;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.03em;
  color: inherit;
}

.feature__text {
  margin-top: var(--space-3);
  font-size: var(--fs-base);
  line-height: 1.7;
  opacity: 0.85;
}

.feature__ui {
  margin-top: auto;
  padding: var(--space-5);
  border-radius: 18px;
  background: var(--color-surface);
  color: var(--color-ink);
}

.is-white .feature__ui,
.is-light .feature__ui {
  border: 1px solid var(--color-border);
}

.ui-caption {
  margin-top: var(--space-3);
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.ui-company {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.ui-company div {
  padding: var(--space-3);
  border-radius: 12px;
  background: var(--color-bg);
}

.ui-company dt {
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.ui-company dd {
  margin: 2px 0 0;
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
}

.ui-eligibility,
.ui-fit,
.ui-phases {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.ui-eligibility li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}

.ui-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
  white-space: nowrap;
}

.ui-status.is-met {
  background: var(--color-success-soft);
  color: var(--color-success-strong);
}

.ui-status.is-unmet {
  background: var(--color-danger-soft);
  color: var(--color-danger-strong);
}

.ui-status.is-needs-check {
  background: var(--color-warning-soft);
  color: var(--color-warning-strong);
}

.ui-fit li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px 36px;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}

.ui-fit__bar {
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-soft);
  overflow: hidden;
}

.ui-fit__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-blue);
}

.ui-fit__value {
  text-align: right;
  color: var(--color-primary-strong);
  font-variant-numeric: tabular-nums;
}

.ui-phases li {
  display: grid;
  gap: 2px;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.ui-phases li:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.ui-phases__stage {
  font-size: var(--fs-sm);
  font-weight: 800;
}

.ui-phases__cats {
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

@media (max-width: 991.98px) {
  .solution__grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .solution__nav {
    margin-top: var(--space-6);
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature,
  .solution__arrow {
    transition: none;
  }
  .feature:hover {
    transform: none;
  }
}
</style>

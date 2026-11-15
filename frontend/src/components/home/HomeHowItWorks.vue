<script setup lang="ts">
/**
 * Section 4. How It Works — 큰 가운데 문구 + 가로형 3단계 프로세스(탭).
 * 단계를 고르면 아래에 설명과 실제 화면으로 가는 버튼이 바뀐다. 방향키로 단계를 옮길 수 있다.
 * 모바일(767px 이하)에서는 세로형 흐름으로 바뀐다.
 */
import { computed, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { IconArrowRight } from '@tabler/icons-vue'
import { STAGE_OPTIONS } from '@/constants/options'
import { vReveal } from '@/composables/useReveal'

interface Step {
  key: string
  title: string
  text: string
  points: string[]
  cta: { label: string; to: RouteLocationRaw }
}

const steps: Step[] = [
  {
    key: 'profile',
    title: '기업정보 입력',
    text: '기업의 기본정보, 업종, 매출액, 수출실적 등을 입력합니다.',
    points: ['6단계 입력 · 언제든 이어서 작성', '입력한 정보는 이 브라우저에만 저장 (사업자등록번호 제외)'],
    cta: { label: '기업정보 입력하기', to: { name: 'company-profile' } },
  },
  {
    key: 'match',
    title: '지원사업 매칭',
    text: '신청 자격을 검토하고 기업과의 적합도에 따라 지원사업을 추천합니다.',
    points: ['신청 가능 · 확인 필요 · 신청 불가로 나눠 보기', '조건마다 공고 원문 근거와 함께 확인'],
    cta: { label: '맞춤 추천 보기', to: { name: 'programs-recommended' } },
  },
  {
    key: 'insight',
    title: '나의 수출 인사이트',
    text: '기업의 수출 단계에 알맞은 지원사업을 확인하고 지원 전략을 수립합니다.',
    points: [`지원 단계: ${STAGE_OPTIONS.map((o) => o.label).join(' · ')}`, '관심·준비·신청 사업을 한곳에서 관리'],
    cta: { label: '전체 지원사업 보기', to: { name: 'programs' } },
  },
]

const active = ref(0)
const current = computed(() => steps[active.value] ?? steps[0]!)
const tabRefs = ref<HTMLButtonElement[]>([])

function select(index: number, focus = false) {
  active.value = (index + steps.length) % steps.length
  if (focus) tabRefs.value[active.value]?.focus()
}

function onKeydown(event: KeyboardEvent) {
  const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
  if (event.key in keys) {
    event.preventDefault()
    select(active.value + (keys[event.key] ?? 0), true)
  } else if (event.key === 'Home') {
    event.preventDefault()
    select(0, true)
  } else if (event.key === 'End') {
    event.preventDefault()
    select(steps.length - 1, true)
  }
}
</script>

<template>
  <section id="how" class="how lp-section" aria-labelledby="how-title">
    <div class="lp-container">
      <div v-reveal class="how__head">
        <p class="lp-eyebrow">이용 과정</p>
        <h2 id="how-title" class="lp-title">
          기업정보 입력부터<br />
          맞춤형 수출 인사이트까지.
        </h2>
      </div>

      <div v-reveal="100" class="how__steps" role="tablist" aria-label="서비스 이용 3단계" @keydown="onKeydown">
        <button
          v-for="(step, index) in steps"
          :id="`how-tab-${step.key}`"
          :key="step.key"
          ref="tabRefs"
          type="button"
          role="tab"
          class="how__step"
          :class="{ 'is-active': index === active, 'is-done': index < active }"
          :aria-selected="index === active"
          :aria-controls="`how-panel`"
          :tabindex="index === active ? 0 : -1"
          @click="select(index)"
        >
          <span class="how__step-num">STEP {{ String(index + 1).padStart(2, '0') }}</span>
          <span class="how__step-dot" aria-hidden="true">{{ index + 1 }}</span>
          <span class="how__step-title">{{ step.title }}</span>
        </button>
      </div>

      <div
        id="how-panel"
        class="how__panel"
        role="tabpanel"
        :aria-labelledby="`how-tab-${current.key}`"
        tabindex="0"
      >
        <div class="how__panel-text">
          <p class="how__panel-step">STEP {{ String(active + 1).padStart(2, '0') }}</p>
          <h3 class="how__panel-title">{{ current.title }}</h3>
          <p class="how__panel-desc">{{ current.text }}</p>
        </div>
        <ul class="how__points">
          <li v-for="point in current.points" :key="point">{{ point }}</li>
        </ul>
        <RouterLink :to="current.cta.to" class="btn btn-primary lp-btn how__cta">
          {{ current.cta.label }}
          <IconArrowRight :size="20" stroke-width="2.2" aria-hidden="true" />
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.how {
  background: var(--color-bg);
}

.how__head {
  text-align: center;
}

.how__steps {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
  margin-top: clamp(48px, 7vw, 80px);
}

/* 단계를 잇는 선 */
.how__steps::before {
  content: '';
  position: absolute;
  top: 74px;
  right: calc(100% / 6);
  left: calc(100% / 6);
  height: 2px;
  background: var(--color-border-strong);
}

.how__step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 0;
  border-radius: 20px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.2s ease;
}

.how__step-num {
  font-size: var(--fs-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.how__step-dot {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border: 2px solid var(--color-border-strong);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-ink);
  font-size: var(--fs-xl);
  font-weight: 800;
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease,
    transform 0.25s ease;
}

.how__step-title {
  font-size: clamp(1.0625rem, 1.8vw, 1.375rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.how__step:hover .how__step-dot {
  transform: scale(1.06);
}

.how__step.is-done .how__step-dot {
  border-color: var(--color-ink);
}

.how__step.is-active {
  color: var(--color-ink);
}

.how__step.is-active .how__step-dot {
  border-color: var(--color-ink);
  background: var(--color-yellow);
}

.how__panel {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(24px, 4vw, 48px);
  margin-top: var(--space-7);
  padding: clamp(28px, 4vw, 48px);
  border-radius: var(--lp-radius);
  background: var(--color-surface);
}

.how__panel-step {
  font-size: var(--fs-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

.how__panel-title {
  margin: var(--space-2) 0 0;
  font-size: clamp(1.5rem, 2.6vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.how__panel-desc {
  margin-top: var(--space-3);
  font-size: var(--fs-md);
  line-height: 1.7;
  color: var(--color-text);
}

.how__points {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.how__points li {
  position: relative;
  padding-left: 22px;
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.how__points li::before {
  content: '';
  position: absolute;
  top: 0.5em;
  left: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-yellow);
  box-shadow: inset 0 0 0 1px rgba(17, 17, 17, 0.2);
}

@media (max-width: 991.98px) {
  .how__panel {
    grid-template-columns: minmax(0, 1fr);
  }
  .how__cta {
    justify-self: start;
  }
}

/* 모바일: 세로형 흐름 */
@media (max-width: 767.98px) {
  .how__steps {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
  .how__steps::before {
    top: 40px;
    bottom: 40px;
    left: 47px;
    right: auto;
    width: 2px;
    height: auto;
  }
  .how__step {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    grid-template-rows: auto auto;
    column-gap: var(--space-4);
    row-gap: 2px;
    align-items: center;
    text-align: left;
  }
  .how__step-dot {
    grid-row: 1 / 3;
    grid-column: 1;
  }
  .how__step-num {
    grid-column: 2;
    align-self: end;
  }
  .how__step-title {
    grid-column: 2;
    align-self: start;
  }
  .how__cta {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .how__step,
  .how__step-dot {
    transition: none;
  }
  .how__step:hover .how__step-dot {
    transform: none;
  }
}
</style>

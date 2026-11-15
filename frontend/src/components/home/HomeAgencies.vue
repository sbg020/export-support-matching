<script setup lang="ts">
/**
 * 기관 띠 — 코나비즈의 고객사 로고 영역 구조를 수출지원 공고 기관 이름으로 바꿨다.
 * 로고 이미지는 쓰지 않고 이름(글자)만 보여 준다. 두 줄이 서로 반대 방향으로 천천히 흐른다.
 * - 움직임 멈추기 버튼(WCAG 2.2.2)과 마우스·포커스 시 멈춤, 동작 줄이기 설정에서는 흐르지 않고 줄바꿈 목록.
 * - 끊김 없이 이어 보이도록 같은 목록을 한 번 더 그리되, 복사본은 화면낭독기에서 숨긴다.
 */
import { ref } from 'vue'
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-vue'
import { AGENCY_ROWS } from '@/constants/landing'
import { vReveal } from '@/composables/useReveal'

const paused = ref(false)
</script>

<template>
  <section class="agencies lp-section" aria-labelledby="agencies-title">
    <div v-reveal class="lp-container agencies__head">
      <h2 id="agencies-title" class="lp-title">
        흩어진 수출지원 공고,<br />
        이제 한곳에서 확인하세요.
      </h2>
      <p class="lp-lead">
        기업마당과 KOTRA 공고 연계를 시작으로, 수출지원사업을 공고하는 기관을 계속 넓혀 갑니다.
      </p>
    </div>

    <div class="agencies__rows" :class="{ 'is-paused': paused }">
      <div v-for="(row, rowIndex) in AGENCY_ROWS" :key="rowIndex" class="agencies__row" :class="{ 'is-reverse': rowIndex % 2 === 1 }">
        <div class="agencies__track">
          <ul class="agencies__list" :aria-label="rowIndex === 0 ? '수출지원사업을 공고하는 기관' : undefined">
            <li v-for="agency in row" :key="agency.name" class="agencies__item">
              <span class="agencies__name">{{ agency.name }}</span>
              <span v-if="agency.short" class="agencies__short">{{ agency.short }}</span>
            </li>
          </ul>
          <ul class="agencies__list agencies__list--copy" aria-hidden="true">
            <li v-for="agency in row" :key="agency.name" class="agencies__item">
              <span class="agencies__name">{{ agency.name }}</span>
              <span v-if="agency.short" class="agencies__short">{{ agency.short }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="lp-container agencies__foot">
      <button type="button" class="agencies__toggle" :aria-pressed="paused" @click="paused = !paused">
        <component :is="paused ? IconPlayerPlay : IconPlayerPause" :size="16" stroke-width="2.2" aria-hidden="true" />
        {{ paused ? '기관 목록 흐르게 하기' : '기관 목록 멈추기' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.agencies {
  background: var(--color-surface);
}

.agencies__head {
  text-align: center;
}

.agencies__rows {
  display: grid;
  gap: var(--space-4);
  margin-top: clamp(40px, 6vw, 72px);
}

.agencies__row {
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}

.agencies__track {
  display: flex;
  width: max-content;
  animation: agencies-flow 48s linear infinite;
}

.agencies__row.is-reverse .agencies__track {
  animation-direction: reverse;
  animation-duration: 56s;
}

.agencies__rows.is-paused .agencies__track,
.agencies__row:hover .agencies__track,
.agencies__row:focus-within .agencies__track {
  animation-play-state: paused;
}

.agencies__list {
  display: flex;
  gap: var(--space-4);
  margin: 0;
  padding: 0 var(--space-4) 0 0;
  list-style: none;
}

.agencies__item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 200px;
  height: 88px;
  padding: 0 var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-surface);
  text-align: center;
}

.agencies__name {
  font-size: var(--fs-lg);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-heading);
  white-space: nowrap;
}

.agencies__short {
  margin-top: 2px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.agencies__foot {
  display: flex;
  justify-content: center;
  margin-top: var(--space-6);
}

.agencies__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-text);
}

.agencies__toggle:hover {
  border-color: var(--color-ink);
  color: var(--color-ink);
}

@keyframes agencies-flow {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

/* 동작 줄이기: 흐르지 않고 줄바꿈 목록으로 */
@media (prefers-reduced-motion: reduce) {
  .agencies__row {
    mask-image: none;
  }
  .agencies__track {
    width: auto;
    animation: none;
    justify-content: center;
  }
  .agencies__list {
    flex-wrap: wrap;
    justify-content: center;
    padding: 0 var(--page-gutter);
  }
  .agencies__list--copy,
  .agencies__foot {
    display: none;
  }
}
</style>

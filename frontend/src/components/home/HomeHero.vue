<script setup lang="ts">
/**
 * Section 1. Hero — 블랙 배경, 대형 타이포그래피, 실제 기능 페이지로 가는 CTA 2개,
 * 추천 결과 화면을 응용한 예시 UI(예시 화면 표시). 헤더는 이 영역 위에서 투명·흰 글자로 보인다.
 */
import { IconArrowRight } from '@tabler/icons-vue'
import { EXAMPLE_COMPANY, EXAMPLE_LABEL, EXAMPLE_MATCHES, EXAMPLE_NOTE } from '@/constants/landing'
import { ELIGIBILITY_STATUS_OPTIONS } from '@/constants/options'
import { vReveal } from '@/composables/useReveal'
import ExampleMatchCard from './ExampleMatchCard.vue'

const heroMatches = EXAMPLE_MATCHES.slice(0, 2)
</script>

<template>
  <section id="home-hero" class="hero lp-dark" aria-labelledby="hero-title">
    <div class="lp-container hero__inner">
      <p class="hero__eyebrow">수출지원사업 매칭 플랫폼</p>
      <h1 id="hero-title" class="lp-title lp-title--xl hero__title">
        수출지원사업,<br />
        <em class="lp-mark">우리 기업에 맞게.</em>
      </h1>
      <p class="hero__lead">
        복잡한 지원사업 검색부터 신청 자격 확인까지.<br />
        기업의 특성을 분석해 적합한 수출지원사업을 추천합니다.
      </p>
      <div class="hero__actions">
        <RouterLink :to="{ name: 'programs-recommended' }" class="btn btn-yellow lp-btn">
          맞춤 지원사업 찾기
          <IconArrowRight :size="20" stroke-width="2.2" aria-hidden="true" />
        </RouterLink>
        <RouterLink :to="{ name: 'programs' }" class="btn lp-btn lp-btn-outline-light">전체 지원사업 보기</RouterLink>
      </div>

      <!-- 예시 UI: 화면에 보이는 안내 문구는 두지 않고, 화면낭독기에는 예시임을 알린다 -->
      <figure v-reveal="150" class="hero__visual" :aria-label="`${EXAMPLE_LABEL}: ${EXAMPLE_NOTE}`">
        <div class="hero__window">
          <div class="hero__profile">
            <p class="hero__panel-title">기업 조건</p>
            <dl class="hero__company">
              <div v-for="item in EXAMPLE_COMPANY" :key="item.label">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>
            <ol class="hero__flow" aria-label="분석 순서">
              <li>기업 조건 분석</li>
              <li>신청 자격 검토</li>
              <li>적합도 기반 매칭</li>
            </ol>
          </div>
          <div class="hero__results">
            <ul class="hero__tabs" aria-label="신청 자격 상태 탭 (예시)">
              <li
                v-for="(option, index) in ELIGIBILITY_STATUS_OPTIONS"
                :key="option.value"
                :class="{ 'is-active': index === 0 }"
              >
                {{ option.label }}
              </li>
            </ul>
            <div class="hero__cards">
              <ExampleMatchCard v-for="match in heroMatches" :key="match.key" :match="match" compact />
            </div>
          </div>
        </div>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.hero {
  /* 헤더(sticky) 아래로 밀어 넣어 헤더가 블랙 배경 위에 투명하게 보이게 한다 */
  margin-top: calc(var(--header-height) * -1);
  padding: calc(var(--header-height) + clamp(56px, 9vw, 120px)) 0 clamp(64px, 8vw, 112px);
  background: var(--color-ink);
  color: #fff;
}

.hero__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hero__eyebrow {
  margin-bottom: var(--space-6);
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: var(--radius-pill);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: rgba(255, 255, 255, 0.86);
}

.hero__title {
  color: #fff;
}

.hero__lead {
  margin-top: var(--space-7);
  font-size: clamp(1.0625rem, 1.8vw, 1.375rem);
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.78);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-8);
}

.hero__visual {
  width: 100%;
  max-width: 1080px;
  margin: clamp(56px, 8vw, 96px) 0 0;
}



.hero__window {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.6fr);
  gap: var(--space-5);
  padding: var(--space-5);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--lp-radius);
  background: #1b1b1b;
  text-align: left;
}

.hero__profile {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: 20px;
  background: #262626;
}

.hero__panel-title {
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  color: var(--color-yellow);
}

.hero__company {
  display: grid;
  gap: var(--space-3);
  margin: 0;
}

.hero__company div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.hero__company dt {
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  color: rgba(255, 255, 255, 0.66);
}

.hero__company dd {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  color: #fff;
}

.hero__flow {
  display: grid;
  gap: 6px;
  margin: auto 0 0;
  padding: 0;
  list-style: none;
  counter-reset: flow;
}

.hero__flow li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: rgba(255, 255, 255, 0.88);
  counter-increment: flow;
}

.hero__flow li::before {
  content: counter(flow);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-yellow);
  color: var(--color-ink);
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
}

.hero__results {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.hero__tabs {
  display: flex;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.hero__tabs li {
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: #2a2a2a;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: rgba(255, 255, 255, 0.72);
}

.hero__tabs li.is-active {
  background: #fff;
  color: var(--color-ink);
}

.hero__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

@media (max-width: 991.98px) {
  .hero__window {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 575.98px) {
  .hero__lead br {
    display: none;
  }
  .hero__actions {
    flex-direction: column;
    width: 100%;
  }
  .hero__actions .btn {
    width: 100%;
  }
  .hero__window {
    padding: var(--space-3);
    border-radius: 20px;
  }
  .hero__cards {
    grid-template-columns: minmax(0, 1fr);
  }
  .hero__tabs {
    overflow-x: auto;
  }
  .hero__tabs li {
    white-space: nowrap;
  }
}
</style>

<script setup lang="ts">
/**
 * 랜딩페이지 예시 추천 카드 (REVISION_05).
 * 실제 맞춤 추천 카드(RecommendationCard)와 같은 배치: 왼쪽 위 자격 배지·공고명·기관, 오른쪽 위 적합도,
 * 아래 수출지원 단계·지원 분야·주요 요건. 실제 공고가 아니므로 관심 저장·비교 버튼은 두지 않고,
 * '자세히 보기'는 실제 맞춤 추천 화면으로 연결한다.
 */
import { computed } from 'vue'
import { IconArrowUpRight } from '@tabler/icons-vue'
import type { ExampleMatch } from '@/constants/landing'
import { STAGE_OPTIONS, optionLabel } from '@/constants/options'
import EligibilityBadge from '@/components/programs/EligibilityBadge.vue'

const props = withDefaults(defineProps<{ match: ExampleMatch; compact?: boolean; showLink?: boolean }>(), {
  compact: false,
  showLink: false,
})

const stageLabel = computed(() => optionLabel(STAGE_OPTIONS, props.match.stage))
const scoreLabel = computed(() =>
  props.match.score === null
    ? '적합도 계산하지 않음 (신청 불가)'
    : `예시 적합도 ${props.match.score}점, 100점 만점`,
)
</script>

<template>
  <article class="ex-card" :class="{ 'is-compact': compact }">
    <div class="ex-card__head">
      <div class="ex-card__main">
        <EligibilityBadge :status="match.status" size="sm" />
        <h3 class="ex-card__title">{{ match.title }}</h3>
        <p class="ex-card__agency">{{ match.agency }}</p>
      </div>
      <div class="ex-card__fit" role="img" :aria-label="scoreLabel">
        <span class="ex-card__fit-label">적합도</span>
        <span v-if="match.score !== null" class="ex-card__fit-score">{{ match.score }}<small>점</small></span>
        <span v-else class="ex-card__fit-score is-empty">-</span>
      </div>
    </div>
    <dl class="ex-card__facts">
      <div>
        <dt>수출지원 단계</dt>
        <dd>{{ stageLabel }}</dd>
      </div>
      <div>
        <dt>지원 분야</dt>
        <dd>{{ match.category }}</dd>
      </div>
      <div v-if="!compact" class="ex-card__wide">
        <dt>지원대상·주요 요건</dt>
        <dd>
          <ul class="ex-card__reqs">
            <li v-for="req in match.requirements" :key="req">{{ req }}</li>
          </ul>
        </dd>
      </div>
    </dl>
    <RouterLink v-if="showLink" :to="{ name: 'programs-recommended' }" class="ex-card__link">
      자세히 보기
      <IconArrowUpRight :size="16" stroke-width="2.2" aria-hidden="true" />
      <span class="visually-hidden">(맞춤 추천 화면으로 이동)</span>
    </RouterLink>
  </article>
</template>

<style scoped>
.ex-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-surface);
  color: var(--color-text);
  text-align: left;
}

.ex-card.is-compact {
  gap: var(--space-3);
  padding: var(--space-4);
}

.ex-card__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-4);
  align-items: start;
}

.ex-card__main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.ex-card__title {
  margin: 2px 0 0;
  font-size: var(--fs-lg);
  letter-spacing: -0.02em;
}

.is-compact .ex-card__title {
  font-size: var(--fs-md);
}

.ex-card__agency {
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.ex-card__fit {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 72px;
}

.ex-card__fit-label {
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.ex-card__fit-score {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--color-primary-strong);
  font-variant-numeric: tabular-nums;
}

.is-compact .ex-card__fit-score {
  font-size: 1.625rem;
}

.ex-card__fit-score small {
  margin-left: 2px;
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
}

.ex-card__fit-score.is-empty {
  color: var(--color-muted);
}

.ex-card__facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3) var(--space-4);
  margin: 0;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.ex-card__facts dt {
  margin-bottom: 2px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.ex-card__facts dd {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.ex-card__wide {
  grid-column: 1 / -1;
}

.ex-card__reqs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 2px 0 0;
  padding: 0;
  list-style: none;
}

.ex-card__reqs li {
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  font-weight: var(--fw-medium);
}

.ex-card__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  color: var(--color-heading);
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  text-decoration: underline;
  text-decoration-color: var(--color-yellow);
  text-decoration-thickness: 3px;
  text-underline-offset: 5px;
}

.ex-card__link:hover {
  color: var(--color-ink);
  text-decoration-color: var(--color-ink);
}
</style>

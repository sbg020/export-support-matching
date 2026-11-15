<script setup lang="ts">
/**
 * Section 5. Matching Preview — 추천 결과 화면 미리보기.
 * 공고 데이터가 연결되어 있고 신청 가능·확인 필요 공고가 있으면 실제 맞춤 추천 카드(RecommendationCard)를
 * 그대로 보여 준다. 아니면(지금처럼 공고 없음) 같은 배치의 예시 카드를 '예시 화면' 표시와 함께 보여 준다.
 */
import { computed } from 'vue'
import { IconArrowRight } from '@tabler/icons-vue'
import { EXAMPLE_LABEL, EXAMPLE_MATCHES, EXAMPLE_NOTE } from '@/constants/landing'
import { ELIGIBILITY_STATUS_OPTIONS } from '@/constants/options'
import { isSourceConnected, programRepository } from '@/repositories'
import { useProgramEvaluations } from '@/composables/useProgramEvaluations'
import { compareToggleMessage, useCompareSelection } from '@/composables/useCompareSelection'
import { compareRecommended } from '@/lib/engine/evaluateAll'
import { compareProgramIds } from '@/lib/programQuery'
import { useToast } from '@/stores/toastStore'
import { vReveal } from '@/composables/useReveal'
import RecommendationCard from '@/components/programs/RecommendationCard.vue'
import ExampleMatchCard from './ExampleMatchCard.vue'

const connected = isSourceConnected(programRepository.source)
// 공고가 연결되지 않았으면 계산 모듈을 부르지 않는다 (빈 저장소)
const evaluation = connected ? useProgramEvaluations() : null
const selection = useCompareSelection()
const toast = useToast()

const realItems = computed(() => {
  if (!evaluation || !evaluation.ready.value) return []
  const evaluations = evaluation.evaluations.value
  return evaluation.programs.value
    .filter((p) => {
      const status = evaluation.get(p.id)?.eligibility?.status
      return status === 'eligible' || status === 'needs-check'
    })
    .sort((a, b) => compareRecommended(a, b, evaluations, compareProgramIds))
    .slice(0, 2)
})

const anatomy = ['지원사업명', '지원기관', '수출지원 단계', '지원대상 및 주요 요건', '자격 충족 여부', '적합도 점수']

function toggleCompare(id: string) {
  const result = selection.toggle(id)
  toast.show(compareToggleMessage(result, selection.count.value), result === 'full' ? 'warning' : 'success')
}
</script>

<template>
  <section id="preview" class="preview lp-section" aria-labelledby="preview-title">
    <div class="lp-container preview__grid">
      <div v-reveal class="preview__intro">
        <p class="lp-eyebrow">추천 결과 미리보기</p>
        <h2 id="preview-title" class="lp-title">
          우리 기업에 맞는 사업을<br />
          <em class="lp-mark-bar">한눈에</em> 확인하세요.
        </h2>
        <p class="lp-lead">
          신청 자격 상태별로 나누고, 같은 상태 안에서는 적합도가 높은 순으로 보여 드립니다. 카드마다 다음을 확인할 수
          있습니다.
        </p>
        <ul class="preview__anatomy">
          <li v-for="(item, index) in anatomy" :key="item">
            <span aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>{{ item }}
          </li>
        </ul>
        <RouterLink :to="{ name: 'programs-recommended' }" class="btn btn-primary lp-btn preview__cta">
          맞춤 추천 보기
          <IconArrowRight :size="20" stroke-width="2.2" aria-hidden="true" />
        </RouterLink>
      </div>

      <div v-reveal="120" class="preview__screen">
        <template v-if="realItems.length > 0 && evaluation">
          <ul class="preview__real">
            <li v-for="program in realItems" :key="program.id">
              <RecommendationCard
                :program="program"
                :evaluation="evaluation.get(program.id)"
                :as-of="evaluation.asOf"
                :in-compare="selection.has(program.id)"
                @compare="toggleCompare"
              />
            </li>
          </ul>
        </template>
        <figure v-else class="preview__example" aria-labelledby="preview-example-caption">
          <figcaption id="preview-example-caption" class="preview__example-bar">
            <span class="lp-example-tag">{{ EXAMPLE_LABEL }}</span>
            <span class="preview__example-note">{{ EXAMPLE_NOTE }}</span>
          </figcaption>
          <ul class="preview__tabs" aria-label="신청 자격 상태 탭 (예시)">
            <li
              v-for="(option, index) in ELIGIBILITY_STATUS_OPTIONS"
              :key="option.value"
              :class="{ 'is-active': index === 0 }"
            >
              {{ option.label }}
            </li>
          </ul>
          <div class="preview__cards">
            <ExampleMatchCard :match="EXAMPLE_MATCHES[0]!" show-link />
            <ExampleMatchCard :match="EXAMPLE_MATCHES[1]!" show-link />
          </div>
        </figure>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview {
  background: var(--color-surface);
}

.preview__grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(32px, 6vw, 88px);
  align-items: center;
}

.preview__anatomy {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3) var(--space-5);
  margin: var(--space-7) 0 0;
  padding: 0;
  list-style: none;
}

.preview__anatomy li {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--fs-base);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.preview__anatomy span {
  font-size: var(--fs-xs);
  font-weight: 800;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.preview__cta {
  margin-top: var(--space-8);
}

.preview__screen {
  min-width: 0;
}

.preview__real {
  display: grid;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.preview__example {
  margin: 0;
  padding: clamp(20px, 3vw, 32px);
  border-radius: var(--lp-radius);
  background: var(--color-bg);
}

.preview__example-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.preview__example-note {
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.preview__tabs {
  display: flex;
  gap: var(--space-5);
  margin: 0 0 var(--space-4);
  padding: 0;
  border-bottom: 1px solid var(--color-border);
  list-style: none;
}

.preview__tabs li {
  padding: var(--space-2) 0 var(--space-3);
  margin-bottom: -1px;
  border-bottom: 3px solid transparent;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.preview__tabs li.is-active {
  border-bottom-color: var(--color-ink);
  font-weight: 800;
  color: var(--color-ink);
}

.preview__cards {
  display: grid;
  gap: var(--space-4);
}

@media (max-width: 991.98px) {
  .preview__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 575.98px) {
  .preview__anatomy {
    grid-template-columns: minmax(0, 1fr);
  }
  .preview__cta {
    width: 100%;
  }
}
</style>

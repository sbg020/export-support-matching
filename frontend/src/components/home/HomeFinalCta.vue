<script setup lang="ts">
/** Section 6. Final CTA — 블랙 띠, 왼쪽 큰 문구, 오른쪽 옐로우 버튼(맞춤 추천으로). */
import { IconArrowRight } from '@tabler/icons-vue'
import { vReveal } from '@/composables/useReveal'
</script>

<template>
  <section class="final lp-dark" aria-labelledby="final-title">
    <div v-reveal class="lp-container final__inner">
      <div>
        <h2 id="final-title" class="lp-title final__title">
          우리 기업의 <em class="lp-mark">다음 수출 기회</em>,<br />
          지금 발견하세요.
        </h2>
        <p class="final__desc">
          기업 정보를 기반으로 신청 가능한 수출지원사업을 확인하고, 해외진출을 위한 다음 단계를 준비하세요.
        </p>
      </div>
      <RouterLink :to="{ name: 'programs-recommended' }" class="btn btn-yellow lp-btn final__cta">
        맞춤 지원사업 찾기
        <IconArrowRight :size="20" stroke-width="2.2" aria-hidden="true" />
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.final {
  padding: clamp(72px, 10vw, 128px) 0;
  background: var(--color-ink);
  color: #fff;
}

.final__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-7);
}

.final__title {
  color: #fff;
}

.final__desc {
  max-width: 560px;
  margin-top: var(--space-5);
  font-size: var(--fs-md);
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.74);
}

.final__cta {
  flex-shrink: 0;
}

@media (max-width: 767.98px) {
  .final__inner {
    flex-direction: column;
    align-items: flex-start;
  }
  .final__cta {
    width: 100%;
  }
}
</style>

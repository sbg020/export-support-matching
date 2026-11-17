<script setup lang="ts">
/**
 * 메인 랜딩페이지 (REVISION_05). 서비스 소개 메뉴가 여는 화면이다.
 * Hero → Problem → Solution → How It Works → Matching Preview → 기관 띠 → Final CTA.
 * 모든 버튼은 실제 기능 화면(맞춤 추천·전체 지원사업·기업 프로필)으로 간다.
 */
import '@/styles/landing.css'
import HomeHero from '@/components/home/HomeHero.vue'
import HomeProblem from '@/components/home/HomeProblem.vue'
import HomeSolution from '@/components/home/HomeSolution.vue'
import HomeHowItWorks from '@/components/home/HomeHowItWorks.vue'
import HomePreview from '@/components/home/HomePreview.vue'
import HomeAgencies from '@/components/home/HomeAgencies.vue'
import HomeFinalCta from '@/components/home/HomeFinalCta.vue'
import { ref } from 'vue'
import { useFullPageScroll } from '@/composables/useFullPageScroll'

/** 풀페이지 스크롤: 섹션마다 화면 높이, 휠·트랙패드 한 번에 한 섹션 (넓은 화면에서만) */
const root = ref<HTMLElement | null>(null)
useFullPageScroll(root)
</script>

<template>
  <div ref="root" class="lp lp-fp">
    <HomeHero data-fp-section data-fp-full class="lp-fp-hero" />
    <!-- 문제 섹션은 안쪽의 질문 배너와 카드 3개가 각각 한 화면이다 (HomeProblem의 data-fp-section) -->
    <HomeProblem />
    <HomeSolution data-fp-section />
    <HomeHowItWorks data-fp-section />
    <HomePreview data-fp-section />
    <!-- 기관 띠는 얇아서 마지막 CTA와 한 화면으로 묶는다 -->
    <div data-fp-section class="lp-fp-tail">
      <HomeAgencies />
      <HomeFinalCta class="lp-fp-grow" />
    </div>
  </div>
</template>

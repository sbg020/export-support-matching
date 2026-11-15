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
</script>

<template>
  <div class="lp">
    <HomeHero />
    <HomeProblem />
    <HomeSolution />
    <HomeHowItWorks />
    <HomePreview />
    <HomeAgencies />
    <HomeFinalCta />
  </div>
</template>

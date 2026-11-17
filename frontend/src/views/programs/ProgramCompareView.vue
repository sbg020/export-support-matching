<script setup lang="ts">
/**
 * 공고 비교 (기업 맞춤 지원사업 > 공고 비교). 경로 /programs/compare, 선택은 ?compare=ID,ID 와 맞물린다.
 */
import PageHeader from '@/components/layout/PageHeader.vue'
import CompareSection from '@/components/programs/CompareSection.vue'
</script>

<template>
  <div class="page">
    <PageHeader
      title="공고 비교"
      description="담아 둔 공고를 2~4개까지 나란히 놓고 신청 자격, 적합도, 지원 내용, 준비 부담을 견줘 봅니다."
    />
    <CompareSection />
  </div>
</template>

<script setup lang="ts">
import { IconTargetArrow } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import ProgramBrowser from '@/components/programs/ProgramBrowser.vue'
import { programRepository } from '@/repositories'

const connected = programRepository.source.kind === 'api'
</script>

<template>
  <div class="page">
    <PageHeader
      title="전체 지원사업"
      description="정부·공공기관의 수출지원사업 공고를 검색하고 조건별로 찾아볼 수 있습니다."
    >
      <template #actions>
        <RouterLink :to="{ name: 'programs-recommended' }" class="btn btn-secondary">
          <IconTargetArrow :size="18" stroke-width="2" aria-hidden="true" />
          맞춤 추천 보기
        </RouterLink>
      </template>
    </PageHeader>

    <div class="stack">
      <NoticeBanner v-if="!connected" tone="neutral" title="공고 데이터를 준비하고 있습니다">
        지원사업 공고는 아직 수집·검증 전입니다. 공고가 등록되면 이 화면에서 검색·필터·정렬로 찾아볼 수 있으며,
        모든 공고에는 원문 링크와 확인한 날짜를 함께 표시합니다.
      </NoticeBanner>
      <ProgramBrowser mode="all" />
    </div>
  </div>
</template>

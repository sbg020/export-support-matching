<script setup lang="ts">
/** 모든 관리자 화면 제목 바로 아래의 저장소 연결 상태 안내 (REVISION_04 §6.2) */
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import { adminRepository } from '@/repositories/admin'
</script>

<template>
  <NoticeBanner v-if="adminRepository.source.kind === 'not-connected'" tone="neutral" title="공고 저장소가 연결되지 않았습니다">
    수집·업로드·검수 결과를 저장할 서버 저장소가 아직 없습니다. 화면 구성과 파일 확인은 지금 쓸 수 있고, 저장이 필요한
    기능은 저장소를 연결한 뒤 켜집니다.
  </NoticeBanner>
</template>

<script setup lang="ts">
/** 모든 관리자 화면 제목 바로 아래의 저장소 연결 상태 안내 (REVISION_04 §6.2) */
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import { adminRepository } from '@/repositories/admin'
</script>

<template>
  <NoticeBanner v-if="adminRepository.source.kind === 'not-connected'" tone="neutral" title="공고 저장소가 연결되지 않았습니다 (읽기 전용)">
    게시 공고와 검수 대기 공고는 마지막으로 내보낸 스냅샷(기준일 2026-10-20)을 읽어 보여 줍니다. 수집·업로드 반영·검수 승인처럼
    저장이 필요한 기능은 서버 저장소를 연결한 뒤 켜집니다. 그 전에는 로컬 관리 명령으로 처리하고 스냅샷을 다시 배포합니다.
  </NoticeBanner>
</template>

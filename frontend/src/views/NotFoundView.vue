<script setup lang="ts">
import { IconMapPin } from '@tabler/icons-vue'
import EmptyState from '@/components/common/EmptyState.vue'
</script>

<template>
  <div class="page">
    <h1 class="visually-hidden">페이지를 찾을 수 없습니다</h1>
    <EmptyState
      :icon="IconMapPin"
      :level="2"
      title="페이지를 찾을 수 없습니다"
      description="주소가 바뀌었거나 없는 페이지입니다. 아래 버튼으로 이동해 주세요."
    >
      <template #actions>
        <RouterLink :to="{ name: 'home' }" class="btn btn-primary">홈으로</RouterLink>
        <RouterLink :to="{ name: 'programs' }" class="btn btn-secondary">전체 지원사업</RouterLink>
        <RouterLink :to="{ name: 'mypage-profile' }" class="btn btn-secondary">마이페이지</RouterLink>
      </template>
    </EmptyState>
  </div>
</template>

<script setup lang="ts">
/**
 * 로고 마크: 블랙 바탕에 옐로우 상승 화살표 (REVISION_05 블랙·옐로우).
 * inverse: 블랙 배경 위에서는 옐로우 바탕에 블랙 화살표로 바꿔 경계가 보이게 한다.
 */
withDefaults(defineProps<{ size?: number; inverse?: boolean }>(), { size: 32, inverse: false })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
    <rect width="32" height="32" rx="9" :fill="inverse ? '#FFCF24' : '#111111'" />
    <path
      d="M9 21.5 14.5 16l3.5 3.5L23.5 12"
      :stroke="inverse ? '#111111' : '#FFCF24'"
      stroke-width="2.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M19 11.5h4.8v4.8"
      :stroke="inverse ? '#111111' : '#FFCF24'"
      stroke-width="2.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

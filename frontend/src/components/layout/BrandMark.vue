<script setup lang="ts">
/**
 * Export Compass 로고 마크 (나침반, 사용자 제공 이미지 public/brand/logo.png).
 * inverse: 블랙 배경(홈 히어로) 위에서는 검은 부분을 흰색으로 바꾼 이미지를 쓴다(노란 중심은 그대로).
 * 옆에 서비스 이름 글자가 함께 나오므로 장식 이미지(alt 빈 값)로 둔다.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{ size?: number; inverse?: boolean }>(), { size: 32, inverse: false })

/** 원본 비율 (가로 2000 : 세로 1792) */
const RATIO = 2000 / 1792
const width = computed(() => Math.round(props.size * RATIO))
</script>

<template>
  <img
    :src="inverse ? '/brand/logo-inverse.png' : '/brand/logo.png'"
    :width="width"
    :height="size"
    alt=""
    class="brand-mark"
    decoding="async"
  />
</template>

<style scoped>
.brand-mark {
  display: block;
  flex-shrink: 0;
  object-fit: contain;
}
</style>

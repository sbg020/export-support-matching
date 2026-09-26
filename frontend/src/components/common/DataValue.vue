<script setup lang="ts" generic="T">
/**
 * 데이터 값 표시. 결측(null·undefined)이면 '-'를 표시한다.
 * 0과 false는 유효한 값으로 format 함수를 거쳐 그대로 표시한다.
 */
import { computed } from 'vue'
import { MISSING, isMissing } from '@/lib/display'

const props = withDefaults(
  defineProps<{
    value: T | null | undefined
    format?: (value: T) => string
    /** 화면낭독기에 읽어 줄 결측 설명 */
    missingLabel?: string
  }>(),
  { format: undefined, missingLabel: '정보 없음' },
)

const missing = computed(() => isMissing(props.value))
const text = computed(() => {
  if (isMissing(props.value)) return MISSING
  return props.format ? props.format(props.value as T) : String(props.value)
})
</script>

<template>
  <span v-if="missing" class="value-missing"
    ><span aria-hidden="true">{{ MISSING }}</span
    ><span class="visually-hidden">{{ missingLabel }}</span></span
  >
  <span v-else-if="text === ''" class="value-missing">(빈 값)</span>
  <span v-else class="value-present">{{ text }}</span>
</template>

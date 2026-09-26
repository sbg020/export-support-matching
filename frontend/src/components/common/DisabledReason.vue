<script setup lang="ts">
/** 비활성 버튼의 이유. ActionButton의 describedby에 이 id를 연결한다. */
import { IconInfoCircle } from '@tabler/icons-vue'

defineProps<{ id: string }>()
</script>

<template>
  <p :id="id" class="disabled-reason">
    <IconInfoCircle :size="15" stroke-width="2" aria-hidden="true" />
    <span><slot /></span>
  </p>
</template>

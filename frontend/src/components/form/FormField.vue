<script setup lang="ts">
/** 단일 입력 필드 래퍼: 라벨, 필수/선택 표시, 도움말, 오류 메시지 */
import { computed } from 'vue'
import { IconAlertCircle } from '@tabler/icons-vue'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    required?: boolean
    optional?: boolean
    hint?: string
    error?: string
  }>(),
  { required: false, optional: false, hint: undefined, error: undefined },
)

const describedby = computed(() => {
  const ids = [props.hint ? `${props.id}-hint` : null, props.error ? `${props.id}-error` : null].filter(
    (value): value is string => value !== null,
  )
  return ids.length > 0 ? ids.join(' ') : undefined
})
</script>

<template>
  <div class="form-field">
    <label :for="id" class="form-label">
      {{ label }}
      <span v-if="required" class="tag-required">필수</span>
      <span v-else-if="optional" class="tag-optional">선택</span>
    </label>
    <slot :id="id" :describedby="describedby" :invalid="Boolean(error)" />
    <p v-if="hint" :id="`${id}-hint`" class="form-hint">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="form-error">
      <IconAlertCircle :size="16" stroke-width="2" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>

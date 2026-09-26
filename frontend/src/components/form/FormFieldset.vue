<script setup lang="ts">
/** 여러 입력(라디오·체크박스·연월 등)을 묶는 필드셋 */
import { computed } from 'vue'
import { IconAlertCircle } from '@tabler/icons-vue'

const props = withDefaults(
  defineProps<{
    id: string
    legend: string
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
  <fieldset :id="id" class="form-fieldset" :aria-describedby="describedby" tabindex="-1">
    <legend class="form-label">
      {{ legend }}
      <span v-if="required" class="tag-required">필수</span>
      <span v-else-if="optional" class="tag-optional">선택</span>
    </legend>
    <slot :describedby="describedby" :invalid="Boolean(error)" />
    <p v-if="hint" :id="`${id}-hint`" class="form-hint">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="form-error">
      <IconAlertCircle :size="16" stroke-width="2" aria-hidden="true" />
      <span>{{ error }}</span>
    </p>
  </fieldset>
</template>

<style scoped>
.form-fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.form-fieldset:focus {
  outline: none;
}

.form-fieldset > legend {
  float: none;
  width: auto;
  margin-bottom: 8px;
  padding: 0;
}
</style>

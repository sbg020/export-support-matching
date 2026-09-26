<script setup lang="ts" generic="T extends string | number">
/** 선택 입력. 선택하지 않으면 null이며, 임의의 기본값을 채우지 않는다. */
const model = defineModel<T | null>({ required: true })

withDefaults(
  defineProps<{
    id: string
    options: { value: T; label: string }[]
    placeholder?: string
    describedby?: string
    invalid?: boolean
    disabled?: boolean
  }>(),
  { placeholder: '선택해 주세요', describedby: undefined, invalid: false, disabled: false },
)
</script>

<template>
  <select
    :id="id"
    v-model="model"
    class="form-select"
    :disabled="disabled"
    :aria-describedby="describedby"
    :aria-invalid="invalid ? 'true' : undefined"
  >
    <option :value="null">{{ placeholder }}</option>
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>

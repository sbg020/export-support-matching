<script setup lang="ts">
/** 텍스트 입력. 빈 입력은 ''가 아닌 null로 저장한다. */
const model = defineModel<string | null>({ required: true })

withDefaults(
  defineProps<{
    id: string
    describedby?: string
    invalid?: boolean
    placeholder?: string
    type?: 'text' | 'date'
    inputmode?: 'text' | 'numeric' | 'decimal'
    autocomplete?: string
    maxlength?: number
    min?: string
    max?: string
  }>(),
  {
    describedby: undefined,
    invalid: false,
    placeholder: undefined,
    type: 'text',
    inputmode: undefined,
    autocomplete: 'off',
    maxlength: undefined,
    min: undefined,
    max: undefined,
  },
)

const emit = defineEmits<{ blur: [] }>()

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  model.value = value.trim() === '' ? null : value
}

function onBlur() {
  if (model.value !== null) {
    const trimmed = model.value.trim()
    model.value = trimmed === '' ? null : trimmed
  }
  emit('blur')
}
</script>

<template>
  <input
    :id="id"
    class="form-control"
    :type="type"
    :value="model ?? ''"
    :placeholder="placeholder"
    :inputmode="inputmode"
    :autocomplete="autocomplete"
    :maxlength="maxlength"
    :min="min"
    :max="max"
    :aria-describedby="describedby"
    :aria-invalid="invalid ? 'true' : undefined"
    @input="onInput"
    @blur="onBlur"
  />
</template>

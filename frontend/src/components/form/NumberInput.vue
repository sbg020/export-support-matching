<script setup lang="ts">
/**
 * 정수 입력. 빈 입력은 null, 사용자가 입력한 0은 0으로 저장한다.
 * 입력 중에는 숫자만, 입력을 마치면 천 단위 쉼표로 보여 준다.
 */
import { computed, ref } from 'vue'

const model = defineModel<number | null>({ required: true })

const props = withDefaults(
  defineProps<{
    id: string
    describedby?: string
    invalid?: boolean
    placeholder?: string
    unit?: string
    maxDigits?: number
  }>(),
  { describedby: undefined, invalid: false, placeholder: undefined, unit: undefined, maxDigits: 15 },
)

const focused = ref(false)
const draft = ref('')
const formatter = new Intl.NumberFormat('ko-KR')

const displayValue = computed(() => {
  if (focused.value) return draft.value
  return model.value === null ? '' : formatter.format(model.value)
})

const describedbyWithUnit = computed(() => {
  const ids = [props.describedby, props.unit ? `${props.id}-unit` : undefined].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
})

function onFocus() {
  focused.value = true
  draft.value = model.value === null ? '' : String(model.value)
}

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, props.maxDigits)
  draft.value = digits
  input.value = digits
  model.value = digits === '' ? null : Number(digits)
}

function onBlur() {
  focused.value = false
}
</script>

<template>
  <div :class="{ 'input-group': unit }">
    <input
      :id="id"
      class="form-control"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      :value="displayValue"
      :placeholder="placeholder"
      :aria-describedby="describedbyWithUnit"
      :aria-invalid="invalid ? 'true' : undefined"
      @focus="onFocus"
      @input="onInput"
      @blur="onBlur"
    />
    <span v-if="unit" :id="`${id}-unit`" class="input-group-text">
      <span class="visually-hidden">단위: </span>{{ unit }}
    </span>
  </div>
</template>

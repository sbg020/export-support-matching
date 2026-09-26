<script setup lang="ts" generic="T extends string">
/** 카드형 다중 선택(체크박스) */
const model = defineModel<T[]>({ required: true })

withDefaults(
  defineProps<{
    name: string
    options: { value: T; label: string; description?: string }[]
    columns?: 1 | 2 | 3
    describedby?: string
    invalid?: boolean
  }>(),
  { columns: 2, describedby: undefined, invalid: false },
)

function toggle(value: T, checked: boolean) {
  const without = model.value.filter((item) => item !== value)
  model.value = checked ? [...without, value] : without
}
</script>

<template>
  <div class="choice-grid" :class="`choice-grid--${columns}`">
    <label
      v-for="(option, index) in options"
      :key="option.value"
      class="choice-card"
      :class="{ 'is-checked': model.includes(option.value), 'is-invalid': invalid }"
    >
      <input
        :id="`${name}-${index}`"
        type="checkbox"
        class="form-check-input"
        :name="name"
        :value="option.value"
        :checked="model.includes(option.value)"
        :aria-describedby="describedby"
        @change="toggle(option.value, ($event.target as HTMLInputElement).checked)"
      />
      <span class="choice-card__text">
        <span class="choice-card__label">{{ option.label }}</span>
        <span v-if="option.description" class="choice-card__description">{{ option.description }}</span>
      </span>
    </label>
  </div>
</template>

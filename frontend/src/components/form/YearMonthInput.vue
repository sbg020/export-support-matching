<script setup lang="ts">
/** 연·월 선택 (YYYY-MM). 연·월을 모두 골라야 값이 저장되며, 기본값을 채우지 않는다. */
import { ref, watch } from 'vue'

const model = defineModel<string | null>({ required: true })

withDefaults(
  defineProps<{
    id: string
    /** 화면낭독기용 묶음 이름 (예: 시작) */
    label: string
    years: number[]
    describedby?: string
    invalid?: boolean
  }>(),
  { describedby: undefined, invalid: false },
)

const year = ref<number | null>(null)
const month = ref<number | null>(null)

function syncFromModel(value: string | null) {
  const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null
  if (match) {
    year.value = Number(match[1])
    month.value = Number(match[2])
  } else if (value === null && year.value !== null && month.value !== null) {
    year.value = null
    month.value = null
  }
}

watch(model, syncFromModel, { immediate: true })

function commit() {
  model.value =
    year.value !== null && month.value !== null
      ? `${year.value}-${String(month.value).padStart(2, '0')}`
      : null
}

const months = Array.from({ length: 12 }, (_, i) => i + 1)
</script>

<template>
  <div class="year-month">
    <div class="year-month__part">
      <label :for="`${id}-year`" class="visually-hidden">{{ label }} 연도</label>
      <select
        :id="`${id}-year`"
        v-model="year"
        class="form-select"
        :aria-describedby="describedby"
        :aria-invalid="invalid ? 'true' : undefined"
        @change="commit"
      >
        <option :value="null">연도</option>
        <option v-for="y in years" :key="y" :value="y">{{ y }}년</option>
      </select>
    </div>
    <div class="year-month__part">
      <label :for="`${id}-month`" class="visually-hidden">{{ label }} 월</label>
      <select
        :id="`${id}-month`"
        v-model="month"
        class="form-select"
        :aria-describedby="describedby"
        :aria-invalid="invalid ? 'true' : undefined"
        @change="commit"
      >
        <option :value="null">월</option>
        <option v-for="m in months" :key="m" :value="m">{{ m }}월</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.year-month {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: var(--space-2);
}
</style>

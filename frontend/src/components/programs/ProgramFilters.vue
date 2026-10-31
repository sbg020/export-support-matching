<script setup lang="ts">
/**
 * 공고 필터 (접수상태·지원분야·세부 분야·기관 유형·지역·지원방식).
 * 세부 분야 15개는 4개 지원 단계(주 단계)로 묶어 보여 준다. 지역은 전국 대상 공고도 함께 통과한다.
 */
import type { ProgramQuery } from '@/types/program'
import { FILTER_GROUPS, type FilterKey } from '@/composables/useProgramFilters'
import { CATEGORIES_BY_PRIMARY_PHASE, categoryName } from '@/constants/categories'
import { STAGE_OPTIONS, optionLabel } from '@/constants/options'

defineProps<{
  query: ProgramQuery
  idPrefix: string
  activeCount: number
}>()

const emit = defineEmits<{
  toggle: [key: FilterKey, value: string, checked: boolean]
  single: [key: FilterKey, value: string | null]
  reset: []
}>()

const checkboxGroups = FILTER_GROUPS.filter((group) => group.key !== 'regions' && group.key !== 'categories')
const categoryGroup = FILTER_GROUPS.find((group) => group.key === 'categories')!
const regionGroup = FILTER_GROUPS.find((group) => group.key === 'regions')!

function onRegionChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('single', 'regions', value === '' ? null : value)
}
</script>

<template>
  <div class="program-filters">
    <div class="program-filters__head">
      <p class="program-filters__title">필터</p>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :aria-disabled="activeCount === 0 ? 'true' : undefined"
        :aria-describedby="activeCount === 0 ? `${idPrefix}-reset-reason` : undefined"
        @click="activeCount > 0 && emit('reset')"
      >
        초기화
      </button>
      <span v-if="activeCount === 0" :id="`${idPrefix}-reset-reason`" class="visually-hidden">
        적용된 필터가 없습니다.
      </span>
    </div>

    <fieldset v-for="group in checkboxGroups" :key="group.key" class="program-filters__group">
      <legend class="program-filters__legend">{{ group.label }}</legend>
      <div class="program-filters__options">
        <div v-for="option in group.options" :key="option.value" class="form-check">
          <input
            :id="`${idPrefix}-${group.key}-${option.value}`"
            class="form-check-input"
            type="checkbox"
            :checked="(query[group.key] as string[]).includes(option.value)"
            @change="emit('toggle', group.key, option.value, ($event.target as HTMLInputElement).checked)"
          />
          <label class="form-check-label" :for="`${idPrefix}-${group.key}-${option.value}`">
            {{ option.label }}
          </label>
        </div>
      </div>
    </fieldset>

    <fieldset class="program-filters__group">
      <legend class="program-filters__legend">
        {{ categoryGroup.label }}
        <span v-if="query.categories.length > 0" class="program-filters__count">{{ query.categories.length }}개 선택</span>
      </legend>
      <details class="program-filters__phase" v-for="phase in CATEGORIES_BY_PRIMARY_PHASE" :key="phase.stage" :open="phase.codes.some((code) => query.categories.includes(code))">
        <summary>{{ optionLabel(STAGE_OPTIONS, phase.stage) }} ({{ phase.codes.length }})</summary>
        <div class="program-filters__options">
          <div v-for="code in phase.codes" :key="code" class="form-check">
            <input
              :id="`${idPrefix}-categories-${code}`"
              class="form-check-input"
              type="checkbox"
              :checked="query.categories.includes(code)"
              @change="emit('toggle', 'categories', code, ($event.target as HTMLInputElement).checked)"
            />
            <label class="form-check-label" :for="`${idPrefix}-categories-${code}`">
              {{ code }} {{ categoryName(code) }}
            </label>
          </div>
        </div>
      </details>
    </fieldset>

    <div class="program-filters__group">
      <label :for="`${idPrefix}-region`" class="program-filters__legend">{{ regionGroup.label }}</label>
      <select :id="`${idPrefix}-region`" class="form-select" :value="query.regions[0] ?? ''" @change="onRegionChange">
        <option value="">전체 지역</option>
        <option v-for="option in regionGroup.options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <p class="program-filters__hint">전국 대상 공고도 함께 표시됩니다.</p>
    </div>
  </div>
</template>

<style scoped>
.program-filters__count {
  margin-left: 6px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  color: var(--color-primary-strong);
}

.program-filters__phase summary {
  padding: 4px 0;
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
  cursor: pointer;
}

.program-filters__phase .program-filters__options {
  padding: var(--space-1) 0 var(--space-2) var(--space-3);
}

.program-filters__hint {
  margin: 6px 0 0;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.program-filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.program-filters__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.program-filters__title {
  font-size: var(--fs-md);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.program-filters__group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.program-filters__legend {
  display: block;
  float: none;
  width: auto;
  margin-bottom: var(--space-2);
  padding: 0;
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.program-filters__options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.program-filters__options .form-check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  margin: 0;
  padding-left: 0;
}

.program-filters__options .form-check-input {
  float: none;
  margin: 0;
}
</style>

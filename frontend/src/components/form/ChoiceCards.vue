<script setup lang="ts" generic="T extends string | boolean">
/**
 * 카드형 단일 선택(라디오). 선택 전에는 null이며,
 * clearable이면 '선택 해제'로 '아직 입력하지 않음' 상태로 되돌릴 수 있다.
 */
const model = defineModel<T | null>({ required: true })

withDefaults(
  defineProps<{
    name: string
    options: { value: T; label: string; description?: string }[]
    columns?: 1 | 2 | 3
    describedby?: string
    invalid?: boolean
    clearable?: boolean
  }>(),
  { columns: 2, describedby: undefined, invalid: false, clearable: false },
)
</script>

<template>
  <div>
    <div class="choice-grid" :class="`choice-grid--${columns}`">
      <label
        v-for="(option, index) in options"
        :key="String(option.value)"
        class="choice-card"
        :class="{ 'is-checked': model === option.value, 'is-invalid': invalid }"
      >
        <input
          :id="`${name}-${index}`"
          type="radio"
          class="form-check-input"
          :name="name"
          :checked="model === option.value"
          :aria-describedby="describedby"
          @change="model = option.value"
        />
        <span class="choice-card__text">
          <span class="choice-card__label">{{ option.label }}</span>
          <span v-if="option.description" class="choice-card__description">{{ option.description }}</span>
        </span>
      </label>
    </div>
    <button
      v-if="clearable && model !== null"
      type="button"
      class="btn btn-ghost btn-sm choice-clear"
      @click="model = null"
    >
      선택 해제 (아직 입력하지 않음으로 되돌리기)
    </button>
  </div>
</template>

<style>
.choice-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-2);
}

@media (min-width: 576px) {
  .choice-grid--2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .choice-grid--3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.choice-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.choice-card:hover {
  border-color: var(--color-primary);
}

.choice-card.is-checked {
  border-color: var(--color-primary-strong);
  background: var(--color-primary-soft);
  box-shadow: inset 0 0 0 1px var(--color-primary-strong);
}

.choice-card.is-invalid:not(.is-checked) {
  border-color: var(--color-danger-strong);
}

.choice-card.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.choice-card:focus-within {
  outline: 2px solid var(--color-primary-strong);
  outline-offset: 2px;
}

.choice-card .form-check-input {
  flex-shrink: 0;
  margin: 3px 0 0;
}

.choice-card .form-check-input:focus {
  box-shadow: none;
}

.choice-card__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.choice-card__label {
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.choice-card__description {
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.choice-clear {
  margin-top: var(--space-2);
  color: var(--color-text-muted);
  --bs-btn-font-weight: var(--fw-medium);
}
</style>

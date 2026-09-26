<script setup lang="ts">
/** 여러 값을 직접 입력해 추가하는 입력 (Enter 또는 '추가' 버튼) */
import { ref } from 'vue'
import { IconPlus, IconX } from '@tabler/icons-vue'

const model = defineModel<string[]>({ required: true })

withDefaults(
  defineProps<{
    id: string
    describedby?: string
    placeholder?: string
    itemLabel?: string
  }>(),
  { describedby: undefined, placeholder: undefined, itemLabel: '항목' },
)

const draft = ref('')

function add() {
  const value = draft.value.trim()
  if (value === '') return
  if (!model.value.includes(value)) model.value = [...model.value, value]
  draft.value = ''
}

function remove(value: string) {
  model.value = model.value.filter((item) => item !== value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault()
    add()
  }
}
</script>

<template>
  <div class="tag-input">
    <div class="tag-input__row">
      <input
        :id="id"
        v-model="draft"
        class="form-control"
        type="text"
        autocomplete="off"
        :placeholder="placeholder"
        :aria-describedby="describedby"
        @keydown="onKeydown"
      />
      <button type="button" class="btn btn-secondary" @click="add">
        <IconPlus :size="18" stroke-width="2" aria-hidden="true" />
        추가
      </button>
    </div>
    <ul v-if="model.length > 0" class="tag-input__list" :aria-label="`입력한 ${itemLabel} 목록`">
      <li v-for="item in model" :key="item" class="tag-input__chip">
        <span>{{ item }}</span>
        <button type="button" class="tag-input__remove" :aria-label="`${item} 삭제`" @click="remove(item)">
          <IconX :size="14" stroke-width="2.2" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tag-input__row {
  display: flex;
  gap: var(--space-2);
}

.tag-input__list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: var(--space-3) 0 0;
  padding: 0;
  list-style: none;
}

.tag-input__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px 4px 12px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}

.tag-input__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.tag-input__remove:hover {
  background: rgba(31, 99, 219, 0.12);
}
</style>

<script setup lang="ts">
/**
 * 파일 고르기 (REVISION_04 §9.3, §11.3). 끌어다 놓는 영역 + <label for>로 연결한 숨긴 file input.
 * 키보드로 '파일 선택'에 포커스를 두고 Enter·Space로 열 수 있다. 파일은 서버로 보내지 않는다.
 */
import { ref, useId } from 'vue'
import { IconFileUpload } from '@tabler/icons-vue'

defineProps<{
  /** 받는 확장자 (예: .csv) */
  accept: string
  /** 영역 안내 문구 */
  hint: string
}>()

const emit = defineEmits<{ select: [file: File] }>()

const inputId = `${useId()}-file`
const hintId = `${inputId}-hint`
const inputRef = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('select', file)
  // 같은 파일을 다시 골라도 change가 일어나도록 비운다
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) emit('select', file)
}

/** label은 Enter로만 열리는 브라우저가 있어 Space도 연결한다 */
function onKeydown(event: KeyboardEvent) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    inputRef.value?.click()
  }
}

defineExpose({ open: () => inputRef.value?.click() })
</script>

<template>
  <div
    class="file-picker"
    :class="{ 'is-dragging': dragging }"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <IconFileUpload :size="28" stroke-width="1.6" aria-hidden="true" class="file-picker__icon" />
    <p :id="hintId" class="file-picker__hint">{{ hint }}</p>
    <input
      :id="inputId"
      ref="inputRef"
      type="file"
      class="visually-hidden"
      :accept="accept"
      tabindex="-1"
      :aria-describedby="hintId"
      @change="onChange"
    />
    <label :for="inputId" class="btn btn-secondary btn-sm" tabindex="0" role="button" @keydown="onKeydown">
      파일 선택
    </label>
  </div>
</template>

<style scoped>
.file-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  text-align: center;
}

.file-picker.is-dragging {
  border-color: var(--color-primary-strong);
  background: var(--color-primary-soft);
}

.file-picker__icon {
  color: var(--color-text-muted);
}

.file-picker__hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--color-text);
}
</style>

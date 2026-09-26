<script setup lang="ts">
import { ref, useId } from 'vue'
import { IconX } from '@tabler/icons-vue'
import { useFocusTrap } from '@/composables/useFocusTrap'

const open = defineModel<boolean>('open', { required: true })

withDefaults(
  defineProps<{
    title: string
    description?: string
    size?: 'sm' | 'md' | 'lg'
    /** center: 가운데 대화상자, left/right: 옆 서랍, bottom: 아래 시트 */
    placement?: 'center' | 'left' | 'right' | 'bottom'
  }>(),
  { description: undefined, size: 'md', placement: 'center' },
)

const panel = ref<HTMLElement | null>(null)
const titleId = useId()
const descriptionId = useId()

function close() {
  open.value = false
}

useFocusTrap(panel, open, { onEscape: close })
</script>

<template>
  <Teleport to="body">
    <Transition :name="`modal-${placement}`">
      <div v-if="open" class="app-modal" :class="`app-modal--${placement}`" @mousedown.self="close">
        <div
          ref="panel"
          class="app-modal__panel"
          :class="`app-modal__panel--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="description ? descriptionId : undefined"
          tabindex="-1"
        >
          <header class="app-modal__header">
            <div class="app-modal__titles">
              <h2 :id="titleId" class="app-modal__title">{{ title }}</h2>
              <p v-if="description" :id="descriptionId" class="app-modal__description">
                {{ description }}
              </p>
            </div>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="닫기" @click="close">
              <IconX :size="20" stroke-width="2" aria-hidden="true" />
            </button>
          </header>
          <div class="app-modal__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="app-modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-modal {
  position: fixed;
  inset: 0;
  z-index: 1080;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(17, 24, 39, 0.48);
}

.app-modal__panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: calc(100vh - 32px);
  max-height: calc(100dvh - 32px);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  outline: none;
}

.app-modal__panel--sm {
  max-width: 420px;
}

.app-modal__panel--md {
  max-width: 600px;
}

.app-modal__panel--lg {
  max-width: 860px;
}

.app-modal--left,
.app-modal--right {
  padding: 0;
}

.app-modal--left {
  justify-content: flex-start;
}

.app-modal--right {
  justify-content: flex-end;
}

.app-modal--left .app-modal__panel,
.app-modal--right .app-modal__panel {
  height: 100%;
  max-height: 100%;
  max-width: min(360px, 88vw);
  border-radius: 0;
}

.app-modal--bottom {
  align-items: flex-end;
  padding: 0;
}

.app-modal--bottom .app-modal__panel {
  max-width: 100%;
  max-height: 88vh;
  max-height: 88dvh;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.app-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-5) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.app-modal__title {
  margin: 0;
  font-size: var(--fs-lg);
}

.app-modal__description {
  margin-top: 4px;
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.app-modal__body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-5);
}

.app-modal__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}

.modal-center-enter-active,
.modal-center-leave-active,
.modal-left-enter-active,
.modal-left-leave-active,
.modal-right-enter-active,
.modal-right-leave-active,
.modal-bottom-enter-active,
.modal-bottom-leave-active {
  transition: opacity 0.18s ease;
}

.modal-center-enter-from,
.modal-center-leave-to,
.modal-left-enter-from,
.modal-left-leave-to,
.modal-right-enter-from,
.modal-right-leave-to,
.modal-bottom-enter-from,
.modal-bottom-leave-to {
  opacity: 0;
}

.modal-left-enter-active .app-modal__panel,
.modal-left-leave-active .app-modal__panel,
.modal-right-enter-active .app-modal__panel,
.modal-right-leave-active .app-modal__panel,
.modal-bottom-enter-active .app-modal__panel,
.modal-bottom-leave-active .app-modal__panel {
  transition: transform 0.22s ease;
}

.modal-left-enter-from .app-modal__panel,
.modal-left-leave-to .app-modal__panel {
  transform: translateX(-100%);
}

.modal-right-enter-from .app-modal__panel,
.modal-right-leave-to .app-modal__panel {
  transform: translateX(100%);
}

.modal-bottom-enter-from .app-modal__panel,
.modal-bottom-leave-to .app-modal__panel {
  transform: translateY(100%);
}
</style>

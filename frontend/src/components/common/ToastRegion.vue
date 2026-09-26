<script setup lang="ts">
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconX } from '@tabler/icons-vue'
import { useToast } from '@/stores/toastStore'

const { state, dismiss } = useToast()

const ICONS = {
  success: IconCircleCheck,
  info: IconInfoCircle,
  warning: IconAlertTriangle,
  danger: IconAlertTriangle,
}
</script>

<template>
  <div class="toast-region" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div v-for="item in state.items" :key="item.id" class="toast-item" :class="`toast-item--${item.tone}`">
        <component :is="ICONS[item.tone]" :size="18" stroke-width="2" aria-hidden="true" />
        <span class="toast-item__text">{{ item.message }}</span>
        <button type="button" class="toast-item__close" aria-label="알림 닫기" @click="dismiss(item.id)">
          <IconX :size="16" stroke-width="2" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-region {
  position: fixed;
  right: var(--space-5);
  bottom: var(--space-5);
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: min(420px, calc(100vw - 32px));
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 12px 12px 12px 16px;
  border-radius: var(--radius-md);
  background: var(--color-heading);
  color: #fff;
  box-shadow: var(--shadow-lg);
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  pointer-events: auto;
}

.toast-item--success svg:first-child {
  color: #7ee2b1;
}

.toast-item--warning svg:first-child,
.toast-item--danger svg:first-child {
  color: #ffc56b;
}

.toast-item__text {
  flex: 1;
}

.toast-item__close {
  display: inline-flex;
  padding: 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.toast-item__close:hover {
  background: rgba(255, 255, 255, 0.12);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 575.98px) {
  .toast-region {
    right: var(--space-4);
    left: var(--space-4);
    bottom: var(--space-4);
    max-width: none;
  }
}
</style>

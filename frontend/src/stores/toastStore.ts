import { reactive, readonly } from 'vue'

export type ToastTone = 'success' | 'info' | 'warning' | 'danger'

export interface ToastMessage {
  id: number
  message: string
  tone: ToastTone
}

const state = reactive<{ items: ToastMessage[] }>({ items: [] })
let nextId = 1

function dismiss(id: number): void {
  state.items = state.items.filter((item) => item.id !== id)
}

function show(message: string, tone: ToastTone = 'success', durationMs = 4000): void {
  const id = nextId++
  state.items = [...state.items, { id, message, tone }]
  window.setTimeout(() => dismiss(id), durationMs)
}

export function useToast() {
  return { state: readonly(state), show, dismiss }
}

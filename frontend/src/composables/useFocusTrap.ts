import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

let scrollLocks = 0

function lockScroll() {
  scrollLocks += 1
  if (scrollLocks === 1) document.body.style.overflow = 'hidden'
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1)
  if (scrollLocks === 0) document.body.style.overflow = ''
}

/**
 * 모달·서랍 메뉴용 포커스 가두기.
 * 열리면 첫 요소로 포커스를 옮기고 Tab 순환·Esc 닫기를 처리하며,
 * 닫히면 열기 전 요소로 포커스를 돌려준다.
 */
export function useFocusTrap(
  container: Ref<HTMLElement | null>,
  active: Ref<boolean>,
  options: { onEscape?: () => void; initialFocus?: () => HTMLElement | null | undefined } = {},
) {
  let previouslyFocused: HTMLElement | null = null
  let engaged = false

  function focusableElements(): HTMLElement[] {
    const root = container.value
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.getClientRects().length > 0,
    )
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      options.onEscape?.()
      return
    }
    if (event.key !== 'Tab') return
    const items = focusableElements()
    const first = items[0]
    const last = items[items.length - 1]
    if (!first || !last) {
      event.preventDefault()
      container.value?.focus()
      return
    }
    const current = document.activeElement
    if (event.shiftKey && (current === first || !container.value?.contains(current))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (current === last || !container.value?.contains(current))) {
      event.preventDefault()
      first.focus()
    }
  }

  async function engage() {
    if (engaged) return
    engaged = true
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.addEventListener('keydown', onKeydown, true)
    lockScroll()
    await nextTick()
    const target = options.initialFocus?.() ?? focusableElements()[0] ?? container.value
    target?.focus()
  }

  function release() {
    if (!engaged) return
    engaged = false
    document.removeEventListener('keydown', onKeydown, true)
    unlockScroll()
    const toFocus = previouslyFocused
    previouslyFocused = null
    if (toFocus && document.contains(toFocus)) toFocus.focus()
  }

  watch(
    active,
    (isActive) => {
      if (isActive) void engage()
      else release()
    },
    { immediate: true },
  )

  onBeforeUnmount(release)
}

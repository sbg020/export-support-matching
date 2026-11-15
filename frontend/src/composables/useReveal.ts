/*
 * 스크롤 등장 효과 (랜딩페이지, REVISION_05).
 * 요소가 화면에 들어오면 'is-revealed' 클래스를 붙인다. CSS(.reveal)가 옅게 아래에서 올라오게 한다.
 * - 동작 줄이기(prefers-reduced-motion)나 IntersectionObserver가 없는 환경에서는 바로 보이게 한다.
 * - 한 번 보이면 관찰을 멈춘다(다시 숨기지 않는다).
 */
import type { Directive } from 'vue'

let observer: IntersectionObserver | null = null

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

function getObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') return null
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-revealed')
          observer?.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0.08 },
    )
  }
  return observer
}

/** v-reveal: 값으로 지연(ms)을 줄 수 있다 (예: v-reveal="120") */
export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.classList.add('reveal')
    if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`)
    const io = reducedMotion() ? null : getObserver()
    if (!io) {
      el.classList.add('is-revealed')
      return
    }
    io.observe(el)
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}

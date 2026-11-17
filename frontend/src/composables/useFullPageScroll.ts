/*
 * 메인 랜딩 풀페이지 스크롤.
 * - 마우스 휠·트랙패드 한 번(제스처 한 번)에 다음/이전 섹션으로 부드럽게 이동하고 섹션 시작 위치에 멈춘다.
 * - 트랙패드 관성: 한 제스처의 휠 이벤트 흐름이 멈출 때(간격 GESTURE_GAP_MS 이상)까지 다음 이동을 받지 않는다.
 *   관성으로 줄어들던 값이 다시 커지면(새 제스처) 이동 직후 잠깐을 빼고 받는다.
 * - 화면보다 긴 섹션(문제 장면이 쌓이는 섹션 등)은 섹션 안에서 화면 높이만큼씩 멈춘다.
 * - 넓은 화면(992px 이상, 높이 600px 이상)이고 '동작 줄이기'를 쓰지 않을 때만 켠다. 그 밖에는 기본 스크롤.
 * - 키보드: PageDown·PageUp·Space(입력 요소 밖)도 같은 방식으로 이동한다.
 * - 섹션 내용이 한 화면보다 크면 내용 크기를 줄여(CSS zoom, 최소 MIN_ZOOM) 한 화면에 맞춘다.
 *   data-fp-free 섹션(장면이 쌓이는 문제 섹션)은 줄이지 않고 섹션 안에서 여러 번 멈춘다.
 */
import { onBeforeUnmount, onMounted, type Ref } from 'vue'

export const FULLPAGE_MEDIA = '(min-width: 992px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)'
/** 섹션 요소 표시 */
export const FULLPAGE_SECTION_ATTR = 'data-fp-section'
/** 이동 중 매 단계와 끝에 window로 보내는 이벤트 (스크롤 위치에 따라 바뀌는 화면이 듣는다) */
export const FULLPAGE_STEP_EVENT = 'fullpage:step'

const DURATION_MS = 850
/** 이 시간 넘게 휠 이벤트가 없으면 다음 제스처로 본다 */
const GESTURE_GAP_MS = 180
/** 이 시간 넘게 멈췄다가 다시 오면 값과 관계없이 새 제스처 */
const LONG_GAP_MS = 600
/** 이동을 시작할 누적 휠 양 (트랙패드의 작은 떨림 무시) */
const TRIGGER_DELTA = 24
/** 이동이 끝난 직후 이 시간 안에는 새 제스처도 받지 않는다 */
const SETTLE_MS = 350
/** 한 화면에 맞추려고 줄일 수 있는 최소 배율 */
export const MIN_ZOOM = 0.7

/** 한 화면에 맞추는 배율 (내용 높이 natural, 쓸 수 있는 높이 available) */
export function fitZoom(natural: number, available: number): number {
  if (natural <= 0 || natural <= available) return 1
  return Math.max(MIN_ZOOM, Math.floor((available / natural) * 1000) / 1000)
}

export interface SectionBox {
  top: number
  height: number
}

/**
 * 멈출 위치 목록 (문서 기준 scrollY).
 * 섹션 시작은 고정 헤더 아래에 맞춘다(top - header). 화면보다 긴 섹션은 화면(헤더 제외) 높이만큼씩 더 멈추고,
 * 섹션 끝이 화면 아래에 닿는 위치에서도 멈춘다. 마지막으로 문서 끝(바닥글)에서 멈춘다.
 */
export function computeStops(sections: SectionBox[], viewport: number, header: number, maxScroll: number): number[] {
  const page = Math.max(1, viewport - header)
  const raw: number[] = []
  for (const { top, height } of sections) {
    const start = top - header
    raw.push(start)
    const end = top + height - viewport
    if (end > start + 40) {
      for (let y = start + page; y < end - 40; y += page) raw.push(y)
      raw.push(end)
    }
  }
  raw.push(maxScroll)
  const stops: number[] = []
  for (const y of raw.map((v) => Math.round(Math.min(Math.max(v, 0), maxScroll))).sort((a, b) => a - b)) {
    if (stops.length === 0 || y - (stops[stops.length - 1] ?? 0) > 8) stops.push(y)
  }
  return stops
}

/** 지금 위치에서 방향(1 아래, -1 위)으로 다음 멈춤 위치. 없으면 null */
export function nextStop(stops: number[], current: number, direction: 1 | -1): number | null {
  if (direction === 1) return stops.find((y) => y > current + 2) ?? null
  for (let i = stops.length - 1; i >= 0; i -= 1) {
    const y = stops[i]!
    if (y < current - 2) return y
  }
  return null
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function headerHeight(): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--header-height')
  return Number.parseInt(value, 10) || 64
}

/** requestAnimationFrame이 멈춘 환경(숨은 탭 등)에서도 진행되도록 타이머를 함께 건다 */
function nextFrame(cb: (now: number) => void): () => void {
  let done = false
  const run = () => {
    if (done) return
    done = true
    cb(performance.now())
  }
  const raf = requestAnimationFrame(run)
  const timer = window.setTimeout(run, 40)
  return () => {
    done = true
    cancelAnimationFrame(raf)
    window.clearTimeout(timer)
  }
}

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

export function useFullPageScroll(root: Ref<HTMLElement | null>) {
  let media: MediaQueryList | null = null
  let animating = false
  let cancelFrame: (() => void) | null = null
  let resizeTimer = 0
  let observer: ResizeObserver | null = null
  let lastWheelAt = 0
  let lastAbs = 0
  let acc = 0
  /** 지금 제스처가 이미 이동을 일으켰는지 (관성 흐름을 막는다) */
  let consumed = false
  let settledAt = 0

  const enabled = () => Boolean(media?.matches) && root.value !== null && document.body.style.overflow !== 'hidden'

  function stops(): number[] {
    const el = root.value
    if (!el) return []
    const sections = [...el.querySelectorAll<HTMLElement>(`[${FULLPAGE_SECTION_ATTR}]`)].map((s) => {
      const rect = s.getBoundingClientRect()
      return { top: rect.top + window.scrollY, height: rect.height }
    })
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    return computeStops(sections, window.innerHeight, headerHeight(), Math.max(0, maxScroll))
  }

  function animateTo(target: number) {
    const from = window.scrollY
    if (Math.abs(target - from) < 1) return
    animating = true
    const started = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / DURATION_MS)
      window.scrollTo({ top: from + (target - from) * easeInOutCubic(t), behavior: 'instant' })
      window.dispatchEvent(new Event(FULLPAGE_STEP_EVENT))
      if (t < 1) {
        cancelFrame = nextFrame(step)
      } else {
        cancelFrame = null
        window.scrollTo({ top: target, behavior: 'instant' })
        window.dispatchEvent(new Event(FULLPAGE_STEP_EVENT))
        animating = false
        settledAt = performance.now()
      }
    }
    cancelFrame = nextFrame(step)
  }

  function move(direction: 1 | -1): boolean {
    // 이동 직전에 한 화면 맞춤을 다시 확인한다 (내용이 바뀌었을 수 있음, 값이 같으면 레이아웃은 그대로)
    fitSections()
    const target = nextStop(stops(), window.scrollY, direction)
    if (target === null) return false
    animateTo(target)
    return true
  }

  function onWheel(event: WheelEvent) {
    if (!enabled() || event.ctrlKey) return
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return // 가로 스크롤(탭 목록 등)은 그대로
    event.preventDefault()
    const now = performance.now()
    const gap = now - lastWheelAt
    lastWheelAt = now
    // 줄·쪽 단위(일부 마우스 휠)는 픽셀로 바꿔 비교한다
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
    const delta = event.deltaY * unit
    const abs = Math.abs(delta)
    const prevAbs = lastAbs
    const rising = abs > prevAbs * 1.6 && abs > 30
    lastAbs = abs
    const settled = !animating && now - settledAt > SETTLE_MS
    if (gap > GESTURE_GAP_MS) {
      // 이동 중이거나 막 멈춘 직후의 끊김은 같은 제스처(관성)로 본다.
      // 잠깐 끊겼다 이어진 관성은 값이 계속 줄어들므로, 짧은 끊김 뒤에는 값이 줄지 않을 때만 새 제스처로 본다
      // (마우스 휠 한 칸은 값이 일정하다). 오래 멈췄으면 무조건 새 제스처다.
      if (settled && (gap > LONG_GAP_MS || (abs >= prevAbs && abs >= 10))) consumed = false
      acc = 0
    } else if (consumed && rising && settled) {
      consumed = false // 관성이 줄어들다가 다시 커졌다 = 새 제스처
      acc = 0
    }
    if (animating || consumed) return
    acc += delta
    if (Math.abs(acc) < TRIGGER_DELTA) return
    consumed = true
    move(acc > 0 ? 1 : -1)
    acc = 0
  }

  function onKeydown(event: KeyboardEvent) {
    if (!enabled() || event.altKey || event.ctrlKey || event.metaKey || isEditable(event.target)) return
    let direction: 1 | -1 | null = null
    if (event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) direction = 1
    else if (event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) direction = -1
    if (direction === null) return
    if (event.key === ' ' && event.target instanceof HTMLElement && event.target.closest('button, a, [role="tab"]')) return
    event.preventDefault()
    if (!animating) move(direction)
  }

  /** 섹션 내용이 한 화면보다 크면 --fp-zoom으로 줄인다 (넓은 화면에서만) */
  function fitSections() {
    const el = root.value
    if (!el) return
    const sections = [...el.querySelectorAll<HTMLElement>(`[${FULLPAGE_SECTION_ATTR}]:not([data-fp-free])`)]
    if (!media?.matches) {
      for (const s of sections) s.style.removeProperty('--fp-zoom')
      return
    }
    // 재는 동안 섹션 높이가 잠깐 바뀌어도 보던 위치가 밀리지 않게 되돌린다
    const keepY = window.scrollY
    const header = headerHeight()
    for (const s of sections) {
      // 히어로는 헤더 밑까지 깔려 화면 전체, 나머지는 헤더 아래 높이
      const screen = s.hasAttribute('data-fp-full') ? window.innerHeight : window.innerHeight - header
      // 최소 높이를 잠시 풀고 재면 여백·간격까지 포함한 실제 내용 높이가 나온다.
      // 줄이면 줄바꿈이 달라져 높이가 비례하지 않으므로 몇 번 다시 잰다.
      s.style.minHeight = '0'
      let zoom = 1
      for (let i = 0; i < 4; i += 1) {
        s.style.setProperty('--fp-zoom', String(zoom))
        const cs = getComputedStyle(s)
        const padding = Number.parseFloat(cs.paddingTop) + Number.parseFloat(cs.paddingBottom)
        const content = s.getBoundingClientRect().height - padding
        const available = screen - padding
        if (content <= available + 1 || zoom <= MIN_ZOOM) break
        zoom = Math.min(zoom, fitZoom(content / zoom, available), zoom - 0.005)
        zoom = Math.max(MIN_ZOOM, zoom)
      }
      s.style.removeProperty('min-height')
    }
    if (Math.abs(window.scrollY - keepY) > 0.5) window.scrollTo({ top: keepY, behavior: 'instant' })
  }

  function onResize() {
    if (animating) return
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(fitSections, 150)
  }

  onMounted(() => {
    if (typeof window.matchMedia !== 'function') return
    media = window.matchMedia(FULLPAGE_MEDIA)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('resize', onResize)
    fitSections()
    void document.fonts?.ready.then(fitSections)
    window.addEventListener('load', fitSections, { once: true })
    // 내용이 나중에 바뀌면(예시 화면이 채워지는 등) 다시 맞춘다
    if (typeof ResizeObserver === 'function' && root.value) {
      observer = new ResizeObserver(onResize)
      for (const child of root.value.querySelectorAll(`[${FULLPAGE_SECTION_ATTR}] > *`)) observer.observe(child)
    }
  })

  onBeforeUnmount(() => {
    cancelFrame?.()
    observer?.disconnect()
    window.clearTimeout(resizeTimer)
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('load', fitSections)
  })
}

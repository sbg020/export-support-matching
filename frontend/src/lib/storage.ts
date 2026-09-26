/** 브라우저 저장소 접근. 차단된 환경에서는 null을 반환한다. */
export function getLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    const probe = '__export_matching_probe__'
    window.localStorage.setItem(probe, probe)
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

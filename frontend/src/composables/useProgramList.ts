import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { programRepository } from '@/repositories'
import type { Program, ProgramQuery } from '@/types/program'

export type LoadStatus = 'loading' | 'ready' | 'error'

/**
 * 공고 목록 불러오기. 실제 요청 중일 때만 'loading'이며,
 * 데이터가 없는 상태('ready' + 빈 배열)와 구분한다.
 */
export function useProgramList(query: Ref<ProgramQuery>) {
  const status = ref<LoadStatus>('loading')
  const items = ref<Program[]>([])
  const total = ref<number | null>(null)
  /** 짧은 요청에서 로딩 표시가 깜박이지 않도록 조금 늦게 보여 준다. */
  const showLoading = ref(false)
  let requestId = 0
  let loadingTimer: number | undefined

  async function load() {
    const id = ++requestId
    status.value = 'loading'
    window.clearTimeout(loadingTimer)
    loadingTimer = window.setTimeout(() => {
      if (id === requestId && status.value === 'loading') showLoading.value = true
    }, 200)
    try {
      const result = await programRepository.list(query.value)
      if (id !== requestId) return
      items.value = result.items
      total.value = result.total
      status.value = 'ready'
    } catch {
      if (id !== requestId) return
      items.value = []
      total.value = null
      status.value = 'error'
    } finally {
      if (id === requestId) {
        window.clearTimeout(loadingTimer)
        showLoading.value = false
      }
    }
  }

  watch(query, load, { immediate: true })
  onBeforeUnmount(() => window.clearTimeout(loadingTimer))

  return {
    status,
    items,
    total,
    showLoading,
    reload: load,
    sourceConnected: programRepository.source.kind === 'api',
  }
}

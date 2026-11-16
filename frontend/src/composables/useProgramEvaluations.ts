/*
 * 공고 전체의 자격·적합도·기회비용 (화면 공통).
 *
 * 전체 공고를 한 번 읽어 두고(화면 필터와 무관), 프로필·직접 확인 답이 바뀌면 다시 계산한다.
 * 맞춤 추천·전체 공고·상세·비교·둘러보기·지원사업 관리가 같은 결과를 쓴다.
 */
import { computed, shallowRef } from 'vue'
import { createEmptyQuery, dataBasisDate, programRepository } from '@/repositories'
import { evaluateAll, type ProgramEvaluation } from '@/lib/engine/evaluateAll'
import { useProfileStore } from '@/stores/profileStore'
import { useSelfChecks } from '@/stores/selfCheckStore'
import type { Program } from '@/types/program'

const allPrograms = shallowRef<Program[] | null>(null)
let loading: Promise<void> | null = null

function ensureAllPrograms(): Promise<void> {
  if (!loading) {
    loading = programRepository
      .list(createEmptyQuery())
      .then((result) => {
        allPrograms.value = result.items
      })
      .catch(() => {
        allPrograms.value = []
        loading = null
      })
  }
  return loading
}

/** 전체 공고를 다 읽을 때까지 기다린다 (챗봇처럼 필요할 때만 읽는 화면용) */
export function loadAllPrograms(): Promise<void> {
  return ensureAllPrograms()
}

export function useProgramEvaluations() {
  void ensureAllPrograms()
  const profileStore = useProfileStore()
  const selfChecks = useSelfChecks()
  /** 데이터 기준일 (지금은 항상 null, 다음 개정에서 API의 meta.asOf). 시스템 날짜를 쓰지 않는다 */
  const asOf = dataBasisDate(programRepository.source)

  const set = computed(() =>
    evaluateAll(allPrograms.value ?? [], profileStore.state.profile, {
      asOf,
      selfChecks: selfChecks.answers.value,
    }),
  )

  return {
    /** 전체 공고를 다 읽었는지 */
    ready: computed(() => allPrograms.value !== null),
    asOf,
    programs: computed(() => allPrograms.value ?? []),
    diagnosis: computed(() => set.value.diagnosis),
    /** 판정 엔진 입력 (사업자등록번호·대표자명·연락처 없음) */
    engineProfile: computed(() => set.value.engineProfile),
    evaluations: computed(() => set.value.byId),
    get: (id: string): ProgramEvaluation | undefined => set.value.byId.get(id),
  }
}

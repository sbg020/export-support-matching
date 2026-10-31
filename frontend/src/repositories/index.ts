import datasetMeta from '@/data/test-dataset.meta.json'
import type { DatasetMeta } from '@/types/dataset'
import { EmptyProgramRepository } from './emptyProgramRepository'
import { HttpProgramRepository } from './httpProgramRepository'
import type { ProgramRepository } from './programRepository'
import { StaticProgramRepository } from './staticProgramRepository'

export type { DataSourceStatus, ProgramRepository } from './programRepository'
export { createEmptyQuery, dataBasisDate, isSourceConnected } from './programRepository'

/**
 * 저장소 선택 순서: API 주소가 있으면 API → VITE_DATA_SOURCE=test-dataset이면 테스트 데이터셋 → 빈 저장소.
 * 테스트 실행 환경은 vitest.config.ts에서 두 값을 비워 빈 저장소를 쓴다.
 */
function createProgramRepository(): ProgramRepository {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (baseUrl) return new HttpProgramRepository(baseUrl)
  if ((import.meta.env.VITE_DATA_SOURCE ?? '').trim() === 'test-dataset') {
    return new StaticProgramRepository(datasetMeta as DatasetMeta)
  }
  return new EmptyProgramRepository()
}

/** 앱 전체에서 사용하는 공고 저장소 */
export const programRepository: ProgramRepository = createProgramRepository()

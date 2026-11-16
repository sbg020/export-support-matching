import { EmptyProgramRepository } from './emptyProgramRepository'
import { HttpProgramRepository } from './httpProgramRepository'
import { PublishedProgramRepository } from './publishedProgramRepository'
import type { ProgramRepository } from './programRepository'

export type { DataSourceStatus, ProgramRepository } from './programRepository'
export { createEmptyQuery, dataBasisDate, isSourceConnected } from './programRepository'

/**
 * 저장소 선택 (REVISION_05): API 주소가 있으면 API, 없으면 게시 공고 스냅샷.
 * VITE_PUBLISHED_SNAPSHOT=off 이면 빈 저장소 (테스트 실행 환경의 빈 상태 검사용, vitest.config.ts).
 */
function createProgramRepository(): ProgramRepository {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (baseUrl) return new HttpProgramRepository(baseUrl)
  if ((import.meta.env.VITE_PUBLISHED_SNAPSHOT ?? '').trim() === 'off') return new EmptyProgramRepository()
  return new PublishedProgramRepository()
}

/** 앱 전체에서 사용하는 공고 저장소 */
export const programRepository: ProgramRepository = createProgramRepository()

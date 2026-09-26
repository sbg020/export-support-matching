import { EmptyProgramRepository } from './emptyProgramRepository'
import { HttpProgramRepository } from './httpProgramRepository'
import type { ProgramRepository } from './programRepository'

export type { DataSourceStatus, ProgramRepository } from './programRepository'
export { createEmptyQuery } from './programRepository'

function createProgramRepository(): ProgramRepository {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (baseUrl) return new HttpProgramRepository(baseUrl)
  return new EmptyProgramRepository()
}

/** 앱 전체에서 사용하는 공고 저장소 */
export const programRepository: ProgramRepository = createProgramRepository()

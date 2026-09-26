import type { Program, ProgramListResult } from '@/types/program'
import type { DataSourceStatus, ProgramRepository } from './programRepository'

/**
 * 공고 데이터 소스가 연결되지 않은 상태의 구현.
 * 목록은 항상 빈 배열이고 건수는 null(화면 표시 '-')이다.
 */
export class EmptyProgramRepository implements ProgramRepository {
  readonly source: DataSourceStatus = { kind: 'not-connected' }

  async list(): Promise<ProgramListResult> {
    return { items: [], total: null }
  }

  async getById(): Promise<Program | null> {
    return null
  }

  async getByIds(): Promise<Program[]> {
    return []
  }
}

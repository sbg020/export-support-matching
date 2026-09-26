/*
 * 공고 데이터 읽기 경계.
 *
 * 화면은 이 인터페이스만 사용한다. 현재 기본 구현(EmptyProgramRepository)은
 * 빈 배열을 반환하며, 이는 '실제 공고 데이터가 아직 없음'을 뜻한다. 샘플 공고가 아니다.
 * 검증된 공고 API가 준비되면 HttpProgramRepository로 교체한다.
 */
import type { Program, ProgramListResult, ProgramQuery } from '@/types/program'

export type DataSourceStatus =
  | { kind: 'not-connected' }
  | { kind: 'api'; baseUrl: string }

export interface ProgramRepository {
  readonly source: DataSourceStatus
  list(query: ProgramQuery): Promise<ProgramListResult>
  /** 조회되지 않으면 null */
  getById(id: string): Promise<Program | null>
  /** 조회된 공고만 반환한다. 없는 ID는 결과에서 빠진다. */
  getByIds(ids: string[]): Promise<Program[]>
}

export function createEmptyQuery(): ProgramQuery {
  return {
    keyword: null,
    receptionStatuses: [],
    stages: [],
    agencyTypes: [],
    regions: [],
    supportTypes: [],
    sort: 'recommended',
  }
}

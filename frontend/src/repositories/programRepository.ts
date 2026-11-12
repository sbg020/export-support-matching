/*
 * 공고 데이터 읽기 경계.
 *
 * 화면은 이 인터페이스만 사용한다. 구현은 두 가지다.
 * - EmptyProgramRepository: 빈 배열 ('실제 공고 데이터가 아직 없음'. 예시 공고가 아니다)
 * - HttpProgramRepository: 관리자가 검수·게시한 공고 API
 */
import type { IsoDate } from '@/types/common'
import type { Program, ProgramListResult, ProgramQuery } from '@/types/program'

export type DataSourceStatus = { kind: 'not-connected' } | { kind: 'api'; baseUrl: string }

export interface ProgramRepository {
  readonly source: DataSourceStatus
  list(query: ProgramQuery): Promise<ProgramListResult>
  /** 조회되지 않으면 null */
  getById(id: string): Promise<Program | null>
  /** 조회된 공고만 반환한다. 없는 ID는 결과에서 빠진다. */
  getByIds(ids: string[]): Promise<Program[]>
}

/** 공고 데이터가 연결되어 있는지 */
export function isSourceConnected(source: DataSourceStatus): boolean {
  return source.kind !== 'not-connected'
}

/**
 * 접수상태·마감 여유를 계산하는 데이터 기준일. 지금은 항상 null이다(시스템 날짜로 대신하지 않는다).
 * 다음 개정에서 API 응답의 기준일(meta.asOf)을 돌려주도록 바꾼다 (REVISION_04 §3.3, §13.2).
 */
export function dataBasisDate(source: DataSourceStatus): IsoDate | null {
  void source
  return null
}

export function createEmptyQuery(): ProgramQuery {
  return {
    keyword: null,
    receptionStatuses: [],
    stages: [],
    categories: [],
    agencyTypes: [],
    regions: [],
    supportTypes: [],
    sort: 'recommended',
  }
}

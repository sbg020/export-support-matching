/*
 * 공고 데이터 읽기 경계.
 *
 * 화면은 이 인터페이스만 사용한다. 구현은 세 가지다.
 * - PublishedProgramRepository: 게시 공고 스냅샷 (REVISION_05, 정답세트 + 게시된 자동 추출 공고. 기본값)
 * - HttpProgramRepository: 관리자가 검수·게시한 공고 API (VITE_API_BASE_URL)
 * - EmptyProgramRepository: 빈 배열 ('실제 공고 데이터가 아직 없음'. 예시 공고가 아니다)
 */
import type { IsoDate } from '@/types/common'
import type { Program, ProgramListResult, ProgramQuery } from '@/types/program'

export type DataSourceStatus =
  | { kind: 'not-connected' }
  | { kind: 'api'; baseUrl: string }
  /** 게시 공고 스냅샷: 데이터 기준일과 버전 (backend export_public_snapshot) */
  | { kind: 'published'; asOf: IsoDate; dataVersion: string }

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
 * 접수상태·마감 여유·업력을 계산하는 데이터 기준일. 시스템 날짜로 대신하지 않는다.
 * 게시 스냅샷이면 스냅샷 기준일(정답세트 작성일), API·미연결이면 null.
 */
export function dataBasisDate(source: DataSourceStatus): IsoDate | null {
  return source.kind === 'published' ? source.asOf : null
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

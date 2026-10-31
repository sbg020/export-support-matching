/*
 * 공고 데이터 읽기 경계.
 *
 * 화면은 이 인터페이스만 사용한다. 구현은 세 가지다.
 * - EmptyProgramRepository: 빈 배열 ('실제 공고 데이터가 아직 없음'. 샘플 공고가 아니다)
 * - StaticProgramRepository: 정답 세트 초안에서 만든 테스트 데이터셋 (사람 검수 전)
 * - HttpProgramRepository: 검증된 공고 API
 */
import type { IsoDate } from '@/types/common'
import type { DataState, Program, ProgramListResult, ProgramQuery } from '@/types/program'

export type DataSourceStatus =
  | { kind: 'not-connected' }
  | { kind: 'api'; baseUrl: string }
  | {
      kind: 'test-dataset'
      /** 데이터 기준일 */
      asOf: IsoDate
      datasetVersion: string
      /** 공고 행 수 (세부사업 포함) */
      programCount: number
      /** 원공고 수 */
      announcementCount: number
      dataState: DataState
    }

export interface ProgramRepository {
  readonly source: DataSourceStatus
  list(query: ProgramQuery): Promise<ProgramListResult>
  /** 조회되지 않으면 null */
  getById(id: string): Promise<Program | null>
  /** 조회된 공고만 반환한다. 없는 ID는 결과에서 빠진다. */
  getByIds(ids: string[]): Promise<Program[]>
}

/** 공고 데이터가 연결되어 있는지 (테스트 데이터셋 포함) */
export function isSourceConnected(source: DataSourceStatus): boolean {
  return source.kind !== 'not-connected'
}

/** 접수상태·마감 여유를 계산하는 데이터 기준일. 테스트 데이터셋이 아니면 null */
export function dataBasisDate(source: DataSourceStatus): IsoDate | null {
  return source.kind === 'test-dataset' ? source.asOf : null
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

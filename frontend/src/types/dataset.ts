import type { IsoDate } from './common'
import type { DataState, Program } from './program'

/**
 * 테스트 데이터셋 JSON (frontend/src/data/test-dataset.json) 형식.
 * tools/dataset/build_test_dataset.py가 정답 세트 초안에서 만든다. 손으로 고치지 않는다.
 */

export interface DatasetSource {
  file: string
  sha256: string
  rows: Record<string, number>
}

export interface DatasetMeta {
  schemaVersion: number
  /** 예: test-2026-10-30 */
  datasetVersion: string
  /** 데이터 기준일. 접수상태·마감 여유·새로 올라온 공고는 이 날짜로 계산한다 */
  asOf: IsoDate
  /** 공고 중 가장 낮은 데이터 상태 */
  dataState: DataState
  sources: DatasetSource[]
  inventory: { file: string; sha256: string }
  sourceUrls: { file: string; sha256: string; rows: number } | null
  counts: {
    announcements: number
    programs: number
    rules: number
    bonuses: number
    documents: number
  }
}

/** JSON에 들어 있는 공고. 지원 단계·관심 분야·stage는 저장소가 읽을 때 채운다. */
export type DatasetProgram = Omit<Program, 'stage' | 'supportPhases' | 'supportAreas'>

export interface TestDatasetFile {
  meta: DatasetMeta
  programs: DatasetProgram[]
}

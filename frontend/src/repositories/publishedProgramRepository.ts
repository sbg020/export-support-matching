/*
 * 게시 공고 스냅샷 저장소 (REVISION_05). 서버 DB가 없는 배포 환경에서 쓰는 기본 저장소다.
 * - 데이터: src/data/published/notices.json (backend `export_public_snapshot`이 만든다. 손으로 고치지 않는다)
 * - 게시(published) 공고만 들어 있다. 동적 import로 따로 불러 첫 화면 번들에 넣지 않는다.
 * - 검색·필터·정렬은 브라우저에서 한다 (lib/programQuery.ts).
 */
import type { IsoDate } from '@/types/common'
import type { Program, ProgramListResult, ProgramQuery } from '@/types/program'
import { filterPrograms, normalizeProgram, sortPrograms, type RawProgram } from '@/lib/programQuery'
import type { DataSourceStatus, ProgramRepository } from './programRepository'

/** 스냅샷 기준일·버전 (빌드 시 상수. 스냅샷을 다시 만들면 함께 바꾼다) */
export const PUBLISHED_AS_OF: IsoDate = '2026-11-13'
export const PUBLISHED_DATA_VERSION = 'published-2026-11-13'

export interface PublishedSnapshot {
  meta: { schemaVersion: number; asOf: IsoDate; dataVersion: string; counts: Record<string, number> }
  conditionTypes: { code: string; group: string; name: string; mode: string; defaultImportance: string }[]
  notices: RawProgram[]
}

let cache: Promise<Program[]> | null = null

export function loadPublishedSnapshot(): Promise<PublishedSnapshot> {
  return import('@/data/published/notices.json').then((m) => m.default as unknown as PublishedSnapshot)
}

function loadPrograms(): Promise<Program[]> {
  cache ??= loadPublishedSnapshot().then((s) => s.notices.map((raw) => normalizeProgram(raw)))
  return cache
}

export class PublishedProgramRepository implements ProgramRepository {
  readonly source: DataSourceStatus = { kind: 'published', asOf: PUBLISHED_AS_OF, dataVersion: PUBLISHED_DATA_VERSION }

  async list(query: ProgramQuery): Promise<ProgramListResult> {
    const all = await loadPrograms()
    const items = sortPrograms(filterPrograms(all, query), query.sort)
    return { items, total: items.length }
  }

  async getById(id: string): Promise<Program | null> {
    return (await loadPrograms()).find((p) => p.id === id) ?? null
  }

  async getByIds(ids: string[]): Promise<Program[]> {
    const all = await loadPrograms()
    return ids.map((id) => all.find((p) => p.id === id)).filter((p): p is Program => Boolean(p))
  }
}

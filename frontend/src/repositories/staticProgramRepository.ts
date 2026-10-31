import { categoryName, deriveSupportAreas, deriveSupportPhases } from '@/constants/categories'
import type { DatasetMeta, DatasetProgram, TestDatasetFile } from '@/types/dataset'
import type { Program, ProgramListResult, ProgramQuery, ProgramSort } from '@/types/program'
import type { DataSourceStatus, ProgramRepository } from './programRepository'

/*
 * 정답 세트 초안에서 만든 테스트 데이터셋(사람 검수 전)을 읽는 저장소.
 * 검색·필터·정렬은 브라우저에서 한다. 추천순은 ID순으로 돌려주고, 화면이 자격·적합도로 다시 정렬한다.
 */

export type DatasetLoader = () => Promise<TestDatasetFile>

/** 테스트 데이터셋 JSON을 별도 청크로 읽는다 (첫 화면 번들에 넣지 않음) */
export async function loadTestDataset(): Promise<TestDatasetFile> {
  const module = await import('@/data/test-dataset.json?raw')
  return JSON.parse(module.default) as TestDatasetFile
}

/** JSON 공고에 지원 단계·관심 분야(세부 분야에서 파생)를 채운다 */
export function normalizeDatasetProgram(raw: DatasetProgram): Program {
  return {
    ...raw,
    stage: null,
    supportPhases: deriveSupportPhases(raw.supportCategories),
    supportAreas: deriveSupportAreas(raw.supportCategories),
  }
}

const idCollator = new Intl.Collator('ko', { numeric: true })

export function compareProgramIds(a: string, b: string): number {
  return idCollator.compare(a, b)
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '')
}

/** 검색 대상: 공고명, 세부사업명, 주관·수행기관, 세부 분야 이름, 금액 메모, 원문 파일명 */
function searchText(program: Program): string {
  const categories = program.supportCategories ?? []
  return normalize(
    [
      program.title,
      program.subProgramName,
      program.ministry,
      program.agency,
      ...categories,
      ...categories.map(categoryName),
      program.amountNote,
      program.sourceFile,
    ]
      .filter((part): part is string => typeof part === 'string')
      .join(' '),
  )
}

export function matchesKeyword(program: Program, keyword: string): boolean {
  const tokens = keyword.split(/\s+/).map(normalize).filter(Boolean)
  if (tokens.length === 0) return true
  const haystack = searchText(program)
  return tokens.every((token) => haystack.includes(token))
}

function intersects<T>(values: readonly T[] | null, wanted: readonly T[]): boolean {
  return values !== null && values.some((value) => wanted.includes(value))
}

export function filterPrograms(programs: readonly Program[], query: ProgramQuery): Program[] {
  return programs.filter(
    (p) =>
      (!query.keyword || matchesKeyword(p, query.keyword)) &&
      (query.receptionStatuses.length === 0 ||
        (p.receptionStatus !== null && query.receptionStatuses.includes(p.receptionStatus))) &&
      (query.stages.length === 0 || intersects(p.supportPhases, query.stages)) &&
      (query.categories.length === 0 || intersects(p.supportCategories, query.categories)) &&
      (query.agencyTypes.length === 0 || (p.agencyType !== null && query.agencyTypes.includes(p.agencyType))) &&
      // 선택한 지역의 공고와 함께 전국 대상 공고도 보여 준다
      (query.regions.length === 0 || intersects(p.regions, [...query.regions, 'nationwide'])) &&
      (query.supportTypes.length === 0 || intersects(p.supportTypes, query.supportTypes)),
  )
}

function dateKey(value: string | null): string | null {
  return value ? value.slice(0, 10) : null
}

/** 값이 없으면 뒤로, 같으면 ID순. 마감 임박순은 이미 마감된 공고를 접수중·예정 공고 뒤에 둔다 */
export function sortPrograms(programs: readonly Program[], sort: ProgramSort): Program[] {
  const byId = (a: Program, b: Program) => compareProgramIds(a.id, b.id)
  const copy = [...programs]
  if (sort === 'deadline') {
    const closed = (p: Program) => (p.receptionStatus === 'closed' ? 1 : 0)
    return copy.sort((a, b) => {
      if (closed(a) !== closed(b)) return closed(a) - closed(b)
      const da = dateKey(a.applyEnd)
      const db = dateKey(b.applyEnd)
      if (da !== db) {
        if (da === null) return 1
        if (db === null) return -1
        return da < db ? -1 : 1
      }
      return byId(a, b)
    })
  }
  if (sort === 'amount') {
    return copy.sort((a, b) => {
      if (a.maxAmountKrw !== b.maxAmountKrw) {
        if (a.maxAmountKrw === null) return 1
        if (b.maxAmountKrw === null) return -1
        return b.maxAmountKrw - a.maxAmountKrw
      }
      return byId(a, b)
    })
  }
  return copy.sort(byId)
}

export class StaticProgramRepository implements ProgramRepository {
  readonly source: DataSourceStatus
  private loading: Promise<Program[]> | null = null

  constructor(
    meta: DatasetMeta,
    private readonly loader: DatasetLoader = loadTestDataset,
  ) {
    this.source = {
      kind: 'test-dataset',
      asOf: meta.asOf,
      datasetVersion: meta.datasetVersion,
      programCount: meta.counts.programs,
      announcementCount: meta.counts.announcements,
      dataState: meta.dataState,
    }
  }

  private all(): Promise<Program[]> {
    if (!this.loading) {
      this.loading = this.loader()
        .then((file) => file.programs.map(normalizeDatasetProgram))
        .catch((error: unknown) => {
          this.loading = null
          throw error
        })
    }
    return this.loading
  }

  async list(query: ProgramQuery): Promise<ProgramListResult> {
    const items = sortPrograms(filterPrograms(await this.all(), query), query.sort)
    return { items, total: items.length }
  }

  async getById(id: string): Promise<Program | null> {
    return (await this.all()).find((program) => program.id === id) ?? null
  }

  async getByIds(ids: string[]): Promise<Program[]> {
    const all = await this.all()
    return ids
      .map((id) => all.find((program) => program.id === id))
      .filter((program): program is Program => program !== undefined)
  }
}

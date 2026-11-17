import { categoryName, deriveSupportAreas, deriveSupportPhases } from '@/constants/categories'
import type { Program, ProgramQuery, ProgramSort } from '@/types/program'

/*
 * 공고 목록의 검색·필터·정렬 (순수 함수).
 * 전체 공고 정렬과 다음 개정의 API 저장소·관리자 화면에서 다시 쓴다 (REVISION_04 §3.3).
 */

/** 원천 공고 (정답세트·업로드 등). 지원 단계·관심 분야·stage는 normalizeProgram이 채운다 */
export type RawProgram = Omit<Program, 'stage' | 'supportPhases' | 'supportAreas'>

/** 원천 공고에 지원 단계·관심 분야(세부 분야에서 파생)를 채운다 */
export function normalizeProgram(raw: RawProgram): Program {
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
/**
 * 정렬. 조회순(views)은 조회 수(viewCounts)가 있을 때만 많이 본 순서이고, 없으면(집계 전) ID 순이다.
 * 조회 수를 지어내거나 기기별 기록으로 대신하지 않는다.
 */
export function sortPrograms(
  programs: readonly Program[],
  sort: ProgramSort,
  viewCounts: ReadonlyMap<string, number> | null = null,
): Program[] {
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
  if (sort === 'views' && viewCounts) {
    return copy.sort((a, b) => (viewCounts.get(b.id) ?? 0) - (viewCounts.get(a.id) ?? 0) || byId(a, b))
  }
  return copy.sort(byId)
}

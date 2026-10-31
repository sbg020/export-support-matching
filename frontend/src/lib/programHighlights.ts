/*
 * 둘러보기: 새로 올라온 공고 · 많이 본 공고 (순수 함수). REVISION_02 §9
 *
 * - 새로 올라온 공고: 게시일 기준 데이터 기준일 이전 30일, 접수중·접수예정만, 같은 원공고·같은 그룹은 1줄.
 *   모자라도 기간 밖 공고로 채우지 않는다.
 * - 많이 본 공고: 실제 현재 시각 기준 최근 7일, 같은 방문자의 같은 공고는 하루 1회만 센다.
 *   순 방문자 10명 이상인 공고가 3개 이상일 때만 목록을 만든다. 이 순위는 추천 점수에 섞지 않는다.
 *   (봇·내부 접속 제외는 이벤트를 받는 서버가 한다)
 */
import type { IsoDate } from '@/types/common'
import type { Program } from '@/types/program'
import type { ProgramViewEvent } from '@/repositories/viewEventSink'
import { daysBetween } from '@/lib/engine/opportunityCost'
import { compareProgramIds } from '@/repositories/staticProgramRepository'

export const NEW_PROGRAM_WINDOW_DAYS = 30
export const HIGHLIGHT_LIMIT = 10
export const MOST_VIEWED_WINDOW_DAYS = 7
export const MIN_UNIQUE_VISITORS = 10
export const MIN_RANKED_PROGRAMS = 3

export interface NewProgramLine {
  program: Program
  /** 함께 묶인 공고 수 (대표 포함) */
  groupSize: number
  /** 추가모집·재공고 */
  isAdditional: boolean
}

export interface NewProgramsResult {
  items: NewProgramLine[]
  /** 게시일이 없어 제외한 공고 수 */
  excludedNoDate: number
}

const ADDITIONAL_PATTERN = /추가\s*모집|재\s*공고|재\s*모집|연장\s*공고/

export function isAdditionalRecruitment(program: Program): boolean {
  return ADDITIONAL_PATTERN.test(`${program.title ?? ''} ${program.subProgramName ?? ''}`)
}

function dateKey(value: string | null): string | null {
  return value ? value.slice(0, 10) : null
}

/** 게시일 최신순 → 마감 빠른 순(없으면 뒤) → ID */
function compareNew(a: Program, b: Program): number {
  const pa = dateKey(a.sourcePublishedAt) ?? ''
  const pb = dateKey(b.sourcePublishedAt) ?? ''
  if (pa !== pb) return pa < pb ? 1 : -1
  const ea = dateKey(a.applyEnd)
  const eb = dateKey(b.applyEnd)
  if (ea !== eb) {
    if (ea === null) return 1
    if (eb === null) return -1
    return ea < eb ? -1 : 1
  }
  return compareProgramIds(a.id, b.id)
}

/** 같은 원공고(parentId)·같은 그룹(groupKey)을 하나로 묶는다 */
function groupPrograms(programs: readonly Program[]): Program[][] {
  const parent = new Map<string, string>()
  const find = (key: string): string => {
    if (!parent.has(key)) parent.set(key, key)
    let root = key
    for (let next = parent.get(root)!; next !== root; next = parent.get(root)!) root = next
    parent.set(key, root)
    return root
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(rb, ra)
  }
  for (const program of programs) {
    const self = `id:${program.id}`
    union(self, `parent:${program.parentId ?? program.id}`)
    if (program.groupKey) union(self, `group:${program.groupKey}`)
  }
  const groups = new Map<string, Program[]>()
  for (const program of programs) {
    const root = find(`id:${program.id}`)
    groups.set(root, [...(groups.get(root) ?? []), program])
  }
  return Array.from(groups.values())
}

export function selectNewPrograms(programs: readonly Program[], asOf: IsoDate | null): NewProgramsResult {
  const excludedNoDate = programs.filter((p) => p.sourcePublishedAt === null).length
  if (asOf === null) return { items: [], excludedNoDate }
  const inWindow = programs.filter((p) => {
    if (p.sourcePublishedAt === null) return false
    if (p.receptionStatus !== 'open' && p.receptionStatus !== 'upcoming') return false
    const days = daysBetween(dateKey(p.sourcePublishedAt) ?? '', asOf)
    return days !== null && days >= 0 && days <= NEW_PROGRAM_WINDOW_DAYS
  })
  const items = groupPrograms(inWindow)
    .map((group) => {
      const sorted = [...group].sort(compareNew)
      const representative = sorted[0]!
      return {
        program: representative,
        groupSize: group.length,
        isAdditional: group.some(isAdditionalRecruitment),
      }
    })
    .sort((a, b) => compareNew(a.program, b.program))
    .slice(0, HIGHLIGHT_LIMIT)
  return { items, excludedNoDate }
}

export interface MostViewedLine {
  program: Program
  uniqueVisitors: number
}

/**
 * 많이 본 공고. 조회 데이터가 충분하지 않으면 null('조회 데이터가 충분히 모이면 표시합니다.').
 * savedCounts는 관심 저장 수(있으면 두 번째 정렬 기준).
 */
export function rankMostViewed(
  events: readonly ProgramViewEvent[],
  programs: readonly Program[],
  now: Date,
  savedCounts: ReadonlyMap<string, number> = new Map(),
): MostViewedLine[] | null {
  const end = now.getTime()
  const start = end - MOST_VIEWED_WINDOW_DAYS * 86_400_000
  const seen = new Set<string>()
  const visitors = new Map<string, number>()
  for (const event of events) {
    const time = Date.parse(event.occurredAt)
    if (Number.isNaN(time) || time <= start || time > end) continue
    const key = `${event.programId}|${event.visitorKey}|${event.occurredAt.slice(0, 10)}`
    if (seen.has(key)) continue
    seen.add(key)
    visitors.set(event.programId, (visitors.get(event.programId) ?? 0) + 1)
  }
  const byId = new Map(programs.map((p) => [p.id, p]))
  const ranked = Array.from(visitors, ([id, count]) => ({ program: byId.get(id), uniqueVisitors: count }))
    .filter(
      (line): line is MostViewedLine =>
        line.program !== undefined && line.program.receptionStatus !== 'closed' && line.uniqueVisitors >= MIN_UNIQUE_VISITORS,
    )
    .sort((a, b) => {
      if (a.uniqueVisitors !== b.uniqueVisitors) return b.uniqueVisitors - a.uniqueVisitors
      const sa = savedCounts.get(a.program.id) ?? 0
      const sb = savedCounts.get(b.program.id) ?? 0
      if (sa !== sb) return sb - sa
      return compareNew(a.program, b.program)
    })
  if (ranked.length < MIN_RANKED_PROGRAMS) return null
  return ranked.slice(0, HIGHLIGHT_LIMIT)
}

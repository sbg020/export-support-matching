/*
 * 재무 원형 기준표 v4 (REVISION_06_FINANCE_REFERENCE) 와 판정 함수.
 *
 * 기준표: src/data/archetypeReferenceV4.json (재무 유형 군집화 v4 결과, 업체명 없음, 검증 전 시험값)
 * 판정 순서 (§3):
 *   1. 재무 값이 모자라면 '재무 미입력'
 *   2. 사전분리 규칙 (매출소멸 → 자본잠식 → 매출 1억 원 미만 → 부채비율 1,000% 초과 → 영업이익률 −100% 미만
 *      → 매출액증가율 300% 초과). 걸리면 원형 없음
 *   3. 수출단계가 없으면 '수출단계 미확정'
 *   4. 네 변수(%): growth · opMargin · debtRatio · nonOpBalance(= 순이익률 − 영업이익률). 전년 매출이 없거나 0이면 growth = null
 *   5. 업종 그룹: KSIC 중분류 → ksicMidToGroup → 'BIG:<대분류>' → 'ALL'
 *   6. 업종 내 백분위(101개 분위수 선형 보간, 0~1) → 7. 수출단계별 표준화 → 8. 같은 단계 군집 중심과 거리 최소
 * 이 파일은 기준표(약 270KB)를 불러오므로 적합도를 계산하는 곳에서만 import 한다 (첫 화면 번들에 넣지 않음).
 */
import type { ExportStage } from '@/types/program'
import type { Archetype } from '@/constants/fitV1'
import referenceJson from '@/data/archetypeReferenceV4.json'

export type FinanceVariable = 'growth' | 'opMargin' | 'debtRatio' | 'nonOpBalance'
export const FINANCE_VARIABLES: FinanceVariable[] = ['growth', 'opMargin', 'debtRatio', 'nonOpBalance']

export interface ArchetypeCluster {
  id: string
  name: string
  archetype: Archetype
  n: number
  share: number
  center: Record<FinanceVariable, number>
  medians: Record<FinanceVariable, number>
}

export interface ArchetypeStage {
  stageLabel: string
  k: number
  stability: string
  zStats: Record<FinanceVariable, { mean: number; sd: number }>
  clusters: ArchetypeCluster[]
}

export interface IndustryGroup {
  label: string
  level: string
  n: number
  /** 0%~100% 1% 간격 101개 분위수. 값이 없으면 null */
  quantiles: Record<FinanceVariable, number[] | null>
}

export interface SpecialRule {
  order: number
  id: string
  label: string
  rule: string
}

/** 재무 원형 기준표 (REVISION_06 §2 구조). 모든 값의 단위는 % */
export interface ArchetypeReferenceTable {
  version: string
  source: string
  status: string
  variables: Record<FinanceVariable, string>
  method: string
  specialRules: SpecialRule[]
  ksicMidToGroup: Record<string, string>
  groupFallback: string
  industryGroups: Record<string, IndustryGroup>
  stages: Record<ExportStage, ArchetypeStage>
  archetypeRule: Record<string, string>
  verificationCases: (Partial<Record<FinanceVariable, number | null>> & {
    stage: ExportStage
    ksicMid: string | null
    ksicBig: string | null
    expectedCluster: string
    note?: string
  })[]
}

export const ARCHETYPE_REFERENCE: ArchetypeReferenceTable = referenceJson as unknown as ArchetypeReferenceTable

/* ───────── KSIC 정규화 ───────── */

/** KSIC 11차 중분류(2자리 숫자) → 대분류 문자 */
const SECTION_RANGES: [number, number, string][] = [
  [1, 3, 'A'], [5, 8, 'B'], [10, 34, 'C'], [35, 35, 'D'], [36, 39, 'E'], [41, 42, 'F'], [45, 47, 'G'], [49, 52, 'H'],
  [55, 56, 'I'], [58, 63, 'J'], [64, 66, 'K'], [68, 68, 'L'], [70, 73, 'M'], [74, 76, 'N'], [84, 84, 'O'], [85, 85, 'P'],
  [86, 87, 'Q'], [90, 91, 'R'], [94, 96, 'S'], [97, 98, 'T'], [99, 99, 'U'],
]

export function sectionOfDivision(division: number): string | null {
  return SECTION_RANGES.find(([lo, hi]) => division >= lo && division <= hi)?.[2] ?? null
}

/**
 * 프로필의 KSIC 코드('C10', '10', 'C10111', '10111' 등) → { mid: 'C10', big: 'C' }.
 * 숫자만 있으면 KSIC 11차 중분류 범위로 대분류 문자를 붙인다. 읽을 수 없으면 null
 */
export function normalizeKsic(code: string | null | undefined): { mid: string; big: string } | null {
  if (!code) return null
  const raw = code.trim().toUpperCase().replace(/[\s-]/g, '')
  const m = /^([A-Z])?(\d{2})\d{0,3}$/.exec(raw)
  if (!m) return null
  const division = Number(m[2])
  const big = m[1] ?? sectionOfDivision(division)
  if (!big) return null
  return { mid: `${big}${m[2]}`, big }
}

/** 업종 그룹 id: 중분류 표 → BIG:<대분류> → ALL */
export function industryGroupId(ksicCode: string | null | undefined, table: ArchetypeReferenceTable = ARCHETYPE_REFERENCE): string {
  const ksic = normalizeKsic(ksicCode)
  if (!ksic) return 'ALL'
  const mapped = table.ksicMidToGroup[ksic.mid]
  if (mapped && table.industryGroups[mapped]) return mapped
  const big = `BIG:${ksic.big}`
  return table.industryGroups[big] ? big : 'ALL'
}

/* ───────── 백분위·표준화·최근접 ───────── */

/**
 * 101개 분위수에서 값의 백분위(0~1). 선형 보간, 같은 값이 여러 칸이면 그 칸들의 가운데, 범위 밖은 0 또는 1
 */
export function percentileOf(value: number, quantiles: readonly number[]): number {
  const last = quantiles.length - 1
  if (value < quantiles[0]!) return 0
  if (value > quantiles[last]!) return 1
  const equal: number[] = []
  for (let i = 0; i <= last; i += 1) if (quantiles[i] === value) equal.push(i)
  if (equal.length > 0) return (equal[0]! + equal[equal.length - 1]!) / 2 / last
  for (let i = 0; i < last; i += 1) {
    const lo = quantiles[i]!
    const hi = quantiles[i + 1]!
    if (value > lo && value < hi) return (i + (value - lo) / (hi - lo)) / last
  }
  return 1
}

function quantilesFor(groupId: string, variable: FinanceVariable, big: string | null, table: ArchetypeReferenceTable): number[] | null {
  const chain = [groupId, big ? `BIG:${big}` : null, 'ALL'].filter((id): id is string => Boolean(id))
  for (const id of chain) {
    const q = table.industryGroups[id]?.quantiles[variable]
    if (q && q.length > 1) return q
  }
  return null
}

export interface ArchetypeAssignment {
  cluster: ArchetypeCluster
  industryGroupId: string
  industryGroupLabel: string
  stability: string
  /** 계산에 쓴 변수 (growth가 없으면 3개) */
  usedVariables: FinanceVariable[]
}

/** 네 변수(%)와 수출단계·KSIC로 같은 단계의 가장 가까운 군집 */
export function assignCluster(
  values: Record<FinanceVariable, number | null>,
  stage: ExportStage,
  ksicCode: string | null | undefined,
  table: ArchetypeReferenceTable = ARCHETYPE_REFERENCE,
): ArchetypeAssignment | null {
  const stageTable = table.stages[stage]
  if (!stageTable) return null
  const groupId = industryGroupId(ksicCode, table)
  const big = normalizeKsic(ksicCode)?.big ?? null
  const z: Partial<Record<FinanceVariable, number>> = {}
  const used: FinanceVariable[] = []
  for (const variable of FINANCE_VARIABLES) {
    const value = values[variable]
    if (value === null || !Number.isFinite(value)) continue
    const q = quantilesFor(groupId, variable, big, table)
    if (!q) continue
    const stats = stageTable.zStats[variable]
    z[variable] = (percentileOf(value, q) - stats.mean) / (stats.sd || 1)
    used.push(variable)
  }
  if (used.length === 0) return null
  let best: { cluster: ArchetypeCluster; d: number } | null = null
  for (const cluster of stageTable.clusters) {
    const d = used.reduce((sum, v) => sum + (z[v]! - cluster.center[v]) ** 2, 0)
    if (!best || d < best.d) best = { cluster, d }
  }
  if (!best) return null
  return {
    cluster: best.cluster,
    industryGroupId: groupId,
    industryGroupLabel: table.industryGroups[groupId]?.label ?? '전체 업종',
    stability: stageTable.stability,
    usedVariables: used,
  }
}

/** 사전분리 규칙 (order 순). 걸리면 그 규칙, 없으면 null */
export function specialRuleFor(input: {
  revenueKrw: number
  totalEquityKrw: number
  debtRatio: number | null
  opMargin: number | null
  growth: number | null
}, table: ArchetypeReferenceTable = ARCHETYPE_REFERENCE): SpecialRule | null {
  const hit: Record<string, boolean> = {
    revenueGone: input.revenueKrw === 0,
    capitalImpaired: input.totalEquityKrw <= 0,
    tinyRevenue: input.revenueKrw < 100_000_000,
    extremeDebt: input.debtRatio !== null && input.debtRatio > 1000,
    extremeLoss: input.opMargin !== null && input.opMargin < -100,
    revenueJump: input.growth !== null && input.growth > 300,
  }
  const rules = [...table.specialRules].sort((a, b) => a.order - b.order)
  return rules.find((rule) => hit[rule.id] === true) ?? null
}

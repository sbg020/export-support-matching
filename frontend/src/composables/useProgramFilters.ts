/*
 * 공고 검색·필터·정렬 상태. URL 쿼리를 유일한 상태로 사용해
 * 새로고침·뒤로 가기·링크 공유 시에도 같은 조건이 유지된다.
 */
import { computed } from 'vue'
import { useRoute, useRouter, type LocationQuery, type LocationQueryRaw } from 'vue-router'
import type { Option } from '@/types/common'
import type { ProgramQuery, ProgramSort } from '@/types/program'
import {
  AGENCY_TYPE_OPTIONS,
  PROGRAM_REGION_OPTIONS,
  RECEPTION_STATUS_OPTIONS,
  SORT_OPTIONS,
  STAGE_OPTIONS,
  SUPPORT_METHOD_OPTIONS,
} from '@/constants/options'

export type FilterKey = 'receptionStatuses' | 'stages' | 'agencyTypes' | 'regions' | 'supportTypes'

export const FILTER_GROUPS: { key: FilterKey; param: string; label: string; options: Option<string>[] }[] = [
  { key: 'receptionStatuses', param: 'status', label: '접수상태', options: RECEPTION_STATUS_OPTIONS },
  { key: 'stages', param: 'stage', label: '지원분야', options: STAGE_OPTIONS },
  { key: 'agencyTypes', param: 'agency', label: '기관 유형', options: AGENCY_TYPE_OPTIONS },
  { key: 'regions', param: 'region', label: '지역', options: PROGRAM_REGION_OPTIONS },
  { key: 'supportTypes', param: 'method', label: '지원방식', options: SUPPORT_METHOD_OPTIONS },
]

function firstString(value: LocationQuery[string] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null
}

function parseList(value: LocationQuery[string] | undefined, options: Option<string>[]): string[] {
  const raw = firstString(value)
  if (raw === null) return []
  const allowed = new Set(options.map((o) => o.value))
  return Array.from(new Set(raw.split(',').filter((item) => allowed.has(item))))
}

export function parseProgramQuery(query: LocationQuery, defaultSort: ProgramSort): ProgramQuery {
  const result = {
    keyword: firstString(query.q),
    sort: defaultSort,
  } as ProgramQuery
  for (const group of FILTER_GROUPS) {
    ;(result[group.key] as string[]) = parseList(query[group.param], group.options)
  }
  const sort = firstString(query.sort)
  if (sort && SORT_OPTIONS.some((o) => o.value === sort)) result.sort = sort as ProgramSort
  return result
}

export function useProgramFilters(defaultSort: ProgramSort) {
  const route = useRoute()
  const router = useRouter()

  const query = computed(() => parseProgramQuery(route.query, defaultSort))

  function write(next: ProgramQuery) {
    const raw: LocationQueryRaw = { ...route.query }
    raw.q = next.keyword ?? undefined
    for (const group of FILTER_GROUPS) {
      const values = next[group.key] as string[]
      raw[group.param] = values.length > 0 ? values.join(',') : undefined
    }
    raw.sort = next.sort !== defaultSort ? next.sort : undefined
    void router.replace({ query: raw })
  }

  function toggle(key: FilterKey, value: string, checked: boolean) {
    const current = query.value[key] as string[]
    const without = current.filter((item) => item !== value)
    write({ ...query.value, [key]: checked ? [...without, value] : without })
  }

  function setSingle(key: FilterKey, value: string | null) {
    write({ ...query.value, [key]: value === null ? [] : [value] })
  }

  function setKeyword(keyword: string | null) {
    const trimmed = keyword?.trim() ?? ''
    write({ ...query.value, keyword: trimmed === '' ? null : trimmed })
  }

  function setSort(sort: ProgramSort) {
    write({ ...query.value, sort })
  }

  function reset() {
    write({ ...query.value, keyword: null, receptionStatuses: [], stages: [], agencyTypes: [], regions: [], supportTypes: [] })
  }

  interface Chip {
    id: string
    label: string
    remove: () => void
  }

  const chips = computed<Chip[]>(() => {
    const list: Chip[] = []
    if (query.value.keyword) {
      list.push({ id: 'keyword', label: `검색어: ${query.value.keyword}`, remove: () => setKeyword(null) })
    }
    for (const group of FILTER_GROUPS) {
      for (const value of query.value[group.key] as string[]) {
        const label = group.options.find((o) => o.value === value)?.label ?? value
        list.push({
          id: `${group.key}-${value}`,
          label: `${group.label}: ${label}`,
          remove: () => toggle(group.key, value, false),
        })
      }
    }
    return list
  })

  const activeCount = computed(() => chips.value.length)

  return { query, toggle, setSingle, setKeyword, setSort, reset, chips, activeCount }
}

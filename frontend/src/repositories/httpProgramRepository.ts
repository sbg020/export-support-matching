import type { Program, ProgramListResult, ProgramQuery } from '@/types/program'
import type { DataSourceStatus, ProgramRepository } from './programRepository'

interface PaginatedResponse<T> {
  count: number
  results: T[]
}

/**
 * Django REST API(backend/)에서 공고를 읽는 구현.
 * VITE_API_BASE_URL이 설정된 경우에만 사용한다. API는 Program 타입과 같은
 * camelCase JSON을 반환한다(backend/programs/serializers.py 참고).
 */
export class HttpProgramRepository implements ProgramRepository {
  readonly source: DataSourceStatus

  constructor(private readonly baseUrl: string) {
    this.source = { kind: 'api', baseUrl }
  }

  private url(path: string, params?: URLSearchParams): string {
    const base = this.baseUrl.replace(/\/+$/, '')
    const query = params && params.toString() ? `?${params.toString()}` : ''
    return `${base}${path}${query}`
  }

  private async request<T>(path: string, params?: URLSearchParams): Promise<T | null> {
    const response = await fetch(this.url(path, params), { headers: { Accept: 'application/json' } })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`공고 API 요청 실패 (${response.status})`)
    return (await response.json()) as T
  }

  async list(query: ProgramQuery): Promise<ProgramListResult> {
    const params = new URLSearchParams()
    if (query.keyword) params.set('search', query.keyword)
    const multi: [string, string[]][] = [
      ['receptionStatus', query.receptionStatuses],
      ['stage', query.stages],
      ['agencyType', query.agencyTypes],
      ['region', query.regions],
      ['supportType', query.supportTypes],
    ]
    for (const [key, values] of multi) {
      for (const value of values) params.append(key, value)
    }
    params.set('ordering', query.sort)
    const data = await this.request<PaginatedResponse<Program>>('/programs/', params)
    if (data === null) return { items: [], total: null }
    return { items: data.results, total: data.count }
  }

  async getById(id: string): Promise<Program | null> {
    return this.request<Program>(`/programs/${encodeURIComponent(id)}/`)
  }

  async getByIds(ids: string[]): Promise<Program[]> {
    const results = await Promise.all(ids.map((id) => this.getById(id)))
    return results.filter((program): program is Program => program !== null)
  }
}

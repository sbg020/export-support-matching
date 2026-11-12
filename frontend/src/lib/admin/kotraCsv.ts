/*
 * KOTRA 공고 CSV 양식과 행 검사 (REVISION_04 §9). 순수 함수 — 파일은 브라우저 안에서만 읽는다.
 */
import { SUPPORT_CATEGORIES } from '@/constants/categories'
import { REGION_OPTIONS } from '@/constants/options'
import { toCsv } from './csv'

export interface KotraColumn {
  name: string
  required: boolean
  howTo: string
  /** 저장 필드 (Program) */
  field: string
}

/** 양식의 열 (이름과 순서를 바꾸지 않는다) */
export const KOTRA_COLUMNS: KotraColumn[] = [
  { name: '공고명', required: true, howTo: '원문 제목 그대로', field: 'title' },
  { name: '주관기관', required: true, howTo: '예: KOTRA', field: 'ministry' },
  { name: '수행기관', required: false, howTo: '', field: 'agency' },
  { name: '접수 시작일', required: false, howTo: 'YYYY-MM-DD', field: 'applyStart' },
  {
    name: '마감일',
    required: true,
    howTo: 'YYYY-MM-DD, 또는 예산 소진 시 · 연중 상시 · 연중 수시 중 하나',
    field: 'applyEnd 또는 applyPeriodNote',
  },
  { name: '지역', required: true, howTo: '전국 또는 시·도 이름. 여러 개는 ;로 구분', field: 'regions' },
  { name: '지원 대상', required: false, howTo: '원문 문장 요약', field: 'targetDescription' },
  { name: '지원 분야', required: false, howTo: 'C01~C15 코드 또는 분야 이름. 여러 개는 ;', field: 'supportCategories' },
  { name: '지원 내용', required: false, howTo: '한 줄 요약(40자 이내 권장)', field: 'summaryEasy' },
  { name: '원문 링크', required: true, howTo: 'https://로 시작', field: 'sourceUrl' },
]

export const KOTRA_TEMPLATE_FILE_NAME = 'kotra_notices_template.csv'
/** 마감일 칸에 날짜 대신 쓸 수 있는 메모 */
export const KOTRA_DEADLINE_NOTES = ['예산 소진 시', '연중 상시', '연중 수시']
export const KOTRA_MAX_BYTES = 5 * 1024 * 1024
export const KOTRA_MAX_ROWS = 1000

/** 양식 내려받기: UTF-8 BOM + 머리글 한 줄만 (예시 행 없음) */
export function buildKotraTemplateCsv(): string {
  return toCsv([KOTRA_COLUMNS.map((column) => column.name)])
}

export type KotraRowStatus = 'ok' | 'error' | 'duplicate'

export interface KotraRowResult {
  /** 파일의 행 번호 (머리글이 1행) */
  rowNumber: number
  title: string
  ministry: string
  deadline: string
  region: string
  status: KotraRowStatus
  reasons: string[]
}

export interface KotraCheckResult {
  /** 파일 단위 오류 (머리글이 양식과 다름 등). 있으면 행 결과는 비어 있다 */
  fileError: string | null
  rows: KotraRowResult[]
  counts: { total: number; ok: number; error: number; duplicate: number }
}

const SHORT_REGION_NAMES = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
]
/** 전국, 시·도 정식 이름, 줄인 이름, 예전 이름 */
const REGION_NAMES = new Set([
  '전국',
  ...REGION_OPTIONS.map((option) => option.label),
  ...SHORT_REGION_NAMES,
  '강원도',
  '전라북도',
])

const CATEGORY_TOKENS = new Set(SUPPORT_CATEGORIES.flatMap((c) => [c.code, c.name]))

/** YYYY-MM-DD이고 실제로 있는 날짜인지 */
export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** 중복 비교용: 공백·기호를 지우고 소문자로 */
export function normalizeForDuplicate(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '')
}

/** 같은 공고로 볼 열쇠: 공고명·주관기관(정규화)과 마감일. 하나라도 비면 null */
export function noticeDuplicateKey(title: string, ministry: string, deadline: string): string | null {
  const t = normalizeForDuplicate(title)
  const m = normalizeForDuplicate(ministry)
  const d = deadline.trim()
  return t && m && d ? `${t}|${m}|${d}` : null
}

function splitList(value: string): string[] {
  return value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
}

/** 머리글 검사. 맞으면 null, 다르면 파일 단위 오류 문구 */
export function checkKotraHeader(header: string[]): string | null {
  const names = header.map((cell) => cell.trim())
  const expected = KOTRA_COLUMNS.map((column) => column.name)
  const missing = KOTRA_COLUMNS.filter((column) => column.required && !names.includes(column.name)).map((c) => c.name)
  if (missing.length > 0) return `필수 열이 없습니다: ${missing.join(', ')}. 양식을 내려받아 열을 맞춰 주세요.`
  const same = names.length === expected.length && names.every((name, index) => name === expected[index])
  if (!same) return '열 이름이나 순서가 양식과 다릅니다. 양식을 내려받아 열 이름과 순서를 맞춰 주세요.'
  return null
}

function checkRow(cells: Record<string, string>): string[] {
  const reasons: string[] = []
  for (const column of KOTRA_COLUMNS) {
    if (column.required && !cells[column.name]) reasons.push(`${column.name} 칸이 비어 있음`)
  }
  const start = cells['접수 시작일'] ?? ''
  const end = cells['마감일'] ?? ''
  const startOk = start !== '' && isValidIsoDate(start)
  if (start !== '' && !startOk) reasons.push('접수 시작일 형식이 맞지 않음')
  const endIsDate = isValidIsoDate(end)
  if (end !== '' && !endIsDate && !KOTRA_DEADLINE_NOTES.includes(end)) reasons.push('마감일 형식이 맞지 않음')
  if (startOk && endIsDate && start > end) reasons.push('접수 시작일이 마감일보다 늦음')
  const regions = splitList(cells['지역'] ?? '')
  if (regions.some((region) => !REGION_NAMES.has(region))) reasons.push('지역 이름을 확인할 수 없음')
  const categories = splitList(cells['지원 분야'] ?? '')
  if (categories.some((category) => !CATEGORY_TOKENS.has(category))) reasons.push('지원 분야를 확인할 수 없음')
  const url = cells['원문 링크'] ?? ''
  if (url !== '' && !url.startsWith('https://')) reasons.push('원문 링크 형식이 맞지 않음')
  return reasons
}

/** CSV 행(머리글 포함)을 검사한다 (REVISION_04 §9.4) */
export function validateKotraCsv(rows: string[][]): KotraCheckResult {
  const empty = { total: 0, ok: 0, error: 0, duplicate: 0 }
  const [header, ...data] = rows
  if (!header) return { fileError: '파일에 내용이 없습니다.', rows: [], counts: empty }
  const headerError = checkKotraHeader(header)
  if (headerError) return { fileError: headerError, rows: [], counts: empty }
  if (data.length > KOTRA_MAX_ROWS) {
    return {
      fileError: `행이 ${data.length.toLocaleString('ko-KR')}개입니다. 한 파일에 ${KOTRA_MAX_ROWS.toLocaleString('ko-KR')}행까지 올릴 수 있습니다.`,
      rows: [],
      counts: empty,
    }
  }

  const firstRowOf = new Map<string, number>()
  const results = data.map((row, index): KotraRowResult => {
    const cells: Record<string, string> = {}
    KOTRA_COLUMNS.forEach((column, columnIndex) => {
      cells[column.name] = (row[columnIndex] ?? '').trim()
    })
    const rowNumber = index + 2
    const reasons = checkRow(cells)
    let status: KotraRowStatus = reasons.length > 0 ? 'error' : 'ok'
    const key = noticeDuplicateKey(cells['공고명'] ?? '', cells['주관기관'] ?? '', cells['마감일'] ?? '')
    if (key) {
      const first = firstRowOf.get(key)
      if (first === undefined) firstRowOf.set(key, rowNumber)
      else if (status === 'ok') {
        status = 'duplicate'
        reasons.push(`${first}행과 같은 공고로 보임`)
      }
    }
    return {
      rowNumber,
      title: cells['공고명'] ?? '',
      ministry: cells['주관기관'] ?? '',
      deadline: cells['마감일'] ?? '',
      region: cells['지역'] ?? '',
      status,
      reasons,
    }
  })

  return {
    fileError: null,
    rows: results,
    counts: {
      total: results.length,
      ok: results.filter((r) => r.status === 'ok').length,
      error: results.filter((r) => r.status === 'error').length,
      duplicate: results.filter((r) => r.status === 'duplicate').length,
    },
  }
}

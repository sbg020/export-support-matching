/*
 * 정답세트(검수 완료 데이터) 검사 — tools/dataset/build_test_dataset.py의 규칙을 옮긴 순수 함수 (REVISION_04 §11.3).
 *
 * 오류(반영 막음): 필수 시트·열 없음, program_id 중복, 없는 공고를 가리키는 rules·bonuses·documents 행,
 *   사전(dictionary)에 없는 field·op, 알 수 없는 구분(kind), C01~C15 밖의 분류 코드
 * 경고(반영 가능): 숫자가 아닌 금액, 근거 문장·쪽이 빈 규칙, 게시일·접수기간 없음,
 *   review_status '검수대기'로 남은 행, 평가용(test split) 공고 포함, inventory_150에 없는 공고
 * 제외: review_status '삭제' 행은 세지 않는다.
 * Python 스크립트는 첫 오류에서 멈추지만, 여기서는 모든 오류·경고를 모아 보여 준다.
 * 평가용 공고는 Python에서 변환을 멈추지만 서비스 데이터에 넣을지는 사용자가 정하므로 경고로 둔다.
 */
import type {
  AnswerSetCell,
  AnswerSetCheckResult,
  AnswerSetIssue,
  AnswerSetProgramRow,
  AnswerSetSheets,
} from '@/types/answerSet'

export const DATA_SHEETS = ['programs', 'rules', 'bonuses', 'documents'] as const
type DataSheet = (typeof DATA_SHEETS)[number]

const KEY_COLUMN: Record<DataSheet, string> = {
  programs: 'program_id',
  rules: 'rule_key',
  bonuses: 'bonus_key',
  documents: 'doc_key',
}

/** 검사에 쓰는 열 (2행 영문 머리글) */
export const REQUIRED_COLUMNS: Record<DataSheet, string[]> = {
  programs: [
    'program_id',
    'parent_id',
    'title',
    'posted_at',
    'apply_start',
    'apply_end',
    'max_amount_krw',
    'subsidy_max_krw',
    'categories',
    'review_status',
  ],
  rules: ['rule_key', 'program_id', 'kind', 'field', 'op', 'evidence', 'page', 'review_status'],
  bonuses: ['bonus_key', 'program_id', 'review_status'],
  documents: ['doc_key', 'program_id', 'review_status'],
}

const RULE_KINDS = new Set(['필수', '제외'])
const CATEGORY_CODES = new Set(Array.from({ length: 15 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`))
const REVIEWED_STATUSES = new Set(['확인', '수정', '추가'])
const PENDING_STATUS = '검수대기'
const DELETED_STATUS = '삭제'

interface SheetRecord {
  row: number
  values: Record<string, AnswerSetCell>
}

/** 빈 값이면 null, 아니면 앞뒤 공백을 뺀 글자 (날짜는 YYYY-MM-DD) */
export function cleanCell(value: AnswerSetCell | undefined): string | null {
  if (value === null || value === undefined) return null
  // 엑셀 날짜는 브라우저 시간대의 자정으로 읽히므로 UTC가 아닌 그 날짜의 연·월·일을 쓴다
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  }
  const text = String(value).trim()
  return text === '' ? null : text
}

/** 숫자로 읽기 (쉼표 허용). 읽을 수 없으면 null — Python to_number와 같다 */
export function toNumber(value: AnswerSetCell | undefined): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value instanceof Date) return null
  const text = String(value).trim().replace(/,/g, '')
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : null
}

function readRecords(rows: AnswerSetCell[][], keyColumn: string): { keys: string[]; records: SheetRecord[] } | null {
  const keyRow = rows[1]
  if (!keyRow) return null
  const keys = keyRow.map((cell) => cleanCell(cell) ?? '')
  const records: SheetRecord[] = []
  rows.slice(2).forEach((cells, index) => {
    if (!cells || !cells.some((cell) => cleanCell(cell) !== null)) return
    const values: Record<string, AnswerSetCell> = {}
    keys.forEach((key, column) => {
      if (key) values[key] = cells[column] ?? null
    })
    if (cleanCell(values[keyColumn]) === null && cleanCell(values.program_id) === null) return
    records.push({ row: index + 3, values })
  })
  return { keys, records }
}

/** dictionary 시트에서 1절(필드)과 2절(연산자)의 첫 열 값을 읽는다 */
export function readDictionary(rows: AnswerSetCell[][]): { fields: Set<string>; ops: Set<string> } | null {
  const fields = new Set<string>()
  const ops = new Set<string>()
  let section: 'fields' | 'ops' | null = null
  let skipHeader = false
  for (const cells of rows) {
    const first = cleanCell(cells?.[0])
    if (first === null) continue
    if (/^1\.\s*필드/.test(first)) {
      section = 'fields'
      skipHeader = true
      continue
    }
    if (/^2\.\s*연산자/.test(first)) {
      section = 'ops'
      skipHeader = true
      continue
    }
    if (/^\d+\.\s/.test(first)) {
      section = null
      continue
    }
    if (skipHeader) {
      skipHeader = false
      continue
    }
    if (section === 'fields') fields.add(first)
    else if (section === 'ops') ops.add(first)
  }
  return fields.size > 0 && ops.size > 0 ? { fields, ops } : null
}

function emptyResult(issues: AnswerSetIssue[]): AnswerSetCheckResult {
  return {
    counts: {
      announcements: 0,
      programs: 0,
      rules: 0,
      bonuses: 0,
      documents: 0,
      errors: issues.filter((i) => i.level === 'error').length,
      warnings: issues.filter((i) => i.level === 'warning').length,
      excluded: 0,
      pendingReview: 0,
      testAnnouncements: null,
    },
    hasSupportSummary: false,
    programs: [],
    issues,
  }
}

export function validateAnswerSet(sheets: AnswerSetSheets): AnswerSetCheckResult {
  const issues: AnswerSetIssue[] = []
  const error = (sheet: string, rowId: string | null, message: string, programId: string | null = null) =>
    issues.push({ level: 'error', sheet, rowId, message, programId })
  const warn = (sheet: string, rowId: string | null, message: string, programId: string | null = null) =>
    issues.push({ level: 'warning', sheet, rowId, message, programId })

  // 1. 시트·열
  for (const name of [...DATA_SHEETS, 'dictionary']) {
    if (!sheets[name]) error(name, null, `'${name}' 시트가 없습니다.`)
  }
  if (issues.length > 0) return emptyResult(issues)

  const data = {} as Record<DataSheet, SheetRecord[]>
  let excluded = 0
  let hasSupportSummary = false
  for (const name of DATA_SHEETS) {
    const parsed = readRecords(sheets[name] ?? [], KEY_COLUMN[name])
    if (!parsed) {
      error(name, null, '2행(영문 머리글)이 없습니다.')
      continue
    }
    const missing = REQUIRED_COLUMNS[name].filter((column) => !parsed.keys.includes(column))
    if (missing.length > 0) error(name, null, `필수 열이 없습니다: ${missing.join(', ')}`)
    if (name === 'programs') hasSupportSummary = parsed.keys.includes('support_summary')
    data[name] = parsed.records.filter((record) => {
      if (cleanCell(record.values.review_status) === DELETED_STATUS) {
        excluded += 1
        return false
      }
      return true
    })
  }
  const dictionary = readDictionary(sheets.dictionary ?? [])
  if (!dictionary) error('dictionary', null, '사전(dictionary)에서 필드·연산자 목록을 읽지 못했습니다.')
  if (issues.length > 0 || !dictionary) return emptyResult(issues)

  // 2. 공고
  const programsById = new Map<string, SheetRecord>()
  for (const record of data.programs) {
    const id = cleanCell(record.values.program_id)
    if (id === null) {
      error('programs', `${record.row}행`, 'program_id가 비어 있습니다.')
      continue
    }
    if (programsById.has(id)) error('programs', id, `program_id '${id}'가 두 번 나옵니다.`, id)
    else programsById.set(id, record)
  }
  const parentOf = (id: string) => cleanCell(programsById.get(id)?.values.parent_id) ?? id
  const childrenOf = new Map<string, string[]>()
  for (const id of programsById.keys()) {
    const parent = parentOf(id)
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), id])
  }
  const targetsOf = (programId: string): string[] =>
    programsById.has(programId) ? [programId] : (childrenOf.get(programId) ?? [])

  const statuses = new Map<string, string[]>()
  const addStatus = (programId: string, status: string | null) =>
    statuses.set(programId, [...(statuses.get(programId) ?? []), status ?? ''])
  let pendingReview = 0
  const countPending = (record: SheetRecord) => {
    if (cleanCell(record.values.review_status) === PENDING_STATUS) pendingReview += 1
  }

  for (const [id, record] of programsById) {
    const v = record.values
    countPending(record)
    addStatus(id, cleanCell(v.review_status))
    if (cleanCell(v.posted_at) === null) warn('programs', id, '게시일(공고일)이 없습니다.', id)
    if (cleanCell(v.apply_start) === null && cleanCell(v.apply_end) === null) {
      warn('programs', id, '접수기간이 없습니다.', id)
    }
    for (const column of ['max_amount_krw', 'subsidy_max_krw']) {
      const raw = cleanCell(v[column])
      if (raw !== null && toNumber(v[column]) === null) {
        warn('programs', id, `금액 '${raw}'(${column})을 숫자로 읽지 못했습니다.`, id)
      }
    }
    const categories = cleanCell(v.categories)
    if (categories) {
      const bad = categories
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c && !CATEGORY_CODES.has(c))
      if (bad.length > 0) error('programs', id, `C01~C15 밖의 분류 코드: ${bad.join(', ')}`, id)
    }
  }

  // 3. 규칙·가점·서류
  const ruleCount = new Map<string, number>()
  for (const sheet of ['rules', 'bonuses', 'documents'] as const) {
    for (const record of data[sheet]) {
      const v = record.values
      const rowId = cleanCell(v[KEY_COLUMN[sheet]]) ?? `${record.row}행`
      const programId = cleanCell(v.program_id)
      countPending(record)
      const targets = programId ? targetsOf(programId) : []
      if (targets.length === 0) {
        error(sheet, rowId, `없는 공고 '${programId ?? '-'}'를 가리키는 행입니다.`)
        continue
      }
      const owner = targets[0] ?? null
      if (sheet !== 'bonuses') for (const target of targets) addStatus(target, cleanCell(v.review_status))
      if (sheet !== 'rules') continue
      for (const target of targets) ruleCount.set(target, (ruleCount.get(target) ?? 0) + 1)
      const field = cleanCell(v.field)
      const op = cleanCell(v.op)
      const kind = cleanCell(v.kind)
      if (field === null || !dictionary.fields.has(field)) error('rules', rowId, `사전에 없는 field '${field ?? ''}'`, owner)
      if (op === null || !dictionary.ops.has(op)) error('rules', rowId, `사전에 없는 op '${op ?? ''}'`, owner)
      if (kind === null || !RULE_KINDS.has(kind)) error('rules', rowId, `구분(kind) '${kind ?? ''}'을 알 수 없습니다.`, owner)
      if (cleanCell(v.evidence) === null || cleanCell(v.page) === null) {
        warn('rules', rowId, '근거 문장이나 쪽 번호가 비어 있습니다.', owner)
      }
    }
  }

  // 4. 평가용(test) 공고
  const parents = [...new Set([...programsById.keys()].map(parentOf))]
  let testAnnouncements: number | null = null
  const inventory = sheets.inventory_150 ? readRecords(sheets.inventory_150, 'pid') : null
  if (!inventory) {
    warn('inventory_150', null, 'inventory_150 시트가 없어 평가용(test) 공고 포함 여부를 확인하지 못했습니다.')
  } else {
    const splitOf = new Map(
      inventory.records.map((record) => [cleanCell(record.values.pid) ?? '', cleanCell(record.values.split)]),
    )
    const tests: string[] = []
    for (const parent of parents) {
      if (!splitOf.has(parent)) warn('inventory_150', parent, 'inventory_150에 없는 공고입니다.', parent)
      else if ((splitOf.get(parent) ?? '').includes('test')) tests.push(parent)
    }
    testAnnouncements = tests.length
    if (tests.length > 0) {
      warn('inventory_150', null, `평가용(test) 공고 ${tests.length}건이 들어 있습니다: ${tests.join(', ')}`)
    }
  }
  if (pendingReview > 0) warn('전체', null, `검수상태가 '검수대기'로 남은 행이 ${pendingReview}개 있습니다.`)

  // 5. 공고별 표
  const resultOf = (programId: string, parentId: string): AnswerSetProgramRow['result'] => {
    const related = issues.filter((i) => i.programId === programId || i.programId === parentId)
    if (related.some((i) => i.level === 'error')) return 'error'
    return related.length > 0 ? 'warning' : 'ok'
  }
  const idCollator = new Intl.Collator('ko', { numeric: true })
  const programs: AnswerSetProgramRow[] = [...programsById.entries()]
    .sort(([a], [b]) => idCollator.compare(a, b))
    .map(([id, record]) => {
      const list = statuses.get(id) ?? []
      return {
        programId: id,
        parentId: parentOf(id),
        title: cleanCell(record.values.title),
        ruleCount: ruleCount.get(id) ?? 0,
        reviewedRatio: list.length > 0 ? list.filter((s) => REVIEWED_STATUSES.has(s)).length / list.length : null,
        result: resultOf(id, parentOf(id)),
      }
    })

  return {
    counts: {
      announcements: parents.length,
      programs: data.programs.length,
      rules: data.rules.length,
      bonuses: data.bonuses.length,
      documents: data.documents.length,
      errors: issues.filter((i) => i.level === 'error').length,
      warnings: issues.filter((i) => i.level === 'warning').length,
      excluded,
      pendingReview,
      testAnnouncements,
    },
    hasSupportSummary,
    programs,
    issues,
  }
}

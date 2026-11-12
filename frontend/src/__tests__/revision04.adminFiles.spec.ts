/*
 * REVISION_04 관리자 파일 검사: KOTRA CSV(§9), 정답세트 xlsx(§11.3), 가중치·키워드(§8.4·§12).
 * 파일은 모두 이 테스트 안에서 만든 테스트 전용 값이다 (실제 공고·정답세트 파일을 쓰지 않는다).
 */
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { UTF8_BOM, decodeCsvBytes, parseCsv, toCsv } from '@/lib/admin/csv'
import { KOTRA_COLUMNS, buildKotraTemplateCsv, checkKotraHeader, validateKotraCsv } from '@/lib/admin/kotraCsv'
import { readDictionary, validateAnswerSet } from '@/lib/admin/answerSet'
import { readWorkbook } from '@/lib/admin/readWorkbook'
import {
  FIT_WEIGHT_SUM_MESSAGE,
  STRATEGY_COLUMNS,
  buildStrategyTemplateCsv,
  checkFitWeights,
  normalizeKeywords,
} from '@/lib/admin/settings'
import type { AnswerSetCell, AnswerSetSheets } from '@/types/answerSet'

const HEADER = KOTRA_COLUMNS.map((c) => c.name)

/** 테스트 전용 KOTRA 행 (열 순서: 양식과 같음) */
function row(overrides: Partial<Record<string, string>> = {}): string[] {
  const base: Record<string, string> = {
    공고명: '테스트 전용 공고',
    주관기관: '테스트기관',
    수행기관: '',
    '접수 시작일': '2030-01-02',
    마감일: '2030-02-01',
    지역: '전국',
    '지원 대상': '',
    '지원 분야': 'C01;해외규격인증',
    '지원 내용': '',
    '원문 링크': 'https://example.com/notice',
    ...overrides,
  }
  return HEADER.map((name) => base[name] ?? '')
}

describe('CSV 읽기·쓰기', () => {
  it('따옴표 안의 쉼표·줄바꿈·두 번 쓴 따옴표를 처리하고 BOM을 지운다', () => {
    const text = `${UTF8_BOM}a,"b,c","줄\n바꿈","말 ""인용"""\r\n1,2,3,4\r\n\r\n`
    expect(parseCsv(text)).toEqual([
      ['a', 'b,c', '줄\n바꿈', '말 "인용"'],
      ['1', '2', '3', '4'],
    ])
    expect(parseCsv(toCsv([['x,y', 'z']]))).toEqual([['x,y', 'z']])
  })

  it('UTF-8로 읽고, 깨진 글자가 나오면 EUC-KR로 다시 읽는다 (엑셀 CSV)', () => {
    // '공고명,주관기관,지역'을 EUC-KR로 인코딩한 바이트
    const eucKr = new Uint8Array([176, 248, 176, 237, 184, 237, 44, 193, 214, 176, 252, 177, 226, 176, 252, 44, 193, 246, 191, 170])
    expect(decodeCsvBytes(eucKr)).toEqual({ text: '공고명,주관기관,지역', encoding: 'euc-kr' })
    const utf8 = new TextEncoder().encode(`${UTF8_BOM}공고명`)
    expect(decodeCsvBytes(utf8).encoding).toBe('utf-8')
  })
})

describe('KOTRA CSV 양식 (§9.2)', () => {
  it('양식은 UTF-8 BOM과 머리글 한 줄뿐이다 (예시 행 없음)', () => {
    const csv = buildKotraTemplateCsv()
    expect(csv.startsWith(UTF8_BOM)).toBe(true)
    expect(parseCsv(csv)).toEqual([HEADER])
    expect(HEADER).toEqual(['공고명', '주관기관', '수행기관', '접수 시작일', '마감일', '지역', '지원 대상', '지원 분야', '지원 내용', '원문 링크'])
  })

  it('머리글이 양식과 다르면 파일 단위 오류', () => {
    expect(checkKotraHeader(HEADER)).toBeNull()
    expect(checkKotraHeader(HEADER.filter((name) => name !== '마감일'))).toContain('필수 열이 없습니다: 마감일')
    expect(checkKotraHeader([...HEADER].reverse())).toContain('순서')
    const result = validateKotraCsv([['제목', '기관']])
    expect(result.fileError).toContain('필수 열이 없습니다')
    expect(result.rows).toEqual([])
  })
})

describe('KOTRA CSV 행 검사 (§9.4)', () => {
  const check = (cells: Partial<Record<string, string>>) => validateKotraCsv([HEADER, row(cells)]).rows[0]!

  it('정상 행', () => {
    expect(check({})).toMatchObject({ rowNumber: 2, status: 'ok', reasons: [] })
    expect(check({ 마감일: '예산 소진 시', '접수 시작일': '' }).status).toBe('ok')
    expect(check({ 지역: '서울;경기도;부산광역시' }).status).toBe('ok')
  })

  it.each([
    [{ 공고명: '' }, '공고명 칸이 비어 있음'],
    [{ 주관기관: '' }, '주관기관 칸이 비어 있음'],
    [{ 마감일: '' }, '마감일 칸이 비어 있음'],
    [{ 지역: '' }, '지역 칸이 비어 있음'],
    [{ '원문 링크': '' }, '원문 링크 칸이 비어 있음'],
    [{ 마감일: '2030/02/01' }, '마감일 형식이 맞지 않음'],
    [{ 마감일: '2030-02-30' }, '마감일 형식이 맞지 않음'],
    [{ 마감일: '상시' }, '마감일 형식이 맞지 않음'],
    [{ '접수 시작일': '2030-1-2' }, '접수 시작일 형식이 맞지 않음'],
    [{ '접수 시작일': '2030-03-01' }, '접수 시작일이 마감일보다 늦음'],
    [{ 지역: '서울;화성시' }, '지역 이름을 확인할 수 없음'],
    [{ '지원 분야': 'C16' }, '지원 분야를 확인할 수 없음'],
    [{ '원문 링크': 'http://example.com' }, '원문 링크 형식이 맞지 않음'],
  ])('%o → 오류: %s', (cells, reason) => {
    const result = check(cells)
    expect(result.status).toBe('error')
    expect(result.reasons).toContain(reason)
  })

  it('같은 파일 안에서 공고명·주관기관(공백·기호 정규화)과 마감일이 같으면 두 번째 행부터 중복 의심', () => {
    const result = validateKotraCsv([
      HEADER,
      row({ 공고명: '수출 바우처 (2차)', 주관기관: 'KOTRA' }),
      row({ 공고명: '수출바우처 2차', 주관기관: 'kotra' }),
      row({ 공고명: '수출바우처-2차!', 주관기관: 'KOTRA', 마감일: '2030-03-01' }),
      row({ 공고명: '수출바우처 2차', 주관기관: 'KOTRA ' }),
    ])
    expect(result.rows.map((r) => r.status)).toEqual(['ok', 'duplicate', 'ok', 'duplicate'])
    expect(result.rows[1]!.reasons).toEqual(['2행과 같은 공고로 보임'])
    expect(result.counts).toEqual({ total: 4, ok: 2, error: 0, duplicate: 2 })
  })

  it('1,000행을 넘으면 파일 단위 오류', () => {
    const rows = [HEADER, ...Array.from({ length: 1001 }, (_, i) => row({ 공고명: `공고 ${i}` }))]
    expect(validateKotraCsv(rows).fileError).toContain('1,000행까지')
  })
})

/* ── 정답세트 xlsx (§11.3) ── */

const PROGRAM_KEYS = ['program_id', 'parent_id', 'title', 'posted_at', 'apply_start', 'apply_end', 'max_amount_krw', 'subsidy_max_krw', 'categories', 'review_status']
const RULE_KEYS = ['rule_key', 'program_id', 'kind', 'field', 'op', 'value', 'evidence', 'page', 'review_status']
const BONUS_KEYS = ['bonus_key', 'program_id', 'item', 'review_status']
const DOC_KEYS = ['doc_key', 'program_id', 'doc_name', 'review_status']

/** 1행 한글 머리글(내용 무관), 2행 영문 머리글, 3행부터 값 */
function sheet(keys: string[], rows: AnswerSetCell[][]): AnswerSetCell[][] {
  return [keys.map((k) => `(${k})`), keys, ...rows]
}

const DICTIONARY: AnswerSetCell[][] = [
  ['1. 필드 (rules.field)'],
  ['필드', '한글명'],
  ['hq_region', '본사 소재지'],
  ['manual_check', '담당자 확인'],
  ['2. 연산자 (rules.op)'],
  ['연산자', '뜻'],
  ['in', '값 목록 중 하나'],
  ['-', '값 비교 없음'],
  ['3. 규칙 읽는 법'],
  ['kind', '필수'],
]

function baseWorkbook(): AnswerSetSheets {
  return {
    programs: sheet(PROGRAM_KEYS, [
      ['T001', null, '테스트 공고 1', '2030-01-01', '2030-01-02', '2030-02-01', 1000000, null, 'C01,C05', '확인'],
      ['T002-01', 'T002', '테스트 공고 2 세부1', '2030-01-01', null, '2030-02-01', null, null, 'C13', '검수대기'],
      ['T002-02', 'T002', '테스트 공고 2 세부2', '2030-01-01', null, '2030-02-01', null, null, 'C13', '확인'],
    ]),
    rules: sheet(RULE_KEYS, [
      ['T001-R01', 'T001', '필수', 'hq_region', 'in', '서울', '근거 문장', 1, '확인'],
      ['T002-R01', 'T002', '제외', 'manual_check', '-', null, '근거 문장', 2, '수정'],
    ]),
    bonuses: sheet(BONUS_KEYS, [['T001-B01', 'T001', '벤처기업', '확인']]),
    documents: sheet(DOC_KEYS, [['T001-D01', 'T001', '사업계획서', '확인']]),
    dictionary: DICTIONARY,
    inventory_150: sheet(['pid', 'split'], [['T001', 'dev-초안'], ['T002', 'dev-초안']]),
  }
}

describe('정답세트 검사 (§11.3)', () => {
  it('사전에서 필드·연산자를 읽는다', () => {
    const dictionary = readDictionary(DICTIONARY)!
    expect([...dictionary.fields]).toEqual(['hq_region', 'manual_check'])
    expect([...dictionary.ops]).toEqual(['in', '-'])
  })

  it('정상 파일: 공고·세부사업·규칙·가점·서류 수와 검수 비율 (원공고 규칙은 모든 세부사업에 붙는다)', () => {
    const result = validateAnswerSet(baseWorkbook())
    expect(result.counts).toMatchObject({ announcements: 2, programs: 3, rules: 2, bonuses: 1, documents: 1, errors: 0, pendingReview: 1, testAnnouncements: 0 })
    expect(result.programs.map((p) => [p.programId, p.ruleCount, p.result])).toEqual([
      ['T001', 1, 'ok'],
      ['T002-01', 1, 'ok'],
      ['T002-02', 1, 'ok'],
    ])
    expect(result.programs.find((p) => p.programId === 'T002-01')?.reviewedRatio).toBe(0.5)
    expect(result.hasSupportSummary).toBe(false)
    expect(result.issues.map((i) => i.message)).toEqual(["검수상태가 '검수대기'로 남은 행이 1개 있습니다."])
  })

  it.each([
    ['필수 시트 없음', (w: AnswerSetSheets) => delete w.rules, "'rules' 시트가 없습니다."],
    ['필수 열 없음', (w: AnswerSetSheets) => (w.programs = sheet(['program_id', 'title'], [['T001', 'x']])), '필수 열이 없습니다'],
    ['program_id 중복', (w: AnswerSetSheets) => w.programs!.push(['T001', null, '중복', '2030-01-01', null, '2030-02-01', null, null, 'C01', '확인']), "program_id 'T001'가 두 번 나옵니다."],
    ['없는 공고를 가리키는 행', (w: AnswerSetSheets) => w.documents!.push(['X-D01', 'X999', '서류', '확인']), "없는 공고 'X999'를 가리키는 행입니다."],
    ['사전에 없는 field', (w: AnswerSetSheets) => w.rules!.push(['T001-R09', 'T001', '필수', 'unknown_field', 'in', 'x', '근거', 1, '확인']), "사전에 없는 field 'unknown_field'"],
    ['사전에 없는 op', (w: AnswerSetSheets) => w.rules!.push(['T001-R09', 'T001', '필수', 'hq_region', '~=', 'x', '근거', 1, '확인']), "사전에 없는 op '~='"],
    ['C01~C15 밖의 분류 코드', (w: AnswerSetSheets) => (w.programs![2]![8] = 'C01,C99'), 'C01~C15 밖의 분류 코드: C99'],
  ])('오류: %s', (_name, mutate, message) => {
    const workbook = baseWorkbook()
    mutate(workbook)
    const result = validateAnswerSet(workbook)
    expect(result.counts.errors).toBeGreaterThan(0)
    expect(result.issues.filter((i) => i.level === 'error').map((i) => i.message).join('\n')).toContain(message)
  })

  it.each([
    ['숫자가 아닌 금액', (w: AnswerSetSheets) => (w.programs![2]![6] = '최대 1억원'), "금액 '최대 1억원'(max_amount_krw)을 숫자로 읽지 못했습니다."],
    ['근거·쪽이 빈 규칙', (w: AnswerSetSheets) => (w.rules![2]![7] = null), '근거 문장이나 쪽 번호가 비어 있습니다.'],
    ['게시일 없음', (w: AnswerSetSheets) => (w.programs![2]![3] = null), '게시일(공고일)이 없습니다.'],
    ['접수기간 없음', (w: AnswerSetSheets) => ((w.programs![2]![4] = null), (w.programs![2]![5] = null)), '접수기간이 없습니다.'],
    ['평가용 공고 포함', (w: AnswerSetSheets) => (w.inventory_150![2]![1] = 'test 후보'), '평가용(test) 공고 1건이 들어 있습니다: T001'],
  ])('경고(반영 가능): %s', (_name, mutate, message) => {
    const workbook = baseWorkbook()
    mutate(workbook)
    const result = validateAnswerSet(workbook)
    expect(result.counts.errors).toBe(0)
    expect(result.issues.filter((i) => i.level === 'warning').map((i) => i.message)).toContain(message)
  })

  it("검수상태 '삭제' 행은 세지 않는다 (그 행의 오류도 무시)", () => {
    const workbook = baseWorkbook()
    workbook.rules!.push(['T001-R09', 'T001', '필수', 'unknown_field', 'in', 'x', '근거', 1, '삭제'])
    const result = validateAnswerSet(workbook)
    expect(result.counts).toMatchObject({ rules: 2, excluded: 1, errors: 0 })
  })

  it('support_summary 열이 있으면 지원 내용 한 줄 열이 있다고 알린다', () => {
    const workbook = baseWorkbook()
    workbook.programs = sheet([...PROGRAM_KEYS, 'support_summary'], [['T001', null, 't', '2030-01-01', null, '2030-02-01', null, null, 'C01', '확인', '한 줄']])
    workbook.rules = sheet(RULE_KEYS, [])
    workbook.bonuses = sheet(BONUS_KEYS, [])
    workbook.documents = sheet(DOC_KEYS, [])
    expect(validateAnswerSet(workbook).hasSupportSummary).toBe(true)
  })

  it('테스트에서 만든 작은 xlsx를 브라우저 읽기 함수로 읽어 같은 결과를 낸다', async () => {
    const book = XLSX.utils.book_new()
    for (const [name, rows] of Object.entries(baseWorkbook())) {
      XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name)
    }
    const data = XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    const result = validateAnswerSet(await readWorkbook(data))
    expect(result.counts).toMatchObject({ announcements: 2, programs: 3, rules: 2, bonuses: 1, documents: 1, errors: 0 })
  })
})

describe('기준·설정과 수집 필터 입력 검증 (§8.4·§12)', () => {
  it('가중치: 합계가 1.00이어야 하고, 0~1 사이 0.05 단위', () => {
    expect(checkFitWeights({ interest: 0.4, stage: 0.3, text: 0.3 })).toMatchObject({ sum: 1, valid: true, sumError: null })
    expect(checkFitWeights({ interest: 0.5, stage: 0.3, text: 0.3 })).toMatchObject({ sum: 1.1, valid: false, sumError: FIT_WEIGHT_SUM_MESSAGE })
    expect(checkFitWeights({ interest: 0.42, stage: 0.28, text: 0.3 }).fieldErrors).toMatchObject({
      interest: '0.05 단위로 입력해 주세요.',
      stage: '0.05 단위로 입력해 주세요.',
    })
    expect(checkFitWeights({ interest: 1.2, stage: null, text: 0 })).toMatchObject({ sum: null, valid: false })
  })

  it('키워드: 1~20자, 중복 제거, 최대 50개', () => {
    expect(normalizeKeywords([' 수출 ', '해외', '수출', ''])).toEqual({ keywords: ['수출', '해외'], rejected: [] })
    const long = '가'.repeat(21)
    expect(normalizeKeywords([long]).rejected[0]).toContain('20자를 넘어')
    const many = Array.from({ length: 51 }, (_, i) => `키워드${i}`)
    const result = normalizeKeywords(many)
    expect(result.keywords).toHaveLength(50)
    expect(result.rejected).toEqual(['키워드는 50개까지 넣을 수 있습니다.'])
  })

  it('19개 전략표 내려받기는 머리글만 있는 CSV', () => {
    expect(parseCsv(buildStrategyTemplateCsv())).toEqual([STRATEGY_COLUMNS])
    expect(STRATEGY_COLUMNS).toEqual(['번호', '전략명', '수출단계', '추천 경로', '지금 할 일', '다음 목표', '연결 지원 분야'])
  })
})

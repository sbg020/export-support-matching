/*
 * xlsx 읽기 (관리자 화면에서만 지연 로드, 브라우저 안에서만).
 * SheetJS 공식 배포본 0.20.3(cdn.sheetjs.com)을 쓴다. npm 레지스트리의 xlsx 0.18.5는
 * 알려진 취약점(CVE-2023-30533, CVE-2024-22363)이 고쳐지지 않아 쓰지 않는다 (REVISION_04 §11.3).
 */
import type { AnswerSetCell, AnswerSetSheets } from '@/types/answerSet'

/** 시트마다 1행부터 행 배열로 (빈 행도 남겨 행 번호를 맞춘다) */
export async function readWorkbook(data: ArrayBuffer): Promise<AnswerSetSheets> {
  const XLSX = await import('xlsx')
  // ArrayBuffer를 그대로 넘기면 SheetJS가 글 파일로 잘못 읽는 경우가 있어 Uint8Array로 감싼다
  const workbook = XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true })
  const sheets: AnswerSetSheets = {}
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue
    sheets[name] = XLSX.utils.sheet_to_json<AnswerSetCell[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    })
  }
  return sheets
}

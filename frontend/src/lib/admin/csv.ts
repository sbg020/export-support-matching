/*
 * CSV 읽기·쓰기 (관리자 화면, 브라우저 안에서만). 파일을 서버로 보내지 않는다.
 * 따옴표 안의 쉼표·줄바꿈·두 번 쓴 따옴표("")를 처리한다 (RFC 4180).
 */

export const UTF8_BOM = '﻿'

/** CSV 글을 행 배열로 나눈다. 맨 앞 BOM은 지우고, 끝의 빈 줄은 행으로 세지 않는다 */
export function parseCsv(text: string): string[][] {
  const source = text.startsWith(UTF8_BOM) ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let i = 0
  while (i < source.length) {
    const char = source[i]
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        quoted = false
      } else {
        field += char
      }
      i += 1
      continue
    }
    if (char === '"' && field === '') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      if (char === '\r' && source[i + 1] === '\n') i += 1
    } else {
      field += char
    }
    i += 1
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** 행 배열을 CSV 글로 (UTF-8 BOM 포함, 줄 끝 CRLF — 엑셀에서 한글이 깨지지 않게) */
export function toCsv(rows: string[][]): string {
  return UTF8_BOM + rows.map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n'
}

export type CsvEncoding = 'utf-8' | 'euc-kr'

/**
 * 파일 바이트를 글로 바꾼다. UTF-8(BOM 유무 모두)로 먼저 읽고, 깨진 글자(�)가 나오면 EUC-KR로 다시 읽는다.
 * 엑셀의 'CSV (쉼표로 분리)' 저장 파일을 위해서다.
 */
export function decodeCsvBytes(bytes: Uint8Array): { text: string; encoding: CsvEncoding } {
  const utf8 = new TextDecoder('utf-8').decode(bytes)
  if (!utf8.includes('�')) return { text: utf8, encoding: 'utf-8' }
  try {
    return { text: new TextDecoder('euc-kr').decode(bytes), encoding: 'euc-kr' }
  } catch {
    return { text: utf8, encoding: 'utf-8' }
  }
}

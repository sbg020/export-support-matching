/*
 * 서류함 ↔ 공고 제출 서류 연결 (순수 함수).
 * 공고의 제출 서류는 documentType이 있으면 그대로, 없으면 서류 이름으로 유형을 추정한다.
 * 서류함에 같은 유형의 기록이 있으면 '서류함에 있음'(보유·만료 예정) 또는 '작성 중'으로 표시한다.
 */
import type { IsoDate } from '@/types/common'
import type { RequiredDocument } from '@/types/program'
import type { DocumentRecord, DocumentStatus, DocumentType } from '@/types/tracking'
import { daysBetween } from '@/lib/engine/opportunityCost'

const NAME_RULES: [RegExp, DocumentType][] = [
  [/사업자\s*등록/, 'business-registration'],
  [/재무\s*제표/, 'financial-statements'],
  [/수출\s*실적/, 'export-performance'],
  [/사업\s*계획서/, 'business-plan'],
  [/중소\s*(기업)?\s*확인/, 'sme-confirmation'],
  [/(납세|완납)\s*증명/, 'tax-certificate'],
  [/인증서/, 'certification-copy'],
]

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  held: '보유',
  drafting: '작성 중',
  expiring: '만료 예정',
  missing: '미보유',
}

/** 제출 서류의 유형 (명시값 → 이름 추정 → null) */
export function requirementDocumentType(doc: Pick<RequiredDocument, 'documentType' | 'name'>): DocumentType | null {
  if (doc.documentType) return doc.documentType
  return NAME_RULES.find(([pattern]) => pattern.test(doc.name))?.[1] ?? null
}

const RANK: Record<DocumentStatus, number> = { held: 0, expiring: 1, drafting: 2, missing: 9 }

/** 제출 서류에 맞는 서류함 기록 (보유 → 만료 예정 → 작성 중 순). 미보유·없음이면 null */
export function vaultMatch(
  doc: Pick<RequiredDocument, 'documentType' | 'name'>,
  documents: readonly DocumentRecord[],
): DocumentRecord | null {
  const type = requirementDocumentType(doc)
  if (!type) return null
  const candidates = documents.filter((d) => d.type === type && d.status !== 'missing')
  return candidates.sort((a, b) => RANK[a.status] - RANK[b.status])[0] ?? null
}

/** 체크리스트에 붙일 문구 */
export function vaultTagText(match: DocumentRecord | null): string | null {
  if (!match) return null
  if (match.status === 'drafting') return '서류함: 작성 중'
  if (match.status === 'expiring') return '서류함에 있음 · 만료 예정'
  return '서류함에 있음'
}

/** 유효기간이 기준일로부터 days일 안에 끝나는지 (기준일은 데이터 기준일, 시스템 날짜를 쓰지 않는다) */
export function expiresWithin(document: DocumentRecord, asOf: IsoDate, days = 30): boolean {
  if (!document.expiresAt) return false
  const left = daysBetween(asOf, document.expiresAt)
  return left !== null && left >= 0 && left <= days
}

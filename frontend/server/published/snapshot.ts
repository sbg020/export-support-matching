/// <reference types="node" />
/*
 * 게시 공고 스냅샷 (서버 전용 읽기).
 * backend `export_public_snapshot`이 만든 frontend/src/data/published/notices.json 을 그대로 읽는다.
 * Vercel 함수에는 vercel.json functions.includeFiles 로 이 파일을 함께 싣는다.
 * 사용자 정보는 들어 있지 않다 (공고 원문에서 정리한 값과 판정식만 있다).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NoticeCondition } from '../../src/types/program.js'

export interface PublishedNotice {
  id: string
  parentId: string | null
  title: string | null
  sourceTitle: string | null
  sourceFile: string | null
  sourceUrl: string | null
  sourcePublishedAt: string | null
  applyStart: string | null
  applyEnd: string | null
  applyPeriodNote: string | null
  receptionStatus: 'open' | 'upcoming' | 'closed' | null
  receptionStatusAsOf: string | null
  ministry: string | null
  agency: string | null
  regions: string[] | null
  supportTypes: string[] | null
  supportTypesNote: string | null
  maxAmountKrw: number | null
  amountNote: string | null
  supportCategories: string[] | null
  summaryEasy: string | null
  targetDescription: string | null
  requiredDocs: { id: string; name: string; requirement?: string | null; note?: string | null }[] | null
  publishSource: string | null
  publishSourceLabel: string | null
  autoExtracted: boolean
  conditions: NoticeCondition[]
}

export interface PublishedSnapshot {
  meta: { schemaVersion: number; asOf: string; dataVersion: string; counts: Record<string, number>; engine: string }
  conditionTypes: { code: string; name: string }[]
  notices: PublishedNotice[]
}

export const SNAPSHOT_RELATIVE_PATH = 'src/data/published/notices.json'

let cache: PublishedSnapshot | null = null

/** 스냅샷을 한 번만 읽어 둔다. 파일이 없으면 오류를 던진다 (호출한 쪽에서 503으로 바꾼다). */
export function loadSnapshot(root: string = process.cwd()): PublishedSnapshot {
  if (cache) return cache
  const raw = readFileSync(join(root, SNAPSHOT_RELATIVE_PATH), 'utf-8')
  cache = JSON.parse(raw) as PublishedSnapshot
  return cache
}

/** 테스트용: 메모리 스냅샷을 직접 넣는다 */
export function setSnapshotForTest(snapshot: PublishedSnapshot | null): void {
  cache = snapshot
}

/** 공고 사업 분류 15개 (src/constants/categories.ts 와 같은 이름) */
export const CATEGORY_NAMES: Record<string, string> = {
  C01: '전시회/행사/해외영업지원',
  C02: '조사/일반컨설팅',
  C03: '법무·세무·회계',
  C04: '특허/지재권/시험',
  C05: '해외규격인증',
  C06: '홍보/광고',
  C07: '브랜드개발/관리',
  C08: '디자인개발',
  C09: '홍보동영상',
  C10: '서류대행/현지등록',
  C11: '역량강화교육',
  C12: '통번역',
  C13: '국제운송',
  C14: '무역보험·보증',
  C15: '관세대응 패키지',
}

/*
 * 게시 공고 검색 (챗봇 1단계, REVISION_05 §8.2): 제목·본문 TF-IDF.
 * 한국어는 띄어쓰기가 일정하지 않아 글자 2-gram을 단어로 쓴다 (영문·숫자는 단어 단위).
 * 본문 대신 스냅샷에 있는 공고 정리 값(제목, 기관, 분류, 지원 내용·금액 설명, 조건 근거 문장, 제출 서류)을 쓴다.
 */
import { CATEGORY_NAMES, type PublishedNotice } from './snapshot.js'

export function tokenize(text: string): string[] {
  const tokens: string[] = []
  const words = text.toLowerCase().match(/[가-힣]+|[a-z0-9]+/g) ?? []
  for (const word of words) {
    if (/^[a-z0-9]+$/.test(word)) {
      if (word.length >= 2) tokens.push(word)
      continue
    }
    if (word.length === 1) continue
    for (let i = 0; i < word.length - 1; i += 1) tokens.push(word.slice(i, i + 2))
  }
  return tokens
}

export function noticeDocument(n: PublishedNotice): string {
  const parts: (string | null | undefined)[] = [
    n.title,
    n.title,
    n.sourceTitle,
    n.ministry,
    n.agency,
    ...(n.supportCategories ?? []).map((c) => CATEGORY_NAMES[c]),
    n.supportTypesNote,
    n.amountNote,
    n.summaryEasy,
    n.targetDescription,
    n.applyPeriodNote,
    ...(n.requiredDocs ?? []).map((d) => d.name),
    ...n.conditions.map((c) => c.evidence),
  ]
  return parts.filter((v): v is string => typeof v === 'string' && v !== '').join(' ')
}

interface IndexEntry {
  id: string
  weights: Map<string, number>
  norm: number
}

export interface SearchIndex {
  idf: Map<string, number>
  entries: IndexEntry[]
}

function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  return tf
}

export function buildIndex(notices: readonly PublishedNotice[]): SearchIndex {
  const docs = notices.map((n) => ({ id: n.id, tf: termFreq(tokenize(noticeDocument(n))) }))
  const df = new Map<string, number>()
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1)
  const total = docs.length
  const idf = new Map<string, number>()
  for (const [t, f] of df) idf.set(t, Math.log((1 + total) / (1 + f)) + 1)
  const entries = docs.map((d) => {
    const weights = new Map<string, number>()
    let sq = 0
    for (const [t, f] of d.tf) {
      const w = (1 + Math.log(f)) * (idf.get(t) ?? 0)
      weights.set(t, w)
      sq += w * w
    }
    return { id: d.id, weights, norm: Math.sqrt(sq) || 1 }
  })
  return { idf, entries }
}

/** 질문과 코사인 유사도가 0보다 큰 공고를 점수 순으로 limit개 돌려준다 */
export function searchNotices(index: SearchIndex, query: string, limit = 5): { id: string; score: number }[] {
  const qtf = termFreq(tokenize(query))
  const qw = new Map<string, number>()
  let qsq = 0
  for (const [t, f] of qtf) {
    const idf = index.idf.get(t)
    if (idf === undefined) continue
    const w = (1 + Math.log(f)) * idf
    qw.set(t, w)
    qsq += w * w
  }
  if (qw.size === 0) return []
  const qnorm = Math.sqrt(qsq)
  const scored: { id: string; score: number }[] = []
  for (const e of index.entries) {
    let dot = 0
    for (const [t, w] of qw) dot += w * (e.weights.get(t) ?? 0)
    if (dot > 0) scored.push({ id: e.id, score: dot / (qnorm * e.norm) })
  }
  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return scored.slice(0, limit)
}

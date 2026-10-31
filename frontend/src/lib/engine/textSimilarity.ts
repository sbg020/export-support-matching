/*
 * 내용 유사도 (시험용 v0, 순수 함수). REVISION_02 §7.2
 *
 * 글자 2-gram TF-IDF 코사인 유사도. 공고 문장들로 IDF를 만들고, 기업 문장은 같은 IDF로 바꿔 비교한다.
 * 나중에 문장 임베딩(v1)으로 바꿀 수 있게 similarity(companyText, programTexts[]) 인터페이스로 둔다.
 * backend/matching/engine.py가 같은 정의로 구현한다 (docs/contracts/engine-cases.json으로 확인).
 *
 * - 정규화: NFKC → 소문자 → 숫자·영문·한글만 남김 (공백·문장부호 제거)
 * - TF: 2-gram 등장 횟수, IDF: ln((1 + N) / (1 + df)) + 1, 벡터는 L2 정규화
 */

export const TEXT_SIMILARITY_VERSION = 'char2gram-tfidf-v0'

export function normalizeText(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[^0-9a-z가-힣]/g, '')
}

export function charBigrams(text: string): string[] {
  const normalized = normalizeText(text)
  const grams: string[] = []
  for (let i = 0; i + 1 < normalized.length; i += 1) grams.push(normalized.slice(i, i + 2))
  return grams
}

function termCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const gram of charBigrams(text)) counts.set(gram, (counts.get(gram) ?? 0) + 1)
  return counts
}

function weighted(counts: Map<string, number>, idf: Map<string, number>): Map<string, number> {
  const vector = new Map<string, number>()
  let norm = 0
  for (const [term, count] of counts) {
    const weight = idf.get(term)
    if (weight === undefined) continue
    const value = count * weight
    vector.set(term, value)
    norm += value * value
  }
  norm = Math.sqrt(norm)
  if (norm > 0) for (const [term, value] of vector) vector.set(term, value / norm)
  return vector
}

/** 기업 문장과 각 공고 문장의 코사인 유사도 (0~1) */
export function similarity(companyText: string, programTexts: readonly string[]): number[] {
  const docs = programTexts.map(termCounts)
  const df = new Map<string, number>()
  for (const doc of docs) for (const term of doc.keys()) df.set(term, (df.get(term) ?? 0) + 1)
  const n = docs.length
  const idf = new Map<string, number>()
  for (const [term, count] of df) idf.set(term, Math.log((1 + n) / (1 + count)) + 1)

  const query = weighted(termCounts(companyText), idf)
  return docs.map((doc) => {
    const vector = weighted(doc, idf)
    let dot = 0
    for (const [term, value] of query) dot += value * (vector.get(term) ?? 0)
    return dot
  })
}

/**
 * 점수를 0~1 백분위로 바꾼다 (중간 순위). 같은 점수는 같은 백분위를 받는다.
 * 대상이 하나뿐이면 비교할 대상이 없으므로 0.5로 둔다.
 */
export function percentileRanks(scores: readonly number[]): number[] {
  const n = scores.length
  if (n === 0) return []
  if (n === 1) return [0.5]
  const key = (x: number) => Math.round(x * 1e9)
  return scores.map((score) => {
    const k = key(score)
    let below = 0
    let equal = 0
    for (const other of scores) {
      const o = key(other)
      if (o < k) below += 1
      else if (o === k) equal += 1
    }
    return (below + (equal - 1) / 2) / (n - 1)
  })
}

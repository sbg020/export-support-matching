/*
 * 커뮤니티 표시용 도우미 (REVISION_02 §10.2).
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** 등록일: 오늘 글은 'HH:mm', 이전 글은 'YYYY.MM.DD' (보는 사람의 현지 시각 기준) */
export function formatPostDate(iso: string, now: Date): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  if (sameDay) return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

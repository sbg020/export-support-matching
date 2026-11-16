/*
 * 관리자 화면용 읽기 전용 저장소 (REVISION_05). 서버 DB가 없는 배포 환경에서 쓴다.
 * - 게시 공고: src/data/published/notices.json, 검수 대기·텍스트 추출 불가: admin-review.json
 *   (backend `export_public_snapshot`이 만든다. 공고 원문과 추출 조건만 있고 사용자 정보는 없다)
 * - 쓰기(승인·반려·일괄 게시·수집·업로드 반영 등)는 저장소가 없어 막는다. canWrite = false.
 *   일괄 게시·적재는 로컬에서 관리 명령(publish_auto_extracted, ingest_notice_folder)으로 하고 스냅샷을 다시 만든다.
 */
import type { IsoDate } from '@/types/common'
import type { NoticeCondition, Program } from '@/types/program'
import type {
  AdminDashboard,
  AdminNoticeList,
  AdminNoticeQuery,
  AdminNoticeSource,
  AdminNoticeStatus,
  AdminNoticeSummary,
  ReviewItem,
} from '@/types/admin'
import { EmptyAdminRepository } from './emptyAdminRepository'
import { PUBLISHED_AS_OF, loadPublishedSnapshot } from '../publishedProgramRepository'

const PAGE_SIZE = 20

export interface AdminReviewEntry {
  notice: Program & { conditions?: NoticeCondition[] }
  status: 'pending-review' | 'text-failed'
  fileName: string
  reason: string | null
  pages: string[]
}

interface AdminReviewSnapshot {
  meta: { asOf: IsoDate; counts: { pending: number; textFailed: number } }
  items: AdminReviewEntry[]
}

let reviewCache: Promise<AdminReviewSnapshot> | null = null
export function loadAdminReview(): Promise<AdminReviewSnapshot> {
  reviewCache ??= import('@/data/published/admin-review.json').then((m) => m.default as unknown as AdminReviewSnapshot)
  return reviewCache
}

const SOURCES: AdminNoticeSource[] = ['bizinfo', 'kotra', 'kita', 'answer-set', 'folder']

function sourceOf(p: Program): AdminNoticeSource {
  return SOURCES.find((v) => v === p.publishSource) ?? 'folder'
}

function summary(p: Program, status: AdminNoticeStatus): AdminNoticeSummary {
  return {
    id: p.id,
    title: p.title ?? null,
    source: sourceOf(p),
    sourceRef: p.sourceFile ?? null,
    status,
    receptionStatus: p.receptionStatus ?? null,
    applyEnd: p.applyEnd ?? null,
    applyPeriodNote: p.applyPeriodNote ?? null,
    version: 1,
    collectedAt: PUBLISHED_AS_OF,
    reviewedAt: status === 'published' && !p.autoExtracted ? PUBLISHED_AS_OF : null,
    reviewedBy: (p.review as { reviewer?: string | null } | null | undefined)?.reviewer ?? null,
  }
}

function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
}

export class SnapshotAdminRepository extends EmptyAdminRepository {
  private async allSummaries(): Promise<AdminNoticeSummary[]> {
    const [published, review] = await Promise.all([loadPublishedSnapshot(), loadAdminReview()])
    const pub = (published.notices as unknown as Program[]).map((p) => summary(p, 'published'))
    const rev = review.items.map((r) => summary({ ...r.notice, title: r.notice.title ?? r.fileName } as Program, r.status))
    return [...pub, ...rev]
  }

  override async getDashboard(): Promise<AdminDashboard> {
    const [published, review] = await Promise.all([loadPublishedSnapshot(), loadAdminReview()])
    const notices = published.notices as unknown as Program[]
    const closingSoon = notices.filter((p) => {
      if (!p.applyEnd) return false
      const d = daysBetween(PUBLISHED_AS_OF, p.applyEnd.slice(0, 10))
      return d >= 0 && d <= 7
    }).length
    return {
      asOf: PUBLISHED_AS_OF,
      todayCollected: null,
      pendingReview: review.meta.counts.pending,
      oldestPendingCollectedAt: null,
      closingSoon,
      collectionErrors: review.meta.counts.textFailed,
      pipeline: {
        collected: notices.length + review.items.length,
        stored: notices.length + review.items.length,
        extracting: 0,
        pendingReview: review.meta.counts.pending,
        published: notices.length,
      },
    }
  }

  override async listReviewQueue(): Promise<AdminNoticeSummary[]> {
    const review = await loadAdminReview()
    return review.items.filter((r) => r.status === 'pending-review').map((r) => summary(r.notice as Program, 'pending-review'))
  }

  override async getReviewItem(id = ''): Promise<ReviewItem | null> {
    const review = await loadAdminReview()
    const entry = review.items.find((r) => r.notice.id === id)
    if (!entry) return null
    const p = entry.notice as Program
    // confidence가 낮은 조건을 위쪽에 (기본 0.6 미만)
    const conditions = [...(entry.notice.conditions ?? [])].sort((a, b) => (a.confidence ?? 1) - (b.confidence ?? 1))
    const low = conditions.filter((c) => (c.confidence ?? 1) < 0.6).length
    return {
      notice: summary(p, entry.status),
      ministry: p.ministry ?? null,
      checkPoint:
        entry.status === 'text-failed'
          ? `텍스트 추출 불가: ${entry.reason ?? '-'}`
          : `자동 추출 조건 ${conditions.length}개 · confidence 0.6 미만 ${low}개`,
      sourceUrl: p.sourceUrl ?? null,
      pages: entry.pages.map((text, i) => ({ page: i + 1, text })),
      extractions: conditions.map((c) => ({
        key: 'manual_check',
        label: `${c.kind} · ${c.condType}${c.confidence !== null ? ` · confidence ${c.confidence}` : ''}`,
        value: c.exprText || JSON.stringify(c.expr),
        certainty: c.certainty === '명확' ? 'clear' : 'ambiguous',
        evidence: c.page ? { page: c.page, start: 0, end: 0 } : null,
        commonCheckKey: null,
      })),
      labels: { supportCategories: p.supportCategories ?? [], targetExportStages: [], summaryEasy: p.summaryEasy ?? null },
      memo: null,
    }
  }

  override async listNotices(query: AdminNoticeQuery = { source: null, status: null, keyword: null, page: 1 }): Promise<AdminNoticeList> {
    let items = await this.allSummaries()
    if (query.source) items = items.filter((n) => n.source === query.source)
    if (query.status === 'closed') items = items.filter((n) => n.receptionStatus === 'closed')
    else if (query.status) items = items.filter((n) => n.status === query.status)
    const keyword = query.keyword?.trim()
    if (keyword) items = items.filter((n) => (n.title ?? '').includes(keyword) || (n.sourceRef ?? '').includes(keyword))
    const start = (Math.max(1, query.page) - 1) * PAGE_SIZE
    return { items: items.slice(start, start + PAGE_SIZE), total: items.length }
  }
}

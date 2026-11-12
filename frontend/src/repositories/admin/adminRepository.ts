/*
 * 관리자 화면 전용 읽기·쓰기 경계 (REVISION_04 §6.3).
 *
 * 화면은 이 인터페이스만 사용한다. 지금 구현은 EmptyAdminRepository(저장소 없음) 하나이고,
 * 다음 개정에서 /api/admin/*을 쓰는 구현을 더한다. 쓰기는 canWrite가 true일 때만 화면에서 부른다.
 */
import type {
  AdminDashboard,
  AdminNoticeList,
  AdminNoticeQuery,
  AdminNoticeSummary,
  CollectionRun,
  CollectionSettings,
  CriteriaSettings,
  DuplicateGroup,
  NoticeVersion,
  RejectReason,
  ReviewItem,
  UploadKind,
  UploadRecord,
} from '@/types/admin'

export type AdminSourceStatus = { kind: 'not-connected' } | { kind: 'api'; baseUrl: string }

export interface AdminRepository {
  readonly source: AdminSourceStatus
  /** 저장(쓰기)을 할 수 있는지. false면 화면이 저장 버튼을 비활성으로 둔다 */
  readonly canWrite: boolean

  // 읽기
  getDashboard(): Promise<AdminDashboard>
  getCollectionSettings(): Promise<CollectionSettings | null>
  listCollectionRuns(): Promise<CollectionRun[]>
  listUploads(kind: UploadKind): Promise<UploadRecord[]>
  listReviewQueue(): Promise<AdminNoticeSummary[]>
  getReviewItem(id: string): Promise<ReviewItem | null>
  listNotices(query: AdminNoticeQuery): Promise<AdminNoticeList>
  listDuplicateGroups(): Promise<DuplicateGroup[]>
  listNoticeVersions(id: string): Promise<NoticeVersion[]>
  getCriteriaSettings(): Promise<CriteriaSettings | null>

  // 쓰기 (저장소 연결 후)
  runCollection(): Promise<CollectionRun>
  saveCollectionSettings(settings: CollectionSettings): Promise<void>
  applyUpload(kind: UploadKind, fileName: string, rows: unknown[]): Promise<UploadRecord>
  revertUpload(id: string): Promise<void>
  approve(id: string, review: Pick<ReviewItem, 'labels' | 'memo'>): Promise<void>
  reject(id: string, reason: RejectReason, memo: string | null): Promise<void>
  suspend(id: string, reason: string): Promise<void>
  republish(id: string): Promise<void>
  merge(groupId: string, keepId: string): Promise<void>
  keepSeparate(groupId: string): Promise<void>
  saveCriteriaSettings(settings: CriteriaSettings): Promise<void>
}

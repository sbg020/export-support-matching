import type {
  AdminDashboard,
  AdminNoticeList,
  AdminNoticeSummary,
  CollectionRun,
  CollectionSettings,
  CriteriaSettings,
  DuplicateGroup,
  NoticeVersion,
  ReviewItem,
  UploadRecord,
} from '@/types/admin'
import type { AdminRepository, AdminSourceStatus } from './adminRepository'

/** 저장소가 연결되지 않았을 때 쓰기 메서드가 던지는 오류. 성공을 흉내 내지 않는다 */
export const NOT_CONNECTED_ERROR = 'not-connected'

function notConnected(): never {
  throw new Error(NOT_CONNECTED_ERROR)
}

/**
 * 공고 저장소가 연결되지 않은 상태의 관리자 경계 (REVISION_04 §6.3).
 * 읽기는 수치 null(화면 '-'), 목록 []를 돌려준다. 쓰기는 화면이 canWrite로 막으며, 불리면 오류를 던진다.
 */
export class EmptyAdminRepository implements AdminRepository {
  readonly source: AdminSourceStatus = { kind: 'not-connected' }
  readonly canWrite = false

  async getDashboard(): Promise<AdminDashboard> {
    return {
      asOf: null,
      todayCollected: null,
      pendingReview: null,
      oldestPendingCollectedAt: null,
      closingSoon: null,
      collectionErrors: null,
      pipeline: null,
    }
  }

  async getCollectionSettings(): Promise<CollectionSettings | null> {
    return null
  }

  async listCollectionRuns(): Promise<CollectionRun[]> {
    return []
  }

  async listUploads(): Promise<UploadRecord[]> {
    return []
  }

  async listReviewQueue(): Promise<AdminNoticeSummary[]> {
    return []
  }

  async getReviewItem(): Promise<ReviewItem | null> {
    return null
  }

  async listNotices(): Promise<AdminNoticeList> {
    return { items: [], total: null }
  }

  async listDuplicateGroups(): Promise<DuplicateGroup[]> {
    return []
  }

  async listNoticeVersions(): Promise<NoticeVersion[]> {
    return []
  }

  async getCriteriaSettings(): Promise<CriteriaSettings | null> {
    return null
  }

  async runCollection(): Promise<CollectionRun> {
    return notConnected()
  }

  async saveCollectionSettings(): Promise<void> {
    return notConnected()
  }

  async applyUpload(): Promise<UploadRecord> {
    return notConnected()
  }

  async revertUpload(): Promise<void> {
    return notConnected()
  }

  async approve(): Promise<void> {
    return notConnected()
  }

  async reject(): Promise<void> {
    return notConnected()
  }

  async suspend(): Promise<void> {
    return notConnected()
  }

  async republish(): Promise<void> {
    return notConnected()
  }

  async merge(): Promise<void> {
    return notConnected()
  }

  async keepSeparate(): Promise<void> {
    return notConnected()
  }

  async saveCriteriaSettings(): Promise<void> {
    return notConnected()
  }
}

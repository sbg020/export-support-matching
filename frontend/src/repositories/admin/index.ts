import type { AdminRepository } from './adminRepository'
import { EmptyAdminRepository } from './emptyAdminRepository'
import { SnapshotAdminRepository } from './snapshotAdminRepository'

export type { AdminRepository, AdminSourceStatus } from './adminRepository'
export { EmptyAdminRepository, NOT_CONNECTED_ERROR } from './emptyAdminRepository'

export { SnapshotAdminRepository } from './snapshotAdminRepository'

/**
 * 관리자 화면이 쓰는 저장소 (REVISION_05): 서버 DB가 없으므로 게시·검수 스냅샷을 읽기 전용으로 쓴다.
 * 테스트 실행 환경(VITE_PUBLISHED_SNAPSHOT=off)에서는 빈 저장소. 서버 API가 생기면 여기서 고른다.
 */
export const adminRepository: AdminRepository =
  (import.meta.env.VITE_PUBLISHED_SNAPSHOT ?? '').trim() === 'off' ? new EmptyAdminRepository() : new SnapshotAdminRepository()

import type { AdminRepository } from './adminRepository'
import { EmptyAdminRepository } from './emptyAdminRepository'

export type { AdminRepository, AdminSourceStatus } from './adminRepository'
export { EmptyAdminRepository, NOT_CONNECTED_ERROR } from './emptyAdminRepository'

/**
 * 관리자 화면이 쓰는 저장소. 이번 개정에는 관리자 API가 없으므로 항상 빈 저장소다 (REVISION_04 §6.3).
 * 다음 개정에서 /api/admin/*을 쓰는 구현을 여기서 고른다.
 */
export const adminRepository: AdminRepository = new EmptyAdminRepository()

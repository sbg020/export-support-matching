/*
 * 커뮤니티 데이터 읽기 경계 (REVISION_02 §10.7).
 *
 * 게시글·댓글을 저장할 서버와 회원 DB가 아직 없으므로 빈 구현만 연결한다.
 * 브라우저 저장소에 글·댓글·추천을 저장해 커뮤니티가 동작하는 것처럼 보이게 하지 않는다
 * (그런 글은 다른 사람에게 보이지 않는다). 서버가 생기면 이 인터페이스의 HTTP 구현으로 바꾼다.
 */
import type {
  CommunityBoard,
  CommunityComment,
  CommunityListResult,
  CommunityPost,
  CommunityQuery,
  ReviewStats,
} from '@/types/community'

export interface CommunityRepository {
  /** 서버가 연결되어 글을 읽고 쓸 수 있는지 */
  readonly connected: boolean
  list(query: CommunityQuery): Promise<CommunityListResult>
  getPost(board: CommunityBoard, postId: string): Promise<CommunityPost | null>
  listComments(postId: string): Promise<CommunityComment[]>
  /** 공고의 참여 후기 요약. 후기 5건 미만이거나 서버가 없으면 null */
  reviewStats(programId: string): Promise<ReviewStats | null>
  /** 정보방에서 그 공고에 연결된 글 수. 서버가 없으면 null */
  countInfoPosts(programId: string): Promise<number | null>
}

export class EmptyCommunityRepository implements CommunityRepository {
  readonly connected = false

  async list(): Promise<CommunityListResult> {
    return { items: [], notices: [], weeklyPopular: [], total: null }
  }

  async getPost(): Promise<CommunityPost | null> {
    return null
  }

  async listComments(): Promise<CommunityComment[]> {
    return []
  }

  async reviewStats(): Promise<ReviewStats | null> {
    return null
  }

  async countInfoPosts(): Promise<number | null> {
    return null
  }
}

/** 앱 전체에서 사용하는 커뮤니티 저장소 (지금은 빈 구현) */
export const communityRepository: CommunityRepository = new EmptyCommunityRepository()

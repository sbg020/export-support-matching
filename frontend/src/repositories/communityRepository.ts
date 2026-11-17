/*
 * 커뮤니티 데이터 읽기 경계 (REVISION_02 §10.7).
 *
 * 게시글·댓글을 저장할 서버와 회원 DB가 아직 없다. 지금은 임시 예시 글(src/data/communitySamples.ts,
 * 게시판별 20개, 작성자 '익명')을 읽기 전용으로 보여 준다(SampleCommunityRepository). 글쓰기·댓글·추천은 막는다.
 * 브라우저 저장소에 글·댓글·추천을 저장하지 않는다. 서버가 생기면 이 인터페이스의 HTTP 구현으로 바꾼다.
 * 테스트 실행 환경(VITE_COMMUNITY_SAMPLES=off)에서는 빈 구현을 쓴다.
 */
import { COMMUNITY_PAGE_SIZE } from '@/constants/community'
import { SAMPLE_INFO_POSTS, SAMPLE_REVIEW_POSTS } from '@/data/communitySamples'
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
  /** 임시 예시 글을 보여 주는 중인지 */
  readonly sample: boolean
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
  readonly sample: boolean = false

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

/** 임시 예시 글 저장소 (읽기 전용). 검색·정렬·말머리·페이지(10개씩)는 화면과 같은 규칙으로 동작한다 */
export class SampleCommunityRepository implements CommunityRepository {
  readonly connected = false
  readonly sample = true

  private postsOf(board: CommunityBoard): CommunityPost[] {
    return board === 'reviews' ? SAMPLE_REVIEW_POSTS : SAMPLE_INFO_POSTS
  }

  async list(query: CommunityQuery): Promise<CommunityListResult> {
    let items = [...this.postsOf(query.board)]
    if (query.programId) items = items.filter((p) => p.programId === query.programId)
    if (query.category) items = items.filter((p) => p.category === query.category)
    const keyword = query.keyword?.trim().toLowerCase()
    if (keyword) {
      items = items.filter((p) =>
        (query.searchScope === 'title-body' ? `${p.title} ${p.body}` : p.title).toLowerCase().includes(keyword),
      )
    }
    const key: Record<CommunityQuery['sort'], (p: CommunityPost) => number> = {
      latest: () => 0,
      views: (p) => p.viewCount,
      likes: (p) => p.likeCount,
      comments: (p) => p.commentCount,
    }
    items.sort((a, b) => key[query.sort](b) - key[query.sort](a) || b.createdAt.localeCompare(a.createdAt))
    const start = (Math.max(1, query.page) - 1) * COMMUNITY_PAGE_SIZE
    return { items: items.slice(start, start + COMMUNITY_PAGE_SIZE), notices: [], weeklyPopular: [], total: items.length }
  }

  async getPost(board: CommunityBoard, postId: string): Promise<CommunityPost | null> {
    return this.postsOf(board).find((p) => p.id === postId) ?? null
  }

  /** 예시 글에는 댓글이 없다 */
  async listComments(): Promise<CommunityComment[]> {
    return []
  }

  /** 예시 글로 공고 후기 요약을 만들지 않는다 */
  async reviewStats(): Promise<ReviewStats | null> {
    return null
  }

  async countInfoPosts(): Promise<number | null> {
    return null
  }
}

/** 앱 전체에서 사용하는 커뮤니티 저장소: 임시 예시 글 (테스트 환경은 빈 구현) */
export const communityRepository: CommunityRepository =
  (import.meta.env.VITE_COMMUNITY_SAMPLES ?? '').trim() === 'off'
    ? new EmptyCommunityRepository()
    : new SampleCommunityRepository()

import type { IsoDateTime } from './common'

/*
 * 커뮤니티 (지원사업 후기 · 지원사업 정보방) 타입. REVISION_02 §10
 * 게시글을 저장할 서버·회원 DB가 아직 없으므로 화면은 빈 구현(EmptyCommunityRepository)을 쓴다.
 * 예시 글이나 가짜 글을 만들지 않는다.
 */

export type CommunityBoard = 'reviews' | 'info'

/** 지원사업 후기 말머리: 선정 후기 · 수행 후기 · 정산 후기 */
export type ReviewCategory = 'selection' | 'execution' | 'settlement'

/** 지원사업 정보방 말머리: 질문 · 정보 공유 · 모집·행사 소식 · 자유 */
export type InfoCategory = 'question' | 'share' | 'event' | 'free'

export type PostStatus = 'pending' | 'published' | 'hidden'

/** 작성자 표시. 후기는 '업종 · 수출단계 · 지역', 정보방은 닉네임만 보인다 */
export interface PostAuthorDisplay {
  kind: 'company-profile' | 'nickname' | 'operator'
  label: string
  /** 참여 확인 배지 (지원사업 후기) */
  participationVerified: boolean
}

/** 지원사업 후기 문항 답 (§10.3) */
export interface ReviewAnswers {
  contentMatched: 'same' | 'partly-different' | 'very-different' | null
  /** 신청서류 준비에 걸린 시간 */
  prepHours: number | null
  /** 실제 자부담 비율(%). 모름이면 null */
  selfPaymentPercent: number | null
  /** 정산 난이도 1~5 */
  settlementDifficulty: number | null
  /** 수행기관 대응 1~5 (수행기관이 있는 사업만) */
  operatorResponse: number | null
  outcomes: ('buyer' | 'contract' | 'certification' | 'none')[]
  rejoinIntent: 'yes' | 'no' | 'unknown' | null
}

export interface CommunityPost {
  id: string
  board: CommunityBoard
  category: ReviewCategory | InfoCategory
  title: string
  body: string
  author: PostAuthorDisplay
  /** 연결된 공고 */
  programId: string | null
  programYear: number | null
  programRound: string | null
  operatorName: string | null
  reviewAnswers: ReviewAnswers | null
  status: PostStatus
  /** 운영자 공지 (목록 맨 위 고정) */
  isNotice: boolean
  viewCount: number
  likeCount: number
  commentCount: number
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface CommunityComment {
  id: string
  postId: string
  /** 답글이면 부모 댓글 ID (1단계까지) */
  parentId: string | null
  author: PostAuthorDisplay
  body: string
  status: PostStatus
  createdAt: IsoDateTime
}

export type CommunitySort = 'latest' | 'views' | 'likes' | 'comments'

export interface CommunityQuery {
  board: CommunityBoard
  keyword: string | null
  searchScope: 'title' | 'title-body'
  sort: CommunitySort
  category: string | null
  /** 특정 공고에 연결된 글만 */
  programId: string | null
  page: number
}

export interface CommunityListResult {
  items: CommunityPost[]
  /** 공지(운영자 글) */
  notices: CommunityPost[]
  /** 최근 7일 추천순 인기글 */
  weeklyPopular: CommunityPost[]
  /** 전체 건수. 서버가 연결되지 않았으면 null('-') */
  total: number | null
}

/** 참여 후기 요약 (후기 5건 이상일 때만 만든다) */
export interface ReviewStats {
  count: number
  prepHoursMedian: number | null
  selfPaymentPercentMedian: number | null
  settlementDifficultyMedian: number | null
  /** 재참여 의향 '예' 비율 (0~1) */
  rejoinRate: number | null
  /** 집계한 후기의 작성 기간 */
  periodFrom: IsoDateTime
  periodTo: IsoDateTime
}

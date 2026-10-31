/*
 * 커뮤니티 게시판 정의 (REVISION_02 §10.2~10.5).
 */
import type { Option } from '@/types/common'
import type { CommunityBoard, CommunitySort, InfoCategory, ReviewCategory } from '@/types/community'

export interface BoardDefinition {
  board: CommunityBoard
  label: string
  description: string
  routeName: 'community-reviews' | 'community-info'
  categories: Option<ReviewCategory | InfoCategory>[]
  /** 작성자 표시 규칙 안내 */
  authorRule: string
}

export const COMMUNITY_BOARDS: Record<CommunityBoard, BoardDefinition> = {
  reviews: {
    board: 'reviews',
    label: '지원사업 후기',
    description: '사업 참여가 확인된 기업이 남긴 선정·수행·정산 후기를 봅니다.',
    routeName: 'community-reviews',
    categories: [
      { value: 'selection', label: '선정 후기' },
      { value: 'execution', label: '수행 후기' },
      { value: 'settlement', label: '정산 후기' },
    ],
    authorRule: '회사명 대신 업종 · 수출단계 · 지역만 표시합니다.',
  },
  info: {
    board: 'info',
    label: '지원사업 정보방',
    description: '지원사업에 관한 질문과 정보를 자유롭게 나눕니다.',
    routeName: 'community-info',
    categories: [
      { value: 'question', label: '질문' },
      { value: 'share', label: '정보 공유' },
      { value: 'event', label: '모집·행사 소식' },
      { value: 'free', label: '자유' },
    ],
    authorRule: '회원 닉네임만 표시합니다. 실명·회사명은 보이지 않습니다.',
  },
}

export function isCommunityBoard(value: unknown): value is CommunityBoard {
  return value === 'reviews' || value === 'info'
}

export const COMMUNITY_SORT_OPTIONS: Option<CommunitySort>[] = [
  { value: 'latest', label: '최신순' },
  { value: 'views', label: '조회순' },
  { value: 'likes', label: '추천순' },
  { value: 'comments', label: '댓글순' },
]

export const COMMUNITY_PAGE_SIZE = 20
export const WEEKLY_POPULAR_MIN_POSTS = 5

/** 글쓰기·등록을 막는 이유 (서버·회원 DB 미연결) */
export const COMMUNITY_WRITE_DISABLED_REASON =
  '게시글을 저장할 서버와 회원 정보가 아직 연결되지 않아 글쓰기는 준비 중입니다.'
export const REVIEW_WRITE_RULE = '참여가 확인된 기업만 쓸 수 있습니다.'

/** 지원사업 후기 문항 (§10.3). 공고 상세의 '후기 문항 보기'에서 읽기 전용으로 보여 준다 */
export const REVIEW_QUESTIONS: { label: string; format: string }[] = [
  { label: '지원 내용이 공고와 같았나요?', format: '같음 / 일부 다름 / 많이 다름' },
  { label: '신청서류 준비에 걸린 시간', format: '시간 (숫자)' },
  { label: '실제 자부담 비율', format: '% (숫자) 또는 모름' },
  { label: '정산 난이도', format: '1~5' },
  { label: '수행기관 대응', format: '1~5 (수행기관이 있는 사업만)' },
  { label: '성과', format: '바이어 연결 / 계약 / 인증 획득 / 해당 없음 (복수 선택)' },
  { label: '다시 참여할 의향', format: '예 / 아니요 / 모름' },
  { label: '제목 · 본문', format: '제목 40자, 본문 1,000자 이내. 회사명·개인정보·비방 금지' },
]

/** 정보방 이용 규칙 요약 (§10.4) */
export const INFO_BOARD_RULES: string[] = [
  '광고·영업 홍보(수행기관·컨설팅 업체의 유료 서비스 홍보 포함)는 올릴 수 없습니다.',
  '개인정보·사업자등록번호·연락처를 게시하지 마세요.',
  '다른 사람이나 기관을 비방하지 마세요.',
  '신고가 3건 이상 쌓인 글은 자동으로 가려지고 운영자가 검토합니다.',
]

/** 지원사업 후기 작성 규칙 요약 (§10.3) */
export const REVIEW_BOARD_RULES: string[] = [
  '마이페이지 관리 기록이 선정완료·수행중·완료이고, 선정 통보·협약서 같은 증빙을 운영자가 확인한 기업만 쓸 수 있습니다.',
  '같은 기업은 같은 사업·연도·차수에 후기를 1개만 쓰고 수정할 수 있습니다.',
  '회사명·개인정보·비방은 쓰지 마세요. 운영자 검토 후 게시됩니다.',
]

/** 글·댓글에 들어가면 등록 전에 경고하는 개인정보 형식 (§10.5) */
export const PERSONAL_INFO_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: '사업자등록번호', pattern: /(?<!\d)\d{3}-?\d{2}-?\d{5}(?!\d)/ },
  { label: '전화번호', pattern: /(?<!\d)0\d{1,2}-?\d{3,4}-?\d{4}(?!\d)/ },
  { label: '이메일', pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/ },
]

export function detectPersonalInfo(text: string): string[] {
  return PERSONAL_INFO_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)
}

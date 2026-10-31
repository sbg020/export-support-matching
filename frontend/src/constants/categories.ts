/*
 * 지원 분야 체계 (REVISION_02 §6.1~6.3, §7.3).
 * 15개 세부 분야를 기본 분류로 두고, 4개 지원 단계는 세부 분야에서 여러 개로 파생한다.
 * 아래 매핑은 검증 전 가설이며, 화면의 '추천 기준 안내'에 버전과 함께 표시한다.
 */
import type { InterestArea } from '@/types/profile'
import type { ExportStage, SupportCategoryCode, SupportStage } from '@/types/program'
import { INTEREST_AREA_OPTIONS } from './options'

export interface SupportCategory {
  code: SupportCategoryCode
  name: string
}

/** C01~C14는 수출바우처의 14개 서비스 영역, C15는 팀이 추가한 분류 */
export const SUPPORT_CATEGORIES: SupportCategory[] = [
  { code: 'C01', name: '전시회/행사/해외영업지원' },
  { code: 'C02', name: '조사/일반컨설팅' },
  { code: 'C03', name: '법무·세무·회계' },
  { code: 'C04', name: '특허/지재권/시험' },
  { code: 'C05', name: '해외규격인증' },
  { code: 'C06', name: '홍보/광고' },
  { code: 'C07', name: '브랜드개발/관리' },
  { code: 'C08', name: '디자인개발' },
  { code: 'C09', name: '홍보동영상' },
  { code: 'C10', name: '서류대행/현지등록' },
  { code: 'C11', name: '역량강화교육' },
  { code: 'C12', name: '통번역' },
  { code: 'C13', name: '국제운송' },
  { code: 'C14', name: '무역보험·보증' },
  { code: 'C15', name: '관세대응 패키지' },
]

const CATEGORY_NAMES = new Map(SUPPORT_CATEGORIES.map((c) => [c.code, c.name]))

export function categoryName(code: SupportCategoryCode): string {
  return CATEGORY_NAMES.get(code) ?? code
}

export function isSupportCategoryCode(value: string): value is SupportCategoryCode {
  return CATEGORY_NAMES.has(value as SupportCategoryCode)
}

/** 지원 단계 표시 순서 */
export const SUPPORT_STAGE_ORDER: SupportStage[] = ['preparation', 'market-entry', 'execution', 'localization']

export const CATEGORY_PHASE_VERSION = 'category-phase-v0'

/** 세부 분야 → 주 단계 + 함께 걸치는 단계 (§6.2) */
export const CATEGORY_PHASES: Record<SupportCategoryCode, { primary: SupportStage; also: SupportStage[] }> = {
  C02: { primary: 'preparation', also: ['market-entry'] },
  C07: { primary: 'preparation', also: ['market-entry'] },
  C08: { primary: 'preparation', also: ['market-entry'] },
  C11: { primary: 'preparation', also: [] },
  C12: { primary: 'preparation', also: ['market-entry', 'execution'] },
  C04: { primary: 'preparation', also: ['localization'] },
  C01: { primary: 'market-entry', also: ['execution'] },
  C06: { primary: 'market-entry', also: [] },
  C09: { primary: 'market-entry', also: ['preparation'] },
  C05: { primary: 'market-entry', also: ['preparation'] },
  C10: { primary: 'market-entry', also: ['localization'] },
  C13: { primary: 'execution', also: ['market-entry'] },
  C14: { primary: 'execution', also: [] },
  C15: { primary: 'execution', also: ['localization'] },
  C03: { primary: 'localization', also: ['execution'] },
}

/** 15개 체크박스를 4개 지원 단계로 묶어 보여 줄 때 쓰는 주 단계별 목록 */
export const CATEGORIES_BY_PRIMARY_PHASE: { stage: SupportStage; codes: SupportCategoryCode[] }[] =
  SUPPORT_STAGE_ORDER.map((stage) => ({
    stage,
    codes: SUPPORT_CATEGORIES.filter((c) => CATEGORY_PHASES[c.code].primary === stage).map((c) => c.code),
  }))

/** 공고의 지원 단계 = 세부 분야의 주 단계와 함께 걸치는 단계의 합집합. 분류가 비어 있으면 null */
export function deriveSupportPhases(categories: SupportCategoryCode[] | null): SupportStage[] | null {
  if (!categories || categories.length === 0) return null
  const phases = new Set<SupportStage>()
  for (const code of categories) {
    const mapping = CATEGORY_PHASES[code]
    phases.add(mapping.primary)
    mapping.also.forEach((stage) => phases.add(stage))
  }
  return SUPPORT_STAGE_ORDER.filter((stage) => phases.has(stage))
}

/** 관심 분야 → 세부 분야 (§6.3) */
export const INTEREST_CATEGORIES: Record<InterestArea, SupportCategoryCode[]> = {
  'market-research': ['C02'],
  'buyer-matching': ['C01'],
  exhibition: ['C01'],
  marketing: ['C06', 'C07', 'C08', 'C09'],
  certification: ['C05'],
  logistics: ['C13', 'C15'],
  translation: ['C12'],
  'export-finance': ['C14'],
  'legal-tax': ['C03'],
  ip: ['C04'],
  'local-registration': ['C10'],
  'export-training': ['C11'],
  'customs-fta': ['C15'],
}

/** 표시용: 세부 분야에서 역매핑한 관심 분야 (관심 분야 선택지 순서) */
export function deriveSupportAreas(categories: SupportCategoryCode[] | null): InterestArea[] | null {
  if (categories === null) return null
  const set = new Set(categories)
  return INTEREST_AREA_OPTIONS.map((o) => o.value).filter((area) =>
    INTEREST_CATEGORIES[area].some((code) => set.has(code)),
  )
}

export const STAGE_PHASE_VERSION = 'stage-phase-v0'

/** ◎ 우선 = 1.0, ○ 함께 보기 = 0.5, · = 0.2. 공고를 숨기지 않도록 0은 쓰지 않는다 (§7.3) */
export const STAGE_PHASE_WEIGHTS: Record<ExportStage, Record<SupportStage, number>> = {
  domestic: { preparation: 1, 'market-entry': 0.5, execution: 0.2, localization: 0.2 },
  beginner: { preparation: 0.5, 'market-entry': 1, execution: 0.5, localization: 0.2 },
  promising: { preparation: 0.2, 'market-entry': 1, execution: 1, localization: 0.2 },
  growth: { preparation: 0.2, 'market-entry': 0.5, execution: 1, localization: 0.5 },
  strong: { preparation: 0.2, 'market-entry': 0.5, execution: 0.5, localization: 1 },
}

/** 권장 지원 단계: ◎(우선)와 ○(함께 보기) */
export function recommendedPhases(stage: ExportStage): { primary: SupportStage[]; secondary: SupportStage[] } {
  const weights = STAGE_PHASE_WEIGHTS[stage]
  return {
    primary: SUPPORT_STAGE_ORDER.filter((phase) => weights[phase] === 1),
    secondary: SUPPORT_STAGE_ORDER.filter((phase) => weights[phase] === 0.5),
  }
}

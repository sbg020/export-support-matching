/*
 * 적합도 v1 기준 (REVISION_05 §6). 초기값이며 관리자 기준·설정에서 바꿀 수 있게 할 값이다(저장소 연결 후).
 * 모든 값은 '검증 전 시험값'이다. 재무 원형 연결은 실증 근거가 아니라 선행연구에 기반한 가정이다.
 */
import type { ExportStage, SupportCategoryCode } from '@/types/program'

export const FIT_V1_VERSION = 'fit-v1'
export const FIT_V1_MAPPING_VERSIONS = ['stage-category-v1', 'archetype-category-v1']
export const FIT_V1_STATUS_LABEL = '검증 전 시험값'
export const FINANCE_ASSUMPTION_NOTE =
  '재무 원형과 지원 분야의 연결은 실증 근거가 아니라 선행연구에 기반한 가정이므로, 이용 데이터가 쌓이면 보정합니다.'

/** 4개 요소 (가점 요소는 2026-11 삭제) */
export type FitV1FactorKey = 'interest' | 'industry' | 'stage' | 'finance'

export const FIT_V1_WEIGHTS: Record<FitV1FactorKey, number> = {
  interest: 0.25,
  industry: 0.25,
  stage: 0.25,
  finance: 0.25,
}

export const FIT_V1_LABEL: Record<FitV1FactorKey, string> = {
  interest: '관심 분야 × 사업 분류 일치도',
  industry: '공고 내용 × KSIC 업종 일치도',
  stage: '수출단계 × 사업 분류 일치도',
  finance: '재무 원형 × 사업 분류 일치도',
}

/** 계산할 수 있는 요소가 이보다 적으면 점수를 내지 않는다 */
export const FIT_V1_MIN_FACTORS = 2

/** ◎ 핵심 = 1.0 · ○ 권장 = 0.6 · △ 선택 = 0.3 */
export const MARK_VALUE = { '◎': 1, '○': 0.6, '△': 0.3 } as const
type Mark = keyof typeof MARK_VALUE

const STAGES: ExportStage[] = ['domestic', 'beginner', 'promising', 'growth', 'strong']
const STAGE_ROWS: [SupportCategoryCode, string][] = [
  ['C02', '◎◎○○△'],
  ['C11', '◎◎○△△'],
  ['C12', '◎◎○△△'],
  ['C08', '◎○○○△'],
  ['C01', '○◎◎○○'],
  ['C05', '○◎◎○○'],
  ['C10', '○◎○○△'],
  ['C09', '○◎○○△'],
  ['C06', '△○◎◎○'],
  ['C13', '△○◎◎○'],
  ['C14', '△○◎◎◎'],
  ['C07', '○○○◎◎'],
  ['C04', '△○○◎◎'],
  ['C03', '△○○◎◎'],
  ['C15', '△○○◎◎'],
]

/** 수출단계 × 사업 분류 매칭표 (§6.2) */
export const STAGE_CATEGORY_MATRIX: Record<SupportCategoryCode, Record<ExportStage, Mark>> = Object.fromEntries(
  STAGE_ROWS.map(([code, marks]) => [
    code,
    Object.fromEntries(STAGES.map((stage, i) => [stage, [...marks][i] as Mark])) as Record<ExportStage, Mark>,
  ]),
) as Record<SupportCategoryCode, Record<ExportStage, Mark>>

export type Archetype = '스타형' | '우량형' | '보수형' | '확장형' | '위축형' | '정체형'

/** 원형 × 사업 분류 매칭표 (§6.3): 핵심 1.0 · 보조 0.6 · 표에 없는 분류 0.3 */
export const ARCHETYPE_CATEGORY: Record<Archetype, { core: SupportCategoryCode[]; support: SupportCategoryCode[] }> = {
  스타형: { core: ['C01', 'C05', 'C07', 'C06'], support: ['C04', 'C10', 'C08'] },
  우량형: { core: ['C02', 'C05', 'C01'], support: ['C08', 'C09', 'C12', 'C04'] },
  보수형: { core: ['C02', 'C08', 'C09', 'C06'], support: ['C04', 'C11', 'C01'] },
  확장형: { core: ['C14', 'C13', 'C10'], support: ['C05', 'C01', 'C03'] },
  위축형: { core: ['C11', 'C03', 'C14', 'C12'], support: ['C02', 'C13'] },
  정체형: { core: ['C02', 'C14', 'C03'], support: ['C04', 'C07'] },
}
export const ARCHETYPE_VALUES = { core: 1, support: 0.6, other: 0.3 }

/** 원형 설명표 (화면 안내용). '주로 나타나는 단계'는 판정에 쓰지 않는다 */
export const ARCHETYPE_GUIDE: {
  name: Archetype
  feature: string
  stages: string
  sgr: string
  strategy: string
  basis: string
}[] = [
  { name: '스타형', feature: '고성장·고수익', stages: '초보·유망·성장·강소', sgr: '성장을 수익으로 감당하고 있음', strategy: '공격적 시장 확대, 높은 수준의 진입', basis: 'Higgins, Melitz, Uppsala' },
  { name: '우량형', feature: '내수·고수익', stages: '내수', sgr: '수익 여력은 있지만 아직 수출 전', strategy: '첫 수출 준비에 투자', basis: 'Melitz, Greenaway, Manova' },
  { name: '보수형', feature: '저부채', stages: '전 단계', sgr: '빌릴 여력은 있지만 성장에 소극적', strategy: '위험이 낮은 시장 개발, 점진적 확대', basis: 'Myers-Majluf, Ansoff, Uppsala' },
  { name: '확장형', feature: '고성장·고부채', stages: '내수~성장', sgr: '실제 성장률이 SGR보다 높아 부채로 성장 중', strategy: '자금 부담을 줄이면서 성장 유지', basis: 'Higgins, Manova, 전기영(2022)' },
  { name: '위축형', feature: '저성장·고부채', stages: '내수~성장', sgr: '성장·수익 부진에 부채 부담까지', strategy: '기반 정비, 자부담이 낮은 활동부터', basis: 'Myers-Majluf, 길재욱 외(2015)' },
  { name: '정체형', feature: '강소·고부채', stages: '강소', sgr: '규모는 크지만 성장이 정체되고 부채가 있음', strategy: '시장 다변화, 위험 관리', basis: 'Higgins, Ansoff' },
]

/*
 * 재무 원형 기준표는 v4(재무 유형 군집화, 수출단계별 군집)를 쓴다: lib/engine/archetypeReference.ts
 * (기준표가 커서 이 상수 파일에는 넣지 않는다. 판정 함수는 lib/engine/fitV1.ts 의 financeArchetype)
 */

/**
 * 테스트 전용 데이터. 앱 코드에서 불러오지 않는다 (tsconfig.app.json이 __tests__를 제외).
 * 모든 값이 null인 '빈 공고'에서 시작해 각 테스트에 필요한 필드만 채운다. 실제 공고가 아니다.
 */
import type { EligibilityRule, Program } from '@/types/program'

export function blankProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'test-only',
    parentId: null,
    subProgramName: null,
    title: null,
    sourceUrl: null,
    sourceTitle: null,
    sourceFile: null,
    sourcePublishedAt: null,
    verifiedAt: null,
    applyStart: null,
    applyEnd: null,
    applyPeriodNote: null,
    applyPeriodSource: null,
    receptionStatus: null,
    receptionStatusAsOf: null,
    announcementDate: null,
    agreementDate: null,
    ministry: null,
    agency: null,
    agencyType: null,
    regions: null,
    regionDistricts: null,
    regionNote: null,
    stage: null,
    supportCategories: null,
    supportPhases: null,
    supportAreas: null,
    categorySource: null,
    isVoucherMenu: null,
    outOfCategoryScope: null,
    supportTypes: null,
    supportTypesNote: null,
    maxAmountKrw: null,
    totalBudgetMaxKrw: null,
    amountNote: null,
    amountSource: null,
    selfPayment: null,
    settlement: null,
    selectionSize: null,
    targetExportStages: null,
    targetStageSource: null,
    summaryEasy: null,
    targetDescription: null,
    useExamples: null,
    eligibilityRules: null,
    requiredDocs: null,
    bonusItems: null,
    obligations: null,
    duplicateSupportNotes: null,
    groupKey: null,
    relatedProgramIds: null,
    prepEstimate: null,
    draftNotes: null,
    review: null,
    dataState: null,
    ...overrides,
  }
}

/** 테스트 전용 '검수 전 초안' 공고 (데이터 기준일 2030-06-30) */
export function draftProgram(overrides: Partial<Program> = {}): Program {
  return blankProgram({ dataState: 'draft', receptionStatusAsOf: '2030-06-30', ...overrides })
}

export const testSource = { quote: '테스트 근거 문구', url: null, locator: '1쪽' }

/** 테스트 전용 자격 규칙. 기본은 '필수 · manual_check' */
export function rule(overrides: Partial<EligibilityRule> = {}): EligibilityRule {
  return {
    id: 'T-R01',
    kind: 'required',
    group: null,
    scope: null,
    field: 'manual_check',
    op: 'none',
    value: null,
    valueNote: null,
    unit: null,
    basis: null,
    certainty: 'clear',
    label: '테스트 조건',
    commonCheckKey: null,
    commonCheckUncovered: [],
    exceptionText: null,
    source: testSource,
    note: null,
    review: { author: null, status: null, source: null },
    ...overrides,
  }
}

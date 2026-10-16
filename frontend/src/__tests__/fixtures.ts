/**
 * 테스트 전용 데이터. 앱 코드에서 불러오지 않는다 (tsconfig.app.json이 __tests__를 제외).
 * 모든 값이 null인 '빈 공고'에서 시작해 각 테스트에 필요한 필드만 채운다. 실제 공고가 아니다.
 */
import type { Program } from '@/types/program'

export function blankProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: 'test-only',
    title: null,
    sourceUrl: null,
    sourceTitle: null,
    sourcePublishedAt: null,
    verifiedAt: null,
    applyStart: null,
    applyEnd: null,
    receptionStatus: null,
    announcementDate: null,
    agreementDate: null,
    ministry: null,
    agency: null,
    agencyType: null,
    regions: null,
    stage: null,
    supportAreas: null,
    supportTypes: null,
    maxAmountKrw: null,
    selfPayment: null,
    summaryEasy: null,
    targetDescription: null,
    useExamples: null,
    eligibilityRules: null,
    requiredDocs: null,
    obligations: null,
    duplicateSupportNotes: null,
    relatedProgramIds: null,
    prepEstimate: null,
    ...overrides,
  }
}

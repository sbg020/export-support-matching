/*
 * 테스트 계정(TEST) 임시 기록: 나의 사업 관리 8건 · 서류함 7건.
 *
 * - 공고는 사이트에 게시된 실제 공고(src/data/published/notices.json, 정답세트)에서 TEST 계정 판정 결과로 골랐다.
 *   관심 3(신청 가능 P034·P063, 확인 필요 P005) · 준비 중 2(신청 가능·마감 전 P037·P036) · 신청완료 1(P038)
 *   · 심사중 1(P006, 마감 지남) · 선정완료 1(P007, 마감 지남).
 * - 기록 날짜는 각 공고의 접수 기간 안, 데이터 기준일(2026-10-20) 이전이다.
 * - 서류함은 파일 없이 문서 기록(메타데이터)만 둔다. 수출실적증명서는 '해당 없음' 상태가 없어 넣지 않았다.
 * - TEST 계정으로 처음 로그인할 때 한 번만 넣는다(stores/accountScope.ts). 사용자가 지우거나 바꾼 기록은 다시 넣지 않는다.
 */
import type { ApplicationRecord, ApplicationStatus, DocumentRecord } from '@/types/tracking'

const at = (date: string, time = '10:00') => `${date}T${time}:00+09:00`

function history(...steps: [ApplicationStatus, string][]): ApplicationRecord['history'] {
  return steps.map(([status, changedAt]) => ({ status, changedAt }))
}

function record(partial: Partial<ApplicationRecord> & Pick<ApplicationRecord, 'programId' | 'status' | 'history'>): ApplicationRecord {
  return { memo: null, appliedOn: null, resultOn: null, checklist: [], businessPlanDocumentId: null, ...partial }
}

const checked = (...ids: string[]) => ids.map((requiredDocumentId) => ({ requiredDocumentId, checked: true }))

export function createTestAccountRecords(): ApplicationRecord[] {
  return [
    // 관심 3건
    record({
      programId: 'P034',
      status: 'interested',
      history: history(['interested', at('2026-10-16', '09:40')]),
      memo: '인증 비용 지원 범위 확인 필요',
    }),
    record({
      programId: 'P063',
      status: 'interested',
      history: history(['interested', at('2026-10-12', '14:20')]),
      memo: '11월 출장 일정 확정되면 신청',
    }),
    record({
      programId: 'P005',
      status: 'interested',
      history: history(['interested', at('2026-10-13', '11:05')]),
      memo: '무역보험 가입 조건 확인 필요',
    }),
    // 준비 중 2건 (서류 체크리스트 일부만 체크)
    record({
      programId: 'P037',
      status: 'preparing',
      history: history(['interested', at('2026-09-25', '10:10')], ['preparing', at('2026-10-02', '16:30')]),
      memo: '사업자등록증명·재무제표 준비 완료, 사업계획서 작성 중',
      checklist: checked('P037-D06', 'P037-D07', 'P037-D08'),
      businessPlanDocumentId: 'TEST-DOC-BP',
    }),
    record({
      programId: 'P036',
      status: 'preparing',
      history: history(['interested', at('2026-10-05', '13:00')], ['preparing', at('2026-10-08', '09:15')]),
      memo: '공장등록증·통장 사본 준비 필요',
      checklist: checked('P036-D04', 'P036-D08'),
    }),
    // 신청완료 1건
    record({
      programId: 'P038',
      status: 'applied',
      history: history(
        ['interested', at('2026-09-22', '15:00')],
        ['preparing', at('2026-09-26', '10:30')],
        ['applied', at('2026-10-14', '17:45')],
      ),
      appliedOn: '2026-10-14',
      memo: '온라인 접수 완료, 접수 확인 메일 보관',
    }),
    // 심사중 1건 (마감 지난 공고)
    record({
      programId: 'P006',
      status: 'under_review',
      history: history(
        ['interested', at('2026-09-30', '11:20')],
        ['preparing', at('2026-10-02', '10:00')],
        ['applied', at('2026-10-08', '16:10')],
        ['under_review', at('2026-10-17', '09:30')],
      ),
      appliedOn: '2026-10-08',
      memo: '서류 심사 결과 대기',
    }),
    // 선정완료 1건 (마감 지난 공고)
    record({
      programId: 'P007',
      status: 'selected',
      history: history(
        ['interested', at('2026-09-30', '11:25')],
        ['applied', at('2026-10-10', '14:00')],
        ['under_review', at('2026-10-16', '18:00')],
        ['selected', at('2026-10-19', '10:20')],
      ),
      appliedOn: '2026-10-10',
      resultOn: '2026-10-19',
      memo: '선정 안내 받음, 협약 서류 준비',
    }),
  ]
}

function doc(partial: Partial<DocumentRecord> & Pick<DocumentRecord, 'id' | 'type' | 'title' | 'status'>): DocumentRecord {
  return { fileName: null, uploadedAt: null, issuedOn: null, expiresAt: null, linkedProgramIds: [], note: null, ...partial }
}

export function createTestAccountDocuments(): DocumentRecord[] {
  return [
    doc({
      id: 'TEST-DOC-BR',
      type: 'business-registration',
      title: '사업자등록증명원',
      status: 'held',
      issuedOn: '2026-10-02',
      linkedProgramIds: ['P037', 'P036'],
    }),
    doc({
      id: 'TEST-DOC-FS2025',
      type: 'financial-statements',
      title: '표준재무제표증명(2025)',
      status: 'held',
      issuedOn: '2026-09-30',
      linkedProgramIds: ['P037', 'P036'],
    }),
    doc({
      id: 'TEST-DOC-FS2024',
      type: 'financial-statements',
      title: '표준재무제표증명(2024)',
      status: 'held',
      issuedOn: '2026-09-30',
    }),
    doc({
      id: 'TEST-DOC-SME',
      type: 'sme-confirmation',
      title: '중소기업확인서',
      status: 'held',
      issuedOn: '2026-04-01',
      expiresAt: '2027-03-31',
      linkedProgramIds: ['P037'],
    }),
    doc({
      id: 'TEST-DOC-HACCP',
      type: 'certification-copy',
      title: 'HACCP 인증서',
      status: 'held',
      issuedOn: '2025-05-20',
      expiresAt: '2028-05-19',
    }),
    doc({
      id: 'TEST-DOC-BP',
      type: 'business-plan',
      title: '사업계획서',
      status: 'drafting',
      linkedProgramIds: ['P037'],
      note: '수출 패키지 지원 신청용으로 작성 중',
    }),
    doc({
      id: 'TEST-DOC-TAX',
      type: 'tax-certificate',
      title: '국세·지방세 완납증명서',
      status: 'expiring',
      issuedOn: '2026-09-30',
      expiresAt: '2026-10-30',
      linkedProgramIds: ['P037', 'P036'],
      note: '유효기간 만료 전 다시 발급 필요',
    }),
  ]
}

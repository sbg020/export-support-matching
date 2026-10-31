/*
 * 수출단계 진단 v1 (순수 함수). REVISION_02 §5
 *
 * 기준: 중소벤처기업부 「2026년 중소기업 수출지원사업 통합공고」의 수출바우처 지원트랙 구분.
 * 원문을 직접 열어 구간을 확인했고, 원문 문구는 요약 없이 그대로 옮겼다.
 * 수출액이 입력되지 않았으면 진단하지 않는다(null → 화면 '-').
 */
import type { IsoDate, SourceReference } from '@/types/common'
import type { CompanyProfile } from '@/types/profile'
import type { ExportStage } from '@/types/program'
import type { ExportStageDiagnosis } from '@/types/results'
import { recommendedPhases } from '@/constants/categories'
import { EXPORT_STAGE_OPTIONS, optionLabel } from '@/constants/options'
import { formatUsd, formatYearMonth } from '@/lib/display'

export interface ExportStageBand {
  stage: ExportStage
  /** 직전 연도 수출액 하한 (USD, 포함). 제한 없으면 null */
  exportUsdMin: number | null
  /** 직전 연도 수출액 상한 (USD, 미포함). 제한 없으면 null */
  exportUsdMax: number | null
  /** 원문 표의 해당 행 */
  quote: string
}

export interface ExportStageCriteria {
  version: string
  /** 원문과 대조해 확인한 날짜 */
  verifiedAt: IsoDate
  /** 출처 이름 (공고명·번호·공고일) */
  sourceTitle: string
  /** 출처 주소가 공식 게시 주소가 아니면 그 사실 */
  sourceNote: string | null
  /** quote = 원문 문구 그대로, locator = 쪽 */
  source: SourceReference
  /** '전년도'의 기준이 되는 사업 연도. 데이터 기준일이 없을 때만 쓴다 */
  programYear: number
  bands: ExportStageBand[]
}

const COPY_URL =
  'https://grant-documents.thevc.kr/285117_2026%EB%85%84%EB%8F%84_%EC%A4%91%EC%86%8C%EA%B8%B0%EC%97%85_%EC%88%98%EC%B6%9C%EC%A7%80%EC%9B%90%EC%82%AC%EC%97%85_%ED%86%B5%ED%95%A9%EA%B3%B5%EA%B3%A0%28251210%29-%EC%B5%9C%EC%A2%85.pdf'

const BANDS: ExportStageBand[] = [
  { stage: 'domestic', exportUsdMin: null, exportUsdMax: 1_000, quote: '내수기업 전년도 수출액 ‘1,000불 미만’' },
  { stage: 'beginner', exportUsdMin: 1_000, exportUsdMax: 100_000, quote: '수출초보 전년도 수출액 ‘1,000불~10만불 미만’' },
  { stage: 'promising', exportUsdMin: 100_000, exportUsdMax: 1_000_000, quote: '수출유망 전년도 수출액 ‘10∼100만불 미만’' },
  { stage: 'growth', exportUsdMin: 1_000_000, exportUsdMax: 5_000_000, quote: '수출성장 전년도 수출액 ‘100∼500만불 미만’' },
  { stage: 'strong', exportUsdMin: 5_000_000, exportUsdMax: null, quote: '수출강소 전년도 수출액 ‘500만불 이상’' },
]

/** 현재 적용 중인 진단 기준 (export-stage-v1) */
export const ACTIVE_EXPORT_STAGE_CRITERIA: ExportStageCriteria = {
  version: 'export-stage-v1',
  verifiedAt: '2026-10-31',
  sourceTitle: '중소벤처기업부 공고 제2025-634호 「2026년 중소기업 수출지원사업 통합공고」(2025-12-10) ① 수출바우처',
  sourceNote: '확인용 사본 주소입니다. 중소벤처기업부·기업마당의 공식 게시 주소를 찾지 못했습니다.',
  source: {
    quote: [
      '수출액 규모에 따라 지원트랙을 구분하고 최대 1억원 한도 내에서 매출액 규모에 따라 보조비율(50~70%) 차등',
      '내수기업 전년도 수출액 ‘1,000불 미만’ 30백만원 50~70%*',
      '수출초보 전년도 수출액 ‘1,000불~10만불 미만’ 30백만원',
      '수출유망 전년도 수출액 ‘10∼100만불 미만’ 40백만원',
      '수출성장 전년도 수출액 ‘100∼500만불 미만’ 70백만원',
      '수출강소 전년도 수출액 ‘500만불 이상’ 100백만원',
    ].join('\n'),
    url: COPY_URL,
    locator: '3쪽',
  },
  programYear: 2026,
  bands: BANDS,
}

export interface DiagnosisContext {
  /** 데이터 기준일. 직전 연도 = 기준일 연도 − 1. 시스템 날짜를 쓰지 않는다 */
  asOf: IsoDate | null
}

/** 'USD 금액 → 10만 달러' 같은 읽기 쉬운 표기 */
export function usdThresholdText(usd: number): string {
  if (usd >= 10_000) return `${(usd / 10_000).toLocaleString('ko-KR')}만 달러`
  return `${usd.toLocaleString('ko-KR')}달러`
}

function stageLabel(stage: ExportStage): string {
  return optionLabel(EXPORT_STAGE_OPTIONS, stage) ?? stage
}

/** 다음 단계 조건 (기준표에서 만든다). 강소는 '최상위 단계입니다.' */
export function nextStageConditions(stage: ExportStage, criteria: ExportStageCriteria): string[] {
  const index = criteria.bands.findIndex((band) => band.stage === stage)
  const next = criteria.bands[index + 1]
  if (index < 0 || !next || next.exportUsdMin === null) return ['최상위 단계입니다.']
  return [`직전 연도 수출액 ${usdThresholdText(next.exportUsdMin)} 이상이면 ${stageLabel(next.stage)} 단계입니다.`]
}

/** 기준 구간 표기. 예: '1,000달러 이상 ~ 10만 달러 미만' */
export function bandText(band: ExportStageBand): string {
  if (band.exportUsdMin === null && band.exportUsdMax !== null) return `${usdThresholdText(band.exportUsdMax)} 미만`
  if (band.exportUsdMax === null && band.exportUsdMin !== null) return `${usdThresholdText(band.exportUsdMin)} 이상`
  return `${usdThresholdText(band.exportUsdMin ?? 0)} 이상 ~ ${usdThresholdText(band.exportUsdMax ?? 0)} 미만`
}

export function diagnoseExportStage(
  profile: CompanyProfile,
  context: DiagnosisContext = { asOf: null },
  criteria: ExportStageCriteria | null = ACTIVE_EXPORT_STAGE_CRITERIA,
): ExportStageDiagnosis | null {
  if (criteria === null) return null
  const exportUsd = profile.exportUsdLastYear
  if (exportUsd === null) return null

  const band = criteria.bands.find(
    (b) => (b.exportUsdMin === null || exportUsd >= b.exportUsdMin) && (b.exportUsdMax === null || exportUsd < b.exportUsdMax),
  )
  if (!band) return null

  const referenceYear = (context.asOf ? Number(context.asOf.slice(0, 4)) : criteria.programYear) - 1
  const start = profile.exportPeriodStart
  const end = profile.exportPeriodEnd
  let periodNote: string | null = null
  if (start === null || end === null) {
    periodNote = '측정 기간이 입력되지 않아 직전 연도(1~12월) 기준인지 알 수 없어 참고용입니다.'
  } else if (start !== `${referenceYear}-01` || end !== `${referenceYear}-12`) {
    periodNote = '측정 기간이 직전 연도(1~12월)와 달라 참고용입니다.'
  }

  const periodText = start && end ? `${formatYearMonth(start)} ~ ${formatYearMonth(end)}` : '측정 기간 미입력'
  const phases = recommendedPhases(band.stage)
  return {
    stage: band.stage,
    exportUsd,
    periodStart: start,
    periodEnd: end,
    referenceYear,
    periodNote,
    bandMin: band.exportUsdMin,
    bandMax: band.exportUsdMax,
    primaryPhases: phases.primary,
    secondaryPhases: phases.secondary,
    reasons: [
      `입력한 수출액 ${formatUsd(exportUsd)}(${periodText})이 ${stageLabel(band.stage)} 구간(직전 연도 수출액 ${bandText(band)})에 해당합니다.`,
    ],
    nextStageConditions: nextStageConditions(band.stage, criteria),
    source: criteria.source,
    basisDate: criteria.verifiedAt,
    criteriaVersion: criteria.version,
  }
}

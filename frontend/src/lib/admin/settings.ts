/*
 * 관리자 기준·설정과 수집 필터의 입력 검증 (REVISION_04 §8.4, §12). 순수 함수.
 * 저장은 저장소 연결 후에 켜진다. 여기서는 화면 안의 검증만 한다.
 */
import { toCsv } from './csv'

/** 적합도 가중치 입력: 0.00~1.00, 0.05 단위 */
export const FIT_WEIGHT_STEP = 0.05
export const FIT_WEIGHT_SUM_MESSAGE = '합계가 1.00이어야 저장할 수 있습니다.'

export interface FitWeightCheck {
  /** 소수 둘째 자리로 반올림한 합계. 빈 칸이 있으면 null */
  sum: number | null
  /** 칸별 오류 (키 → 문구) */
  fieldErrors: Record<string, string>
  sumError: string | null
  valid: boolean
}

export function checkFitWeights(weights: Record<string, number | null>): FitWeightCheck {
  const fieldErrors: Record<string, string> = {}
  for (const [key, value] of Object.entries(weights)) {
    if (value === null || !Number.isFinite(value)) fieldErrors[key] = '값을 입력해 주세요.'
    else if (value < 0 || value > 1) fieldErrors[key] = '0.00에서 1.00 사이로 입력해 주세요.'
    else if (Math.abs(Math.round(value / FIT_WEIGHT_STEP) * FIT_WEIGHT_STEP - value) > 1e-9) {
      fieldErrors[key] = '0.05 단위로 입력해 주세요.'
    }
  }
  const values = Object.values(weights)
  const sum = values.every((v): v is number => v !== null && Number.isFinite(v))
    ? Math.round(values.reduce((total, v) => total + v, 0) * 100) / 100
    : null
  const sumError = sum === null || Math.abs(sum - 1) > 1e-9 ? FIT_WEIGHT_SUM_MESSAGE : null
  return { sum, fieldErrors, sumError, valid: Object.keys(fieldErrors).length === 0 && sumError === null }
}

/** 수집 필터 키워드: 1~20자, 중복 제거, 최대 50개 (REVISION_04 §8.4) */
export const KEYWORD_MAX_LENGTH = 20
export const KEYWORD_MAX_COUNT = 50

export function normalizeKeywords(values: readonly string[]): { keywords: string[]; rejected: string[] } {
  const keywords: string[] = []
  const rejected: string[] = []
  for (const raw of values) {
    const keyword = raw.trim()
    if (keyword === '') continue
    if (keyword.length > KEYWORD_MAX_LENGTH) {
      rejected.push(`'${keyword}'은(는) ${KEYWORD_MAX_LENGTH}자를 넘어 넣을 수 없습니다.`)
      continue
    }
    if (keywords.includes(keyword)) continue
    if (keywords.length >= KEYWORD_MAX_COUNT) {
      rejected.push(`키워드는 ${KEYWORD_MAX_COUNT}개까지 넣을 수 있습니다.`)
      break
    }
    keywords.push(keyword)
  }
  return { keywords, rejected }
}

/** 19개 전략표 열 (REVISION_04 §12.6). 값은 전략표가 확정되면 입력한다 */
export const STRATEGY_COLUMNS = ['번호', '전략명', '수출단계', '추천 경로', '지금 할 일', '다음 목표', '연결 지원 분야']
export const STRATEGY_TEMPLATE_FILE_NAME = 'strategy_table_template.csv'

/** 표 내려받기: 머리글만 있는 CSV (UTF-8 BOM) */
export function buildStrategyTemplateCsv(): string {
  return toCsv([STRATEGY_COLUMNS])
}

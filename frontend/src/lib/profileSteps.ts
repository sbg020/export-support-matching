import type { CompanyProfile, ProfileField, ProfileMeta, ProfileStepId } from '@/types/profile'
import { FIELD_STEP, hasErrors, validateStep } from './profile'

export type StepStatus = 'complete' | 'incomplete' | 'skipped' | 'optional'

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  complete: '입력함',
  incomplete: '입력 필요',
  skipped: '건너뜀',
  optional: '선택 입력',
}

function stepHasInput(step: ProfileStepId, p: CompanyProfile): boolean {
  return (Object.keys(FIELD_STEP) as ProfileField[])
    .filter((field) => FIELD_STEP[field] === step && field !== 'businessNumber')
    .some((field) => {
      const value = p[field]
      if (Array.isArray(value)) return value.length > 0
      if (field === 'interestUnsure') return value === true
      return value !== null
    })
}

/** 단계 진행 표시용 상태 (저장된 값 기준. 사업자등록번호는 기기에 저장하지 않으므로 제외) */
export function getStepStatus(step: ProfileStepId, p: CompanyProfile, meta: ProfileMeta): StepStatus {
  const touched = stepHasInput(step, p)
  const valid = !hasErrors(validateStep(step, p, { requireSessionFields: false }))
  if (step === 5) {
    if (!touched) return meta.skippedSteps.includes(5) ? 'skipped' : 'optional'
    return valid ? 'complete' : 'incomplete'
  }
  if (touched && valid) return 'complete'
  if (meta.skippedSteps.includes(step)) return 'skipped'
  return 'incomplete'
}

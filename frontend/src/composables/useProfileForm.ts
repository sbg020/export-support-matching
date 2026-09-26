import { inject, provide, type InjectionKey, type Ref } from 'vue'
import type { CompanyProfile, ProfileField } from '@/types/profile'
import type { FieldErrors } from '@/lib/profile'

export interface ProfileFormContext {
  /** 편집 중인 프로필 (입력 페이지는 저장소 상태, 수정 모달은 복사본) */
  profile: Ref<CompanyProfile>
  errors: Ref<FieldErrors>
  /** 같은 화면에 폼이 두 번 나타나도 id가 겹치지 않도록 하는 접두어 */
  idPrefix: string
}

const PROFILE_FORM_KEY: InjectionKey<ProfileFormContext> = Symbol('profile-form')

export function provideProfileForm(context: ProfileFormContext): void {
  provide(PROFILE_FORM_KEY, context)
}

export function useProfileForm() {
  const context = inject(PROFILE_FORM_KEY)
  if (!context) throw new Error('useProfileForm은 provideProfileForm 안에서만 사용할 수 있습니다.')
  const fieldId = (field: ProfileField | string) => `${context.idPrefix}-${field}`
  return { ...context, fieldId }
}

/** 입력 검증 오류가 난 필드로 포커스를 옮긴다. */
export function focusProfileField(idPrefix: string, field: ProfileField): void {
  const element = document.getElementById(`${idPrefix}-${field}`)
  if (!element) return
  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
    element.focus()
    return
  }
  const inner = element.querySelector<HTMLElement>('input, select, textarea, button')
  ;(inner ?? element).focus()
}

/** 연도 선택지 (최근 연도부터). 기본 선택값으로 사용하지 않는다. */
export function recentYears(count: number, includeNextYear = false): number[] {
  const current = new Date().getFullYear()
  const start = includeNextYear ? current + 1 : current
  return Array.from({ length: count }, (_, i) => start - i)
}

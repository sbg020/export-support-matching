/*
 * 직접 확인(자가 확인) 답. REVISION_02 §6.9
 *
 * - 이 브라우저의 localStorage(esm.selfChecks.v1)에만 저장한다. 서버로 보내지 않는다.
 * - 공통 확인 5가지와 공고별 확인 답을 함께 둔다. 프로필 삭제와는 별개로 '모두 지우기'를 제공한다.
 */
import { computed, reactive } from 'vue'
import type { CommonCheckKey } from '@/types/program'
import type { CommonCheckAnswer, RuleCheckAnswer, RuleCheckEntry, SelfCheckAnswers } from '@/types/selfCheck'
import { getLocalStorage } from '@/lib/storage'

export const SELF_CHECK_STORAGE_KEY = 'esm.selfChecks.v1'

interface StoredSelfChecks extends SelfCheckAnswers {
  version: 1
}

const COMMON_KEYS: CommonCheckKey[] = ['closure', 'tax-arrears', 'credit', 'sanction', 'financial-health']
const COMMON_ANSWERS: CommonCheckAnswer[] = ['no', 'yes', 'unknown']

const state = reactive<{ answers: SelfCheckAnswers; loaded: boolean }>({
  answers: { common: {}, programs: {} },
  loaded: false,
})

/** 저장된 값을 검사해 읽는다. 형식이 틀린 항목은 버린다. */
export function readSelfChecks(raw: string | null): SelfCheckAnswers {
  const empty: SelfCheckAnswers = { common: {}, programs: {} }
  if (!raw) return empty
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return empty
  }
  if (typeof parsed !== 'object' || parsed === null) return empty
  const record = parsed as Partial<StoredSelfChecks>
  if (record.version !== 1) return empty

  const common: SelfCheckAnswers['common'] = {}
  const storedCommon = (record.common ?? {}) as Record<string, unknown>
  for (const key of COMMON_KEYS) {
    const answer = storedCommon[key]
    if (typeof answer === 'string' && COMMON_ANSWERS.includes(answer as CommonCheckAnswer)) {
      common[key] = answer as CommonCheckAnswer
    }
  }

  const programs: SelfCheckAnswers['programs'] = {}
  const storedPrograms = (record.programs ?? {}) as Record<string, unknown>
  for (const [programId, rules] of Object.entries(storedPrograms)) {
    if (typeof rules !== 'object' || rules === null) continue
    const entries: Record<string, RuleCheckEntry> = {}
    for (const [ruleId, entry] of Object.entries(rules as Record<string, unknown>)) {
      const e = entry as Partial<RuleCheckEntry> | null
      if (e && (e.answer === 'met' || e.answer === 'unmet') && typeof e.answeredAt === 'string') {
        entries[ruleId] = { answer: e.answer, answeredAt: e.answeredAt }
      }
    }
    if (Object.keys(entries).length > 0) programs[programId] = entries
  }
  return { common, programs }
}

function ensureLoaded() {
  if (state.loaded) return
  state.loaded = true
  try {
    state.answers = readSelfChecks(getLocalStorage()?.getItem(SELF_CHECK_STORAGE_KEY) ?? null)
  } catch {
    state.answers = { common: {}, programs: {} }
  }
}

function persist(): boolean {
  const storage = getLocalStorage()
  if (!storage) return false
  try {
    const stored: StoredSelfChecks = { version: 1, ...state.answers }
    storage.setItem(SELF_CHECK_STORAGE_KEY, JSON.stringify(stored))
    return true
  } catch {
    return false
  }
}

function setCommon(key: CommonCheckKey, answer: CommonCheckAnswer | null) {
  const common = { ...state.answers.common }
  if (answer === null) delete common[key]
  else common[key] = answer
  state.answers = { ...state.answers, common }
  persist()
}

function setProgramAnswer(programId: string, ruleId: string, answer: RuleCheckAnswer | null) {
  const programs = { ...state.answers.programs }
  const rules = { ...programs[programId] }
  if (answer === null) delete rules[ruleId]
  else rules[ruleId] = { answer, answeredAt: new Date().toISOString() }
  if (Object.keys(rules).length > 0) programs[programId] = rules
  else delete programs[programId]
  state.answers = { ...state.answers, programs }
  persist()
}

/** 직접 확인 모두 지우기 (프로필은 지우지 않는다) */
function clearAll() {
  state.answers = { common: {}, programs: {} }
  try {
    getLocalStorage()?.removeItem(SELF_CHECK_STORAGE_KEY)
  } catch {
    // 저장소를 쓸 수 없으면 화면 상태만 비운다
  }
}

export function useSelfChecks() {
  ensureLoaded()
  return {
    answers: computed(() => state.answers),
    hasAny: computed(
      () => Object.keys(state.answers.common).length > 0 || Object.keys(state.answers.programs).length > 0,
    ),
    setCommon,
    setProgramAnswer,
    clearAll,
  }
}

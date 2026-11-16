/*
 * 공고 도우미 챗봇 API 호출 (REVISION_05 §8). 서버: frontend/server/assistant/handlers.ts
 * 질문과 함께 판정에 쓰는 기업 정보(엔진 프로필), 직접 확인한 조건 답, 화면에서 계산한 적합도만 보낸다.
 * 사업자등록번호·대표자명·연락처는 보내지 않는다. 서버는 대화 내용을 저장하지 않는다.
 */
import type { EngineProfile, TabKey } from '@/lib/engine/eligibilityV3'

export const ASSISTANT_DISCLAIMER =
  'AI 답변은 등록된 공고와 판정 결과를 바탕으로 하며, 최종 신청 자격은 공고 원문과 주관기관에서 확인하세요.'

export interface AssistantStatus {
  configured: boolean
  authenticated: boolean
  dailyLimit: number | null
  remaining: number | null
}

export interface AssistantRelated {
  programId: string
  title: string | null
  tab: TabKey | null
  tabLabel: string
  fit: number | null
  note: string
  evidence: { condId: string; text: string; page: number | null }[]
  link: string
}

export interface AssistantAnswer {
  summary: string
  related: AssistantRelated[]
  checks: string[]
  nextStep: string
}

export interface AssistantMeta {
  model: string
  promptVersion: string
  dataVersion: string
  asOf: string
  retrieval: 'tfidf' | 'fit'
  noticeCount: number
  remaining: number
}

export interface AssistantRequest {
  question: string
  profile: EngineProfile
  answers: Record<string, Record<string, 'met' | 'unmet'>>
  fit: Record<string, number>
}

export type AssistantResult =
  | { ok: true; answer: AssistantAnswer; meta: AssistantMeta }
  | { ok: false; status: number; message: string; remaining?: number }

const UNREACHABLE = '서버에 연결할 수 없습니다. 잠시 뒤 다시 시도해 주세요.'

export async function fetchAssistantStatus(): Promise<AssistantStatus> {
  try {
    const response = await fetch('/api/assistant/status', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(String(response.status))
    const data = (await response.json()) as Partial<AssistantStatus>
    return {
      configured: data.configured === true,
      authenticated: data.authenticated === true,
      dailyLimit: typeof data.dailyLimit === 'number' ? data.dailyLimit : null,
      remaining: typeof data.remaining === 'number' ? data.remaining : null,
    }
  } catch {
    // 서버 함수에 닿지 않으면(정적 미리보기 등) 준비 중으로 둔다
    return { configured: false, authenticated: false, dailyLimit: null, remaining: null }
  }
}

export async function askAssistant(body: AssistantRequest): Promise<AssistantResult> {
  try {
    const response = await fetch('/api/assistant/chat', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (response.ok && data && typeof data.answer === 'object' && data.answer !== null) {
      return { ok: true, answer: data.answer as AssistantAnswer, meta: data.meta as AssistantMeta }
    }
    return {
      ok: false,
      status: response.status,
      message: typeof data?.message === 'string' ? data.message : '답변을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
      remaining: typeof data?.remaining === 'number' ? data.remaining : undefined,
    }
  } catch {
    return { ok: false, status: 0, message: UNREACHABLE }
  }
}

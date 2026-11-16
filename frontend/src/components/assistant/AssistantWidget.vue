<script setup lang="ts">
/**
 * 공고 도우미 챗봇 (REVISION_05 §8). 로그인한 사용자 화면 오른쪽 아래 버튼 → 대화 패널.
 * - 서버에 ANTHROPIC_API_KEY가 없으면 버튼에 '준비 중'을 표시하고 비활성화한다 (응답이 오는 것처럼 꾸미지 않는다).
 * - 질문마다 따로 답한다. 대화 내용은 이 화면에만 있고 서버에 저장하지 않는다.
 * - 보내는 값: 질문, 판정용 기업 정보(엔진 프로필), 직접 확인한 조건 답, 화면에서 계산한 적합도(신청 가능 공고만).
 */
import { computed, effectScope, nextTick, onBeforeUnmount, ref, watch, type EffectScope } from 'vue'
import { IconMessageCircleQuestion, IconSend, IconX } from '@tabler/icons-vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { BadgeTone } from '@/components/common/types'
import { useAuth } from '@/stores/authStore'
import { useSelfChecks } from '@/stores/selfCheckStore'
import { loadAllPrograms, useProgramEvaluations } from '@/composables/useProgramEvaluations'
import {
  ASSISTANT_DISCLAIMER,
  askAssistant,
  fetchAssistantStatus,
  type AssistantAnswer,
  type AssistantMeta,
  type AssistantStatus,
} from '@/repositories/assistantClient'
import type { TabKey } from '@/lib/engine/eligibilityV3'

const MAX_QUESTION = 500
const auth = useAuth()
const selfChecks = useSelfChecks()
const authenticated = computed(() => auth.state.status === 'authenticated')

const status = ref<AssistantStatus | null>(null)
const open = ref(false)
const question = ref('')
const sending = ref(false)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const logRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLButtonElement | null>(null)

interface Turn {
  id: number
  question: string
  answer: AssistantAnswer | null
  meta: AssistantMeta | null
  error: string | null
}
const turns = ref<Turn[]>([])
let nextId = 1

watch(
  authenticated,
  async (value) => {
    status.value = value ? await fetchAssistantStatus() : null
  },
  { immediate: true },
)

const configured = computed(() => status.value?.configured === true)
const remaining = computed(() => status.value?.remaining ?? null)
const limitReached = computed(() => remaining.value !== null && remaining.value <= 0)

let scope: EffectScope | null = null
let evaluations: ReturnType<typeof useProgramEvaluations> | null = null
function ensureEvaluations() {
  if (!evaluations) {
    scope = effectScope(true)
    evaluations = scope.run(() => useProgramEvaluations()) ?? null
  }
  return evaluations
}
onBeforeUnmount(() => scope?.stop())

async function openPanel() {
  if (!configured.value) return
  open.value = true
  ensureEvaluations()
  await nextTick()
  inputRef.value?.focus()
}

function closePanel() {
  open.value = false
  void nextTick(() => buttonRef.value?.focus())
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closePanel()
}

const TAB_TONE: Record<TabKey, BadgeTone> = { eligible: 'success', 'needs-check': 'warning', ineligible: 'danger' }

async function send() {
  const text = question.value.trim()
  if (text === '' || sending.value || limitReached.value) return
  sending.value = true
  const turn: Turn = { id: nextId++, question: text, answer: null, meta: null, error: null }
  turns.value.push(turn)
  question.value = ''
  await nextTick()
  logRef.value?.scrollTo({ top: logRef.value.scrollHeight })
  try {
    const ev = ensureEvaluations()
    await loadAllPrograms()
    if (!ev) throw new Error('evaluations')
    const fit: Record<string, number> = {}
    for (const [id, e] of ev.evaluations.value) if (e.fit) fit[id] = e.fit.score
    const answers: Record<string, Record<string, 'met' | 'unmet'>> = {}
    for (const [programId, entries] of Object.entries(selfChecks.answers.value.programs)) {
      answers[programId] = Object.fromEntries(Object.entries(entries).map(([condId, entry]) => [condId, entry.answer]))
    }
    const result = await askAssistant({ question: text, profile: ev.engineProfile.value, answers, fit })
    const target = turns.value.find((t) => t.id === turn.id)
    if (!target) return
    if (result.ok) {
      target.answer = result.answer
      target.meta = result.meta
      if (status.value) status.value = { ...status.value, remaining: result.meta.remaining }
    } else {
      target.error = result.message
      if (result.remaining !== undefined && status.value) status.value = { ...status.value, remaining: result.remaining }
    }
  } catch {
    const target = turns.value.find((t) => t.id === turn.id)
    if (target) target.error = '답변을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.'
  } finally {
    sending.value = false
    await nextTick()
    logRef.value?.scrollTo({ top: logRef.value.scrollHeight })
  }
}

function onTextareaKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void send()
  }
}
</script>

<template>
  <div v-if="authenticated" class="assistant" @keydown="onKeydown">
    <section
      v-if="open"
      id="assistant-panel"
      class="assistant__panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="assistant-title"
    >
      <header class="assistant__head">
        <div>
          <h2 id="assistant-title" class="assistant__title">공고 도우미</h2>
          <p class="assistant__sub">
            게시된 공고와 우리 회사 판정 결과로만 답합니다.
            <span v-if="remaining !== null">오늘 남은 질문 {{ remaining }}회</span>
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm assistant__close" aria-label="공고 도우미 닫기" @click="closePanel">
          <IconX :size="18" stroke-width="2" aria-hidden="true" />
        </button>
      </header>

      <div ref="logRef" class="assistant__log" aria-live="polite">
        <p v-if="turns.length === 0" class="assistant__hint">
          예: "해외 전시회 참가를 지원하는 공고 중 우리 회사가 신청할 수 있는 것은?", "물류바우처 신청 전에 확인할 조건은?"
          질문마다 따로 답하며, 대화 내용은 저장하지 않습니다.
        </p>
        <article v-for="turn in turns" :key="turn.id" class="assistant__turn">
          <p class="assistant__question"><span class="visually-hidden">질문: </span>{{ turn.question }}</p>
          <p v-if="!turn.answer && !turn.error" class="assistant__pending" role="status">답변을 만드는 중입니다…</p>
          <p v-if="turn.error" class="assistant__error" role="alert">{{ turn.error }}</p>
          <div v-if="turn.answer" class="assistant__answer">
            <h3 class="assistant__label">요약</h3>
            <p>{{ turn.answer.summary }}</p>

            <template v-if="turn.answer.related.length > 0">
              <h3 class="assistant__label">관련 공고</h3>
              <ul class="assistant__related">
                <li v-for="item in turn.answer.related" :key="item.programId">
                  <div class="assistant__related-head">
                    <RouterLink :to="item.link" class="assistant__link">{{ item.title ?? item.programId }}</RouterLink>
                    <StatusBadge v-if="item.tab" :label="item.tabLabel" :tone="TAB_TONE[item.tab]" size="sm" />
                    <span class="assistant__fit">적합도 {{ item.fit ?? '-' }}</span>
                  </div>
                  <p class="mb-1">{{ item.note }}</p>
                  <blockquote v-for="ev in item.evidence" :key="ev.condId" class="assistant__evidence">
                    “{{ ev.text }}” <span class="assistant__page">{{ ev.page !== null ? `${ev.page}쪽` : '쪽 -' }}</span>
                  </blockquote>
                </li>
              </ul>
            </template>

            <template v-if="turn.answer.checks.length > 0">
              <h3 class="assistant__label">확인 필요 항목</h3>
              <ul class="assistant__checks">
                <li v-for="(c, i) in turn.answer.checks" :key="i">{{ c }}</li>
              </ul>
            </template>

            <h3 class="assistant__label">다음 할 일</h3>
            <p>{{ turn.answer.nextStep }}</p>
            <p class="assistant__disclaimer">{{ ASSISTANT_DISCLAIMER }}</p>
            <p v-if="turn.meta" class="assistant__meta">
              데이터 기준일 {{ turn.meta.asOf }} · 모델 {{ turn.meta.model }} · {{ turn.meta.promptVersion }}
            </p>
          </div>
        </article>
      </div>

      <form class="assistant__form" @submit.prevent="send">
        <label for="assistant-question" class="visually-hidden">공고 도우미에게 질문하기</label>
        <textarea
          id="assistant-question"
          ref="inputRef"
          v-model="question"
          class="form-control"
          rows="2"
          :maxlength="MAX_QUESTION"
          :disabled="limitReached"
          :placeholder="limitReached ? '오늘 질문할 수 있는 횟수를 모두 썼습니다.' : '등록된 공고에 대해 물어보세요 (Enter로 보내기)'"
          aria-describedby="assistant-question-help"
          @keydown="onTextareaKeydown"
        />
        <button type="submit" class="btn btn-primary" :disabled="sending || limitReached || question.trim() === ''">
          <IconSend :size="18" stroke-width="2" aria-hidden="true" />
          <span>보내기</span>
        </button>
        <p id="assistant-question-help" class="assistant__help">
          판정에 쓰는 기업 정보만 함께 보냅니다 (사업자등록번호·대표자명·연락처 제외). {{ question.length }}/{{ MAX_QUESTION }}자
        </p>
      </form>
    </section>

    <button
      ref="buttonRef"
      type="button"
      class="assistant__fab"
      :class="{ 'assistant__fab--off': !configured }"
      :disabled="!configured"
      :aria-expanded="open"
      aria-controls="assistant-panel"
      :aria-describedby="!configured ? 'assistant-off-reason' : undefined"
      @click="open ? closePanel() : openPanel()"
    >
      <IconMessageCircleQuestion :size="22" stroke-width="2" aria-hidden="true" />
      <span>공고 도우미</span>
      <span v-if="!configured" class="assistant__fab-badge">준비 중</span>
    </button>
    <span v-if="!configured" id="assistant-off-reason" class="visually-hidden">
      서버에 AI 키가 설정되지 않아 아직 사용할 수 없습니다.
    </span>
  </div>
</template>

<style scoped>
.assistant {
  position: fixed;
  right: var(--space-5);
  bottom: var(--space-5);
  z-index: 1040;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-3);
  pointer-events: none;
}

.assistant > * {
  pointer-events: auto;
}

.assistant__fab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 18px;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--color-heading);
  color: #fff;
  font-weight: var(--fw-semibold);
  box-shadow: var(--shadow-lg);
}

.assistant__fab:hover:not(:disabled) {
  background: #000;
}

.assistant__fab:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

.assistant__fab--off {
  background: var(--color-surface-sunken);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
  cursor: not-allowed;
}

.assistant__fab-badge {
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  font-size: var(--fs-xs);
}

.assistant__panel {
  display: flex;
  flex-direction: column;
  width: min(420px, calc(100vw - 32px));
  height: min(640px, calc(100vh - 120px));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.assistant__head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.assistant__title {
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.assistant__sub {
  margin: 2px 0 0;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.assistant__sub span {
  margin-left: 4px;
  font-weight: var(--fw-semibold);
}

.assistant__log {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.assistant__hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.assistant__turn {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.assistant__question {
  align-self: flex-end;
  max-width: 88%;
  margin: 0;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: var(--color-accent-soft);
  color: var(--color-heading);
  font-size: var(--fs-sm);
  white-space: pre-wrap;
}

.assistant__pending,
.assistant__error {
  margin: 0;
  font-size: var(--fs-sm);
}

.assistant__error {
  color: var(--color-danger-strong);
}

.assistant__answer {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
}

.assistant__answer p {
  margin-bottom: var(--space-2);
}

.assistant__label {
  margin: var(--space-3) 0 4px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.assistant__label:first-child {
  margin-top: 0;
}

.assistant__related,
.assistant__checks {
  margin: 0 0 var(--space-2);
  padding-left: 18px;
}

.assistant__related li + li {
  margin-top: var(--space-2);
}

.assistant__related-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.assistant__link {
  font-weight: var(--fw-semibold);
}

.assistant__fit {
  font-size: var(--fs-xs);
  color: var(--color-text);
}

.assistant__evidence {
  margin: 4px 0;
  padding-left: 8px;
  border-left: 3px solid var(--color-border-strong);
  font-size: var(--fs-xs);
  color: var(--color-text);
}

.assistant__page {
  color: var(--color-text-muted);
  white-space: nowrap;
}

.assistant__disclaimer {
  margin: var(--space-3) 0 0 !important;
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.assistant__meta {
  margin: 2px 0 0 !important;
  font-size: 11px;
  color: var(--color-text-muted);
}

.assistant__form {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
}

.assistant__form textarea {
  resize: none;
}

.assistant__form .btn {
  align-self: end;
}

.assistant__help {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 11px;
  color: var(--color-text-muted);
}

@media (max-width: 575.98px) {
  .assistant {
    right: var(--space-3);
    bottom: var(--space-3);
  }

  .assistant__fab span:not(.assistant__fab-badge) {
    display: none;
  }

  .assistant__fab {
    padding: 0 14px;
  }

  .assistant__panel {
    width: calc(100vw - 24px);
    height: calc(100vh - 96px);
  }
}
</style>

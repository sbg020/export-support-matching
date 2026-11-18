<script setup lang="ts">
/**
 * '까치에게 물어보기' 챗봇. 로그인한 사용자 화면 오른쪽 아래 버튼 → 대화 패널.
 * - 외부 AI API를 쓰지 않는다. 사이트에 게시된 공고와 이 기업의 판정 결과(3탭·적합도·조건)로
 *   규칙에 따라 답 문장을 만든다 (lib/assistant/ruleAssistant.ts). 질문은 이 브라우저 밖으로 보내지 않는다.
 * - 질문마다 따로 답한다. 대화 내용은 이 화면에만 있고 저장하지 않는다.
 */
import { computed, effectScope, nextTick, onBeforeUnmount, ref, type EffectScope } from 'vue'
import { IconSend, IconX } from '@tabler/icons-vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { BadgeTone } from '@/components/common/types'
import { useAuth } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { loadAllPrograms, useProgramEvaluations } from '@/composables/useProgramEvaluations'
import { ASSISTANT_DISCLAIMER, ASSISTANT_NAME } from '@/repositories/assistantClient'
import { EXAMPLE_QUESTIONS, answerQuestion, type RuleAnswer } from '@/lib/assistant/ruleAssistant'
import type { TabKey } from '@/lib/engine/eligibilityV3'

const MAX_QUESTION = 500
/** 챗봇 로고 (까치, public/brand/) */
const MAGPIE_LOGO = '/brand/assistant-magpie-96.png'
const auth = useAuth()
const profile = useProfileStore()
const authenticated = computed(() => auth.state.status === 'authenticated')

const open = ref(false)
const question = ref('')
const sending = ref(false)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const logRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLButtonElement | null>(null)

interface Turn {
  id: number
  question: string
  answer: RuleAnswer | null
  asOf: string | null
  error: string | null
}
const turns = ref<Turn[]>([])
let nextId = 1

/* 사이트 데이터로 답하므로 항상 쓸 수 있다 (외부 API 키가 필요 없다) */
const configured = computed(() => true)
const limitReached = computed(() => false)

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

function ask(example: string) {
  question.value = example
  void send()
}

async function send() {
  const text = question.value.trim()
  if (text === '' || sending.value || limitReached.value) return
  sending.value = true
  const turn: Turn = { id: nextId++, question: text, answer: null, asOf: null, error: null }
  turns.value.push(turn)
  question.value = ''
  await nextTick()
  logRef.value?.scrollTo?.({ top: logRef.value.scrollHeight })
  try {
    const ev = ensureEvaluations()
    await loadAllPrograms()
    if (!ev) throw new Error('evaluations')
    const answer = answerQuestion(text, {
      programs: ev.programs.value,
      evaluations: ev.evaluations.value,
      asOf: ev.asOf,
      profileEmpty: profile.assessment.value.status === 'empty',
    })
    const target = turns.value.find((t) => t.id === turn.id)
    if (!target) return
    target.answer = answer
    target.asOf = ev.asOf
  } catch {
    const target = turns.value.find((t) => t.id === turn.id)
    if (target) target.error = '답변을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.'
  } finally {
    sending.value = false
    await nextTick()
    logRef.value?.scrollTo?.({ top: logRef.value.scrollHeight })
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
        <img class="assistant__avatar" :src="MAGPIE_LOGO" alt="" width="40" height="40" />
        <div class="assistant__head-text">
          <h2 id="assistant-title" class="assistant__title">{{ ASSISTANT_NAME }}</h2>
          <p class="assistant__sub">사이트에 등록된 공고와 우리 회사 판정 결과로 답해요.</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm assistant__close" :aria-label="`${ASSISTANT_NAME} 닫기`" @click="closePanel">
          <IconX :size="18" stroke-width="2" aria-hidden="true" />
        </button>
      </header>

      <div ref="logRef" class="assistant__log" aria-live="polite">
        <div v-if="turns.length === 0" class="assistant__hint">
          <p class="mb-2">
            안녕하세요, 까치예요. 신청할 수 있는 공고, 마감이 가까운 공고, 제출 서류, 신청 자격, 지원 금액을 물어보세요.
          </p>
          <ul class="assistant__examples" aria-label="질문 예시">
            <li v-for="example in EXAMPLE_QUESTIONS" :key="example">
              <button type="button" class="assistant__example" @click="ask(example)">{{ example }}</button>
            </li>
          </ul>
        </div>
        <article v-for="turn in turns" :key="turn.id" class="assistant__turn">
          <p class="assistant__question"><span class="visually-hidden">질문: </span>{{ turn.question }}</p>
          <p v-if="!turn.answer && !turn.error" class="assistant__pending" role="status">답변을 만드는 중입니다…</p>
          <p v-if="turn.error" class="assistant__error" role="alert">{{ turn.error }}</p>
          <div v-if="turn.answer" class="assistant__answer">
            <h3 class="assistant__label">까치의 답</h3>
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
              <h3 class="assistant__label">{{ turn.answer.intent === 'documents' ? '제출 서류' : turn.answer.intent === 'help' || turn.answer.intent === 'search' ? '이렇게 물어보세요' : '확인할 항목' }}</h3>
              <ul class="assistant__checks">
                <li v-for="(c, i) in turn.answer.checks" :key="i">{{ c }}</li>
              </ul>
            </template>

            <h3 class="assistant__label">다음 할 일</h3>
            <p>{{ turn.answer.nextStep }}</p>
            <p class="assistant__disclaimer">{{ ASSISTANT_DISCLAIMER }}</p>
            <p class="assistant__meta">데이터 기준일 {{ turn.asOf ?? '-' }} · 사이트 데이터로 만든 답변</p>
          </div>
        </article>
      </div>

      <form class="assistant__form" @submit.prevent="send">
        <label for="assistant-question" class="visually-hidden">까치에게 질문하기</label>
        <textarea
          id="assistant-question"
          ref="inputRef"
          v-model="question"
          class="form-control"
          rows="2"
          :maxlength="MAX_QUESTION"
          :disabled="limitReached"
          placeholder="까치에게 물어보세요 (Enter로 보내기)"
          aria-describedby="assistant-question-help"
          @keydown="onTextareaKeydown"
        />
        <button type="submit" class="btn btn-primary" :disabled="sending || limitReached || question.trim() === ''">
          <IconSend :size="18" stroke-width="2" aria-hidden="true" />
          <span>보내기</span>
        </button>
        <p id="assistant-question-help" class="assistant__help">
          질문은 이 브라우저 밖으로 보내지 않아요. {{ question.length }}/{{ MAX_QUESTION }}자
        </p>
      </form>
    </section>

    <button
      ref="buttonRef"
      type="button"
      class="assistant__fab"
      :aria-expanded="open"
      aria-controls="assistant-panel"
      @click="open ? closePanel() : openPanel()"
    >
      <img class="assistant__fab-logo" :src="MAGPIE_LOGO" alt="" width="34" height="34" />
      <span>{{ ASSISTANT_NAME }}</span>
    </button>
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
  min-height: 52px;
  padding: 0 18px 0 8px;
  border: 2px solid var(--color-heading);
  border-radius: var(--radius-pill);
  background: #fff;
  color: var(--color-heading);
  font-weight: var(--fw-bold);
  box-shadow: var(--shadow-lg);
}

.assistant__fab:hover:not(:disabled) {
  background: var(--color-accent-soft);
}

/* 까치 로고 */
.assistant__fab-logo {
  flex: none;
  width: 34px;
  height: 34px;
}

.assistant__avatar {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-accent-soft);
}

.assistant__head-text {
  flex: 1;
  min-width: 0;
}

.assistant__fab:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

.assistant__fab--off {
  border-color: var(--color-border-strong);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
  cursor: not-allowed;
}

.assistant__fab--off .assistant__fab-logo {
  opacity: 0.6;
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
  align-items: flex-start;
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
    padding: 0 8px;
  }

  .assistant__panel {
    width: calc(100vw - 24px);
    height: calc(100vh - 96px);
  }
}
.assistant__examples {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.assistant__example {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-heading);
  font-size: var(--fs-sm);
  text-align: left;
}

.assistant__example:hover {
  border-color: var(--color-heading);
  background: var(--color-accent-soft);
}
</style>

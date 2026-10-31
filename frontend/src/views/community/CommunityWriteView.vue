<script setup lang="ts">
/**
 * 커뮤니티 글쓰기 (REVISION_02 §10.3·§10.4·§10.7). 로그인 후 열 수 있다.
 * 게시판별 양식과 미리보기, 이용 규칙 동의를 보여 주지만, 글을 저장할 서버와 회원 DB가 없어 '등록'은 비활성이다.
 * 입력값은 화면에만 두고 브라우저 저장소에 저장하지 않는다 (다른 사람에게 보이지 않는 글을 만들지 않는다).
 */
import { computed, reactive, ref, useId } from 'vue'
import { IconArrowLeft, IconEye, IconX } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import {
  COMMUNITY_BOARDS,
  COMMUNITY_WRITE_DISABLED_REASON,
  INFO_BOARD_RULES,
  REVIEW_BOARD_RULES,
  REVIEW_WRITE_RULE,
  detectPersonalInfo,
} from '@/constants/community'
import { communityRepository } from '@/repositories/communityRepository'
import { matchesKeyword } from '@/repositories/staticProgramRepository'
import { useProgramEvaluations } from '@/composables/useProgramEvaluations'
import { programTitleText } from '@/lib/programDisplay'
import type { CommunityBoard, ReviewAnswers } from '@/types/community'

const props = defineProps<{ board: CommunityBoard }>()

const uid = useId()
const definition = computed(() => COMMUNITY_BOARDS[props.board])
const rules = computed(() => (props.board === 'reviews' ? REVIEW_BOARD_RULES : INFO_BOARD_RULES))
const evaluation = useProgramEvaluations()

const TITLE_MAX = 40
const BODY_MAX = 1000

const form = reactive({
  category: '',
  title: '',
  body: '',
  programId: null as string | null,
  programYear: null as number | null,
  programRound: '',
  operatorName: '',
  agreed: false,
})
const answers = reactive<ReviewAnswers>({
  contentMatched: null,
  prepHours: null,
  selfPaymentPercent: null,
  settlementDifficulty: null,
  operatorResponse: null,
  outcomes: [],
  rejoinIntent: null,
})
const selfPaymentUnknown = ref(false)
const preview = ref(false)

/* 공고 연결 */
const programKeyword = ref('')
const programMatches = computed(() => {
  const keyword = programKeyword.value.trim()
  if (keyword.length < 2) return []
  return evaluation.programs.value.filter((p) => matchesKeyword(p, keyword)).slice(0, 6)
})
const selectedProgram = computed(
  () => evaluation.programs.value.find((p) => p.id === form.programId) ?? null,
)
function pickProgram(id: string) {
  form.programId = id
  programKeyword.value = ''
}

const personalInfo = computed(() => detectPersonalInfo(`${form.title}\n${form.body}`))
const submitReasonId = `${uid}-submit-reason`

const CONTENT_MATCH_OPTIONS = [
  { value: 'same', label: '같음' },
  { value: 'partly-different', label: '일부 다름' },
  { value: 'very-different', label: '많이 다름' },
] as const
const OUTCOME_OPTIONS = [
  { value: 'buyer', label: '바이어 연결' },
  { value: 'contract', label: '계약' },
  { value: 'certification', label: '인증 획득' },
  { value: 'none', label: '해당 없음' },
] as const
const REJOIN_OPTIONS = [
  { value: 'yes', label: '예' },
  { value: 'no', label: '아니요' },
  { value: 'unknown', label: '모름' },
] as const
const SCALE = [1, 2, 3, 4, 5]

function toNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toggleOutcome(value: ReviewAnswers['outcomes'][number], checked: boolean) {
  const others = answers.outcomes.filter((o) => o !== value)
  answers.outcomes = checked ? [...others, value] : others
}
</script>

<template>
  <div class="page">
    <PageHeader :title="`${definition.label} 글쓰기`" :description="definition.authorRule">
      <template #actions>
        <RouterLink :to="{ name: definition.routeName }" class="btn btn-secondary">
          <IconArrowLeft :size="18" stroke-width="2" aria-hidden="true" />
          목록으로
        </RouterLink>
      </template>
    </PageHeader>

    <div class="stack">
      <NoticeBanner v-if="!communityRepository.connected" tone="neutral" title="글쓰기는 준비 중입니다">
        {{ COMMUNITY_WRITE_DISABLED_REASON }}
        <template v-if="board === 'reviews'"> {{ REVIEW_WRITE_RULE }}</template>
        입력한 내용은 이 화면에만 있고 저장되지 않습니다.
      </NoticeBanner>

      <form class="write surface-card" @submit.prevent>
        <section class="write__rules" aria-labelledby="write-rules-title">
          <h2 id="write-rules-title" class="write__subtitle">이용 규칙</h2>
          <ul>
            <li v-for="rule in rules" :key="rule">{{ rule }}</li>
          </ul>
        </section>

        <div class="write__row">
          <div class="write__field">
            <label class="form-label" :for="`${uid}-category`">말머리 <span class="tag-required">필수</span></label>
            <select :id="`${uid}-category`" v-model="form.category" class="form-select">
              <option value="" disabled>말머리 선택</option>
              <option v-for="option in definition.categories" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <fieldset class="write__program">
          <legend class="form-label">
            연결 공고
            <span :class="board === 'reviews' ? 'tag-required' : 'tag-optional'">{{ board === 'reviews' ? '필수' : '선택' }}</span>
          </legend>
          <p v-if="selectedProgram" class="write__chip">
            {{ programTitleText(selectedProgram) }}
            <button type="button" class="btn btn-ghost btn-sm" aria-label="연결 공고 빼기" @click="form.programId = null">
              <IconX :size="14" stroke-width="2" aria-hidden="true" />
            </button>
          </p>
          <template v-else>
            <label class="visually-hidden" :for="`${uid}-program`">공고 검색</label>
            <input
              :id="`${uid}-program`"
              v-model="programKeyword"
              type="search"
              class="form-control"
              placeholder="공고명이나 기관명으로 검색 (2글자 이상)"
              autocomplete="off"
            />
            <ul v-if="programMatches.length > 0" class="write__matches">
              <li v-for="program in programMatches" :key="program.id">
                <button type="button" class="btn btn-ghost btn-sm" @click="pickProgram(program.id)">
                  {{ programTitleText(program) }}
                </button>
              </li>
            </ul>
            <p v-else-if="programKeyword.trim().length >= 2" class="form-hint">검색어에 맞는 공고가 없습니다.</p>
          </template>
        </fieldset>

        <template v-if="board === 'reviews'">
          <div class="write__row">
            <div class="write__field">
              <label class="form-label" :for="`${uid}-year`">사업 연도 <span class="tag-required">필수</span></label>
              <input
                :id="`${uid}-year`"
                class="form-control"
                type="number"
                inputmode="numeric"
                :value="form.programYear ?? ''"
                @input="form.programYear = toNumber(($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="write__field">
              <label class="form-label" :for="`${uid}-round`">차수 <span class="tag-required">필수</span></label>
              <input :id="`${uid}-round`" v-model="form.programRound" class="form-control" placeholder="예: 1차" />
            </div>
            <div class="write__field">
              <label class="form-label" :for="`${uid}-operator`">수행기관 <span class="tag-optional">있는 사업만</span></label>
              <input :id="`${uid}-operator`" v-model="form.operatorName" class="form-control" />
            </div>
          </div>

          <fieldset class="write__question">
            <legend class="form-label">지원 내용이 공고와 같았나요?</legend>
            <label v-for="option in CONTENT_MATCH_OPTIONS" :key="option.value" class="write__choice">
              <input v-model="answers.contentMatched" type="radio" class="form-check-input" :name="`${uid}-match`" :value="option.value" />
              {{ option.label }}
            </label>
          </fieldset>

          <div class="write__row">
            <div class="write__field">
              <label class="form-label" :for="`${uid}-hours`">신청서류 준비에 걸린 시간 (시간)</label>
              <input
                :id="`${uid}-hours`"
                class="form-control"
                type="number"
                min="0"
                inputmode="decimal"
                :value="answers.prepHours ?? ''"
                @input="answers.prepHours = toNumber(($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="write__field">
              <label class="form-label" :for="`${uid}-self`">실제 자부담 비율 (%)</label>
              <input
                :id="`${uid}-self`"
                class="form-control"
                type="number"
                min="0"
                max="100"
                inputmode="decimal"
                :disabled="selfPaymentUnknown"
                :value="answers.selfPaymentPercent ?? ''"
                @input="answers.selfPaymentPercent = toNumber(($event.target as HTMLInputElement).value)"
              />
              <label class="write__choice">
                <input
                  v-model="selfPaymentUnknown"
                  type="checkbox"
                  class="form-check-input"
                  @change="selfPaymentUnknown && (answers.selfPaymentPercent = null)"
                />
                모름
              </label>
            </div>
          </div>

          <fieldset class="write__question">
            <legend class="form-label">정산 난이도 (1 쉬움 ~ 5 어려움)</legend>
            <label v-for="n in SCALE" :key="n" class="write__choice">
              <input v-model="answers.settlementDifficulty" type="radio" class="form-check-input" :name="`${uid}-settle`" :value="n" />
              {{ n }}
            </label>
          </fieldset>

          <fieldset class="write__question">
            <legend class="form-label">수행기관 대응 (1 아쉬움 ~ 5 좋음) <span class="tag-optional">수행기관이 있는 사업만</span></legend>
            <label v-for="n in SCALE" :key="n" class="write__choice">
              <input v-model="answers.operatorResponse" type="radio" class="form-check-input" :name="`${uid}-operator-score`" :value="n" />
              {{ n }}
            </label>
          </fieldset>

          <fieldset class="write__question">
            <legend class="form-label">성과 (여러 개 선택)</legend>
            <label v-for="option in OUTCOME_OPTIONS" :key="option.value" class="write__choice">
              <input
                type="checkbox"
                class="form-check-input"
                :checked="answers.outcomes.includes(option.value)"
                @change="toggleOutcome(option.value, ($event.target as HTMLInputElement).checked)"
              />
              {{ option.label }}
            </label>
          </fieldset>

          <fieldset class="write__question">
            <legend class="form-label">다시 참여할 의향</legend>
            <label v-for="option in REJOIN_OPTIONS" :key="option.value" class="write__choice">
              <input v-model="answers.rejoinIntent" type="radio" class="form-check-input" :name="`${uid}-rejoin`" :value="option.value" />
              {{ option.label }}
            </label>
          </fieldset>
        </template>

        <div class="write__field">
          <label class="form-label" :for="`${uid}-title`">
            제목 <span class="tag-required">필수</span>
            <span class="write__counter">{{ form.title.length }}/{{ TITLE_MAX }}</span>
          </label>
          <input :id="`${uid}-title`" v-model="form.title" class="form-control" :maxlength="TITLE_MAX" />
        </div>
        <div class="write__field">
          <label class="form-label" :for="`${uid}-body`">
            본문 <span class="tag-required">필수</span>
            <span class="write__counter">{{ form.body.length }}/{{ BODY_MAX }}</span>
          </label>
          <textarea :id="`${uid}-body`" v-model="form.body" class="form-control" rows="8" :maxlength="BODY_MAX" />
          <p class="form-hint">회사명·개인정보·연락처·비방은 쓰지 마세요.</p>
        </div>

        <NoticeBanner v-if="personalInfo.length > 0" tone="warning" title="개인정보로 보이는 내용이 있습니다" alert>
          {{ personalInfo.join(', ') }} 형식이 보입니다. 등록 전에 지워 주세요.
        </NoticeBanner>

        <label class="write__choice write__agree">
          <input v-model="form.agreed" type="checkbox" class="form-check-input" />
          위 이용 규칙을 읽었고 지키겠습니다.
        </label>

        <div class="action-row">
          <button type="button" class="btn btn-secondary" :aria-pressed="preview" @click="preview = !preview">
            <IconEye :size="18" stroke-width="2" aria-hidden="true" />
            {{ preview ? '미리보기 닫기' : '미리보기' }}
          </button>
          <button type="submit" class="btn btn-primary" disabled :aria-describedby="submitReasonId">등록</button>
        </div>
        <DisabledReason :id="submitReasonId">
          {{ COMMUNITY_WRITE_DISABLED_REASON }}<template v-if="board === 'reviews'"> {{ REVIEW_WRITE_RULE }}</template>
        </DisabledReason>

        <section v-if="preview" class="write__preview" aria-labelledby="write-preview-title">
          <h2 id="write-preview-title" class="write__subtitle">미리보기</h2>
          <p class="write__preview-meta">
            {{ definition.categories.find((c) => c.value === form.category)?.label ?? '말머리 미선택' }} ·
            {{ board === 'reviews' ? '업종 · 수출단계 · 지역' : '닉네임' }}
          </p>
          <p class="write__preview-title">{{ form.title || '(제목 없음)' }}</p>
          <p v-if="selectedProgram" class="write__chip">{{ programTitleText(selectedProgram) }}</p>
          <p class="write__preview-body">{{ form.body || '(본문 없음)' }}</p>
        </section>
      </form>
    </div>
  </div>
</template>

<style scoped>
.write {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--card-padding);
}

.write__subtitle {
  margin: 0 0 var(--space-2);
  font-size: var(--fs-base);
}

.write__rules ul {
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--fs-sm);
}

.write__row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.write__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.write__program,
.write__question {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.write__question {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
}

.write__question legend {
  width: 100%;
}

.write__choice {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  font-size: var(--fs-sm);
  cursor: pointer;
}

.write__choice .form-check-input {
  margin: 0;
}

.write__counter {
  margin-left: 6px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-regular);
  color: var(--color-text-muted);
}

.write__matches {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.write__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 2px 4px 2px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: var(--fs-sm);
}

.write__agree {
  font-weight: var(--fw-semibold);
}

.write__preview {
  padding: var(--space-4);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
}

.write__preview-meta {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.write__preview-title {
  margin: 4px 0;
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
}

.write__preview-body {
  margin: var(--space-2) 0 0;
  white-space: pre-line;
}

@media (max-width: 767.98px) {
  .write__row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

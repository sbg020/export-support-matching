<script setup lang="ts">
/**
 * 공고 상세의 신청 자격 영역 (REVISION_05 §5.3). 3탭 분류 결과에 따라 보여 준다.
 * - 신청 가능: 충족된 조건(우리 회사 정보 값·원문 문장·쪽) + 아직 확인할 조건(체크)
 * - 확인 필요: 확인이 필요한 신청 자격(이유 한 줄·원문·쪽, 체크) + 이미 충족된 조건(접기)
 * - 신청 불가: 미충족 조건마다 조건 내용·우리 회사 정보 값·원문·쪽. 같은 그룹(OR)은 묶어서 표시, 기업 확인으로 불가면 체크 취소
 * - 판정에 쓰지 않는 안내 조건은 맨 아래 '참고 안내'
 * 체크(충족함/충족하지 않음, 해당 없음/해당함)는 이 기기에만 저장하고, 다시 분류해 탭이 바뀌면 안내한다.
 */
import { computed, nextTick } from 'vue'
import { IconCircleCheck, IconCircleX, IconHelpCircle } from '@tabler/icons-vue'
import type { Program } from '@/types/program'
import type { ConditionResult } from '@/types/results'
import type { ProgramEvaluation } from '@/lib/engine/evaluateAll'
import type { ConditionOutcome } from '@/lib/engine/eligibilityV3'
import { CONDITION_TYPE_NAME, PER_NOTICE_TYPES } from '@/constants/conditionTypes'
import { useSelfChecks } from '@/stores/selfCheckStore'
import { useApplicationStore } from '@/stores/applicationStore'
import { useToast } from '@/stores/toastStore'
import StatusBadge from '@/components/common/StatusBadge.vue'
import DataValue from '@/components/common/DataValue.vue'

const props = defineProps<{ program: Program; evaluation: ProgramEvaluation }>()

const selfChecks = useSelfChecks()
const applications = useApplicationStore()
const toast = useToast()

const tab = computed(() => props.evaluation.tab!)
const resultById = computed(() => new Map((props.evaluation.eligibility?.conditions ?? []).map((c) => [c.ruleId, c])))
const byId = computed(() => new Map(tab.value.outcomes.map((o) => [o.condition.condId, o])))

const met = computed(() => tab.value.outcomes.filter((o) => o.state === 'met'))
const majorUnknown = computed(() => tab.value.majorUnknown.map((id) => byId.value.get(id)!).filter(Boolean))
const checklist = computed(() => tab.value.checklist.map((id) => byId.value.get(id)!).filter(Boolean))
/** 미충족: 같은 그룹(OR) 필수 조건은 한 묶음 */
const failGroups = computed(() => {
  const groups = new Map<string, ConditionOutcome[]>()
  for (const id of tab.value.fails) {
    const o = byId.value.get(id)
    if (!o) continue
    const key = o.condition.kind === '제외' ? `x:${id}` : `g:${o.condition.group ?? ''}`
    groups.set(key, [...(groups.get(key) ?? []), o])
  }
  return [...groups.values()]
})
const history = computed(() => applications.records.value)

const TAB_LABEL = { eligible: '신청 가능', 'needs-check': '확인 필요', ineligible: '신청 불가' } as const

function info(o: ConditionOutcome): ConditionResult | undefined {
  return resultById.value.get(o.condition.condId)
}
function typeName(o: ConditionOutcome): string {
  return CONDITION_TYPE_NAME[o.condition.condType] ?? o.condition.condType
}
function answerOf(o: ConditionOutcome): 'met' | 'unmet' | null {
  return selfChecks.answers.value.programs[props.program.id]?.[o.condition.condId]?.answer ?? null
}
function answeredAt(o: ConditionOutcome): string | null {
  const at = selfChecks.answers.value.programs[props.program.id]?.[o.condition.condId]?.answeredAt
  return at ? at.slice(0, 10).split('-').join('.') : null
}

async function setAnswer(o: ConditionOutcome, answer: 'met' | 'unmet' | null) {
  const before = tab.value.tab
  selfChecks.setProgramAnswer(props.program.id, o.condition.condId, answer)
  await nextTick()
  const after = props.evaluation.tab?.tab
  if (after && after !== before) toast.show(`${TAB_LABEL[after]} 탭으로 이동했습니다.`, after === 'ineligible' ? 'warning' : 'success')
}

function labels(o: ConditionOutcome): [string, string] {
  return o.condition.kind === '제외' ? ['해당 없음', '해당함'] : ['충족함', '충족하지 않음']
}
</script>

<template>
  <div class="tab-panel">
    <p class="tab-panel__summary">
      <StatusBadge
        :label="TAB_LABEL[tab.tab]"
        :tone="tab.tab === 'eligible' ? 'success' : tab.tab === 'needs-check' ? 'warning' : 'danger'"
        :icon="tab.tab === 'eligible' ? IconCircleCheck : tab.tab === 'needs-check' ? IconHelpCircle : IconCircleX"
      />
      <span v-if="tab.userDecided.length > 0" class="fs-sm">기업 확인 {{ tab.userDecided.length }}개 포함</span>
      <StatusBadge v-if="program.autoExtracted" label="자동 추출 · 검수 전" tone="warning" />
    </p>

    <!-- 신청 불가: 근거 -->
    <section v-if="tab.tab === 'ineligible'" class="tab-panel__block" aria-labelledby="tp-fail">
      <h3 id="tp-fail" class="tab-panel__title">신청할 수 없는 근거</h3>
      <ul class="cond-list">
        <li v-for="(group, gi) in failGroups" :key="gi" class="cond is-unmet">
          <p v-if="group.length > 1" class="cond__group-note">아래 중 하나도 해당하지 않음</p>
          <div v-for="o in group" :key="o.condition.condId" class="cond__row">
            <p class="cond__name">
              {{ typeName(o) }}<template v-if="o.condition.valueRaw">: {{ o.condition.valueRaw }}</template>
              <span class="cond__kind">{{ o.condition.kind }}</span>
            </p>
            <p class="cond__company">우리 회사 정보: <DataValue :value="info(o)?.companyValue ?? null" /></p>
            <blockquote v-if="o.condition.evidence" class="cond__quote">
              “{{ o.condition.evidence }}”<span v-if="o.condition.page"> · {{ o.condition.page }}쪽</span>
            </blockquote>
            <p v-if="o.userDecided" class="cond__user">
              <StatusBadge label="기업 확인으로 판정" tone="neutral" size="sm" />
              <span v-if="answeredAt(o)" class="fs-xs">답한 날짜 {{ answeredAt(o) }}</span>
              <button type="button" class="btn btn-secondary btn-sm" @click="setAnswer(o, null)">체크 취소</button>
            </p>
          </div>
        </li>
      </ul>
      <p class="fs-sm">
        기업 정보가 틀렸을 수 있습니다.
        <RouterLink :to="{ name: 'company-profile' }">기업 정보 수정하기</RouterLink>
      </p>
    </section>

    <!-- 확인 필요(주요) · 아직 확인할 조건(체크리스트) -->
    <section v-if="majorUnknown.length + checklist.length > 0 && tab.tab !== 'ineligible'" class="tab-panel__block" aria-labelledby="tp-check">
      <h3 id="tp-check" class="tab-panel__title">
        {{ tab.tab === 'needs-check' ? '확인이 필요한 신청 자격' : '신청 전 확인 체크리스트' }}
      </h3>
      <p class="fs-sm text-muted-strong">
        체크하면 다시 분류합니다. 답은 이 기기에만 저장되며 판정에 '기업 확인'으로 표시됩니다.
      </p>
      <ul class="cond-list">
        <li v-for="o in [...majorUnknown, ...checklist]" :key="o.condition.condId" class="cond is-unknown">
          <p class="cond__name">
            {{ typeName(o) }}<template v-if="o.condition.valueRaw">: {{ o.condition.valueRaw }}</template>
            <span class="cond__kind">{{ o.importance === '주요' ? '주요' : '체크리스트' }}</span>
          </p>
          <p class="cond__reason">
            {{ info(o)?.reason }}
            <RouterLink v-if="info(o)?.inputStep" :to="{ name: 'company-profile', query: { step: String(info(o)?.inputStep) } }">
              기업 정보 입력하기
            </RouterLink>
          </p>
          <blockquote v-if="o.condition.evidence" class="cond__quote">
            “{{ o.condition.evidence }}”<span v-if="o.condition.page"> · {{ o.condition.page }}쪽</span>
          </blockquote>
          <div v-if="PER_NOTICE_TYPES.has(o.condition.condType)" class="cond__history">
            참고: 지원사업 관리의 지원 이력 {{ history.length }}건
            <RouterLink :to="{ name: 'manage-programs' }">이력 보기</RouterLink>
            — 이력이 이 조건에 해당하는지는 원문 기준으로 직접 판단해 주세요.
          </div>
          <div class="cond__answers" role="group" :aria-label="`${typeName(o)} 확인`">
            <button
              type="button"
              class="btn btn-sm"
              :class="answerOf(o) === 'met' ? 'btn-primary' : 'btn-secondary'"
              :aria-pressed="answerOf(o) === 'met'"
              @click="setAnswer(o, answerOf(o) === 'met' ? null : 'met')"
            >
              {{ labels(o)[0] }}
            </button>
            <button
              type="button"
              class="btn btn-sm"
              :class="answerOf(o) === 'unmet' ? 'btn-primary' : 'btn-secondary'"
              :aria-pressed="answerOf(o) === 'unmet'"
              @click="setAnswer(o, answerOf(o) === 'unmet' ? null : 'unmet')"
            >
              {{ labels(o)[1] }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 충족된 조건 -->
    <component
      :is="tab.tab === 'eligible' ? 'section' : 'details'"
      v-if="met.length > 0 && tab.tab !== 'ineligible'"
      class="tab-panel__block"
    >
      <component :is="tab.tab === 'eligible' ? 'h3' : 'summary'" class="tab-panel__title">
        충족된 조건 {{ met.length }}개
      </component>
      <ul class="cond-list">
        <li v-for="o in met" :key="o.condition.condId" class="cond is-met">
          <p class="cond__name">
            {{ typeName(o) }}<template v-if="o.condition.valueRaw">: {{ o.condition.valueRaw }}</template>
            <span class="cond__kind">{{ o.condition.kind }}</span>
            <StatusBadge v-if="o.userDecided" label="기업 확인" tone="neutral" size="sm" />
          </p>
          <p class="cond__company">판정 근거(우리 회사 정보): <DataValue :value="info(o)?.companyValue ?? (o.userDecided ? '기업 확인' : null)" /></p>
          <blockquote v-if="o.condition.evidence" class="cond__quote">
            “{{ o.condition.evidence }}”<span v-if="o.condition.page"> · {{ o.condition.page }}쪽</span>
          </blockquote>
          <button v-if="o.userDecided" type="button" class="btn btn-ghost btn-sm" @click="setAnswer(o, null)">체크 취소</button>
        </li>
      </ul>
    </component>

    <!-- 참고 안내 -->
    <details v-if="tab.notices.length > 0" class="tab-panel__block">
      <summary class="tab-panel__title">참고 안내 {{ tab.notices.length }}개 (판정에 쓰지 않음)</summary>
      <ul class="cond-list">
        <li v-for="c in tab.notices" :key="c.condId" class="cond">
          <p class="cond__name">{{ CONDITION_TYPE_NAME[c.condType] ?? c.condType }}</p>
          <blockquote v-if="c.evidence" class="cond__quote">“{{ c.evidence }}”<span v-if="c.page"> · {{ c.page }}쪽</span></blockquote>
        </li>
      </ul>
    </details>
  </div>
</template>

<style scoped>
.tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.tab-panel__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
}

.tab-panel__block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.tab-panel__title {
  margin: 0;
  font-size: var(--fs-md);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
  cursor: default;
}

summary.tab-panel__title {
  cursor: pointer;
}

.cond-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.cond {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
}

.cond.is-met {
  border-left-color: var(--color-success);
}

.cond.is-unmet {
  border-left-color: var(--color-danger);
}

.cond.is-unknown {
  border-left-color: var(--color-warning);
}

.cond__row + .cond__row {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px dashed var(--color-border);
}

.cond__group-note {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  color: var(--color-danger-strong);
}

.cond__name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.cond__kind {
  padding: 0 8px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text);
}

.cond__company,
.cond__reason,
.cond__history {
  margin: 0;
  font-size: var(--fs-sm);
}

.cond__quote {
  margin: 0;
  padding-left: var(--space-3);
  border-left: 2px solid var(--color-border);
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.cond__user,
.cond__answers {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
</style>

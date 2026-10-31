<script setup lang="ts">
/**
 * 공고 상세의 조건별 자격 판정 (REVISION_02 §6.6~6.9).
 * - 필수 조건: 같은 그룹은 하나 이상 충족(OR), 그룹끼리는 모두 충족(AND)
 * - 제외 조건: 하나라도 해당하면 신청 불가
 * - 일부 지원 항목에만 적용되는 조건: 전체 판정에서 빼고 따로 보여 준다
 */
import { computed } from 'vue'
import type { ConditionGroupResult, ConditionResult, EligibilityResult } from '@/types/results'
import ConditionBadge from './ConditionBadge.vue'
import ConditionItem from './ConditionItem.vue'

const props = defineProps<{ programId: string; result: EligibilityResult }>()

interface GroupView {
  key: string
  /** 조건이 둘 이상인 OR 그룹 */
  multiple: boolean
  status: ConditionGroupResult['status']
  conditions: ConditionResult[]
}

const required = computed<GroupView[]>(() => {
  const byId = new Map(props.result.conditions.map((c) => [c.ruleId, c]))
  return props.result.groups.map((group) => {
    const conditions = group.ruleIds.map((id) => byId.get(id)).filter((c): c is ConditionResult => c !== undefined)
    return { key: group.group, multiple: conditions.length > 1, status: group.status, conditions }
  })
})
const exclusions = computed(() => props.result.conditions.filter((c) => c.kind === 'exclusion'))
</script>

<template>
  <div class="conditions">
    <section v-if="required.length > 0" class="conditions__block" aria-labelledby="cond-required-title">
      <h3 id="cond-required-title" class="conditions__title">필수 조건</h3>
      <p class="conditions__rule">같은 그룹 안에서는 하나 이상 충족하면 되고(또는), 그룹끼리는 모두 충족해야 합니다(그리고).</p>
      <ul class="conditions__list">
        <li v-for="group in required" :key="group.key" :class="{ 'cond-group': group.multiple }">
          <p v-if="group.multiple" class="cond-group__head">
            <span>그룹 {{ group.key }} · 아래 중 하나 이상</span>
            <ConditionBadge :status="group.status" />
          </p>
          <ul class="conditions__list">
            <li v-for="condition in group.conditions" :key="condition.ruleId">
              <ConditionItem :program-id="programId" :condition="condition" />
            </li>
          </ul>
        </li>
      </ul>
    </section>

    <section v-if="exclusions.length > 0" class="conditions__block" aria-labelledby="cond-exclusion-title">
      <h3 id="cond-exclusion-title" class="conditions__title">제외 조건</h3>
      <p class="conditions__rule">하나라도 해당하면 신청할 수 없습니다. 해당하지 않으면 '해당 없음'입니다.</p>
      <ul class="conditions__list">
        <li v-for="condition in exclusions" :key="condition.ruleId">
          <ConditionItem :program-id="programId" :condition="condition" />
        </li>
      </ul>
    </section>

    <section v-if="result.scopedConditions.length > 0" class="conditions__block" aria-labelledby="cond-scoped-title">
      <h3 id="cond-scoped-title" class="conditions__title">일부 지원 항목에만 적용되는 조건</h3>
      <p class="conditions__rule">전체 신청 자격 판정에는 넣지 않았습니다. 해당 지원 항목을 신청할 때 확인하세요.</p>
      <ul class="conditions__list">
        <li v-for="condition in result.scopedConditions" :key="condition.ruleId">
          <ConditionItem :program-id="programId" :condition="condition" />
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.conditions {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.conditions__block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.conditions__title {
  margin: 0;
  font-size: var(--fs-base);
}

.conditions__rule {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.conditions__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.cond-group {
  padding: var(--space-3);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
}

.cond-group__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}
</style>

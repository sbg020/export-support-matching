<script setup lang="ts">
/**
 * 공고 상세 '신청 준비'의 필요서류 체크리스트 (REVISION_02 §8.2).
 * 필수 → 해당 시 → 선택 순서로 보여 주고, 원문 서류명과 근거 쪽을 함께 표시한다.
 * 체크 상태는 관리 기록(관심·준비 중·신청완료)이 있을 때만 저장한다.
 */
import { computed } from 'vue'
import { IconChecklist } from '@tabler/icons-vue'
import type { DocumentRequirement, Program, RequiredDocument } from '@/types/program'
import type { ApplicationRecord } from '@/types/tracking'
import { DOCUMENT_REQUIREMENT_OPTIONS, optionLabel } from '@/constants/options'
import { useApplicationStore } from '@/stores/applicationStore'
import EmptyState from '@/components/common/EmptyState.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'

const props = defineProps<{ program: Program | null; record: ApplicationRecord | null }>()

const applications = useApplicationStore()

const ORDER: Record<DocumentRequirement, number> = { required: 0, conditional: 1, optional: 2 }
const docs = computed(() =>
  [...(props.program?.requiredDocs ?? [])].sort(
    (a, b) => (a.requirement ? ORDER[a.requirement] : 3) - (b.requirement ? ORDER[b.requirement] : 3),
  ),
)
const checkedIds = computed(() => new Set((props.record?.checklist ?? []).filter((i) => i.checked).map((i) => i.requiredDocumentId)))
const reasonId = computed(() => `checklist-reason-${props.program?.id ?? 'none'}`)

function metaText(doc: RequiredDocument): string {
  return [
    doc.originalName && doc.originalName !== doc.name ? `원문: ${doc.originalName}` : null,
    doc.source?.locator ?? null,
    doc.note,
  ]
    .filter(Boolean)
    .join(' · ')
}

function onChange(docId: string, event: Event) {
  if (!props.program || !props.record) return
  applications.setChecklistItem(props.program.id, docId, (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <ul v-if="docs.length > 0" class="checklist">
    <li v-for="doc in docs" :key="doc.id" class="checklist__item">
      <input
        :id="`doc-${doc.id}`"
        class="form-check-input"
        type="checkbox"
        :checked="checkedIds.has(doc.id)"
        :disabled="!record"
        :aria-describedby="!record ? reasonId : undefined"
        @change="onChange(doc.id, $event)"
      />
      <label class="checklist__label" :for="`doc-${doc.id}`">
        <span class="checklist__name">
          {{ doc.name }}
          <span v-if="doc.requirement" class="checklist__tag">{{ optionLabel(DOCUMENT_REQUIREMENT_OPTIONS, doc.requirement) }}</span>
          <span v-if="doc.isProgramForm" class="checklist__tag checklist__tag--form">공고 전용 서식</span>
        </span>
        <span v-if="metaText(doc)" class="checklist__meta">{{ metaText(doc) }}</span>
      </label>
    </li>
  </ul>
  <EmptyState
    v-else
    :icon="IconChecklist"
    title="필요서류 정보가 없습니다"
    description="공고의 필요서류가 등록되면 체크리스트로 준비 상황을 관리할 수 있습니다."
    compact
    :level="4"
  />
  <DisabledReason v-if="!program" :id="reasonId">공고 정보가 없어 서류를 체크할 수 없습니다.</DisabledReason>
  <DisabledReason v-else-if="!record && docs.length > 0" :id="reasonId">
    관심사업으로 저장하면 서류 준비 상태를 체크해 기록할 수 있습니다.
  </DisabledReason>
  <p v-else-if="record && docs.length > 0" class="fs-sm text-muted-strong mt-2 mb-0">
    체크 상태는 이 기기의 관리 기록에 저장됩니다.
  </p>
</template>

<style scoped>
.checklist {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.checklist__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.checklist__item .form-check-input {
  flex-shrink: 0;
  margin-top: 3px;
}

.checklist__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--fs-sm);
}

.checklist__name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.checklist__tag {
  padding: 0 6px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  color: var(--color-text);
}

.checklist__tag--form {
  border-style: dashed;
}

.checklist__meta {
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}
</style>

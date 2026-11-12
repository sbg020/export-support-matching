<script setup lang="ts">
/**
 * 공고 검수 (REVISION_04 §10). 왼쪽 대기 목록, 오른쪽 상세(원문과 자동 추출 조건 나란히, 분류 라벨, 승인·반려).
 * 선택한 공고가 없거나 저장소가 없으면 입력칸·칩·버튼은 모두 비활성이고, 구조는 '-'로 그대로 보여 준다.
 */
import { computed, ref, shallowRef, useId, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import DataValue from '@/components/common/DataValue.vue'
import ActionButton from '@/components/common/ActionButton.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import AdminStoreNotice from '@/components/admin/AdminStoreNotice.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import StoreButton from '@/components/admin/StoreButton.vue'
import { REJECT_REASON_OPTIONS, REVIEW_EXTRACTION_FIELDS, adminSourceLabel } from '@/constants/adminOptions'
import { SUPPORT_CATEGORIES } from '@/constants/categories'
import { RECEPTION_STATUS_OPTIONS, optionLabel } from '@/constants/options'
import { formatDateTime } from '@/lib/display'
import { adminRepository } from '@/repositories/admin'
import type { AdminNoticeSummary, RejectReason, ReviewItem } from '@/types/admin'
import type { ExportStage } from '@/types/program'

const route = useRoute()
const uid = useId()

const queue = shallowRef<AdminNoticeSummary[]>([])
const item = shallowRef<ReviewItem | null>(null)
const selectedId = computed(() => (typeof route.query.id === 'string' ? route.query.id : null))

void adminRepository.listReviewQueue().then((list) => {
  queue.value = list
})
watch(
  selectedId,
  async (id) => {
    item.value = id ? await adminRepository.getReviewItem(id) : null
  },
  { immediate: true },
)

/** 입력칸·칩·버튼을 쓸 수 있는지 */
const editable = computed(() => item.value !== null && adminRepository.canWrite)
const lockReason = computed(() =>
  item.value === null ? '검수할 공고를 선택하면 사용할 수 있습니다.' : '공고 저장소를 연결한 뒤 사용할 수 있습니다.',
)

const EXPORT_STAGE_CHIPS: { value: ExportStage; label: string }[] = [
  { value: 'domestic', label: '내수' },
  { value: 'beginner', label: '초보' },
  { value: 'promising', label: '유망' },
  { value: 'growth', label: '성장' },
  { value: 'strong', label: '강소' },
]
const SUMMARY_RECOMMENDED_LENGTH = 40

const categories = ref<string[]>([])
const stages = ref<ExportStage[]>([])
const summary = ref('')
const memo = ref('')
const rejectReason = ref<RejectReason | ''>('')

watch(item, (value) => {
  categories.value = value ? [...value.labels.supportCategories] : []
  stages.value = value ? [...value.labels.targetExportStages] : []
  summary.value = value?.labels.summaryEasy ?? ''
  memo.value = value?.memo ?? ''
  rejectReason.value = ''
})

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

const lockId = `${uid}-lock`
const sourceReasonId = `${uid}-source-reason`
const notice = computed(() => item.value?.notice ?? null)
</script>

<template>
  <div class="page">
    <PageHeader
      title="공고 검수"
      description="자동으로 읽은 자격 조건을 원문과 나란히 비교해 확인한 뒤 승인합니다. 승인한 공고만 사용자에게 보입니다."
    />

    <div class="stack">
      <AdminStoreNotice />

      <div class="grid-12 review">
        <SectionCard class="col-span-12 lg-span-4" title="대기 목록" heading-id="review-queue-title">
          <template #actions>
            <span class="count-badge">
              <span class="visually-hidden">대기 건수</span>
              <DataValue :value="queue.length > 0 ? queue.length : null" />
            </span>
          </template>
          <EmptyState v-if="queue.length === 0" title="검수 대기 공고가 없습니다." compact :level="3" />
          <ul v-else class="queue">
            <li v-for="entry in queue" :key="entry.id">
              <RouterLink
                :to="{ name: 'admin-review', query: { id: entry.id } }"
                class="queue__item"
                :class="{ 'is-current': entry.id === selectedId }"
                :aria-current="entry.id === selectedId ? 'true' : undefined"
              >
                <strong><DataValue :value="entry.title" missing-label="공고명 없음" /></strong>
                <span class="queue__meta">{{ adminSourceLabel(entry.source) }} · {{ formatDateTime(entry.collectedAt) }}</span>
              </RouterLink>
            </li>
          </ul>
        </SectionCard>

        <div class="col-span-12 lg-span-8 stack">
          <NoticeBanner v-if="!item" tone="neutral">왼쪽 목록에서 검수할 공고를 선택하세요.</NoticeBanner>
          <p :id="lockId" class="visually-hidden">{{ lockReason }}</p>

          <SectionCard title="공고 정보" heading-id="review-head-title">
            <template #actions>
              <span class="fs-sm text-muted-strong">확인할 점</span>
              <strong class="text-heading ms-1"><DataValue :value="item?.checkPoint ?? null" /></strong>
            </template>
            <InfoList :columns="2" compact>
              <InfoRow label="공고명" :value="notice?.title ?? null" />
              <InfoRow label="주관기관" :value="item?.ministry ?? null" />
              <InfoRow label="출처" :value="notice ? adminSourceLabel(notice.source) : null" />
              <InfoRow label="수집일" :value="notice?.collectedAt ?? null" :format="formatDateTime" />
              <InfoRow label="접수 상태" :value="optionLabel(RECEPTION_STATUS_OPTIONS, notice?.receptionStatus ?? null)" />
            </InfoList>
          </SectionCard>

          <div class="grid-12">
            <SectionCard class="col-span-12 lg-span-6" title="공고 원문" heading-id="review-source-title">
              <div class="source-text" tabindex="0" role="region" aria-label="공고 원문">
                <template v-if="item && item.pages.length > 0">
                  <section v-for="page in item.pages" :key="page.page" class="source-text__page">
                    <p class="source-text__no">{{ page.page }}쪽</p>
                    <p class="source-text__body">{{ page.text }}</p>
                  </section>
                </template>
                <p v-else class="fs-sm text-muted-strong mb-0">공고를 선택하면 원문을 쪽 번호와 함께 보여 드립니다.</p>
              </div>
              <div class="mt-3">
                <ActionButton
                  variant="ghost"
                  size="sm"
                  :href="item?.sourceUrl ?? undefined"
                  :disabled="!item?.sourceUrl"
                  :describedby="!item?.sourceUrl ? sourceReasonId : undefined"
                >
                  원문 전체와 첨부 파일 보기
                </ActionButton>
                <DisabledReason v-if="!item?.sourceUrl" :id="sourceReasonId">원문 주소가 있을 때만 열 수 있습니다.</DisabledReason>
              </div>
            </SectionCard>

            <SectionCard
              class="col-span-12 lg-span-6"
              title="자동 추출 조건"
              heading-id="review-extract-title"
              description="수정한 값은 원문의 문장과 함께 저장됩니다."
            >
              <AdminTable label="자동 추출 조건" :columns="['항목', '값', '확실성', '원문에서 보기']" :row-count="REVIEW_EXTRACTION_FIELDS.length">
                <tr v-for="(field, index) in REVIEW_EXTRACTION_FIELDS" :key="field">
                  <th scope="row">{{ field }}</th>
                  <td>
                    <label :for="`${uid}-extract-${index}`" class="visually-hidden">{{ field }} 값</label>
                    <input
                      :id="`${uid}-extract-${index}`"
                      class="form-control form-control-sm"
                      :value="item?.extractions[index]?.value ?? ''"
                      placeholder="-"
                      :disabled="!editable"
                      :aria-describedby="!editable ? lockId : undefined"
                    />
                  </td>
                  <td><DataValue :value="null" /></td>
                  <td>
                    <button type="button" class="btn btn-ghost btn-sm" disabled :aria-describedby="lockId">원문에서 보기</button>
                  </td>
                </tr>
              </AdminTable>
            </SectionCard>
          </div>

          <SectionCard title="분류 라벨 수정" heading-id="review-labels-title">
            <div class="step-fields">
              <fieldset class="label-group">
                <legend class="form-label">지원 분야</legend>
                <div class="chips">
                  <button
                    v-for="category in SUPPORT_CATEGORIES"
                    :key="category.code"
                    type="button"
                    class="chip"
                    :aria-pressed="categories.includes(category.code)"
                    :disabled="!editable"
                    :aria-describedby="!editable ? lockId : undefined"
                    @click="categories = toggle(categories, category.code)"
                  >
                    {{ category.code }} {{ category.name }}
                  </button>
                </div>
              </fieldset>
              <fieldset class="label-group">
                <legend class="form-label">맞는 수출단계</legend>
                <div class="chips">
                  <button
                    v-for="stage in EXPORT_STAGE_CHIPS"
                    :key="stage.value"
                    type="button"
                    class="chip"
                    :aria-pressed="stages.includes(stage.value)"
                    :disabled="!editable"
                    :aria-describedby="!editable ? lockId : undefined"
                    @click="stages = toggle(stages, stage.value)"
                  >
                    {{ stage.label }}
                  </button>
                </div>
              </fieldset>
              <div>
                <label :for="`${uid}-summary`" class="form-label">지원 내용 한 줄</label>
                <input
                  :id="`${uid}-summary`"
                  v-model="summary"
                  class="form-control"
                  :disabled="!editable"
                  :aria-describedby="`${uid}-summary-hint${!editable ? ` ${lockId}` : ''}`"
                />
                <p :id="`${uid}-summary-hint`" class="form-hint">
                  {{ SUMMARY_RECOMMENDED_LENGTH }}자 이내 권장 · 지금 {{ summary.length }}자. 맞춤 추천 카드의 '지원 내용'으로 쓰입니다.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="승인 또는 반려" heading-id="review-decision-title" description="검토일과 검토자(계정 아이디)는 저장할 때 기록됩니다.">
            <div class="field-pair">
              <div>
                <label :for="`${uid}-memo`" class="form-label">검토 메모</label>
                <textarea
                  :id="`${uid}-memo`"
                  v-model="memo"
                  class="form-control"
                  rows="3"
                  :disabled="!editable"
                  :aria-describedby="!editable ? lockId : undefined"
                />
              </div>
              <div>
                <label :for="`${uid}-reject`" class="form-label">반려 사유</label>
                <select
                  :id="`${uid}-reject`"
                  v-model="rejectReason"
                  class="form-select"
                  :disabled="!editable"
                  :aria-describedby="`${uid}-reject-hint${!editable ? ` ${lockId}` : ''}`"
                >
                  <option value="">선택해 주세요</option>
                  <option v-for="option in REJECT_REASON_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <p :id="`${uid}-reject-hint`" class="form-hint">'기타'를 고르면 검토 메모를 꼭 적어 주세요.</p>
              </div>
            </div>
            <div class="action-row mt-3">
              <StoreButton label="반려" variant="danger-outline" :blocked="!item" :reason="lockReason" />
              <StoreButton label="승인하고 게시" variant="primary" :blocked="!item" :reason="lockReason" />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.count-badge {
  display: inline-flex;
  align-items: center;
  min-width: 28px;
  justify-content: center;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);
  font-weight: var(--fw-bold);
}

.queue {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.queue__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-heading);
  text-decoration: none;
}

.queue__item.is-current {
  border: 2px solid var(--color-primary-strong);
  background: var(--color-primary-soft);
}

.queue__meta {
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.source-text {
  max-height: 480px;
  overflow-y: auto;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.source-text__no {
  margin: 0 0 4px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.source-text__body {
  white-space: pre-wrap;
  font-size: var(--fs-sm);
}

.label-group {
  margin: 0;
  padding: 0;
  border: 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}

.chip[aria-pressed='true'] {
  border-color: var(--color-primary-strong);
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.chip:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

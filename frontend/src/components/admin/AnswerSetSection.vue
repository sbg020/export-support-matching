<script setup lang="ts">
/**
 * 검수 완료 데이터 일괄 반영 (정답세트 xlsx, REVISION_04 §11.3).
 * 지금 동작: 파일 고르기 → 브라우저에서 읽기(SheetJS 지연 로드) → 검사 결과. 반영은 저장소 연결 후(오류 0건일 때만).
 */
import { computed, ref, shallowRef } from 'vue'
import { IconAlertTriangle, IconCircleCheck, IconCircleX } from '@tabler/icons-vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import AdminFilePicker from './AdminFilePicker.vue'
import AdminTable from './AdminTable.vue'
import StoreButton from './StoreButton.vue'
import { validateAnswerSet } from '@/lib/admin/answerSet'
import { readWorkbook } from '@/lib/admin/readWorkbook'
import type { AnswerSetCheckResult, AnswerSetProgramRow } from '@/types/answerSet'

const MAX_BYTES = 20 * 1024 * 1024

const fileName = ref<string | null>(null)
const reading = ref(false)
const problem = ref<string | null>(null)
const result = shallowRef<AnswerSetCheckResult | null>(null)
type IssueView = 'error' | 'warning'
const issueView = ref<IssueView>('error')

function clear() {
  fileName.value = null
  problem.value = null
  result.value = null
  issueView.value = 'error'
}

async function onSelect(file: File) {
  clear()
  fileName.value = file.name
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    problem.value = '.xlsx 파일만 검사할 수 있습니다.'
    return
  }
  if (file.size > MAX_BYTES) {
    problem.value = '파일이 20MB를 넘습니다.'
    return
  }
  reading.value = true
  try {
    result.value = validateAnswerSet(await readWorkbook(await file.arrayBuffer()))
    issueView.value = result.value.counts.errors > 0 ? 'error' : 'warning'
  } catch {
    problem.value = '엑셀 파일을 읽지 못했습니다. 파일이 손상되지 않았는지 확인해 주세요.'
  } finally {
    reading.value = false
  }
}

const visibleIssues = computed(() => (result.value?.issues ?? []).filter((issue) => issue.level === issueView.value))
const RESULT_BADGE: Record<AnswerSetProgramRow['result'], { label: string; tone: 'success' | 'warning' | 'danger'; icon: typeof IconCircleCheck }> = {
  ok: { label: '정상', tone: 'success', icon: IconCircleCheck },
  warning: { label: '경고', tone: 'warning', icon: IconAlertTriangle },
  error: { label: '오류', tone: 'danger', icon: IconCircleX },
}
const percent = (ratio: number | null) => (ratio === null ? '-' : `${Math.round(ratio * 100)}%`)
const ISSUE_VIEWS: { value: IssueView; label: string }[] = [
  { value: 'error', label: '오류' },
  { value: 'warning', label: '경고' },
]
</script>

<template>
  <SectionCard
    id="bulk"
    title="검수 완료 데이터 일괄 반영"
    heading-id="bulk-title"
    description="정답세트 xlsx(programs · rules · bonuses · documents 시트, 2행 영문 머리글)를 브라우저에서 읽어 검사합니다. 파일은 서버로 보내지 않습니다."
  >
    <AdminFilePicker
      v-if="!fileName"
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      hint="정답세트 .xlsx 파일을 끌어다 놓거나 선택하세요."
      @select="onSelect"
    />
    <div v-else class="bulk-file">
      <span class="fw-semibold text-heading">{{ fileName }}</span>
      <button type="button" class="btn btn-ghost btn-sm" @click="clear">선택 지우기</button>
    </div>

    <p v-if="reading" class="bulk-reading" role="status">
      <span class="spinner-border spinner-border-sm" aria-hidden="true" />
      파일을 읽는 중입니다.
    </p>
    <NoticeBanner v-if="problem" class="mt-3" tone="danger" title="파일을 검사할 수 없습니다" alert>{{ problem }}</NoticeBanner>

    <template v-if="result">
      <p class="bulk-summary" role="status">
        공고 {{ result.counts.announcements }}건 · 세부사업 포함 {{ result.counts.programs }}행 · 규칙 {{ result.counts.rules }} ·
        가점 {{ result.counts.bonuses }} · 서류 {{ result.counts.documents }} · 오류 {{ result.counts.errors }} · 경고
        {{ result.counts.warnings }}
      </p>
      <ul class="bulk-facts">
        <li>검수상태 '검수대기'로 남은 행: {{ result.counts.pendingReview }}개</li>
        <li>
          평가용(test) 공고: {{ result.counts.testAnnouncements === null ? '-' : `${result.counts.testAnnouncements}건` }}
        </li>
        <li>검수상태 '삭제'로 세지 않은 행: {{ result.counts.excluded }}개</li>
        <li>
          지원 내용 한 줄 열(support_summary):
          {{ result.hasSupportSummary ? '있음 — 맞춤 추천 카드의 지원 내용으로 씁니다' : '없음 — 카드의 지원 내용은 세부 분야 이름으로 표시됩니다' }}
        </li>
      </ul>

      <div v-if="result.issues.length > 0" class="mt-3">
        <SegmentedControl v-model="issueView" :options="ISSUE_VIEWS" label="오류·경고 보기" />
        <div class="mt-3">
          <AdminTable
            label="오류·경고 목록"
            :columns="['시트', '행 ID', '내용']"
            :row-count="visibleIssues.length"
            :empty-title="issueView === 'error' ? '오류가 없습니다' : '경고가 없습니다'"
            empty-description="다른 보기를 선택해 보세요."
          >
            <tr v-for="(issue, index) in visibleIssues" :key="index">
              <td>{{ issue.sheet }}</td>
              <td>{{ issue.rowId ?? '-' }}</td>
              <td>{{ issue.message }}</td>
            </tr>
          </AdminTable>
        </div>
      </div>

      <div class="mt-4">
        <AdminTable
          label="공고별 검사 결과"
          :columns="['공고 ID', '공고명', '규칙 수', '검수 끝난 비율', '결과']"
          :row-count="result.programs.length"
          empty-title="읽은 공고가 없습니다"
          empty-description="시트와 열 이름을 확인해 주세요."
        >
          <tr v-for="row in result.programs" :key="row.programId">
            <td>{{ row.programId }}</td>
            <th scope="row">{{ row.title ?? '-' }}</th>
            <td>{{ row.ruleCount }}</td>
            <td>{{ percent(row.reviewedRatio) }}</td>
            <td>
              <StatusBadge
                :label="RESULT_BADGE[row.result].label"
                :tone="RESULT_BADGE[row.result].tone"
                :icon="RESULT_BADGE[row.result].icon"
                size="sm"
              />
            </td>
          </tr>
        </AdminTable>
      </div>

      <div class="mt-4">
        <StoreButton
          label="검사 결과대로 반영하기"
          variant="primary"
          :blocked="result.counts.errors > 0"
          :reason="result.counts.errors > 0 ? '오류가 0건이어야 반영할 수 있습니다. 파일을 고쳐 다시 올려 주세요.' : undefined"
        />
      </div>
    </template>
  </SectionCard>
</template>

<style scoped>
.bulk-file {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  word-break: break-all;
}

.bulk-reading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-3) 0 0;
}

.bulk-summary {
  margin: var(--space-4) 0 var(--space-2);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.bulk-facts {
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--fs-sm);
}
</style>

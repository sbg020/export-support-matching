<script setup lang="ts">
/**
 * KOTRA·KITA CSV 업로드 (REVISION_04 §9, REVISION_05 §7.4). 두 화면은 이 컴포넌트를 같이 쓰고 출처(route.meta.uploadSource)만 다르다.
 * 지금 동작: 양식 내려받기, 파일 고르기(브라우저 안에서만 읽음), 인코딩 판별, 행 검사·미리보기·보기 선택, 선택 지우기.
 * 저장소 연결 후: 반영, 업로드 이력, 되돌리기.
 */
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import { IconCircleCheck, IconCircleX, IconCopy, IconDownload } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import AdminStoreNotice from '@/components/admin/AdminStoreNotice.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import AdminFilePicker from '@/components/admin/AdminFilePicker.vue'
import StoreButton from '@/components/admin/StoreButton.vue'
import { decodeCsvBytes, parseCsv, type CsvEncoding } from '@/lib/admin/csv'
import {
  KOTRA_COLUMNS,
  KOTRA_MAX_BYTES,
  KOTRA_TEMPLATE_FILE_NAME,
  buildKotraTemplateCsv,
  validateKotraCsv,
  type KotraCheckResult,
  type KotraRowStatus,
} from '@/lib/admin/kotraCsv'
import { downloadTextFile } from '@/lib/admin/download'
import { formatDateTime } from '@/lib/display'
import { adminRepository } from '@/repositories/admin'
import type { UploadRecord } from '@/types/admin'

const STEPS = ['양식 내려받기 (선택)', '파일 올리기', '미리보기·오류 확인', '반영']

/** 출처: KOTRA(기본) · KITA */
const route = useRoute()
const source = computed<'kotra' | 'kita'>(() => (route.meta.uploadSource === 'kita' ? 'kita' : 'kotra'))
const sourceName = computed(() => (source.value === 'kita' ? 'KITA' : 'KOTRA'))

/** '다른 파일 선택'용 숨긴 입력 (보이는 버튼이 연다) */
const replaceInput = ref<HTMLInputElement | null>(null)
const fileName = ref<string | null>(null)
const readAt = ref<Date | null>(null)
const encoding = ref<CsvEncoding | null>(null)
const fileProblem = ref<string | null>(null)
const result = shallowRef<KotraCheckResult | null>(null)
type ViewFilter = 'all' | 'error' | 'duplicate'
const view = ref<ViewFilter>('all')
const uploads = shallowRef<UploadRecord[]>([])

onMounted(async () => {
  uploads.value = await adminRepository.listUploads(source.value === 'kita' ? 'kita-csv' : 'kotra-csv')
})

/** 지금 단계 (0부터): 파일을 고르기 전 1, 검사가 끝나면 2. 반영(3)은 저장소 연결 후에만 */
const currentStep = computed(() => (result.value && !result.value.fileError ? 2 : 1))

function downloadTemplate() {
  const name = source.value === 'kita' ? KOTRA_TEMPLATE_FILE_NAME.replace('kotra', 'kita') : KOTRA_TEMPLATE_FILE_NAME
  downloadTextFile(name, buildKotraTemplateCsv())
}

function clearSelection() {
  fileName.value = null
  readAt.value = null
  encoding.value = null
  fileProblem.value = null
  result.value = null
  view.value = 'all'
}

async function onSelect(file: File) {
  clearSelection()
  fileName.value = file.name
  if (!file.name.toLowerCase().endsWith('.csv')) {
    fileProblem.value = '.csv 파일만 올릴 수 있습니다.'
    return
  }
  if (file.size > KOTRA_MAX_BYTES) {
    fileProblem.value = '파일이 5MB를 넘습니다. 5MB 이하로 나누어 올려 주세요.'
    return
  }
  const decoded = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()))
  encoding.value = decoded.encoding
  readAt.value = new Date()
  result.value = validateKotraCsv(parseCsv(decoded.text))
}

function onReplace(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) void onSelect(file)
}

const visibleRows = computed(() => {
  const rows = result.value?.rows ?? []
  return view.value === 'all' ? rows : rows.filter((row) => row.status === view.value)
})
const applicableCount = computed(() => (result.value ? result.value.counts.ok + result.value.counts.duplicate : 0))

const STATUS_BADGE: Record<KotraRowStatus, { label: string; tone: 'success' | 'danger' | 'warning'; icon: typeof IconCircleCheck }> = {
  ok: { label: '정상', tone: 'success', icon: IconCircleCheck },
  error: { label: '오류', tone: 'danger', icon: IconCircleX },
  duplicate: { label: '중복 의심', tone: 'warning', icon: IconCopy },
}
const VIEW_OPTIONS: { value: ViewFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'error', label: '오류만' },
  { value: 'duplicate', label: '중복 의심만' },
]
const timeText = (date: Date) => date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
</script>

<template>
  <div class="page">
    <PageHeader
      :title="`${sourceName} CSV 업로드`"
      :description="`${sourceName} 공고는 API가 없어 정해진 양식의 CSV 파일로 직접 올립니다. 올린 공고는 검수 대기로 들어갑니다.`"
    />

    <div class="stack">
      <AdminStoreNotice />

      <ol class="upload-steps" aria-label="업로드 단계">
        <li
          v-for="(step, index) in STEPS"
          :key="step"
          class="upload-steps__item"
          :class="{ 'is-current': index === currentStep, 'is-done': index < currentStep && index > 0 }"
          :aria-current="index === currentStep ? 'step' : undefined"
        >
          <span class="upload-steps__num" aria-hidden="true">{{ index + 1 }}</span>
          <span>{{ step }}</span>
        </li>
      </ol>

      <SectionCard
        title="양식 내려받기"
        heading-id="kotra-template-title"
        description="양식의 열 이름과 순서를 바꾸지 마세요. 날짜는 2026-12-18처럼 씁니다."
      >
        <template #actions>
          <button type="button" class="btn btn-secondary btn-sm" @click="downloadTemplate">
            <IconDownload :size="16" stroke-width="2" aria-hidden="true" />
            CSV 양식 내려받기
          </button>
        </template>
        <AdminTable :label="`${sourceName} CSV 양식의 열`" :columns="['열', '필수', '쓰는 법', '저장 필드']" :row-count="KOTRA_COLUMNS.length">
          <tr v-for="column in KOTRA_COLUMNS" :key="column.name">
            <th scope="row">{{ column.name }}</th>
            <td>{{ column.required ? '필수' : '선택' }}</td>
            <td>{{ column.howTo || '-' }}</td>
            <td><code>{{ column.field }}</code></td>
          </tr>
        </AdminTable>
      </SectionCard>

      <SectionCard title="파일 올리기" heading-id="kotra-file-title" description="파일은 서버로 보내지 않고 이 브라우저에서만 읽어 확인합니다.">
        <AdminFilePicker
          v-if="!fileName"
          accept=".csv,text/csv"
          hint=".csv 파일을 끌어다 놓거나 선택하세요. 5MB·1,000행까지 올릴 수 있습니다."
          @select="onSelect"
        />
        <div v-else class="file-meta">
          <dl class="file-meta__list">
            <div><dt>파일</dt><dd>{{ fileName }}</dd></div>
            <div><dt>읽은 시각</dt><dd>{{ readAt ? timeText(readAt) : '-' }}</dd></div>
            <div><dt>행 수</dt><dd>{{ result && !result.fileError ? `${result.counts.total}행` : '-' }}</dd></div>
            <div><dt>인코딩</dt><dd>{{ encoding === 'euc-kr' ? 'EUC-KR (엑셀 CSV)' : encoding === 'utf-8' ? 'UTF-8' : '-' }}</dd></div>
          </dl>
          <div class="action-row">
            <input
              ref="replaceInput"
              type="file"
              class="visually-hidden"
              accept=".csv,text/csv"
              tabindex="-1"
              aria-hidden="true"
              @change="onReplace"
            />
            <button type="button" class="btn btn-secondary btn-sm" @click="replaceInput?.click()">다른 파일 선택</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="clearSelection">선택 지우기</button>
          </div>
        </div>
        <NoticeBanner v-if="fileProblem" class="mt-3" tone="danger" title="파일을 확인할 수 없습니다" alert>
          {{ fileProblem }}
        </NoticeBanner>
        <NoticeBanner v-else-if="result?.fileError" class="mt-3" tone="danger" title="양식과 다른 파일입니다" alert>
          {{ result.fileError }}
        </NoticeBanner>
      </SectionCard>

      <SectionCard v-if="result && !result.fileError" title="미리보기·오류 확인" heading-id="kotra-preview-title">
        <p class="preview-summary" role="status">
          {{ result.counts.total }}행 중 정상 {{ result.counts.ok }}행, 오류 {{ result.counts.error }}행, 중복 의심
          {{ result.counts.duplicate }}행입니다.
        </p>
        <div class="action-row mb-3">
          <StatusBadge :label="`정상 ${result.counts.ok}`" tone="success" :icon="IconCircleCheck" size="sm" />
          <StatusBadge :label="`오류 ${result.counts.error}`" tone="danger" :icon="IconCircleX" size="sm" />
          <StatusBadge :label="`중복 의심 ${result.counts.duplicate}`" tone="warning" :icon="IconCopy" size="sm" />
        </div>
        <SegmentedControl v-model="view" :options="VIEW_OPTIONS" label="미리보기 보기 선택" />
        <div class="mt-3">
          <AdminTable
            label="CSV 미리보기"
            :columns="['행', '공고명', '주관기관', '마감일', '지역', '확인 결과']"
            :row-count="visibleRows.length"
            empty-title="해당하는 행이 없습니다"
            empty-description="다른 보기를 선택해 보세요."
          >
            <tr v-for="row in visibleRows" :key="row.rowNumber" :class="{ 'is-error': row.status === 'error' }">
              <td>{{ row.rowNumber }}</td>
              <th scope="row">{{ row.title || '-' }}</th>
              <td>{{ row.ministry || '-' }}</td>
              <td>{{ row.deadline || '-' }}</td>
              <td>{{ row.region || '-' }}</td>
              <td>
                <StatusBadge
                  :label="STATUS_BADGE[row.status].label"
                  :tone="STATUS_BADGE[row.status].tone"
                  :icon="STATUS_BADGE[row.status].icon"
                  size="sm"
                />
                <ul v-if="row.reasons.length > 0" class="row-reasons">
                  <li v-for="reason in row.reasons" :key="reason">{{ reason }}</li>
                </ul>
              </td>
            </tr>
          </AdminTable>
        </div>
        <p class="fs-sm text-muted-strong mt-3 mb-1">저장된 공고와의 중복은 저장소를 연결한 뒤 확인합니다.</p>
        <p class="fs-sm mb-3">
          오류 행은 반영하지 않습니다. 파일을 고쳐 다시 올리거나, 오류 행만 빼고 반영할 수 있습니다. 중복 의심 행은 반영
          후 공고 관리에서 병합 여부를 정합니다.
        </p>
        <div class="action-row">
          <button type="button" class="btn btn-secondary" @click="clearSelection">취소</button>
          <StoreButton :label="`오류 행 빼고 ${applicableCount}건 반영하기`" variant="primary" />
        </div>
      </SectionCard>

      <SectionCard
        title="업로드 이력"
        heading-id="kotra-history-title"
        description="반영을 되돌리면 그 파일로 들어온 공고가 모두 검수 대기와 게시에서 빠집니다."
      >
        <AdminTable
          :label="`${sourceName} 업로드 이력`"
          :columns="['일시', '파일', '반영 건수', '올린 사람', '상태', '되돌리기']"
          :row-count="uploads.length"
          empty-title="업로드 기록이 없습니다"
        >
          <tr v-for="upload in uploads" :key="upload.id">
            <td>{{ formatDateTime(upload.uploadedAt) }}</td>
            <td>{{ upload.fileName }}</td>
            <td>{{ upload.appliedCount }}</td>
            <td>{{ upload.uploadedBy }}</td>
            <td>{{ upload.status === 'applied' ? '반영됨' : '되돌림' }}</td>
            <td><StoreButton label="되돌리기" size="sm" quiet-reason /></td>
          </tr>
        </AdminTable>
      </SectionCard>
    </div>
  </div>
</template>

<style scoped>
.upload-steps {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.upload-steps__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.upload-steps__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-surface-sunken);
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
}

.upload-steps__item.is-current {
  border-color: var(--color-primary-strong);
  color: var(--color-primary-strong);
  font-weight: var(--fw-bold);
}

.upload-steps__item.is-current .upload-steps__num {
  background: var(--color-primary-strong);
  color: #fff;
}

.file-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.file-meta__list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-6);
  margin: 0;
}

.file-meta__list dt {
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.file-meta__list dd {
  margin: 0;
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
  word-break: break-all;
}

.preview-summary {
  margin: 0 0 var(--space-3);
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

tr.is-error > * {
  background: var(--color-danger-soft, #fdecec);
}

.row-reasons {
  margin: 6px 0 0;
  padding-left: var(--space-4);
  font-size: var(--fs-sm);
  color: var(--color-text);
}
</style>

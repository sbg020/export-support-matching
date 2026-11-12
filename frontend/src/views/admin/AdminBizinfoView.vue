<script setup lang="ts">
/**
 * 기업마당 API 수집 (REVISION_04 §8).
 * 지금 동작: 수집 주기·필터 입력과 키워드 검증(1~20자, 중복 제거, 최대 50개).
 * 저장소·인증키 연결 후: 지금 수집, 인증키 등록·연결 확인, 주기·필터 저장, 수집 로그.
 * 저장할 수 없는 화면에서 비밀값을 받지 않도록 인증키 입력칸은 두지 않는다 (A-11).
 */
import { onMounted, ref, shallowRef, watch } from 'vue'
import { IconKey, IconPlugConnectedX } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import FormField from '@/components/form/FormField.vue'
import FormFieldset from '@/components/form/FormFieldset.vue'
import SelectInput from '@/components/form/SelectInput.vue'
import CheckCards from '@/components/form/CheckCards.vue'
import TagInput from '@/components/form/TagInput.vue'
import AdminStoreNotice from '@/components/admin/AdminStoreNotice.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import StoreButton from '@/components/admin/StoreButton.vue'
import {
  BIZINFO_CATEGORY_OPTIONS,
  BIZINFO_DEFAULT_CATEGORIES,
  COLLECTION_SCHEDULE_OPTIONS,
  COLLECTION_TIME_OPTIONS,
} from '@/constants/adminOptions'
import { formatDateTime } from '@/lib/display'
import { normalizeKeywords } from '@/lib/admin/settings'
import { adminRepository } from '@/repositories/admin'
import type { CollectionRun, CollectionSchedule, CollectionTime } from '@/types/admin'

const runs = shallowRef<CollectionRun[]>([])
onMounted(async () => {
  runs.value = await adminRepository.listCollectionRuns()
})

const schedule = ref<CollectionSchedule | null>(null)
const time = ref<CollectionTime | null>(null)
const refetchRevisions = ref(false)
const categories = ref<string[]>([...BIZINFO_DEFAULT_CATEGORIES])
/** 기본값은 비워 둔다 (근거 없는 설정값을 미리 채우지 않는다, A-12) */
const keywords = ref<string[]>([])
const keywordMessages = ref<string[]>([])

watch(keywords, (value) => {
  const { keywords: normalized, rejected } = normalizeKeywords(value)
  keywordMessages.value = rejected
  if (normalized.length !== value.length || normalized.some((k, i) => k !== value[i])) keywords.value = normalized
})

const KEY_REASON = '인증키와 공고 저장소를 연결한 뒤 사용할 수 있습니다.'
const countFormat = (n: number) => `${n}건`
</script>

<template>
  <div class="page">
    <PageHeader
      title="기업마당 API 수집"
      description="기업마당 공고를 정해진 주기에 자동으로 가져옵니다. 수출 분야 공고만 걸러 검수 대기로 보냅니다."
    >
      <template #actions>
        <StoreButton label="지금 수집" variant="primary" :reason="KEY_REASON" />
      </template>
    </PageHeader>

    <div class="stack">
      <AdminStoreNotice />

      <div class="grid-12">
        <SectionCard class="col-span-12 lg-span-6" title="수집 상태" heading-id="bizinfo-status-title">
          <template #actions>
            <StatusBadge label="연결 전" tone="neutral" :icon="IconPlugConnectedX" size="sm" />
          </template>
          <InfoList>
            <InfoRow label="마지막 수집" :value="runs[0]?.startedAt ?? null" :format="formatDateTime" />
            <InfoRow label="다음 수집" :value="null" />
            <InfoRow label="오늘 새 공고 (수출 분야)" :value="null" :format="countFormat" />
            <InfoRow label="오류" :value="null" :format="countFormat" />
          </InfoList>
        </SectionCard>

        <SectionCard class="col-span-12 lg-span-6" title="인증키" heading-id="bizinfo-key-title">
          <template #actions>
            <StatusBadge label="등록 안 됨" tone="neutral" :icon="IconKey" size="sm" />
          </template>
          <p class="fs-sm">
            인증키는 기업마당에서 발급받습니다. 저장소를 연결한 뒤 이 화면에서 등록하며, 서버에만 보관하고 화면에는 끝
            4자리만 보여 줍니다. 코드와 Git에는 넣지 않습니다.
          </p>
          <div class="action-row">
            <StoreButton label="인증키 등록" :reason="KEY_REASON" />
            <StoreButton label="연결 확인" :reason="KEY_REASON" />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="수집 주기" heading-id="bizinfo-schedule-title" description="시각은 한국 시간 기준입니다.">
        <template #actions>
          <StatusBadge label="저장 안 됨" tone="warning" size="sm" />
        </template>
        <div class="field-pair">
          <FormField id="bizinfo-schedule" label="주기">
            <template #default="{ id, describedby }">
              <SelectInput :id="id" v-model="schedule" :options="COLLECTION_SCHEDULE_OPTIONS" :describedby="describedby" />
            </template>
          </FormField>
          <FormField id="bizinfo-time" label="시각" hint="한국 시간 (저장소 연결 후 UTC로 바꿔 예약합니다)">
            <template #default="{ id, describedby }">
              <SelectInput :id="id" v-model="time" :options="COLLECTION_TIME_OPTIONS" :describedby="describedby" />
            </template>
          </FormField>
        </div>
        <div class="form-check mt-3">
          <input id="bizinfo-refetch" v-model="refetchRevisions" class="form-check-input" type="checkbox" />
          <label class="form-check-label" for="bizinfo-refetch">수정공고도 다시 가져오기</label>
        </div>
        <div class="mt-4">
          <StoreButton label="주기 저장" />
        </div>
      </SectionCard>

      <SectionCard
        title="수출 분야 필터"
        heading-id="bizinfo-filter-title"
        description="아래 조건 중 하나라도 맞는 공고만 검수 대기로 보냅니다. 나머지는 원문만 저장합니다."
      >
        <div class="step-fields">
          <FormFieldset id="bizinfo-categories" legend="기업마당 지원분야" hint="분야 코드는 구현 전 기업마당 공식 안내로 다시 확인합니다.">
            <template #default="{ describedby }">
              <CheckCards
                v-model="categories"
                name="bizinfo-category"
                :options="BIZINFO_CATEGORY_OPTIONS"
                :columns="3"
                :describedby="describedby"
              />
            </template>
          </FormFieldset>
          <FormField
            id="bizinfo-keywords"
            label="제목·본문 키워드"
            optional
            hint="키워드는 1~20자, 최대 50개입니다. 같은 키워드는 한 번만 넣습니다."
          >
            <template #default="{ id, describedby }">
              <TagInput :id="id" v-model="keywords" :describedby="describedby" placeholder="예: 수출, 해외, 바이어" item-label="키워드" />
            </template>
          </FormField>
          <ul v-if="keywordMessages.length > 0" class="keyword-messages" role="status">
            <li v-for="message in keywordMessages" :key="message">{{ message }}</li>
          </ul>
          <p class="fs-sm mb-0">
            키워드 사전은 기준·설정에서 함께 관리합니다.
            <RouterLink :to="{ name: 'admin-settings' }">기준·설정으로</RouterLink>
          </p>
          <div>
            <StoreButton label="필터 저장" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="수집 로그" heading-id="bizinfo-log-title">
        <AdminTable
          label="수집 로그"
          :columns="['일시', '방식', '가져온 공고', '수출 분야', '수정공고', '결과']"
          :row-count="runs.length"
          empty-title="수집 기록이 없습니다."
        >
          <tr v-for="run in runs" :key="run.id">
            <td>{{ formatDateTime(run.startedAt) }}</td>
            <td>{{ run.trigger === 'manual' ? '지금 수집' : '자동' }}</td>
            <td>{{ run.fetched }}</td>
            <td>{{ run.exportMatched }}</td>
            <td>{{ run.revised }}</td>
            <td>{{ run.errors.length > 0 ? `오류 ${run.errors.length}건` : '정상' }}</td>
          </tr>
        </AdminTable>
        <ul v-if="runs.some((run) => run.errors.length > 0)" class="run-errors">
          <template v-for="run in runs" :key="run.id">
            <li v-for="(error, index) in run.errors" :key="index">
              {{ formatDateTime(run.startedAt) }} · {{ error.message }} — 다음 수집 때 다시 시도합니다.
            </li>
          </template>
        </ul>
      </SectionCard>
    </div>
  </div>
</template>

<style scoped>
.keyword-messages,
.run-errors {
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--fs-sm);
  color: var(--color-danger-strong, var(--color-text));
}
</style>

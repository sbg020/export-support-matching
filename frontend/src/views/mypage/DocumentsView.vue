<script setup lang="ts">
/**
 * 서류함. 파일 저장소가 없어 원본 파일은 올리지 않고, 이 기기에 둔 서류 기록(이름·유형·상태·발급일·유효기간·연결 사업)만 보여 준다.
 * 기기 공용 범위에는 기록이 없다(빈 상태). 테스트 계정은 처음 로그인할 때 임시 기록이 들어간다.
 */
import { computed, ref, watch } from 'vue'
import { IconClock, IconFileCertificate, IconFolder, IconLink, IconUpload } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatTile from '@/components/common/StatTile.vue'
import DataValue from '@/components/common/DataValue.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import type { BadgeTone } from '@/components/common/types'
import ActionButton from '@/components/common/ActionButton.vue'
import { DOCUMENT_TYPE_OPTIONS, optionLabel } from '@/constants/options'
import { DOCUMENT_STATUS_LABEL, expiresWithin } from '@/lib/documentVault'
import { formatDateCompact } from '@/lib/display'
import { programTitleText } from '@/lib/programDisplay'
import { SITE_TODAY } from '@/lib/siteClock'
import { programRepository } from '@/repositories'
import { useTrackingStore } from '@/stores/trackingStore'
import type { Program } from '@/types/program'
import type { DocumentStatus, DocumentType } from '@/types/tracking'

const tracking = useTrackingStore()
const documents = tracking.documents

const heldCount = computed(() => documents.value.filter((d) => d.status === 'held' || d.status === 'expiring').length)
const expiringCount = computed(() => documents.value.filter((d) => d.status === 'expiring' || expiresWithin(d, SITE_TODAY)).length)
const linkedCount = computed(() => documents.value.filter((d) => d.linkedProgramIds.length > 0).length)
const hasDocuments = computed(() => documents.value.length > 0)
const count = (n: number) => (hasDocuments.value ? `${n}건` : null)

const STATUS_TONE: Record<DocumentStatus, BadgeTone> = { held: 'success', drafting: 'info', expiring: 'warning', missing: 'danger' }

/** 연결된 공고 이름 */
const programs = ref<Map<string, Program>>(new Map())
watch(
  () => documents.value.flatMap((d) => d.linkedProgramIds).join(','),
  async () => {
    const ids = Array.from(new Set(documents.value.flatMap((d) => d.linkedProgramIds)))
    if (ids.length === 0) return
    try {
      programs.value = new Map((await programRepository.getByIds(ids)).map((p) => [p.id, p]))
    } catch {
      programs.value = new Map()
    }
  },
  { immediate: true },
)

function documentsOfType(type: DocumentType) {
  return documents.value.filter((d) => d.type === type)
}
</script>

<template>
  <div class="page">
    <PageHeader
      title="서류함"
      description="지원사업 신청에 자주 쓰는 서류를 정리하고, 어떤 사업에 필요한지 연결해 봅니다."
    >
      <template #actions>
        <ActionButton variant="primary" :icon="IconUpload" disabled describedby="upload-reason">서류 올리기</ActionButton>
      </template>
    </PageHeader>

    <div class="stack">
      <!-- 서류 올리기 비활성 이유 (화면낭독기용) -->
      <span id="upload-reason" class="visually-hidden">파일 저장소가 연결되지 않아 서류 원본을 올릴 수 없습니다.</span>

      <div class="tile-grid">
        <StatTile label="보유 서류" :value="count(heldCount)" :icon="IconFolder" />
        <StatTile label="유효기간 임박" :value="count(expiringCount)" :icon="IconClock" tone="accent" hint="30일 안에 끝나거나 만료 예정" />
        <StatTile label="사업과 연결된 서류" :value="count(linkedCount)" :icon="IconLink" tone="secondary" />
      </div>

      <SectionCard title="내 서류" heading-id="doc-records-title" :icon="IconFolder" flush>
        <EmptyState
          v-if="!hasDocuments"
          :icon="IconFolder"
          title="등록된 서류가 없습니다"
          description="파일 저장소가 연결되면 서류를 올리고, 공고의 제출 서류와 연결해 보여 드립니다."
          compact
          :level="3"
        />
        <div v-else class="scroll-x">
          <table class="data-table doc-table">
            <caption class="visually-hidden">내 서류 기록</caption>
            <thead>
              <tr>
                <th scope="col">서류</th>
                <th scope="col">상태</th>
                <th scope="col">발급일</th>
                <th scope="col">유효기간</th>
                <th scope="col">연결된 사업</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="document in documents" :key="document.id">
                <th scope="row">
                  <span class="doc-table__title">{{ document.title }}</span>
                  <span class="doc-table__type">{{ optionLabel(DOCUMENT_TYPE_OPTIONS, document.type) }}</span>
                  <span v-if="document.note" class="doc-table__note">{{ document.note }}</span>
                </th>
                <td><StatusBadge :label="DOCUMENT_STATUS_LABEL[document.status]" :tone="STATUS_TONE[document.status]" size="sm" /></td>
                <td><DataValue :value="document.issuedOn" :format="formatDateCompact" /></td>
                <td><DataValue :value="document.expiresAt" :format="formatDateCompact" missing-label="유효기간 없음" /></td>
                <td>
                  <ul v-if="document.linkedProgramIds.length > 0" class="doc-table__links">
                    <li v-for="id in document.linkedProgramIds" :key="id">
                      <RouterLink :to="{ name: 'program-detail', params: { id } }">
                        {{ programTitleText(programs.get(id) ?? null) ?? id }}
                      </RouterLink>
                    </li>
                  </ul>
                  <DataValue v-else :value="null" missing-label="연결된 사업 없음" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="서류 유형"
        heading-id="doc-types-title"
        description="자주 쓰는 서류 유형과 내 서류 기록입니다."
        :icon="IconFileCertificate"
        flush
      >
        <div class="scroll-x">
          <table class="data-table doc-table">
            <caption class="visually-hidden">서류 유형별 보유 현황</caption>
            <thead>
              <tr>
                <th scope="col">서류 유형</th>
                <th scope="col">설명</th>
                <th scope="col">내 서류</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="type in DOCUMENT_TYPE_OPTIONS" :key="type.value">
                <th scope="row">{{ type.label }}</th>
                <td class="doc-table__desc">{{ type.description }}</td>
                <td>
                  <template v-if="documentsOfType(type.value).length > 0">
                    <span v-for="document in documentsOfType(type.value)" :key="document.id" class="doc-table__owned">
                      {{ document.title }} · {{ DOCUMENT_STATUS_LABEL[document.status] }}
                    </span>
                  </template>
                  <DataValue v-else :value="null" missing-label="보유 정보 없음" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  </div>
</template>

<style scoped>
.doc-table {
  min-width: 640px;
}

.doc-table th[scope='col']:first-child,
.doc-table tbody th {
  padding-left: var(--card-padding);
}

.doc-table__title {
  display: block;
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.doc-table__type,
.doc-table__note {
  display: block;
  font-size: var(--fs-xs);
  font-weight: var(--fw-regular);
  color: var(--color-text-muted);
}

.doc-table__desc {
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.doc-table__links {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-sm);
}

.doc-table__owned {
  display: block;
  font-size: var(--fs-sm);
}
</style>

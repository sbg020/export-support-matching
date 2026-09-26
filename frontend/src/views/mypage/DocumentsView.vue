<script setup lang="ts">
import { computed } from 'vue'
import { IconClock, IconFileCertificate, IconFolder, IconLink, IconUpload } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatTile from '@/components/common/StatTile.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import DataValue from '@/components/common/DataValue.vue'
import ActionButton from '@/components/common/ActionButton.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import { DOCUMENT_TYPE_OPTIONS } from '@/constants/options'
import { DOCUMENT_STORAGE_CONNECTED, useTrackingStore } from '@/stores/trackingStore'

const tracking = useTrackingStore()
/** 저장소가 연결되기 전에는 보유 현황을 표시하지 않는다. */
const ownedCount = computed(() =>
  DOCUMENT_STORAGE_CONNECTED && tracking.state.documents.length > 0 ? `${tracking.state.documents.length}건` : null,
)
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
      <NoticeBanner tone="warning" title="파일 업로드가 아직 연결되지 않았습니다">
        <p id="upload-reason">
          파일 저장소가 연결되지 않아 서류를 올리거나 보관할 수 없습니다. 서류 원본은 이 기기에도 저장하지 않습니다.
        </p>
      </NoticeBanner>

      <div class="tile-grid">
        <StatTile label="보유 서류" :value="ownedCount" :icon="IconFolder" />
        <StatTile label="유효기간 임박" :value="null" :icon="IconClock" tone="accent" />
        <StatTile label="사업과 연결된 서류" :value="null" :icon="IconLink" tone="secondary" />
      </div>

      <SectionCard
        title="서류 유형"
        heading-id="doc-types-title"
        description="아래는 자주 쓰는 서류 유형 안내입니다. 보유한 서류로 표시하지 않습니다."
        :icon="IconFileCertificate"
        flush
      >
        <div class="scroll-x">
          <table class="data-table doc-table">
            <caption class="visually-hidden">서류 유형별 보유·연결 현황</caption>
            <thead>
              <tr>
                <th scope="col">서류 유형</th>
                <th scope="col">설명</th>
                <th scope="col">보유 문서</th>
                <th scope="col">유효기간</th>
                <th scope="col">필요한 사업</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="type in DOCUMENT_TYPE_OPTIONS" :key="type.value">
                <th scope="row">{{ type.label }}</th>
                <td class="doc-table__desc">{{ type.description }}</td>
                <td><DataValue :value="null" missing-label="보유 정보 없음" /></td>
                <td><DataValue :value="null" /></td>
                <td><DataValue :value="null" missing-label="연결된 사업 없음" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <template #footer>
          <DisabledReason id="doc-link-reason" class="mt-0">
            필요한 사업은 공고의 필요서류가 등록되면 자동으로 연결해 보여 드립니다.
          </DisabledReason>
        </template>
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

.doc-table__desc {
  font-size: var(--fs-sm);
  color: var(--color-text);
}
</style>

<script setup lang="ts">
/**
 * 관심·준비 중·신청완료 사업 — 상태별 탭 하나의 관리 화면.
 * 탭은 URL ?tab=interested|preparing|applied 와 동기화한다.
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import TabNav from '@/components/common/TabNav.vue'
import type { TabItem } from '@/components/common/types'
import InterestedPanel from '@/components/mypage/InterestedPanel.vue'
import PreparingPanel from '@/components/mypage/PreparingPanel.vue'
import AppliedPanel from '@/components/mypage/AppliedPanel.vue'
import { APPLICATION_TABS, isApplicationTab, type ApplicationTab } from '@/constants/applicationStatus'
import { useApplicationStore } from '@/stores/applicationStore'

const route = useRoute()
const router = useRouter()
const applications = useApplicationStore()

const tab = computed<ApplicationTab>({
  get: () => (isApplicationTab(route.query.tab) ? route.query.tab : 'interested'),
  set: (next) => {
    void router.replace({ query: { ...route.query, tab: next } })
  },
})

/** 실제 기록이 없으면 건수는 '-' */
const tabs = computed<TabItem<ApplicationTab>[]>(() =>
  APPLICATION_TABS.map((item) => ({
    key: item.key,
    label: item.label,
    count: applications.records.value.length > 0 ? applications.byTab(item.key).length : null,
  })),
)
</script>

<template>
  <div class="page">
    <PageHeader
      title="관심·준비 중·신청완료 사업"
      description="저장한 사업을 상태별로 관리합니다. 기록은 이 기기에만 저장됩니다."
    />

    <div class="stack">
      <TabNav v-model="tab" :tabs="tabs" label="관리 상태" id-prefix="my-programs" />
      <div id="my-programs-panel" role="tabpanel" :aria-labelledby="`my-programs-tab-${tab}`">
        <InterestedPanel v-if="tab === 'interested'" />
        <PreparingPanel v-else-if="tab === 'preparing'" />
        <AppliedPanel v-else />
      </div>
    </div>
  </div>
</template>

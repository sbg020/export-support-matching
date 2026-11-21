<script setup lang="ts">
/**
 * 관리자 홈 (REVISION_04 §7). 저장소가 연결되기 전에는 수치가 모두 '-'이고 목록은 빈 상태다.
 * 참고 화면의 '관심 저장 n개 기업' 열은 넣지 않는다 (관심 기록은 각 사용자 브라우저에만 있어 집계할 수 없다).
 */
import { computed, onMounted, shallowRef } from 'vue'
import { IconAlertTriangle, IconArrowRight, IconClipboardCheck, IconClockHour4, IconDownload } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import StatTile from '@/components/common/StatTile.vue'
import DataValue from '@/components/common/DataValue.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import StoreButton from '@/components/admin/StoreButton.vue'
import { ADMIN_PIPELINE_STEPS, adminSourceLabel } from '@/constants/adminOptions'
import { formatDateTime } from '@/lib/display'
import { adminRepository } from '@/repositories/admin'
import type { AdminDashboard, AdminNoticeSummary, CollectionRun } from '@/types/admin'

const dashboard = shallowRef<AdminDashboard | null>(null)
const pending = shallowRef<AdminNoticeSummary[]>([])
const runs = shallowRef<CollectionRun[]>([])

onMounted(async () => {
  dashboard.value = await adminRepository.getDashboard()
  pending.value = (await adminRepository.listReviewQueue()).slice(0, 5)
  runs.value = await adminRepository.listCollectionRuns()
})

const countFormat = (n: number) => `${n}건`
const today = computed(() => dashboard.value?.todayCollected ?? null)
const todayTotal = computed(() => (today.value ? today.value.bizinfo + today.value.kotra : null))
const todayHint = computed(() =>
  today.value ? `기업마당 ${today.value.bizinfo} · KOTRA ${today.value.kotra}` : '기업마당 - · KOTRA -',
)
const unresolvedErrors = computed(() =>
  runs.value.flatMap((run) => run.errors.filter((e) => !e.resolved).map((e) => ({ run, error: e }))),
)
/** 마감 임박 목록 (저장소 연결 후 게시 중이고 마감 7일 이내). 지금은 빈 목록 */
const closingSoon = shallowRef<AdminNoticeSummary[]>([])

function pipelineCount(key: (typeof ADMIN_PIPELINE_STEPS)[number]['key']): number | null {
  return dashboard.value?.pipeline?.[key] ?? null
}
</script>

<template>
  <div class="page">
    <PageHeader title="관리자 홈" description="오늘 수집한 공고와 검수할 일을 한눈에 확인합니다.">
      <template #meta>
        <span class="fs-sm text-muted-strong">집계 시각</span>
        <strong class="text-heading"><DataValue :value="dashboard?.asOf ?? null" :format="formatDateTime" /></strong>
      </template>
    </PageHeader>

    <div class="stack">
      <div class="tile-grid">
        <StatTile
          label="오늘 수집 건수"
          :value="todayTotal !== null ? countFormat(todayTotal) : null"
          :icon="IconDownload"
          :hint="todayHint"
          :to="{ name: 'admin-bizinfo' }"
        />
        <StatTile
          class="admin-home__focus"
          label="검수 대기"
          :value="dashboard?.pendingReview != null ? countFormat(dashboard.pendingReview) : null"
          :icon="IconClipboardCheck"
          tone="accent"
          :hint="dashboard?.oldestPendingCollectedAt ? `가장 오래된 건 ${formatDateTime(dashboard.oldestPendingCollectedAt)} 수집` : '가장 오래된 건 -'"
          :to="{ name: 'admin-review' }"
        />
        <StatTile
          label="마감 임박 (7일 이내)"
          :value="dashboard?.closingSoon != null ? countFormat(dashboard.closingSoon) : null"
          :icon="IconClockHour4"
          tone="secondary"
          hint="게시 중인 공고 기준"
          :to="{ name: 'admin-notices', query: { status: 'published' } }"
        />
        <StatTile
          label="수집 오류"
          :value="dashboard?.collectionErrors != null ? countFormat(dashboard.collectionErrors) : null"
          :icon="IconAlertTriangle"
          tone="neutral"
          :hint="unresolvedErrors[0]?.error.message ?? '마지막 오류 -'"
          :to="{ name: 'admin-bizinfo' }"
        />
      </div>

      <SectionCard
        title="공고 데이터 흐름"
        heading-id="admin-pipeline-title"
        description="사용자는 관리자가 승인한 공고만 봅니다. 단계별 현재 건수입니다."
      >
        <ol class="pipeline">
          <li
            v-for="(step, index) in ADMIN_PIPELINE_STEPS"
            :key="step.key"
            class="pipeline__step"
            :class="{ 'is-highlight': 'highlight' in step }"
          >
            <p class="pipeline__num">{{ index + 1 }}단계</p>
            <p class="pipeline__name">
              {{ step.label }}
              <span v-if="'highlight' in step" class="pipeline__tag">사용자에게 보이기 전 확인</span>
            </p>
            <p class="pipeline__desc">{{ step.description }}</p>
            <p class="pipeline__count">
              {{ step.countLabel }} <strong><DataValue :value="pipelineCount(step.key)" :format="countFormat" /></strong>
            </p>
            <span v-if="index < ADMIN_PIPELINE_STEPS.length - 1" class="pipeline__arrow" aria-hidden="true">
              <IconArrowRight :size="18" stroke-width="2" />
            </span>
          </li>
        </ol>
      </SectionCard>

      <div class="grid-12">
        <SectionCard class="col-span-12 lg-span-6" title="검수 대기" heading-id="admin-pending-title" description="최근 5건">
          <template #actions>
            <RouterLink :to="{ name: 'admin-review' }" class="btn btn-ghost btn-sm">전체 검수하기</RouterLink>
          </template>
          <AdminTable label="검수 대기 최근 5건" :columns="['공고', '출처', '수집일']" :row-count="pending.length" empty-title="검수 대기 공고가 없습니다">
            <tr v-for="notice in pending" :key="notice.id">
              <th scope="row"><DataValue :value="notice.title" missing-label="공고명 없음" /></th>
              <td>{{ adminSourceLabel(notice.source) }}</td>
              <td>{{ formatDateTime(notice.collectedAt) }}</td>
            </tr>
          </AdminTable>
        </SectionCard>
        <SectionCard class="col-span-12 lg-span-6" title="마감 임박" heading-id="admin-closing-title" description="게시 중이고 마감이 7일 이내인 공고">
          <template #actions>
            <RouterLink :to="{ name: 'admin-notices', query: { status: 'published' } }" class="btn btn-ghost btn-sm">
              공고 관리로
            </RouterLink>
          </template>
          <AdminTable label="마감 임박 공고" :columns="['공고', '마감', '출처']" :row-count="closingSoon.length">
            <tr v-for="notice in closingSoon" :key="notice.id">
              <th scope="row"><DataValue :value="notice.title" missing-label="공고명 없음" /></th>
              <td><DataValue :value="notice.applyEnd" :format="formatDateTime" /></td>
              <td>{{ adminSourceLabel(notice.source) }}</td>
            </tr>
          </AdminTable>
        </SectionCard>
      </div>

      <SectionCard title="수집 오류" heading-id="admin-errors-title">
        <AdminTable
          label="수집 오류"
          :columns="['일시', '출처', '내용', '상태', '동작']"
          :row-count="unresolvedErrors.length"
          empty-title="수집 오류가 없습니다"
        >
          <tr v-for="({ run, error }, index) in unresolvedErrors" :key="`${run.id}-${index}`">
            <td>{{ formatDateTime(run.startedAt) }}</td>
            <td>기업마당</td>
            <td>{{ error.message }}</td>
            <td>해결 전</td>
            <td><StoreButton label="다시 수집" size="sm" quiet-reason /></td>
          </tr>
        </AdminTable>
      </SectionCard>
    </div>
  </div>
</template>

<style scoped>
/* 검수 대기 지표는 테두리를 강조한다 */
.admin-home__focus {
  border: 2px solid var(--color-primary-strong);
}

.pipeline {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.pipeline__step {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.pipeline__step.is-highlight {
  border: 2px solid var(--color-primary-strong);
  background: var(--color-primary-soft);
}

.pipeline__num {
  margin: 0;
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-text-muted);
}

.pipeline__name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.pipeline__tag {
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--color-primary-strong);
}

.pipeline__desc {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.pipeline__count {
  margin: var(--space-2) 0 0;
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.pipeline__count strong {
  margin-left: 4px;
  font-size: var(--fs-md);
  color: var(--color-heading);
}

.pipeline__arrow {
  position: absolute;
  top: 50%;
  right: calc(var(--space-5) * -1);
  display: flex;
  justify-content: center;
  width: var(--space-5);
  transform: translateY(-50%);
  color: var(--color-text-muted);
}

@media (max-width: 991.98px) {
  .pipeline {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
  }
  .pipeline__arrow {
    top: auto;
    right: auto;
    bottom: calc(var(--space-4) * -1);
    left: 50%;
    width: auto;
    transform: translate(-50%, 0) rotate(90deg);
  }
}
</style>

<script setup lang="ts">
/**
 * 데이터 출처 안내 (REVISION_02 §3.6).
 * 테스트 데이터셋을 쓰는 동안 제목 아래 한 줄로 출처·건수·기준일·검수 전 초안임을 알린다.
 * 숫자와 날짜는 데이터셋 meta에서 읽는다(하드코딩 금지). 데이터가 연결되지 않았으면 그리지 않는다.
 */
import { computed, ref, useId } from 'vue'
import { IconChevronDown, IconFlask } from '@tabler/icons-vue'
import { programRepository, type DataSourceStatus } from '@/repositories'
import { DATA_STATE_LABEL } from '@/constants/options'

/** 기본은 앱의 공고 저장소. 테스트에서만 다른 상태를 넘긴다 */
const props = defineProps<{ status?: DataSourceStatus }>()
const source = computed(() => props.status ?? programRepository.source)
const open = ref(false)
const detailId = `${useId()}-detail`
</script>

<template>
  <aside v-if="source.kind === 'test-dataset'" class="data-source" aria-label="데이터 출처">
    <p class="data-source__line">
      <IconFlask :size="16" stroke-width="2" aria-hidden="true" />
      <span>
        테스트 데이터 · 기업마당 수출지원 공고 {{ source.announcementCount }}건({{ DATA_STATE_LABEL[source.dataState] }}) ·
        기준일 {{ source.asOf }}
      </span>
      <button
        type="button"
        class="data-source__toggle"
        :aria-expanded="open"
        :aria-controls="detailId"
        @click="open = !open"
      >
        자세히
        <IconChevronDown :size="14" stroke-width="2" aria-hidden="true" :class="{ 'is-open': open }" />
      </button>
    </p>
    <p v-show="open" :id="detailId" class="data-source__detail">
      공고 원문에서 정리한 초안이며 사람 검수 전입니다. 자격 판정과 적합도는 이 초안으로 계산한 시험 결과입니다. 실제 신청
      전에는 반드시 공고 원문을 확인하세요.
      <span class="data-source__version">데이터 버전 {{ source.datasetVersion }} · 공고 행 {{ source.programCount }}개(세부사업 포함)</span>
    </p>
  </aside>
</template>

<style scoped>
.data-source {
  padding: var(--space-2) var(--space-3);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.data-source__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.data-source__line > svg {
  color: var(--color-accent-strong);
}

.data-source__toggle {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary-strong);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
  cursor: pointer;
}

.data-source__toggle svg {
  transition: transform 0.2s ease;
}

.data-source__toggle svg.is-open {
  transform: rotate(180deg);
}

.data-source__detail {
  margin: var(--space-2) 0 0;
  line-height: 1.6;
}

.data-source__version {
  display: block;
  margin-top: 4px;
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}
</style>

<script setup lang="ts">
/**
 * 기준·설정 (REVISION_04 §12). 코드에 있는 실제 기준을 상수에서 읽어 보여 준다(숫자를 화면 코드에 다시 적지 않는다).
 * 편집 칸은 입력·검증까지만 동작하고 저장은 저장소 연결 후에 켜진다.
 */
import { computed, reactive, ref, useId } from 'vue'
import { IconDownload } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import ExportStageCriteriaNote from '@/components/diagnose/ExportStageCriteriaNote.vue'
import AdminStoreNotice from '@/components/admin/AdminStoreNotice.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import StoreButton from '@/components/admin/StoreButton.vue'
import { ACTIVE_EXPORT_STAGE_CRITERIA, bandText } from '@/lib/engine/diagnosis'
import { ACTIVE_FIT_CRITERIA, FIT_FACTOR_LABEL } from '@/lib/engine/fit'
import {
  CATEGORY_PHASES,
  CATEGORY_PHASE_VERSION,
  STAGE_PHASE_VERSION,
  STAGE_PHASE_WEIGHTS,
  SUPPORT_CATEGORIES,
  SUPPORT_STAGE_ORDER,
} from '@/constants/categories'
import { COMMON_CHECK_KEY_LABEL, EXPORT_STAGE_OPTIONS, STAGE_OPTIONS, optionLabel } from '@/constants/options'
import { exportStageText } from '@/lib/programDisplay'
import { FIT_WEIGHT_STEP, STRATEGY_COLUMNS, STRATEGY_TEMPLATE_FILE_NAME, buildStrategyTemplateCsv, checkFitWeights } from '@/lib/admin/settings'
import { downloadTextFile } from '@/lib/admin/download'
import { dataBasisDate, programRepository } from '@/repositories'
import type { CommonCheckKey } from '@/types/program'
import type { FitFactorKey } from '@/types/results'

const uid = useId()

/* 12.1 기준 시점 */
const basisDate = dataBasisDate(programRepository.source)
const basisMode = ref<'fixed' | 'daily-kst'>('fixed')
const fixedDate = ref('')
const exportYear = computed(() =>
  basisDate ? Number(basisDate.slice(0, 4)) - 1 : ACTIVE_EXPORT_STAGE_CRITERIA.programYear - 1,
)

/* 12.3 적합도 가중치 */
const criteria = ACTIVE_FIT_CRITERIA
const FIT_KEYS = Object.keys(criteria.weights) as FitFactorKey[]
const weights = reactive<Record<FitFactorKey, number | null>>({ ...criteria.weights })
const weightCheck = computed(() => checkFitWeights({ ...weights }))
function onWeightInput(key: FitFactorKey, event: Event) {
  const raw = (event.target as HTMLInputElement).value
  weights[key] = raw.trim() === '' ? null : Number(raw)
}
const weightStatus = criteria.status === 'hypothesis' ? '검증 전 가설' : '확정'
const STAGE_SYMBOL = (value: number) => (value === 1 ? '◎ 1' : value === 0.5 ? '○ 0.5' : `· ${value}`)
const stageLabel = (value: (typeof SUPPORT_STAGE_ORDER)[number]) => optionLabel(STAGE_OPTIONS, value) ?? value

/* 12.4 제외코드 */
const CHECK_KEYS = Object.keys(COMMON_CHECK_KEY_LABEL) as CommonCheckKey[]

function downloadStrategyTemplate() {
  downloadTextFile(STRATEGY_TEMPLATE_FILE_NAME, buildStrategyTemplateCsv())
}
</script>

<template>
  <div class="page">
    <PageHeader
      title="기준·설정"
      description="수출단계 판정, 공고 분류, 적합도 계산에 쓰는 기준을 확인합니다. 바꾼 기준은 저장한 뒤 다음 계산부터 적용됩니다."
    />

    <div class="stack">
      <AdminStoreNotice />

      <SectionCard title="기준 시점" heading-id="settings-basis-title">
        <InfoList>
          <InfoRow label="판정 기준일" :value="basisDate" hint="접수 상태·남은 일수·업력 계산에 쓰입니다. 공고 데이터 연결 후 표시" />
          <InfoRow label="수출실적 기준 연도" :value="`${exportYear}년 (판정 기준일의 직전 연도)`" :hint="basisDate ? undefined : '기준일이 없어 기준표 연도에서 1을 뺐습니다'" />
          <InfoRow label="기준 마지막 변경" :value="null" hint="저장소 연결 후 일시·계정" />
        </InfoList>
        <fieldset class="basis-mode mt-4">
          <legend class="form-label">기준일 정하는 방식</legend>
          <div class="form-check">
            <input :id="`${uid}-fixed`" v-model="basisMode" class="form-check-input" type="radio" value="fixed" :name="`${uid}-mode`" />
            <label class="form-check-label" :for="`${uid}-fixed`">고정 날짜</label>
          </div>
          <div class="form-check">
            <input :id="`${uid}-daily`" v-model="basisMode" class="form-check-input" type="radio" value="daily-kst" :name="`${uid}-mode`" />
            <label class="form-check-label" :for="`${uid}-daily`">매일 자동 (한국 시간 오늘)</label>
          </div>
          <div v-if="basisMode === 'fixed'" class="basis-mode__date">
            <label :for="`${uid}-date`" class="form-label">고정 날짜</label>
            <input :id="`${uid}-date`" v-model="fixedDate" type="date" class="form-control" />
          </div>
          <p class="form-hint">
            시스템 날짜를 기준일로 쓰려면 '매일 자동'을 고르세요. 어느 방식이든 화면에 기준일을 함께 표시합니다.
          </p>
        </fieldset>
        <div class="mt-3"><StoreButton label="기준 저장" /></div>
      </SectionCard>

      <SectionCard title="수출단계 기준" :heading-id="`${uid}-stage-title`" :description="`${ACTIVE_EXPORT_STAGE_CRITERIA.version} · 읽기 전용`">
        <AdminTable label="수출단계 기준 구간" :columns="['단계', '전년도 수출액(달러) 구간', '상태']" :row-count="ACTIVE_EXPORT_STAGE_CRITERIA.bands.length">
          <tr v-for="band in ACTIVE_EXPORT_STAGE_CRITERIA.bands" :key="band.stage">
            <th scope="row">{{ exportStageText(band.stage) }}</th>
            <td>{{ bandText(band) }}</td>
            <td>
              <StatusBadge label="확인됨" tone="success" size="sm" />
              <span class="fs-sm ms-2">확인일 {{ ACTIVE_EXPORT_STAGE_CRITERIA.verifiedAt }}</span>
            </td>
          </tr>
        </AdminTable>
        <ExportStageCriteriaNote class="mt-3" />
      </SectionCard>

      <SectionCard
        title="적합도 가중치"
        heading-id="settings-fit-title"
        :description="`기준 버전 ${criteria.version} · 상태 ${weightStatus} · 가점·감점 보정 상한 ±${criteria.bonusCap}점`"
      >
        <AdminTable label="적합도 가중치" :columns="['항목', '현재 가중치', '바꿀 가중치']" :row-count="FIT_KEYS.length">
          <tr v-for="key in FIT_KEYS" :key="key">
            <th scope="row">{{ FIT_FACTOR_LABEL[key] }}</th>
            <td>{{ criteria.weights[key].toFixed(2) }}</td>
            <td>
              <label :for="`${uid}-w-${key}`" class="visually-hidden">{{ FIT_FACTOR_LABEL[key] }} 가중치</label>
              <input
                :id="`${uid}-w-${key}`"
                class="form-control form-control-sm weight-input"
                type="number"
                min="0"
                max="1"
                :step="FIT_WEIGHT_STEP"
                :value="weights[key] ?? ''"
                :aria-invalid="weightCheck.fieldErrors[key] ? 'true' : undefined"
                :aria-describedby="weightCheck.fieldErrors[key] ? `${uid}-w-${key}-error` : undefined"
                @input="onWeightInput(key, $event)"
              />
              <p v-if="weightCheck.fieldErrors[key]" :id="`${uid}-w-${key}-error`" class="form-error">
                {{ weightCheck.fieldErrors[key] }}
              </p>
            </td>
          </tr>
        </AdminTable>
        <p class="weight-sum" role="status">
          합계 <strong>{{ weightCheck.sum === null ? '-' : weightCheck.sum.toFixed(2) }}</strong>
          <span v-if="weightCheck.sumError" class="weight-sum__error">{{ weightCheck.sumError }}</span>
        </p>
        <StoreButton
          label="가중치 저장"
          :blocked="!weightCheck.valid"
          :reason="
            weightCheck.valid
              ? '공고 저장소를 연결한 뒤 사용할 수 있습니다. 저장하면 새 버전으로 기록되고, 사람 평가 전까지 검증 전으로 표시됩니다.'
              : weightCheck.sumError ?? '입력한 가중치를 확인해 주세요.'
          "
        />

        <h3 class="settings-subtitle">단계 가중치 ({{ STAGE_PHASE_VERSION }}, 읽기 전용)</h3>
        <AdminTable
          label="단계 가중치: 수출단계 × 지원 단계"
          :columns="['수출단계', ...SUPPORT_STAGE_ORDER.map(stageLabel)]"
          :row-count="EXPORT_STAGE_OPTIONS.length"
        >
          <tr v-for="stage in EXPORT_STAGE_OPTIONS" :key="stage.value">
            <th scope="row">{{ stage.label }}</th>
            <td v-for="phase in SUPPORT_STAGE_ORDER" :key="phase">{{ STAGE_SYMBOL(STAGE_PHASE_WEIGHTS[stage.value][phase]) }}</td>
          </tr>
        </AdminTable>
        <p class="fs-sm text-muted-strong mt-2 mb-0">◎ 우선 · ○ 함께 보기 · 그 밖. 공고를 숨기지 않도록 0은 쓰지 않습니다.</p>

        <details class="settings-details mt-3">
          <summary>세부 분야 → 지원 단계 매핑 ({{ CATEGORY_PHASE_VERSION }}, 읽기 전용)</summary>
          <AdminTable label="세부 분야와 지원 단계" :columns="['세부 분야', '주 단계', '함께 걸치는 단계']" :row-count="SUPPORT_CATEGORIES.length">
            <tr v-for="category in SUPPORT_CATEGORIES" :key="category.code">
              <th scope="row">{{ category.code }} {{ category.name }}</th>
              <td>{{ stageLabel(CATEGORY_PHASES[category.code].primary) }}</td>
              <td>{{ CATEGORY_PHASES[category.code].also.map(stageLabel).join(', ') || '-' }}</td>
            </tr>
          </AdminTable>
        </details>
      </SectionCard>

      <SectionCard title="제외코드" heading-id="settings-exclusion-title">
        <AdminTable
          label="제외코드"
          :columns="['코드', '제외 조건', '판정에 쓰는 회사 정보', '연결된 규칙 수']"
          :row-count="CHECK_KEYS.length"
        >
          <tr v-for="key in CHECK_KEYS" :key="key">
            <td><code>{{ key }}</code></td>
            <th scope="row">{{ COMMON_CHECK_KEY_LABEL[key] }}</th>
            <td>공통 확인 사항 — 기업이 직접 답함</td>
            <td>-</td>
          </tr>
        </AdminTable>
        <p class="fs-sm mt-3 mb-0">
          공통 확인으로 덮이지 않는 제외 조건(예: 4대보험 미납)은 공고별 직접 확인으로 판정합니다. 업종 제외 같은 조건은 각
          공고의 자격 규칙으로 판정합니다. 연결된 규칙 수는 공고 데이터 연결 후 표시합니다.
        </p>
      </SectionCard>

      <SectionCard
        title="키워드 사전"
        heading-id="settings-keywords-title"
        description="기업마당에서 수집한 공고의 제목·본문 단어를 지원 분야로 분류(자동 추출 초안)하고, 수출 분야 필터에 쓸 키워드입니다."
      >
        <template #actions>
          <StoreButton label="키워드 추가" size="sm" />
        </template>
        <AdminTable label="키워드 사전" :columns="['지원 분야', '키워드', '연결된 공고']" :row-count="SUPPORT_CATEGORIES.length">
          <tr v-for="category in SUPPORT_CATEGORIES" :key="category.code">
            <th scope="row">{{ category.code }} {{ category.name }}</th>
            <td>-</td>
            <td>-</td>
          </tr>
        </AdminTable>
      </SectionCard>

      <SectionCard
        title="19개 전략표"
        heading-id="settings-strategy-title"
        description="적합도·로드맵 계산에는 아직 연결하지 않습니다. 재무 군집 전략(A~D)과는 다른 표입니다."
      >
        <template #actions>
          <div class="action-row">
            <button type="button" class="btn btn-secondary btn-sm" @click="downloadStrategyTemplate">
              <IconDownload :size="16" stroke-width="2" aria-hidden="true" />
              표 내려받기
            </button>
            <StoreButton label="전략 추가" size="sm" />
          </div>
        </template>
        <AdminTable
          label="19개 전략표"
          :columns="STRATEGY_COLUMNS"
          :row-count="0"
          empty-title="전략표가 아직 입력되지 않았습니다."
          empty-description="19개 전략의 이름·추천 경로·연결 분야가 확정되면 입력합니다."
        />
      </SectionCard>
    </div>
  </div>
</template>

<style scoped>
.basis-mode {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  border: 0;
}

.basis-mode__date {
  max-width: 240px;
}

.weight-input {
  max-width: 120px;
}

.weight-sum {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
  margin: var(--space-3) 0;
}

.weight-sum__error {
  font-size: var(--fs-sm);
  color: var(--color-danger-strong);
}

.settings-subtitle {
  margin: var(--space-6) 0 var(--space-3);
  font-size: var(--fs-md);
}

.settings-details summary {
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
  cursor: pointer;
}

.settings-details[open] summary {
  margin-bottom: var(--space-3);
}
</style>

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
import AdminTable from '@/components/admin/AdminTable.vue'
import StoreButton from '@/components/admin/StoreButton.vue'
import { ACTIVE_EXPORT_STAGE_CRITERIA, bandText } from '@/lib/engine/diagnosis'
import {
  ARCHETYPE_CATEGORY,
  ARCHETYPE_GUIDE,
  FINANCE_ASSUMPTION_NOTE,
  FIT_V1_LABEL,
  FIT_V1_MAPPING_VERSIONS,
  FIT_V1_STATUS_LABEL,
  FIT_V1_VERSION,
  FIT_V1_WEIGHTS,
  STAGE_CATEGORY_MATRIX,
  type Archetype,
  type FitV1FactorKey,
} from '@/constants/fitV1'
import { CONDITION_TYPE_NAME } from '@/constants/conditionTypes'
import { ARCHETYPE_REFERENCE } from '@/lib/engine/archetypeReference'
import { defaultImportance } from '@/lib/engine/eligibilityV3'
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

const uid = useId()

/* 12.1 기준 시점 */
const basisDate = dataBasisDate(programRepository.source)
const basisMode = ref<'fixed' | 'daily-kst'>('fixed')
const fixedDate = ref('')
const exportYear = computed(() =>
  basisDate ? Number(basisDate.slice(0, 4)) - 1 : ACTIVE_EXPORT_STAGE_CRITERIA.programYear - 1,
)

/* 적합도 가중치 v1 (REVISION_05 §6.4) */
const FIT_KEYS = Object.keys(FIT_V1_WEIGHTS) as FitV1FactorKey[]
const weights = reactive<Record<FitV1FactorKey, number | null>>({ ...FIT_V1_WEIGHTS })
const weightCheck = computed(() => checkFitWeights({ ...weights }))
function onWeightInput(key: FitV1FactorKey, event: Event) {
  const raw = (event.target as HTMLInputElement).value
  weights[key] = raw.trim() === '' ? null : Number(raw)
}
const ARCHETYPES = Object.keys(ARCHETYPE_CATEGORY) as Archetype[]
/** 기준표 v4: 수출단계별 군집 수·안정성·군집 이름 */
const archetypeStages = Object.entries(ARCHETYPE_REFERENCE.stages).map(([stage, t]) => ({
  stage,
  label: t.stageLabel,
  k: t.k,
  stability: t.stability,
  clusters: t.clusters.map((c) => `${c.name} (${c.archetype})`).join(' · '),
}))
const TYPE_CODES = Object.keys(CONDITION_TYPE_NAME)
const archetypeCell = (a: Archetype, code: (typeof SUPPORT_CATEGORIES)[number]['code']) =>
  ARCHETYPE_CATEGORY[a].core.includes(code) ? '핵심 1.0' : ARCHETYPE_CATEGORY[a].support.includes(code) ? '보조 0.6' : '0.3'
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
        :description="`가중치 버전 ${FIT_V1_VERSION} · ${FIT_V1_STATUS_LABEL} · 4개 요소 각 25% (가점 요소 삭제)`"
      >
        <AdminTable label="적합도 가중치" :columns="['항목', '현재 가중치', '바꿀 가중치']" :row-count="FIT_KEYS.length">
          <tr v-for="key in FIT_KEYS" :key="key">
            <th scope="row">{{ FIT_V1_LABEL[key] }}</th>
            <td>{{ FIT_V1_WEIGHTS[key].toFixed(2) }}</td>
            <td>
              <label :for="`${uid}-w-${key}`" class="visually-hidden">{{ FIT_V1_LABEL[key] }} 가중치</label>
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

        <p class="fs-sm text-muted-strong mt-2 mb-0">{{ FINANCE_ASSUMPTION_NOTE }}</p>

        <h3 class="settings-subtitle">수출단계 × 사업 분류 매칭표 ({{ FIT_V1_MAPPING_VERSIONS[0] }})</h3>
        <AdminTable
          label="수출단계 × 사업 분류 매칭표"
          :columns="['사업 분류', ...EXPORT_STAGE_OPTIONS.map((o) => o.label)]"
          :row-count="SUPPORT_CATEGORIES.length"
        >
          <tr v-for="category in SUPPORT_CATEGORIES" :key="category.code">
            <th scope="row">{{ category.code }} {{ category.name }}</th>
            <td v-for="stage in EXPORT_STAGE_OPTIONS" :key="stage.value">{{ STAGE_CATEGORY_MATRIX[category.code][stage.value] }}</td>
          </tr>
        </AdminTable>
        <p class="fs-sm text-muted-strong mt-2 mb-0">◎ 핵심 1.0 · ○ 권장 0.6 · △ 선택 0.3. 공고 분류가 여러 개면 가장 높은 값을 씁니다.</p>

        <h3 class="settings-subtitle">재무 원형 × 사업 분류 매칭표 ({{ FIT_V1_MAPPING_VERSIONS[1] }})</h3>
        <AdminTable
          label="재무 원형 × 사업 분류 매칭표"
          :columns="['사업 분류', ...ARCHETYPES]"
          :row-count="SUPPORT_CATEGORIES.length"
        >
          <tr v-for="category in SUPPORT_CATEGORIES" :key="category.code">
            <th scope="row">{{ category.code }} {{ category.name }}</th>
            <td v-for="a in ARCHETYPES" :key="a">{{ archetypeCell(a, category.code) }}</td>
          </tr>
        </AdminTable>
        <details class="settings-details mt-3">
          <summary>재무 원형 설명표 (화면 안내용)</summary>
          <AdminTable label="재무 원형 설명" :columns="['원형', '특징', '주로 나타나는 단계', 'Higgins SGR 해석', '전략 방향', '주요 근거']" :row-count="ARCHETYPE_GUIDE.length">
            <tr v-for="g in ARCHETYPE_GUIDE" :key="g.name">
              <th scope="row">{{ g.name }}</th>
              <td>{{ g.feature }}</td>
              <td>{{ g.stages }}</td>
              <td>{{ g.sgr }}</td>
              <td>{{ g.strategy }}</td>
              <td>{{ g.basis }}</td>
            </tr>
          </AdminTable>
        </details>

        <h3 class="settings-subtitle">재무 원형 기준표 (수출단계별 군집)</h3>
        <p class="mb-2">
          상태:
          <StatusBadge :label="`등록됨 (${ARCHETYPE_REFERENCE.version})`" tone="success" />
          · {{ ARCHETYPE_REFERENCE.status }}
        </p>
        <p class="fs-sm text-muted-strong mb-2">
          4개 변수(매출액증가율·매출액영업이익률·부채비율·영업외수지)의 업종 내 백분위 → 수출단계별 표준화 → 단계별 군집 중심.
          출처: {{ ARCHETYPE_REFERENCE.source }}
        </p>
        <AdminTable
          label="수출단계별 재무 원형 군집"
          :columns="['수출단계', '군집 수', '안정성', '군집 (원형)']"
          :row-count="archetypeStages.length"
        >
          <tr v-for="row in archetypeStages" :key="row.stage">
            <th scope="row">{{ row.label }}</th>
            <td>{{ row.k }}</td>
            <td>{{ row.stability }}</td>
            <td>{{ row.clusters }}</td>
          </tr>
        </AdminTable>
        <p class="fs-sm text-muted-strong mt-2">
          사전분리(원형 없음): {{ ARCHETYPE_REFERENCE.specialRules.slice(1).map((r) => r.label).join(' · ') }}. 업종은 KSIC 중분류 →
          대분류 → 전체 순으로 비교합니다. 기준표는 코드에 넣어 두었고, 화면 등록은 서버 저장소 연결 후에 씁니다.
        </p>
        <StoreButton label="기준표 CSV 등록" reason="서버 저장소를 연결한 뒤 사용할 수 있습니다. 팀의 군집 분석 결과를 등록하면 버전과 변경자를 남깁니다." />

        <h3 class="settings-subtitle">단계 가중치 ({{ STAGE_PHASE_VERSION }}, 읽기 전용 · 적합도 v0 비교용)</h3>
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

      <SectionCard
        title="조건 유형별 기본 중요도"
        heading-id="settings-importance-title"
        description="3탭 분류에 쓰는 기본값입니다 (REVISION_05 §2.4). 주요 조건이 모름이면 '확인 필요', 체크리스트만 모름이면 '신청 가능'입니다."
      >
        <AdminTable label="조건 유형별 기본 중요도" :columns="['유형', '이름', '기본 중요도']" :row-count="TYPE_CODES.length">
          <tr v-for="code in TYPE_CODES" :key="code">
            <th scope="row">{{ code }}</th>
            <td>{{ CONDITION_TYPE_NAME[code] }}</td>
            <td>{{ defaultImportance(code) }}</td>
          </tr>
        </AdminTable>
        <StoreButton class="mt-3" label="중요도 저장" reason="서버 저장소를 연결한 뒤 사용할 수 있습니다. 변경은 버전과 변경자를 남깁니다." />
      </SectionCard>

      <SectionCard
        title="공개 API 키"
        heading-id="settings-api-keys-title"
        description="공개 API(/api/public/v1/*)는 X-API-Key 헤더로 인증합니다 (REVISION_05 §9)."
      >
        <p class="mb-2">
          지금은 서버 저장소가 없어 키를 서버 환경변수 <code>PUBLIC_API_KEYS</code>(쉼표로 여러 개)로 관리합니다. 화면에는 키 값을 보여 주지 않습니다.
          <RouterLink :to="{ name: 'developers' }">API 안내 보기</RouterLink>
        </p>
        <StoreButton label="키 발급" reason="서버 저장소를 연결한 뒤 화면에서 발급·폐기할 수 있습니다. 그 전에는 Vercel 환경변수에서 관리합니다." />
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
        description="적합도 계산에는 아직 연결하지 않습니다. 재무 군집 전략(A~D)과는 다른 표입니다."
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

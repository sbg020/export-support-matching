<script setup lang="ts">
/** 사용자가 입력한 기업정보 요약. 입력하지 않은 값은 '-'로 표시한다. */
import { computed } from 'vue'
import { IconPencil } from '@tabler/icons-vue'
import type { CompanyProfile, ProfileStepId } from '@/types/profile'
import { PROFILE_STEPS } from '@/constants/options'
import {
  formatDate,
  formatKrw,
  formatKrwReadable,
  formatPeriod,
  formatUsd,
  formatYearMonth,
} from '@/lib/display'
import {
  businessNumberText,
  certificationText,
  companyTypeText,
  countriesText,
  factoryText,
  hsStatusText,
  industryModeText,
  interestText,
  ipText,
  regionText,
} from '@/lib/profileDisplay'
import InfoList from '@/components/common/InfoList.vue'
import InfoRow from '@/components/common/InfoRow.vue'

const props = withDefaults(
  defineProps<{
    profile: CompanyProfile
    steps?: ProfileStepId[]
    editable?: boolean
    headingLevel?: 2 | 3
  }>(),
  { steps: () => [1, 2, 3, 4, 5, 6], editable: false, headingLevel: 3 },
)

const emit = defineEmits<{ edit: [step: ProfileStepId] }>()

const sections = computed(() => PROFILE_STEPS.filter((step) => props.steps.includes(step.id)))

const formatCount = (n: number) => `${new Intl.NumberFormat('ko-KR').format(n)}명`
const formatYear = (n: number) => `${n}년`
const exportPeriod = computed(() =>
  props.profile.exportPeriodStart === null && props.profile.exportPeriodEnd === null
    ? null
    : formatPeriod(props.profile.exportPeriodStart, props.profile.exportPeriodEnd, formatYearMonth),
)
</script>

<template>
  <div class="profile-summary">
    <section
      v-for="section in sections"
      :key="section.id"
      class="profile-summary__section"
      :aria-labelledby="`profile-summary-${section.id}`"
    >
      <header class="profile-summary__header">
        <component :is="`h${headingLevel}`" :id="`profile-summary-${section.id}`" class="profile-summary__title">
          <span class="profile-summary__num" aria-hidden="true">{{ section.id }}</span>
          {{ section.title }}
        </component>
        <button
          v-if="editable"
          type="button"
          class="btn btn-secondary btn-sm"
          :aria-label="`${section.title} 수정`"
          @click="emit('edit', section.id)"
        >
          <IconPencil :size="15" stroke-width="2" aria-hidden="true" />
          수정
        </button>
      </header>

      <InfoList v-if="section.id === 1" :columns="2">
        <InfoRow label="기업명" :value="profile.companyName" />
        <InfoRow
          label="사업자등록번호"
          :value="businessNumberText(profile)"
          hint="이 기기에 저장하지 않으며, 현재 화면에서만 보관합니다."
        />
        <InfoRow label="기업 형태" :value="companyTypeText(profile)" />
        <InfoRow label="설립일" :value="profile.foundedAt" :format="formatDate" />
        <InfoRow label="본사 소재지" :value="regionText(profile.hqRegion, profile.hqDistrict)" />
        <InfoRow label="공장" :value="factoryText(profile)" />
        <InfoRow label="종업원 수" :value="profile.employeeCount" :format="formatCount" />
      </InfoList>

      <InfoList v-else-if="section.id === 2" :columns="2">
        <InfoRow label="업종 입력 방식" :value="industryModeText(profile)" />
        <InfoRow label="KSIC 코드" :value="profile.ksicCode" />
        <InfoRow label="업종명" :value="profile.industryName" />
        <InfoRow
          label="최근 매출액"
          :value="profile.revenueKrw"
          :format="formatKrw"
          :hint="profile.revenueKrw !== null ? formatKrwReadable(profile.revenueKrw) : undefined"
        />
        <InfoRow label="매출액 기준연도" :value="profile.revenueYear" :format="formatYear" />
      </InfoList>

      <InfoList v-else-if="section.id === 3" :columns="2">
        <InfoRow label="최근 1년 수출액" :value="profile.exportUsdLastYear" :format="formatUsd" />
        <InfoRow label="측정 기간" :value="exportPeriod" />
        <InfoRow label="수출 대상 국가" :value="countriesText(profile)" />
      </InfoList>

      <InfoList v-else-if="section.id === 4" :columns="2">
        <InfoRow label="주력 제품명" :value="profile.productName" />
        <InfoRow label="HS 코드" :value="profile.hsCode" />
        <InfoRow label="HS 코드 상태" :value="hsStatusText(profile)" />
      </InfoList>

      <InfoList v-else-if="section.id === 5" :columns="2">
        <InfoRow
          label="기업 인증"
          :value="certificationText(profile)"
          :hint="profile.certificationStatus === null ? '아직 입력하지 않음' : undefined"
        />
        <InfoRow
          label="지식재산권"
          :value="ipText(profile)"
          :hint="profile.ipStatus === null ? '아직 입력하지 않음' : undefined"
        />
      </InfoList>

      <InfoList v-else-if="section.id === 6">
        <InfoRow label="관심 분야" :value="interestText(profile)" />
      </InfoList>
    </section>
  </div>
</template>

<style scoped>
.profile-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.profile-summary__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-1);
}

.profile-summary__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--fs-md);
}

.profile-summary__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  IconArrowRight,
  IconChecklist,
  IconCircleCheck,
  IconForms,
  IconInfoCircle,
  IconLayoutColumns,
  IconListDetails,
  IconScale,
  IconTargetArrow,
} from '@tabler/icons-vue'
import { NAV_SECTIONS } from '@/constants/navigation'
import { programRepository, createEmptyQuery } from '@/repositories'
import { useProfileStore } from '@/stores/profileStore'
import { formatNumber } from '@/lib/display'
import DataValue from '@/components/common/DataValue.vue'
import ProfileStatusBadge from '@/components/diagnose/ProfileStatusBadge.vue'

const store = useProfileStore()
const openCount = ref<number | null>(null)

onMounted(async () => {
  try {
    const result = await programRepository.list({ ...createEmptyQuery(), receptionStatuses: ['open'] })
    openCount.value = result.total
  } catch {
    openCount.value = null
  }
})

/** 추천 건수는 검증된 공고와 판정 기준이 연결되기 전까지 계산하지 않는다. */
const recommendedCount = ref<number | null>(null)

const profileStatus = computed(() => store.assessment.value.status)
const ctaLabel = computed(() => (profileStatus.value === 'empty' ? '기업정보 입력하기' : '기업정보 이어서 입력하기'))

const flow = [
  {
    icon: IconForms,
    title: '기업정보 입력',
    text: '업종, 매출액, 수출실적, 주력 제품 등을 6단계로 입력합니다. 모르는 코드는 나중에 확인해도 됩니다.',
  },
  {
    icon: IconTargetArrow,
    title: '신청 자격과 적합도 확인',
    text: '공고별로 신청할 수 있는지와 우리 회사에 얼마나 잘 맞는지를 나누어 보여 드립니다.',
  },
  {
    icon: IconLayoutColumns,
    title: '비교하고 신청 준비',
    text: '필요 서류와 준비 부담을 비교하고, 준비 일정과 지원 이력을 관리합니다.',
  },
]

const principles = [
  {
    icon: IconCircleCheck,
    title: '1. 신청 자격',
    text: '공고의 자격 조건마다 충족·미충족·확인 필요를 원문 근거와 함께 보여 드립니다.',
  },
  {
    icon: IconTargetArrow,
    title: '2. 적합도',
    text: '신청 자격과는 따로, 관심 분야 등과 얼마나 맞는지를 계산 근거와 함께 보여 드립니다.',
  },
  {
    icon: IconScale,
    title: '3. 준비 부담·기회비용',
    text: '예상 준비 시간, 새로 준비할 서류, 자기부담금, 선정 후 의무를 비교할 수 있게 정리합니다.',
  },
]

const MENU_DESCRIPTIONS: Record<string, string> = {
  'diagnose-input': '6단계로 기업정보를 입력하고 수정합니다.',
  'diagnose-result': '입력한 기업정보를 요약해 봅니다.',
  'programs-recommended': '신청 자격과 적합도를 나누어 봅니다.',
  programs: '검색과 필터로 공고를 찾아봅니다.',
  'programs-compare': '공고 2~4개를 나란히 비교합니다.',
  roadmap: '수출 단계별로 필요한 지원을 살펴봅니다.',
  mypage: '내 기록을 한곳에서 확인합니다.',
  'mypage-profile': '입력한 기업정보를 보고 고칩니다.',
  'mypage-saved': '관심 있는 공고를 모아 봅니다.',
  'mypage-preparation': '서류 체크리스트와 준비도를 관리합니다.',
  'mypage-calendar': '접수·마감·발표 일정을 봅니다.',
  'mypage-history': '신청부터 완료까지의 이력을 기록합니다.',
  'mypage-documents': '신청에 쓰는 서류를 정리합니다.',
}
</script>

<template>
  <div class="home">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero__inner">
        <div class="hero__copy">
          <p class="hero__eyebrow">중소·중견기업 수출지원사업 매칭</p>
          <h1 id="hero-title" class="hero__title">우리 회사에 맞는 수출지원사업을 찾아보세요.</h1>
          <p class="hero__lead">
            기업 정보를 입력하면 공고가 준비된 후 신청자격과 지원내용을 한눈에 확인할 수 있습니다.
          </p>
          <div class="hero__actions">
            <RouterLink :to="{ name: 'diagnose-input' }" class="btn btn-primary btn-lg">
              {{ ctaLabel }}
              <IconArrowRight :size="20" stroke-width="2" aria-hidden="true" />
            </RouterLink>
            <RouterLink :to="{ name: 'programs' }" class="btn btn-secondary btn-lg">
              <IconListDetails :size="20" stroke-width="2" aria-hidden="true" />
              전체 지원사업 보기
            </RouterLink>
          </div>
          <p class="hero__status">
            <IconInfoCircle :size="16" stroke-width="2" aria-hidden="true" />
            지원사업 공고는 아직 수집·검증 전입니다. 공고가 등록되기 전에는 추천 결과가 표시되지 않습니다.
          </p>
        </div>

        <aside class="hero__panel surface-card" aria-labelledby="hero-panel-title">
          <h2 id="hero-panel-title" class="hero__panel-title">한눈에 보기</h2>
          <dl class="hero__stats">
            <div class="hero__stat">
              <dt>현재 접수 중인 공고</dt>
              <dd><DataValue :value="openCount" :format="formatNumber" /></dd>
            </div>
            <div class="hero__stat">
              <dt>우리 회사 추천 공고</dt>
              <dd><DataValue :value="recommendedCount" :format="formatNumber" /></dd>
            </div>
            <div class="hero__stat">
              <dt>내 기업정보</dt>
              <dd><ProfileStatusBadge :status="profileStatus" /></dd>
            </div>
          </dl>
          <p class="hero__panel-note">
            공고 수와 추천 수는 검증된 공고가 등록되면 표시됩니다. 기업정보는 이 기기에만 저장됩니다.
          </p>
        </aside>
      </div>
    </section>

    <div class="home__content">
      <section aria-labelledby="flow-title" class="home-section">
        <p class="section-eyebrow">이용 방법</p>
        <h2 id="flow-title" class="home-section__title">세 단계로 이용해요</h2>
        <ol class="flow">
          <li v-for="(item, index) in flow" :key="item.title" class="flow__item surface-card">
            <span class="flow__step">{{ index + 1 }}단계</span>
            <span class="flow__icon" aria-hidden="true">
              <component :is="item.icon" :size="24" stroke-width="1.8" />
            </span>
            <h3 class="flow__title">{{ item.title }}</h3>
            <p class="flow__text">{{ item.text }}</p>
          </li>
        </ol>
      </section>

      <section aria-labelledby="principle-title" class="home-section">
        <p class="section-eyebrow">판단 순서</p>
        <h2 id="principle-title" class="home-section__title">신청 자격 → 적합도 → 준비 부담 순서로 봅니다</h2>
        <p class="home-section__lead">
          신청할 수 있는지와 얼마나 잘 맞는지는 서로 다른 질문입니다. 근거가 없는 점수나 선정 가능성은 표시하지
          않습니다.
        </p>
        <ul class="principles">
          <li v-for="item in principles" :key="item.title" class="principles__item surface-card">
            <span class="principles__icon" aria-hidden="true">
              <component :is="item.icon" :size="22" stroke-width="1.8" />
            </span>
            <div>
              <h3 class="principles__title">{{ item.title }}</h3>
              <p class="principles__text">{{ item.text }}</p>
            </div>
          </li>
        </ul>
      </section>

      <section aria-labelledby="menu-title" class="home-section">
        <p class="section-eyebrow">전체 메뉴</p>
        <h2 id="menu-title" class="home-section__title">필요한 화면으로 바로 이동하세요</h2>
        <div class="menu-grid">
          <nav
            v-for="section in NAV_SECTIONS"
            :key="section.key"
            class="menu-group surface-card"
            :aria-labelledby="`menu-${section.key}`"
          >
            <h3 :id="`menu-${section.key}`" class="menu-group__title">{{ section.label }}</h3>
            <ul class="list-plain menu-group__list">
              <li v-for="item in section.items" :key="item.routeName">
                <RouterLink :to="{ name: item.routeName }" class="menu-link">
                  <component :is="item.icon" :size="20" stroke-width="1.8" aria-hidden="true" />
                  <span class="menu-link__text">
                    <span class="menu-link__label">{{ item.label }}</span>
                    <span class="menu-link__desc">{{ MENU_DESCRIPTIONS[item.routeName] }}</span>
                  </span>
                </RouterLink>
              </li>
            </ul>
          </nav>
        </div>
      </section>

      <section class="home-cta surface-card" aria-labelledby="cta-title">
        <div>
          <h2 id="cta-title" class="home-cta__title">기업정보를 먼저 입력해 두세요</h2>
          <p class="home-cta__text">
            공고가 등록되면 입력한 정보를 기준으로 신청 자격과 적합도를 확인할 수 있습니다.
          </p>
        </div>
        <RouterLink :to="{ name: 'diagnose-input' }" class="btn btn-primary btn-lg">
          <IconChecklist :size="20" stroke-width="2" aria-hidden="true" />
          {{ ctaLabel }}
        </RouterLink>
      </section>
    </div>
  </div>
</template>

<style scoped>
.hero {
  background:
    radial-gradient(1200px 400px at 85% -10%, rgba(39, 194, 212, 0.16), transparent 60%),
    radial-gradient(900px 420px at 0% 0%, rgba(52, 120, 246, 0.14), transparent 60%),
    var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.hero__inner {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: var(--space-8);
  align-items: center;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-9) var(--page-gutter);
}

.hero__eyebrow {
  display: inline-flex;
  margin-bottom: var(--space-3);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  font-size: var(--fs-sm);
  font-weight: var(--fw-semibold);
}

.hero__title {
  margin: 0;
  font-size: var(--fs-3xl);
  line-height: 1.25;
  letter-spacing: -0.03em;
}

.hero__lead {
  margin-top: var(--space-4);
  font-size: var(--fs-lg);
  color: var(--color-text);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-7);
}

.hero__status {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: var(--space-5);
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.hero__status svg {
  flex-shrink: 0;
  margin-top: 3px;
}

.hero__panel {
  padding: var(--space-6);
}

.hero__panel-title {
  margin: 0 0 var(--space-3);
  font-size: var(--fs-md);
}

.hero__stats {
  display: flex;
  flex-direction: column;
  margin: 0;
}

.hero__stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-border);
}

.hero__stat dt {
  font-weight: var(--fw-medium);
  color: var(--color-text);
}

.hero__stat dd {
  margin: 0;
  font-size: var(--fs-xl);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.hero__panel-note {
  margin-top: var(--space-4);
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.home__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-9);
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-9) var(--page-gutter);
}

.home-section__title {
  margin: 0;
  font-size: var(--fs-2xl);
}

.home-section__lead {
  max-width: 720px;
  margin-top: var(--space-2);
}

.flow {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--card-gap);
  margin: var(--space-6) 0 0;
  padding: 0;
  list-style: none;
  counter-reset: none;
}

.flow__item {
  position: relative;
  padding: var(--space-6);
}

.flow__step {
  display: inline-block;
  margin-bottom: var(--space-4);
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  color: var(--color-primary-strong);
}

.flow__icon {
  position: absolute;
  top: var(--space-5);
  right: var(--space-5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
}

.flow__title {
  margin: 0 0 var(--space-2);
  font-size: var(--fs-lg);
}

.flow__text {
  color: var(--color-text);
}

.principles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--card-gap);
  margin: var(--space-6) 0 0;
  padding: 0;
  list-style: none;
}

.principles__item {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-6);
}

.principles__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
}

.principles__title {
  margin: 0 0 6px;
  font-size: var(--fs-md);
}

.principles__text {
  font-size: var(--fs-sm);
}

.menu-grid {
  display: grid;
  align-items: start;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--card-gap);
  margin-top: var(--space-6);
}

.menu-group {
  padding: var(--space-5);
}

.menu-group__title {
  margin: 0 0 var(--space-3);
  font-size: var(--fs-md);
}

.menu-group__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-link {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: 10px;
  border-radius: var(--radius-sm);
  color: var(--color-primary-strong);
  text-decoration: none;
}

.menu-link svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.menu-link:hover {
  background: var(--color-primary-soft);
}

.menu-link__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-link__label {
  font-weight: var(--fw-semibold);
  color: var(--color-heading);
}

.menu-link__desc {
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.home-cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  padding: var(--space-7);
  background: linear-gradient(120deg, var(--color-primary-soft), var(--color-secondary-soft));
}

.home-cta__title {
  margin: 0 0 6px;
  font-size: var(--fs-xl);
}

@media (max-width: 1199.98px) {
  .menu-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 991.98px) {
  .hero__inner {
    grid-template-columns: minmax(0, 1fr);
    padding-top: var(--space-8);
    padding-bottom: var(--space-8);
  }
  .flow,
  .principles {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 575.98px) {
  .hero__title {
    font-size: 1.75rem;
  }
  .hero__lead {
    font-size: var(--fs-md);
  }
  .hero__actions .btn {
    width: 100%;
  }
  .menu-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .home__content {
    gap: var(--space-8);
    padding-top: var(--space-8);
  }
  .home-section__title {
    font-size: var(--fs-xl);
  }
  .home-cta {
    padding: var(--space-5);
  }
  .home-cta .btn {
    width: 100%;
  }
}
</style>

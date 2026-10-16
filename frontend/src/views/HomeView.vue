<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IconArrowRight, IconChevronDown } from '@tabler/icons-vue'
import { useAuth } from '@/stores/authStore'

const router = useRouter()
const auth = useAuth()
const waiting = ref(false)

const steps = [
  { title: '기업정보 입력', text: '회사의 기본 정보와 수출 현황을 입력합니다.' },
  { title: '맞춤 지원사업 확인', text: '신청자격과 추천 이유를 확인합니다.' },
  { title: '비교 및 신청 준비', text: '공고를 비교하고 필요한 서류를 준비합니다.' },
]

/** 로그인 상태 확인이 끝난 뒤 이동한다: 로그인 → 기업정보 입력, 비로그인 → 로그인 후 기업정보 입력 */
async function startRecommendation() {
  if (waiting.value) return
  waiting.value = true
  await auth.ensureChecked()
  waiting.value = false
  if (auth.state.status === 'authenticated') {
    await router.push({ name: 'diagnose-input' })
  } else {
    await router.push({ name: 'login', query: { redirect: '/diagnose/input' } })
  }
}
</script>

<template>
  <div class="home">
    <section class="home-hero" aria-labelledby="home-title">
      <h1 id="home-title" class="home-hero__title">우리 회사에 맞는 수출지원사업을 찾아보세요.</h1>
      <span class="home-hero__scroll" aria-hidden="true">
        <IconChevronDown :size="28" stroke-width="1.8" />
      </span>
    </section>

    <section class="home-steps" aria-labelledby="home-steps-title">
      <h2 id="home-steps-title" class="home-steps__title">이용 방법</h2>
      <ol class="home-steps__list">
        <li v-for="(step, index) in steps" :key="step.title" class="home-step">
          <span class="home-step__num" aria-hidden="true">{{ index + 1 }}</span>
          <div>
            <h3 class="home-step__title">
              <span class="visually-hidden">{{ index + 1 }}단계: </span>{{ step.title }}
            </h3>
            <p class="home-step__text">{{ step.text }}</p>
          </div>
        </li>
      </ol>
      <button
        type="button"
        class="btn btn-primary btn-lg home-steps__cta"
        :aria-busy="waiting ? 'true' : 'false'"
        @click="startRecommendation"
      >
        추천받기
        <IconArrowRight :size="20" stroke-width="2" aria-hidden="true" />
      </button>
    </section>
  </div>
</template>

<style scoped>
.home-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--header-height));
  min-height: calc(100svh - var(--header-height));
  padding: var(--space-8) var(--page-gutter);
  background:
    radial-gradient(1100px 420px at 85% 0%, rgba(39, 194, 212, 0.14), transparent 60%),
    radial-gradient(900px 420px at 0% 10%, rgba(52, 120, 246, 0.14), transparent 60%),
    var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  text-align: center;
}

.home-hero__title {
  max-width: 900px;
  margin: 0;
  font-size: clamp(1.75rem, 4.2vw, 3rem);
  line-height: 1.3;
  letter-spacing: -0.03em;
}

.home-hero__scroll {
  position: absolute;
  bottom: var(--space-6);
  left: 50%;
  transform: translateX(-50%);
  color: var(--color-muted);
  animation: home-bounce 1.8s ease-in-out infinite;
}

@keyframes home-bounce {
  0%,
  100% {
    transform: translate(-50%, 0);
  }
  50% {
    transform: translate(-50%, 6px);
  }
}

.home-steps {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-7);
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-9) var(--page-gutter);
}

.home-steps__title {
  margin: 0;
  font-size: var(--fs-2xl);
}

.home-steps__list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--card-gap);
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.home-step {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.home-step__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary-strong);
  font-weight: var(--fw-bold);
}

.home-step__title {
  margin: 0 0 6px;
  font-size: var(--fs-lg);
}

.home-step__text {
  color: var(--color-text);
}

.home-steps__cta {
  min-width: 240px;
}

@media (max-width: 991.98px) {
  .home-steps__list {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 575.98px) {
  .home-steps {
    padding-top: var(--space-8);
    padding-bottom: var(--space-8);
  }
  .home-steps__cta {
    width: 100%;
  }
}
</style>

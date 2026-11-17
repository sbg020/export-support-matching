<script setup lang="ts">
/**
 * Section 2. Problem — 옐로우 배너의 큰 질문, 이어서 문제 3개.
 * - 넓은 화면(풀페이지 스크롤): 문제 구간에 들어오면 카드 틀을 화면에 고정하고, 아래로 스크롤할 때마다
 *   같은 자리에서 문구와 그림이 한 세트씩 함께 바뀐다. 위로 스크롤하면 이전 세트, 마지막 세트에서 더 내리면
 *   고정이 풀리며 다음 섹션으로 이어진다. 무대(.problem__stage)는 세트 수 × 화면 높이이고,
 *   useFullPageScroll이 세트마다 한 번씩 멈춘다. 지금 세트는 스크롤 위치로 정한다.
 * - 좁은 화면: 카드가 차례로 위에 쌓인다(sticky).
 * 그림은 이미지 대신 서비스 요소(기관 이름, 자격 항목, 지원 단계)로 만든 단순한 도식이다.
 */
import { onBeforeUnmount, onMounted, ref } from "vue";
import { IconHelpCircle } from "@tabler/icons-vue";
import { FULLPAGE_MEDIA, FULLPAGE_STEP_EVENT } from "@/composables/useFullPageScroll";
import { AGENCY_ROWS } from "@/constants/landing";
import { STAGE_OPTIONS } from "@/constants/options";
import { vReveal } from "@/composables/useReveal";

const scattered = AGENCY_ROWS.flat().slice(0, 9);

/* ── 고정 무대: 지금 보이는 세트 ── */
const stage = ref<HTMLElement | null>(null);
const active = ref(0);
const pinned = ref(false);
let media: MediaQueryList | null = null;
let ticking = false;

function headerHeight(): number {
  return (
    Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--header-height"),
      10,
    ) || 64
  );
}

function update() {
  ticking = false;
  const el = stage.value;
  if (!el || !media?.matches) {
    pinned.value = false;
    active.value = 0;
    return;
  }
  pinned.value = true;
  const header = headerHeight();
  const page = Math.max(1, window.innerHeight - header);
  // 무대 시작(카드 틀이 헤더 아래에 고정되는 위치)에서 몇 화면 내려왔는지
  const progress = (header - el.getBoundingClientRect().top) / page;
  active.value = Math.min(problems.length - 1, Math.max(0, Math.round(progress)));
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(update);
  window.setTimeout(() => ticking && update(), 50);
}

onMounted(() => {
  if (typeof window.matchMedia !== "function") return;
  media = window.matchMedia(FULLPAGE_MEDIA);
  media.addEventListener?.("change", update);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener(FULLPAGE_STEP_EVENT, update);
  window.addEventListener("resize", onScroll);
  update();
});

onBeforeUnmount(() => {
  media?.removeEventListener?.("change", update);
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener(FULLPAGE_STEP_EVENT, update);
  window.removeEventListener("resize", onScroll);
});
const conditions = ["업종", "소재지", "매출액", "수출실적", "업력", "인증"];

const problems = [
  {
    key: "scattered",
    num: "01",
    title: "흩어진 공고",
    lines: [
      "수출지원사업은 여러 기관에 나뉘어 올라옵니다.",
      "기관마다 사이트를 돌며 직접 확인해야 합니다.",
    ],
  },
  {
    key: "conditions",
    num: "02",
    title: "복잡한 신청 자격",
    lines: [
      "업종, 소재지, 매출액, 수출실적까지.",
      "사업마다 다른 조건을 하나하나 검토해야 합니다.",
    ],
  },
  {
    key: "strategy",
    num: "03",
    title: "불분명한 지원 전략",
    lines: ["우리 회사의 수출 단계에서", "어떤 사업을 먼저 신청해야 할지 판단하기 어렵습니다."],
  },
];
</script>

<template>
  <section class="problem lp-section" aria-labelledby="problem-title">
    <div class="lp-container">
      <!-- 넓은 화면의 풀페이지 스크롤: 질문 배너와 문제 카드 3개가 각각 한 화면(data-fp-section) -->
      <div class="problem__panel" data-fp-section>
        <div v-reveal class="problem__banner">
          <h2 id="problem-title" class="lp-title">
            우리 기업에 맞는 수출지원사업,<br />
            왜 찾기 어려울까요?
          </h2>
        </div>
      </div>

      <!-- 무대: 세트 수만큼 화면 높이. 안쪽 틀은 헤더 아래에 고정된다 (data-fp-free: 크기를 줄이지 않고 세트마다 멈춤) -->
      <div
        ref="stage"
        class="problem__stage"
        data-fp-section
        data-fp-free
        :style="{ '--set-count': problems.length }"
      >
        <div class="problem__pin">
          <ol class="problem__list">
            <li
              v-for="(problem, index) in problems"
              :key="problem.key"
              class="problem__scene"
              :class="
                pinned
                  ? {
                      'is-active': index === active,
                      'is-before': index < active,
                      'is-after': index > active,
                    }
                  : null
              "
              :aria-current="pinned && index === active ? 'step' : undefined"
              :style="{ '--scene-index': index }"
            >
              <div class="problem__card">
                <div class="problem__text">
                  <span class="problem__num" aria-hidden="true">{{ problem.num }}</span>
                  <h3 class="problem__title">{{ problem.title }}</h3>
                  <p class="problem__desc">
                    <template v-for="(line, i) in problem.lines" :key="i"
                      >{{ line }}<br v-if="i < problem.lines.length - 1"
                    /></template>
                  </p>
                </div>

                <div class="problem__art" aria-hidden="true">
                  <div v-if="problem.key === 'scattered'" class="art-scatter">
                    <span
                      v-for="(agency, i) in scattered"
                      :key="agency.name"
                      class="art-scatter__chip"
                      :class="`is-${i % 3}`"
                    >
                      {{ agency.name }}
                    </span>
                  </div>

                  <div v-else-if="problem.key === 'conditions'" class="art-check">
                    <div v-for="(item, i) in conditions" :key="item" class="art-check__row">
                      <span class="art-check__name">{{ item }}</span>
                      <span class="art-check__bar" :style="{ width: `${40 + ((i * 17) % 50)}%` }" />
                      <span class="art-check__q"
                        ><IconHelpCircle :size="18" stroke-width="2"
                      /></span>
                    </div>
                  </div>

                  <div v-else class="art-path">
                    <div
                      v-for="(stage, i) in STAGE_OPTIONS"
                      :key="stage.value"
                      class="art-path__step"
                    >
                      <span class="art-path__dot">{{ i + 1 }}</span>
                      <span class="art-path__label">{{ stage.label }}</span>
                    </div>
                    <span class="art-path__ask">무엇부터?</span>
                  </div>
                </div>
              </div>
            </li>
          </ol>
          <!-- 세트 위치 표시 (넓은 화면) -->
          <ol class="problem__dots" aria-hidden="true">
            <li
              v-for="(problem, index) in problems"
              :key="problem.key"
              :class="{ 'is-active': index === active }"
            >
              {{ problem.num }}
            </li>
          </ol>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.problem {
  background: var(--color-surface);
}

.problem__banner {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: clamp(260px, 34vw, 400px);
  padding: var(--space-8) var(--space-6);
  border-radius: var(--lp-radius);
  background: var(--color-yellow);
  color: var(--color-ink);
  text-align: center;
}

.problem__list {
  display: flex;
  flex-direction: column;
  gap: clamp(24px, 4vw, 48px);
  margin: clamp(48px, 8vw, 96px) 0 0;
  padding: 0;
  list-style: none;
}

/* 좁은 화면: 장면이 차례로 위에 쌓인다 (스크롤 연동, 별도 스크립트 없음) */
.problem__scene {
  position: sticky;
  top: calc(var(--header-height) + 24px + var(--scene-index) * 16px);
}

.problem__card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: clamp(24px, 5vw, 72px);
  min-height: clamp(380px, 52vh, 520px);
  padding: clamp(32px, 5vw, 64px);
  border: 1px solid var(--color-border);
  border-radius: var(--lp-radius);
  background: var(--color-bg);
}

.problem__num {
  display: block;
  margin-bottom: var(--space-4);
  font-size: var(--fs-md);
  font-weight: 800;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.problem__title {
  margin: 0;
  font-size: clamp(1.75rem, 3.4vw, 2.75rem);
  font-weight: 800;
  letter-spacing: -0.035em;
}

.problem__desc {
  margin-top: var(--space-5);
  font-size: clamp(1rem, 1.4vw, 1.1875rem);
  line-height: 1.75;
  color: var(--color-text);
}

.problem__art {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: var(--space-6);
  border-radius: 22px;
  background: var(--color-surface);
}

/* 01 흩어진 공고 */
.art-scatter {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px 10px;
  max-width: 420px;
}

.art-scatter__chip {
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.art-scatter__chip.is-0 {
  transform: rotate(-4deg);
}

.art-scatter__chip.is-1 {
  transform: translateY(6px) rotate(3deg);
  background: var(--color-ink);
  color: #fff;
}

.art-scatter__chip.is-2 {
  transform: rotate(-1deg);
  background: var(--color-yellow);
  border-color: var(--color-yellow);
}

/* 02 복잡한 신청 자격 */
.art-check {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 400px;
}

.art-check__row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 12px;
}

.art-check__name {
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.art-check__bar {
  height: 12px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);
}

.art-check__q {
  display: inline-flex;
  color: var(--color-warning-strong);
}

/* 03 불분명한 지원 전략 */
.art-path {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  max-width: 440px;
  padding-top: 48px;
}

.art-path::before {
  content: "";
  position: absolute;
  top: 66px;
  right: 12%;
  left: 12%;
  border-top: 2px dashed var(--color-border-strong);
}

.art-path__step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.art-path__dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--color-ink);
  color: #fff;
  font-weight: var(--fw-bold);
}

.art-path__label {
  font-size: var(--fs-xs);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}

.art-path__ask {
  position: absolute;
  top: 0;
  left: 50%;
  padding: 4px 14px;
  border-radius: var(--radius-pill);
  background: var(--color-yellow);
  font-size: var(--fs-sm);
  font-weight: 800;
  transform: translateX(-50%);
}

/* 넓은 화면의 풀페이지 스크롤 (useFullPageScroll과 같은 조건): 카드를 겹치지 않고 한 화면에 하나씩 */
.problem__dots {
  display: none;
}

/* 넓은 화면의 풀페이지 스크롤 (useFullPageScroll과 같은 조건): 카드 틀을 고정하고 세트를 같은 자리에서 바꾼다 */
@media (min-width: 992px) and (min-height: 600px) and (prefers-reduced-motion: no-preference) {
  .problem {
    padding-block: 0;
  }

  /* 세트 수 × (화면 - 헤더). useFullPageScroll이 무대 시작 + 화면 높이마다 멈춘다 */
  .problem .problem__stage {
    display: block;
    height: calc(var(--set-count) * (100svh - var(--header-height)));
    min-height: 0;
  }

  .problem__pin {
    position: sticky;
    top: var(--header-height);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-5);
    height: calc(100svh - var(--header-height));
  }

  /* 세 장면을 같은 칸에 겹쳐 두고 지금 세트만 보인다. 카드 틀은 목록에 있어 전환 중에도 움직이지 않는다 */
  .problem__list {
    display: grid;
    margin: 0;
    padding: clamp(32px, 5vw, 64px);
    border: 1px solid var(--color-border);
    border-radius: var(--lp-radius);
    background: var(--color-bg);
    overflow: hidden;
  }

  .problem__scene {
    position: relative;
    top: auto;
    grid-area: 1 / 1;
    opacity: 0;
    transform: translateY(40px);
    transition:
      opacity 0.5s ease,
      transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }

  .problem__scene.is-before {
    transform: translateY(-40px);
  }

  .problem__scene.is-active {
    opacity: 1;
    transform: none;
    transition-delay: 0.08s;
    pointer-events: auto;
  }

  .problem__card {
    min-height: clamp(360px, 50vh, 500px);
    padding: 0;
    border: 0;
    background: transparent;
  }

  .problem__dots {
    display: flex;
    justify-content: center;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .problem__dots li {
    min-width: 44px;
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-size: var(--fs-xs);
    font-weight: 800;
    text-align: center;
    font-variant-numeric: tabular-nums;
    transition:
      background 0.3s ease,
      color 0.3s ease;
  }

  .problem__dots li.is-active {
    background: var(--color-ink);
    color: #fff;
  }
}

@media (max-width: 767.98px) {
  .problem__scene {
    position: relative;
    top: auto;
  }

  .problem__card {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }
  .problem__desc br {
    display: none;
  }
  .problem__art {
    min-height: 220px;
  }
}
</style>

<script setup lang="ts">
/**
 * 하단 비교 바 (REVISION_02 §8.4.1). 선택이 1개 이상일 때만 보인다.
 * - 다른 화면: '비교하기'를 누르면 전체 공고 하단 비교 영역으로 이동한다(2개 이상이면 자동으로 펼친다).
 * - 전체 공고 화면(mode=scroll): 이동하지 않고 비교 영역으로 스크롤한다.
 * - 1개만 골랐으면 '비교하기'를 비활성으로 두고 이유를 보여 준다.
 * 바가 마지막 카드의 버튼과 토스트를 가리지 않도록, 바 높이만큼 흐름 안에 여백을 두고 토스트를 올린다.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import { IconLayoutColumns } from '@tabler/icons-vue'
import { MAX_COMPARE, useCompareSelection } from '@/composables/useCompareSelection'

const props = withDefaults(defineProps<{ mode?: 'navigate' | 'scroll'; hidden?: boolean }>(), {
  mode: 'navigate',
  hidden: false,
})
const emit = defineEmits<{ go: [] }>()

const router = useRouter()
const selection = useCompareSelection()
const count = selection.count
const visible = computed(() => count.value > 0 && !props.hidden)
const ready = computed(() => count.value >= 2)
const reasonId = `${useId()}-reason`
const dock = ref<HTMLElement | null>(null)

const OFFSET_VAR = '--compare-dock-offset'
let observer: ResizeObserver | null = null

function setOffset(px: number | null) {
  if (typeof document === 'undefined') return
  if (px === null) document.documentElement.style.removeProperty(OFFSET_VAR)
  else document.documentElement.style.setProperty(OFFSET_VAR, `${px}px`)
}

function measure() {
  if (dock.value) setOffset(dock.value.offsetHeight + 16)
}

watch(
  visible,
  async (shown) => {
    observer?.disconnect()
    observer = null
    if (!shown) {
      setOffset(null)
      return
    }
    await nextTick()
    measure()
    if (dock.value && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure)
      observer.observe(dock.value)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  observer?.disconnect()
  setOffset(null)
})

function go() {
  if (!ready.value) return
  if (props.mode === 'scroll') emit('go')
  else void router.push(selection.compareLocation())
}
</script>

<template>
  <div v-if="visible" class="compare-dock-spacer" aria-hidden="true" />
  <div v-if="visible" ref="dock" class="compare-dock" role="region" aria-label="공고 비교 바로가기">
    <button
      type="button"
      class="compare-dock__button"
      :aria-disabled="!ready"
      :aria-describedby="!ready ? reasonId : undefined"
      @click="go"
    >
      <IconLayoutColumns :size="18" stroke-width="2" aria-hidden="true" />
      비교 {{ count }}/{{ MAX_COMPARE }} · 비교하기
    </button>
    <p v-if="!ready" :id="reasonId" class="compare-dock__reason">1개 더 고르면 비교할 수 있습니다.</p>
  </div>
</template>

<style scoped>
.compare-dock-spacer {
  height: var(--compare-dock-offset, 72px);
}

.compare-dock {
  position: fixed;
  left: 50%;
  bottom: var(--space-5);
  z-index: 1020;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transform: translateX(-50%);
}

.compare-dock__button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 var(--space-5);
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--color-heading);
  color: #fff;
  font-weight: var(--fw-semibold);
  box-shadow: var(--shadow-lg);
  cursor: pointer;
}

.compare-dock__button:hover:not([aria-disabled='true']) {
  background: var(--color-primary-strong);
}

.compare-dock__button[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.75;
}

.compare-dock__reason {
  margin: 0;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  font-size: var(--fs-xs);
  color: var(--color-text);
}

@media (max-width: 767.98px) {
  .compare-dock {
    left: var(--space-4);
    right: var(--space-4);
    bottom: var(--space-4);
    transform: none;
  }
  .compare-dock__button {
    justify-content: center;
    width: 100%;
  }
}
</style>

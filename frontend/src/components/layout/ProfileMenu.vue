<script setup lang="ts">
/**
 * 헤더 오른쪽 계정 영역 (REVISION_03 §5).
 *
 * - 로그인: 원형 프로필 버튼 → '기업 프로필'·'로그아웃' 팝업. 키보드로 열면 첫 항목에 포커스를 둔다.
 *   Esc(포커스는 버튼으로)·바깥 누르기·항목 선택·화면 이동·Tab으로 밖으로 나갈 때 닫는다.
 *   하위 메뉴 패널이 열리면 AppHeader가 닫는다.
 * - 비로그인: '로그인' 버튼 (redirect 없이 로그인 화면, 로그인 후 수출 로드맵). 로그인 화면에서는 숨긴다.
 * - 확인 중: 자리만 비워 둔다 (가짜 아바타·스켈레톤 없음).
 * - 로그아웃은 서버 세션만 끝내고 홈으로 간다. 이 기기에 저장한 기업정보·관리 기록·직접 확인 답·비교 선택은 그대로 둔다.
 */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LOGOUT_MESSAGE } from '@/constants/navigation'
import { useAuth } from '@/stores/authStore'
import { useToast } from '@/stores/toastStore'

const open = defineModel<boolean>('open', { required: true })

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const toast = useToast()

const rootRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLButtonElement | null>(null)
const popupRef = ref<HTMLElement | null>(null)
const popupId = `${useId()}-account-menu`

const user = computed(() => auth.state.user)
/** 계정 아이디의 첫 글자 (예: ADMIN → A) */
const initial = computed(() => Array.from(user.value?.id ?? '')[0] ?? '')
const onProfile = computed(() => route.name === 'company-profile')

/** 키보드(Enter·Space)로 누른 경우에는 detail이 0이다 */
async function toggle(event: MouseEvent) {
  const next = !open.value
  open.value = next
  if (next && event.detail === 0) {
    await nextTick()
    popupRef.value?.querySelector<HTMLElement>('a, button')?.focus()
  }
}

function closeAndFocusButton() {
  open.value = false
  buttonRef.value?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open.value) return
  event.stopPropagation()
  closeAndFocusButton()
}

/** Tab으로 팝업 밖으로 나가면 닫는다 */
function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (!(next instanceof Node) || !rootRef.value?.contains(next)) open.value = false
}

function onDocumentPointer(event: Event) {
  const target = event.target
  if (target instanceof Node && rootRef.value?.contains(target)) return
  open.value = false
}

watch(open, (value) => {
  if (typeof document === 'undefined') return
  if (value) {
    document.addEventListener('mousedown', onDocumentPointer, true)
    document.addEventListener('touchstart', onDocumentPointer, true)
  } else {
    document.removeEventListener('mousedown', onDocumentPointer, true)
    document.removeEventListener('touchstart', onDocumentPointer, true)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentPointer, true)
  document.removeEventListener('touchstart', onDocumentPointer, true)
})

// 화면이 바뀌면 닫는다
watch(
  () => route.fullPath,
  () => {
    open.value = false
  },
)

async function logout() {
  open.value = false
  await auth.logout()
  toast.show(LOGOUT_MESSAGE, 'info')
  await router.push({ name: 'home' })
}
</script>

<template>
  <div ref="rootRef" class="profile-menu" @keydown="onKeydown" @focusout="onFocusOut">
    <template v-if="auth.state.status === 'authenticated' && user">
      <button
        ref="buttonRef"
        type="button"
        class="profile-avatar"
        :class="{ 'is-current': onProfile }"
        :aria-expanded="open"
        :aria-controls="popupId"
        :aria-label="`계정 메뉴 (${user.id} 계정)`"
        @click="toggle"
      >
        <span aria-hidden="true">{{ initial }}</span>
      </button>
      <div v-show="open" :id="popupId" ref="popupRef" class="profile-menu__popup">
        <ul class="profile-menu__list">
          <li>
            <RouterLink :to="{ name: 'company-profile' }" class="profile-menu__item" @click="open = false">
              기업 프로필
            </RouterLink>
          </li>
          <li>
            <button type="button" class="profile-menu__item" @click="logout">로그아웃</button>
          </li>
        </ul>
      </div>
    </template>
    <RouterLink
      v-else-if="auth.state.status === 'anonymous' && route.name !== 'login'"
      :to="{ name: 'login' }"
      class="btn btn-primary btn-sm"
    >
      로그인
    </RouterLink>
  </div>
</template>

<style scoped>
.profile-menu {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 40px;
  min-height: 40px;
}

.profile-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--color-heading);
  color: #fff;
  font-size: var(--fs-md);
  font-weight: var(--fw-bold);
  cursor: pointer;
}

.profile-avatar:hover,
.profile-avatar[aria-expanded='true'] {
  background: var(--color-primary-strong);
}

/* 기업 프로필 화면에서는 선택 상태 (테두리 고리로 색 외 표시) */
.profile-avatar.is-current {
  background: var(--color-primary-strong);
  box-shadow:
    0 0 0 3px var(--color-surface),
    0 0 0 5px var(--color-primary-strong);
}

.profile-menu__popup {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  z-index: 3;
  min-width: 160px;
  padding: var(--space-1) 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.profile-menu__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.profile-menu__item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 0 var(--space-4);
  border: 0;
  background: none;
  color: var(--color-heading);
  font-size: var(--fs-base);
  font-weight: var(--fw-medium);
  text-align: left;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

.profile-menu__item:hover {
  background: var(--color-surface-sunken);
  color: var(--color-primary-strong);
}

.profile-menu__item:focus-visible {
  outline-offset: -2px;
}
</style>

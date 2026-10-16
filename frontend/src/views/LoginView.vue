<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconAlertCircle, IconLogin2 } from '@tabler/icons-vue'
import TabNav from '@/components/common/TabNav.vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import type { TabItem } from '@/components/common/types'
import { useAuth } from '@/stores/authStore'
import { safeRedirect } from '@/lib/redirect'

type Mode = 'login' | 'signup'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const mode = computed<Mode>({
  get: () => (route.query.mode === 'signup' ? 'signup' : 'login'),
  set: (next) => {
    void router.replace({ query: { ...route.query, mode: next === 'signup' ? 'signup' : undefined } })
  },
})

const tabs: TabItem<Mode>[] = [
  { key: 'login', label: '로그인' },
  { key: 'signup', label: '회원가입' },
]

const loginId = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const fieldError = ref<string | null>(null)

const signupId = ref('')
const signupPassword = ref('')
const signupConfirm = ref('')

watch(mode, () => {
  errorMessage.value = null
  fieldError.value = null
})

function destination(): string {
  return safeRedirect(route.query.redirect, router) ?? '/'
}

async function submitLogin() {
  if (submitting.value) return
  errorMessage.value = null
  fieldError.value = null
  if (loginId.value === '' || password.value === '') {
    fieldError.value = '아이디와 비밀번호를 모두 입력해 주세요.'
    return
  }
  submitting.value = true
  const result = await auth.login(loginId.value, password.value)
  submitting.value = false
  if (result.ok) {
    password.value = ''
    await router.replace(destination())
    return
  }
  errorMessage.value = result.message
  password.value = ''
}
</script>

<template>
  <div class="page login-page">
    <section class="login-card surface-card" aria-labelledby="login-title">
      <h1 id="login-title" class="login-card__title">
        {{ mode === 'signup' ? '회원가입' : '로그인' }}
      </h1>
      <p class="login-card__lead">로그인하면 마이페이지에서 기업 프로필과 관리 기록을 볼 수 있습니다.</p>

      <NoticeBanner v-if="auth.state.errorMessage" tone="warning" class="mt-3">
        {{ auth.state.errorMessage }}
      </NoticeBanner>

      <TabNav v-model="mode" :tabs="tabs" label="로그인 또는 회원가입" id-prefix="auth" class="mt-4" />

      <div id="auth-panel" role="tabpanel" :aria-labelledby="`auth-tab-${mode}`" class="login-card__panel">
        <form v-if="mode === 'login'" novalidate @submit.prevent="submitLogin">
          <div class="form-field">
            <label for="login-id" class="form-label">아이디</label>
            <input
              id="login-id"
              v-model="loginId"
              class="form-control"
              type="text"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              :aria-invalid="fieldError && loginId === '' ? 'true' : undefined"
            />
            <p class="form-hint">대소문자를 구분합니다.</p>
          </div>
          <div class="form-field mt-3">
            <label for="login-password" class="form-label">비밀번호</label>
            <input
              id="login-password"
              v-model="password"
              class="form-control"
              type="password"
              autocomplete="current-password"
              :aria-invalid="fieldError && password === '' ? 'true' : undefined"
            />
          </div>

          <p v-if="fieldError || errorMessage" class="form-error mt-3" role="alert">
            <IconAlertCircle :size="16" stroke-width="2" aria-hidden="true" />
            <span>{{ fieldError ?? errorMessage }}</span>
          </p>

          <button
            type="submit"
            class="btn btn-primary btn-lg w-100 mt-4"
            :aria-busy="submitting ? 'true' : 'false'"
            :disabled="submitting"
          >
            <IconLogin2 :size="20" stroke-width="2" aria-hidden="true" />
            {{ submitting ? '확인 중…' : '로그인' }}
          </button>
        </form>

        <form v-else novalidate @submit.prevent>
          <div class="form-field">
            <label for="signup-id" class="form-label">아이디</label>
            <input id="signup-id" v-model="signupId" class="form-control" type="text" autocomplete="username" />
          </div>
          <div class="form-field mt-3">
            <label for="signup-password" class="form-label">비밀번호</label>
            <input
              id="signup-password"
              v-model="signupPassword"
              class="form-control"
              type="password"
              autocomplete="new-password"
            />
          </div>
          <div class="form-field mt-3">
            <label for="signup-confirm" class="form-label">비밀번호 확인</label>
            <input
              id="signup-confirm"
              v-model="signupConfirm"
              class="form-control"
              type="password"
              autocomplete="new-password"
            />
          </div>
          <button
            type="submit"
            class="btn btn-primary btn-lg w-100 mt-4"
            aria-disabled="true"
            aria-describedby="signup-reason"
          >
            회원가입
          </button>
          <DisabledReason id="signup-reason">
            회원 정보를 저장할 서버가 아직 연결되지 않아 회원가입은 준비 중입니다. 데모 계정으로 로그인해 확인할 수
            있습니다.
          </DisabledReason>
        </form>
      </div>

      <ul class="login-card__notes">
        <li>지원사업 찾기·전체 지원사업·나의 로드맵은 로그인하지 않아도 이용할 수 있습니다.</li>
        <li>입력한 기업정보는 로그인과 관계없이 이 기기에만 저장됩니다.</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  padding-top: var(--space-8);
}

.login-card {
  width: 100%;
  max-width: 440px;
  padding: var(--space-7);
}

.login-card__title {
  margin: 0;
  font-size: var(--fs-2xl);
}

.login-card__lead {
  margin-top: 6px;
  font-size: var(--fs-sm);
  color: var(--color-text);
}

.login-card__panel {
  padding-top: var(--space-5);
}

.login-card__notes {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: var(--space-6) 0 0;
  padding: var(--space-4) 0 0 var(--space-5);
  border-top: 1px solid var(--color-border);
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

@media (max-width: 575.98px) {
  .login-page {
    padding-top: var(--space-5);
  }
  .login-card {
    padding: var(--space-5);
  }
}
</style>

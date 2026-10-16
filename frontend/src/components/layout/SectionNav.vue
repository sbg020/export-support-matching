<script setup lang="ts">
/**
 * 화면 안의 하위 메뉴. 현재 섹션의 하위 메뉴만 탭 모양 링크로 보여 준다.
 * 마이페이지에서는 오른쪽 끝에 로그아웃 버튼을 둔다.
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconLogout } from '@tabler/icons-vue'
import { sectionByKey, type NavItem } from '@/constants/navigation'
import { useAuth } from '@/stores/authStore'
import { useToast } from '@/stores/toastStore'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const toast = useToast()

const section = computed(() => sectionByKey(route.meta.section))

/** 정확히 이 화면이면 'page', 상세처럼 이 메뉴에 속한 화면이면 'true' */
function currentValue(item: NavItem): 'page' | 'true' | undefined {
  const name = typeof route.name === 'string' ? route.name : ''
  if (name === item.routeName) return 'page'
  if (name === 'program-detail') {
    const fromCalendar = route.query.from === 'calendar'
    if (fromCalendar) return item.routeName === 'programs-calendar' ? 'true' : undefined
  }
  return item.activeFor?.includes(name) ? 'true' : undefined
}

async function logout() {
  await auth.logout()
  toast.show('로그아웃했습니다. 이 기기에 저장한 기업정보는 그대로 남아 있습니다.', 'info')
  await router.push({ name: 'home' })
}
</script>

<template>
  <nav v-if="section" class="section-nav" :aria-label="`${section.label} 하위 메뉴`">
    <ul class="section-nav__list">
      <li v-for="item in section.items" :key="item.routeName">
        <RouterLink v-slot="{ href, navigate }" :to="{ name: item.routeName }" custom>
          <a
            :href="href"
            class="section-nav__link"
            :class="{ 'is-current': currentValue(item) }"
            :aria-current="currentValue(item)"
            @click="navigate"
          >
            {{ item.label }}
          </a>
        </RouterLink>
      </li>
    </ul>
    <button
      v-if="section.key === 'mypage' && auth.state.status === 'authenticated'"
      type="button"
      class="btn btn-secondary btn-sm section-nav__logout"
      @click="logout"
    >
      <IconLogout :size="16" stroke-width="2" aria-hidden="true" />
      로그아웃
    </button>
  </nav>
</template>

<style scoped>
.section-nav {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.section-nav__list {
  position: relative;
  display: flex;
  flex: 1;
  gap: var(--space-1);
  min-width: 0;
  margin: 0;
  padding: 0;
  overflow-x: auto;
  list-style: none;
  scrollbar-width: thin;
}

.section-nav__link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 var(--space-4);
  border-bottom: 3px solid transparent;
  color: var(--color-text-muted);
  font-weight: var(--fw-medium);
  text-decoration: none;
  white-space: nowrap;
}

.section-nav__link:hover {
  color: var(--color-heading);
}

/* 현재 하위 메뉴: 밑줄 + 굵은 글씨 */
.section-nav__link.is-current {
  border-bottom-color: var(--color-primary-strong);
  color: var(--color-primary-strong);
  font-weight: var(--fw-bold);
}

.section-nav__link:focus-visible {
  outline-offset: -2px;
}

.section-nav__logout {
  flex-shrink: 0;
  margin-bottom: 6px;
}
</style>

<script setup lang="ts">
/** 페이지 제목, 이동 경로(breadcrumb), 상위 위치로 이동 링크 */
import { computed } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { IconArrowLeft, IconChevronRight } from '@tabler/icons-vue'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    eyebrow?: string
  }>(),
  { description: undefined, eyebrow: undefined },
)

const route = useRoute()
const router = useRouter()

interface Crumb {
  label: string
  to: RouteLocationRaw
}

const crumbs = computed<Crumb[]>(() => {
  const items: Crumb[] = [{ label: '홈', to: { name: 'home' } }]
  for (const name of route.meta.ancestors ?? []) {
    const record = router.getRoutes().find((r) => r.name === name)
    if (record) items.push({ label: record.meta.title, to: { name } })
  }
  return items
})

const parent = computed(() => crumbs.value[crumbs.value.length - 1])
const currentLabel = computed(() => props.title)
</script>

<template>
  <header class="page-header">
    <div class="page-header__nav">
      <RouterLink
        v-if="parent"
        :to="parent.to"
        class="page-header__back"
        :aria-label="`상위 페이지(${parent.label})로 이동`"
      >
        <IconArrowLeft :size="18" stroke-width="2" aria-hidden="true" />
      </RouterLink>
      <nav aria-label="현재 위치" class="breadcrumbs">
        <ol class="breadcrumbs__list">
          <li v-for="crumb in crumbs" :key="crumb.label" class="breadcrumbs__item">
            <RouterLink :to="crumb.to">{{ crumb.label }}</RouterLink>
            <IconChevronRight :size="14" stroke-width="2" aria-hidden="true" class="breadcrumbs__sep" />
          </li>
          <li class="breadcrumbs__item" aria-current="page">{{ currentLabel }}</li>
        </ol>
      </nav>
    </div>
    <div class="page-header__main">
      <div class="page-header__titles">
        <p v-if="eyebrow" class="section-eyebrow">{{ eyebrow }}</p>
        <h1 class="page-header__title">{{ title }}</h1>
        <p v-if="description" class="page-header__description">{{ description }}</p>
        <div v-if="$slots.meta" class="page-header__meta"><slot name="meta" /></div>
      </div>
      <div v-if="$slots.actions" class="page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--card-gap);
}

.page-header__nav {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.page-header__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-heading);
}

.page-header__back:hover {
  background: var(--color-surface-sunken);
}

.breadcrumbs__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-sm);
}

.breadcrumbs__item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--color-text-muted);
}

.breadcrumbs__item a {
  color: var(--color-text-muted);
  text-decoration: none;
}

.breadcrumbs__item a:hover {
  color: var(--color-primary-strong);
  text-decoration: underline;
}

.breadcrumbs__item[aria-current='page'] {
  color: var(--color-heading);
  font-weight: var(--fw-semibold);
}

.breadcrumbs__sep {
  color: var(--color-muted);
}

.page-header__main {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-header__titles {
  flex: 1 1 420px;
  min-width: 0;
}

.page-header__title {
  margin: 0;
  font-size: var(--fs-2xl);
}

.page-header__description {
  margin-top: 6px;
  max-width: 760px;
  color: var(--color-text);
}

.page-header__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

@media (max-width: 575.98px) {
  .page-header__title {
    font-size: var(--fs-xl);
  }
  .page-header__actions {
    width: 100%;
  }
}
</style>

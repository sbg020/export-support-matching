<script setup lang="ts">
/** 로고(홈 링크). 메뉴가 아니므로 홈에서도 선택 상태(aria-current)로 표시하지 않는다. */
import { APP_NAME } from '@/constants/navigation'
import BrandMark from './BrandMark.vue'

// custom 링크라 부모가 준 class 등을 <a>에 직접 넘긴다.
defineOptions({ inheritAttrs: false })
</script>

<template>
  <RouterLink v-slot="{ href, navigate }" :to="{ name: 'home' }" custom>
    <a v-bind="$attrs" :href="href" class="brand-link" @click="navigate">
      <BrandMark :size="30" />
      <span class="brand-link__name">{{ APP_NAME }}</span>
    </a>
  </RouterLink>
</template>

<style scoped>
.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  color: var(--color-heading);
  font-size: var(--fs-md);
  font-weight: var(--fw-bold);
  letter-spacing: -0.02em;
  text-decoration: none;
}

.brand-link:hover {
  color: var(--color-heading);
}

@media (max-width: 575.98px) {
  .brand-link {
    font-size: var(--fs-base);
  }
}
</style>

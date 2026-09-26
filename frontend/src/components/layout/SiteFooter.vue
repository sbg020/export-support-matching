<script setup lang="ts">
import { APP_NAME } from '@/constants/navigation'
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <p class="site-footer__name">{{ APP_NAME }}</p>
      <p>
        이 서비스는 공고 원문을 대신하지 않습니다. 실제 신청 전에는 반드시 공고 원문을 확인해 주세요.
      </p>
      <p>입력한 기업정보는 서버로 전송되지 않고 이 브라우저에만 저장됩니다. (사업자등록번호 제외)</p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.site-footer__inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-6) var(--page-gutter);
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
}

.site-footer__name {
  margin-bottom: 4px;
  font-size: var(--fs-sm);
  font-weight: var(--fw-bold);
  color: var(--color-heading);
}
</style>

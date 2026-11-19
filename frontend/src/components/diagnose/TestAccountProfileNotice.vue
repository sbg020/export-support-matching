<script setup lang="ts">
/**
 * '테스트 프로필 초기화' 버튼 (revision_03 테스트 계정 §3.1 --reset-profile에 해당).
 * 테스트 계정으로 로그인했을 때만 보인다. 안내 카드는 두지 않는다. 초기화는 테스트 계정 전용 저장 키만 덮어쓴다.
 */
import { computed, ref } from 'vue'
import { IconRestore } from '@tabler/icons-vue'
import AppModal from '@/components/common/AppModal.vue'
import { useProfileStore } from '@/stores/profileStore'
import { resetTestAccountData } from '@/stores/accountScope'
import { useToast } from '@/stores/toastStore'

const store = useProfileStore()
const toast = useToast()
const scope = computed(() => store.state.scope)
const confirmOpen = ref(false)

function reset() {
  confirmOpen.value = false
  if (resetTestAccountData()) toast.show('테스트 프로필을 처음 값으로 되돌렸습니다.', 'info')
}
</script>

<template>
  <div v-if="scope.kind === 'test-account'" class="test-reset">
    <button type="button" class="btn btn-secondary btn-sm" @click="confirmOpen = true">
      <IconRestore :size="16" stroke-width="2" aria-hidden="true" />
      테스트 프로필 초기화
    </button>
  </div>

  <AppModal v-model:open="confirmOpen" title="테스트 프로필을 처음 값으로 되돌릴까요?" size="sm">
    <p>
      이 테스트 계정의 기업 프로필과 공통 확인 답을 처음 등록한 값으로 다시 덮어씁니다. 공고별 직접 확인 답은 지워집니다.
      다른 계정의 정보는 바뀌지 않습니다.
    </p>
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="confirmOpen = false">취소</button>
      <button type="button" class="btn btn-primary" @click="reset">초기화</button>
    </template>
  </AppModal>
</template>

<style scoped>
.test-reset {
  display: flex;
  justify-content: flex-end;
}
</style>

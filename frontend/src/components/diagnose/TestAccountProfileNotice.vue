<script setup lang="ts">
/**
 * 테스트 계정 안내와 '테스트 프로필 초기화' (revision_03 테스트 계정 §3.1 --reset-profile에 해당).
 * 테스트 계정으로 로그인했을 때만 보인다. 초기화는 테스트 계정 전용 저장 키만 덮어쓴다.
 */
import { computed, ref } from 'vue'
import { IconRestore } from '@tabler/icons-vue'
import NoticeBanner from '@/components/common/NoticeBanner.vue'
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
  <NoticeBanner v-if="scope.kind === 'test-account'" tone="info" :title="`테스트 계정(${scope.accountId})의 기업 프로필입니다`">
    시연·화면 캡처용 가상의 테스트 기업입니다. 이 계정의 프로필은 이 브라우저에 따로 저장되며, 고친 내용은 다시
    로그인해도 유지됩니다. 다른 계정과 비로그인 상태의 기업정보에는 영향을 주지 않습니다.
    <template #actions>
      <button type="button" class="btn btn-secondary btn-sm" @click="confirmOpen = true">
        <IconRestore :size="16" stroke-width="2" aria-hidden="true" />
        테스트 프로필 초기화
      </button>
    </template>
  </NoticeBanner>

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

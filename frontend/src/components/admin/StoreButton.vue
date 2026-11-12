<script setup lang="ts">
/**
 * 저장이 필요한 버튼 (REVISION_04 §6.2). 저장소에 쓸 수 없으면 비활성(aria-disabled)이고
 * 이유를 DisabledReason으로 연결한다. 누르면 성공한 것처럼 보이는 토스트나 가짜 진행 표시를 넣지 않는다.
 */
import { computed, useId, type Component } from 'vue'
import ActionButton from '@/components/common/ActionButton.vue'
import DisabledReason from '@/components/common/DisabledReason.vue'
import { ADMIN_STORE_REASON } from '@/constants/adminNavigation'
import { adminRepository } from '@/repositories/admin'

const props = withDefaults(
  defineProps<{
    label: string
    /** 비활성 이유 (기본: 공고 저장소를 연결한 뒤 사용할 수 있습니다.) */
    reason?: string
    variant?: 'primary' | 'outline-primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline'
    size?: 'sm' | 'md'
    icon?: Component
    /** 저장소가 있어도 이 화면의 조건이 맞지 않으면 비활성 */
    blocked?: boolean
    /** 이유 문구를 버튼 아래에 보이지 않게 (같은 이유가 이미 근처에 있을 때). 화면낭독기에는 읽힌다 */
    quietReason?: boolean
  }>(),
  { reason: ADMIN_STORE_REASON, variant: 'secondary', size: 'md', icon: undefined, blocked: false, quietReason: false },
)

const emit = defineEmits<{ click: [] }>()

const reasonId = `${useId()}-reason`
const disabled = computed(() => !adminRepository.canWrite || props.blocked)
</script>

<template>
  <span class="store-button">
    <ActionButton
      :variant="variant"
      :size="size"
      :icon="icon"
      :disabled="disabled"
      :describedby="disabled ? reasonId : undefined"
      @click="emit('click')"
    >
      {{ label }}
    </ActionButton>
    <DisabledReason v-if="disabled" :id="reasonId" :class="{ 'visually-hidden': quietReason }">
      {{ reason }}
    </DisabledReason>
  </span>
</template>

<style scoped>
.store-button {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 100%;
}

.store-button :deep(.disabled-reason) {
  margin-top: 4px;
  font-size: var(--fs-xs);
}
</style>

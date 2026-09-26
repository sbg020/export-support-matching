<script setup lang="ts">
/**
 * 버튼. disabled이면 aria-disabled로 표시해 키보드 포커스와 비활성 이유 낭독이
 * 가능하게 하고, 클릭해도 동작하지 않는다. 비활성 이유 문구는 describedby로 연결한다.
 */
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'outline-primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline'
    size?: 'sm' | 'md' | 'lg'
    icon?: Component
    iconRight?: Component
    to?: RouteLocationRaw
    /** 외부 링크 (새 창). 공고 원문처럼 검증된 URL에만 사용한다. */
    href?: string
    disabled?: boolean
    /** 비활성 이유 문구의 id */
    describedby?: string
    type?: 'button' | 'submit'
    block?: boolean
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    icon: undefined,
    iconRight: undefined,
    to: undefined,
    href: undefined,
    disabled: false,
    describedby: undefined,
    type: 'button',
    block: false,
  },
)

const emit = defineEmits<{ click: [event: MouseEvent] }>()

function onClick(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}
</script>

<template>
  <RouterLink
    v-if="to && !disabled"
    :to="to"
    class="btn"
    :class="[`btn-${variant}`, { 'btn-sm': size === 'sm', 'btn-lg': size === 'lg', 'w-100': block }]"
    :aria-describedby="describedby"
  >
    <component :is="icon" v-if="icon" :size="size === 'sm' ? 16 : 18" stroke-width="2" aria-hidden="true" />
    <slot />
    <component
      :is="iconRight"
      v-if="iconRight"
      :size="size === 'sm' ? 16 : 18"
      stroke-width="2"
      aria-hidden="true"
    />
  </RouterLink>
  <a
    v-else-if="href && !disabled"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    class="btn"
    :class="[`btn-${variant}`, { 'btn-sm': size === 'sm', 'btn-lg': size === 'lg', 'w-100': block }]"
    :aria-describedby="describedby"
  >
    <component :is="icon" v-if="icon" :size="size === 'sm' ? 16 : 18" stroke-width="2" aria-hidden="true" />
    <slot />
    <span class="visually-hidden">(새 창)</span>
  </a>
  <button
    v-else
    :type="type"
    class="btn"
    :class="[`btn-${variant}`, { 'btn-sm': size === 'sm', 'btn-lg': size === 'lg', 'w-100': block }]"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-describedby="describedby"
    @click="onClick"
  >
    <component :is="icon" v-if="icon" :size="size === 'sm' ? 16 : 18" stroke-width="2" aria-hidden="true" />
    <slot />
    <component
      :is="iconRight"
      v-if="iconRight"
      :size="size === 'sm' ? 16 : 18"
      stroke-width="2"
      aria-hidden="true"
    />
  </button>
</template>

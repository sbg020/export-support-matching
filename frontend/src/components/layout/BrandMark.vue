<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 32 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="brand-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stop-color="#3478F6" />
        <stop offset="1" stop-color="#27C2D4" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#brand-gradient)" />
    <path d="M9 21.5 14.5 16l3.5 3.5L23.5 12" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M19 11.5h4.8v4.8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  size?: number;
}>();
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="faq-icon"
    :style="{ width: `${size ?? 24}px`, height: `${size ?? 24}px` }"
  >
    <path d="M12 17V11" stroke="white" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="12" cy="7" r="1.5" fill="white" />
  </svg>
</template>

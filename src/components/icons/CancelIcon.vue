<script setup lang="ts">
defineProps<{
  size?: number;
}>();
</script>

<template>
  <svg
    viewBox="0 0 70 70"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="cancel-icon"
    :style="{ width: `${size ?? 80}px`, height: `${size ?? 80}px` }"
  >
    <circle cx="35" cy="35" r="30" stroke="white" stroke-width="5" />
    <line x1="18" y1="18" x2="52" y2="52" stroke="white" stroke-width="5" stroke-linecap="round" />
  </svg>
</template>

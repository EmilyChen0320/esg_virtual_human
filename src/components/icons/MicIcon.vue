<script setup lang="ts">
defineProps<{
  size?: number;
}>();
</script>

<template>
  <svg
    viewBox="0 0 48 62"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="mic-icon"
    :style="{ width: `${size ?? 80}px`, height: `${size ?? 80}px` }"
  >
    <path
      d="M15.92 12.03c0-2.17.85-4.26 2.37-5.79A7.93 7.93 0 0 1 24 3.83c2.14 0 4.2.86 5.71 2.4a8.3 8.3 0 0 1 2.37 5.8v13.65c0 2.17-.85 4.26-2.37 5.79A7.93 7.93 0 0 1 24 33.87c-2.14 0-4.2-.86-5.71-2.4a8.3 8.3 0 0 1-2.37-5.79V12.03Z"
      stroke="white"
      stroke-width="4.41"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M5.16 25.67a19.1 19.1 0 0 0 5.52 13.52A18.47 18.47 0 0 0 24 44.79a18.47 18.47 0 0 0 13.32-5.6 19.1 19.1 0 0 0 5.52-13.52M24 44.79v10.92M13.23 55.71h21.53"
      stroke="white"
      stroke-width="4.41"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

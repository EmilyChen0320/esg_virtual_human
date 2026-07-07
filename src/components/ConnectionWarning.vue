<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { SUBTITLE_FONT_SIZE } from "../constants/ui";

defineProps<{
  show: boolean;
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="show" class="connection-warning" role="alert" aria-live="assertive">
    <svg
      class="warning-icon"
      width="29"
      height="29"
      viewBox="0 0 29 29"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="14.5" cy="14.5" r="13" stroke="#dc0000" stroke-width="2.5" fill="none" />
      <text
        x="14.5"
        y="20"
        text-anchor="middle"
        fill="#dc0000"
        font-size="18"
        font-weight="500"
        font-family="Arial, 'Noto Sans TC', sans-serif"
      >
        i
      </text>
    </svg>
    <span class="warning-text">{{ t("connection.disconnected") }}</span>
  </div>
</template>

<style scoped>
.connection-warning {
  display: flex;
  align-items: center;
  gap: 12px;
}

.warning-icon {
  flex-shrink: 0;
}

.warning-text {
  color: #dc0000;
  font-size: v-bind("`${SUBTITLE_FONT_SIZE}px`");
  font-weight: 500;
  font-family: var(--app-font-family);
  white-space: nowrap;
  line-height: 40px;
}
</style>

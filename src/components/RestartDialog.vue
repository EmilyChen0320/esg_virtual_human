<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";

import { RESTART_DIALOG_LOGO_IMAGE } from "../constants/media";
import { DIALOG_DISMISS_GUARD_MS, DIALOG_FONT_SIZE } from "../constants/ui";

const props = defineProps<{
  show: boolean;
  title?: string;
  body?: string;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const { t } = useI18n();

const displayTitle = computed(() => props.title ?? t("confirm.restart-chat-title"));
const displayBody = computed(() => props.body ?? t("confirm.restart-chat-body"));

const dialogTextStyle = computed(() => ({ fontSize: `${DIALOG_FONT_SIZE}px` }));

// Backdrop dismiss guard: only cancel when the gesture both started and ended on
// the backdrop, and not within the open-guard window. Blocks ghost/synthesized
// clicks (kiosk touch) from closing a just-opened dialog.
let pressStartedOnBackdrop = false;
let openedAt = 0;

watch(
  () => props.show,
  (show) => {
    if (show) {
      openedAt = Date.now();
      pressStartedOnBackdrop = false;
    }
  }
);

function onBackdropPointerDown() {
  pressStartedOnBackdrop = true;
}

function onBackdropClick() {
  const startedOnBackdrop = pressStartedOnBackdrop;
  pressStartedOnBackdrop = false;
  if (!startedOnBackdrop || Date.now() - openedAt < DIALOG_DISMISS_GUARD_MS) {
    return;
  }
  emit("cancel");
}
</script>

<template>
  <div
    v-if="show"
    class="restart-overlay"
    @pointerdown.self="onBackdropPointerDown"
    @click.self="onBackdropClick"
  >
    <div class="restart-card">
      <div class="restart-top">
        <img :src="RESTART_DIALOG_LOGO_IMAGE" alt="Restart dialog logo" class="restart-logo" />
        <div class="restart-text">
          <p class="restart-title" :style="dialogTextStyle">{{ displayTitle }}</p>
          <p class="restart-body" :style="dialogTextStyle">{{ displayBody }}</p>
        </div>
      </div>
      <div class="restart-buttons">
        <button class="restart-btn restart-btn--cancel" @click="$emit('cancel')">
          {{ t("confirm.restart-no") }}
        </button>
        <button class="restart-btn restart-btn--confirm" @click="$emit('confirm')">
          {{ t("confirm.restart-yes") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.restart-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.restart-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 17.5px;
  gap: 60px;
}

.restart-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.restart-logo {
  width: 211px;
  height: auto;
}

.restart-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  font-weight: 700;
  color: #5a6e78;
}

.restart-title,
.restart-body {
  margin: 0;
  line-height: normal;
}

.restart-buttons {
  display: flex;
  gap: 17.5px;
}

.restart-btn {
  width: 256px;
  height: 77px;
  border-radius: 10.5px;
  background: #5a6e78;
  color: white;
  font-weight: 700;
  font-size: v-bind("`${DIALOG_FONT_SIZE}px`");
  text-align: center;
  border: none;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    transform 0.12s ease,
    filter 0.12s ease,
    box-shadow 0.12s ease;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
}

.restart-btn:active:not(:disabled) {
  filter: brightness(1.16);
  transform: scale(0.94);
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.24),
    inset 0 0 0 4px rgba(255, 255, 255, 0.18);
}
</style>

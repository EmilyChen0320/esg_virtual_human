<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { usePressReleaseAction } from "../../composables/usePressReleaseAction";
import {
  BOTTOM_ACTION_ROW_CONTAINER,
  BOTTOM_ACTION_ROW_FAQ_BTN,
  BOTTOM_ACTION_ROW_GAP,
  BOTTOM_ACTION_ROW_RESTART_BTN,
  BOTTOM_ICON_SIZE,
  DIALOG_FONT_SIZE
} from "../../constants/ui";
import FaqIcon from "../icons/FaqIcon.vue";
import RestartIcon from "../icons/RestartIcon.vue";

const props = defineProps<{
  disabled: boolean;
  isProcessing?: boolean;
}>();

const emit = defineEmits<{
  restart: [];
  faq: [];
  blockedAction: [];
}>();

const { t } = useI18n();

function emitRestart() {
  emit("restart");
}

function emitFaq() {
  emit("faq");
}

const restartPress = usePressReleaseAction(emitRestart, {
  disabled: () => props.disabled
});
const faqPress = usePressReleaseAction(emitFaq, {
  disabled: () => props.disabled
});
</script>

<template>
  <div
    class="bottom-action-row"
    :style="{
      left: `${BOTTOM_ACTION_ROW_CONTAINER.left}px`,
      top: `${BOTTOM_ACTION_ROW_CONTAINER.top}px`,
      width: `${BOTTOM_ACTION_ROW_CONTAINER.width}px`,
      height: `${BOTTOM_ACTION_ROW_CONTAINER.height}px`
    }"
  >
    <button
      class="row-btn restart"
      :class="{ 'row-btn--disabled': disabled }"
      :disabled="disabled"
      @pointerdown.stop.prevent="restartPress.onPointerdown"
      @pointerup.stop.prevent="restartPress.onPointerup"
      @pointercancel.stop="restartPress.onPointercancel"
      @pointerleave="restartPress.onPointerleave"
      @click.stop="restartPress.onClick"
    >
      <RestartIcon :size="BOTTOM_ICON_SIZE" class="row-btn-icon" />
      <span class="row-btn-text">
        {{ isProcessing ? t("button.loading") : t("button.restart-chat") }}
      </span>
    </button>
    <button
      class="row-btn faq"
      :class="{ 'row-btn--disabled': disabled }"
      :disabled="disabled"
      @pointerdown.stop.prevent="faqPress.onPointerdown"
      @pointerup.stop.prevent="faqPress.onPointerup"
      @pointercancel.stop="faqPress.onPointercancel"
      @pointerleave="faqPress.onPointerleave"
      @click.stop="faqPress.onClick"
    >
      <FaqIcon :size="BOTTOM_ICON_SIZE" class="row-btn-icon" />
      <span class="row-btn-text">{{ isProcessing ? t("button.loading") : t("button.faq") }}</span>
    </button>
  </div>
</template>

<style scoped>
.bottom-action-row {
  position: absolute;
  display: flex;
  gap: v-bind("`${BOTTOM_ACTION_ROW_GAP}px`");
  z-index: 20;
}

.row-btn {
  flex: 1;
  height: 100%;
  border: none;
  color: white;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.2s ease;
}

.row-btn:active:not(:disabled) {
  filter: brightness(1.16);
  transform: scale(0.96);
  box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.22);
}

.row-btn--disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.row-btn.restart {
  border-radius: v-bind("`${BOTTOM_ACTION_ROW_RESTART_BTN.radius}px`");
  background: v-bind("BOTTOM_ACTION_ROW_RESTART_BTN.bg");
  font-size: v-bind("`${DIALOG_FONT_SIZE}px`");
}

.row-btn.faq {
  border-radius: v-bind("`${BOTTOM_ACTION_ROW_FAQ_BTN.radius}px`");
  background: v-bind("BOTTOM_ACTION_ROW_FAQ_BTN.bg");
  font-size: v-bind("`${DIALOG_FONT_SIZE}px`");
}

.row-btn-icon {
  flex-shrink: 0;
}

.row-btn-text {
  color: #fff;
  font-size: v-bind("`${DIALOG_FONT_SIZE}px`");
  white-space: nowrap;
}
</style>

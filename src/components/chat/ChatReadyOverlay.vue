<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { usePressReleaseAction } from "../../composables/usePressReleaseAction";
import { HOSPITAL_LOGO_IMAGE, QR_CODE_IMAGE } from "../../constants/media";
import {
  ACTION_BUTTON_LAYOUTS,
  ACTION_ICON_SIZE,
  AI_DIALOG_MAX_CHARS,
  BUTTON_FONT_SIZE,
  DIALOG_FONT_SIZE,
  READY_BOTTOM_HEADER_QR_GAP,
  READY_BOTTOM_CONTAINER,
  READY_BOTTOM_MESSAGE,
  READY_BOTTOM_QR,
  READY_BOTTOM_START_BAR,
  READY_TOP_MESSAGE,
  SUBTITLE_FONT_SIZE,
  TOP_FOOTER_DISCLAIMER,
  TOP_FOOTER_QR,
  type ActionButtonPosition
} from "../../constants/ui";
import ConnectionWarning from "../ConnectionWarning.vue";
import FaqIcon from "../icons/FaqIcon.vue";
import MicIcon from "../icons/MicIcon.vue";
import RestartIcon from "../icons/RestartIcon.vue";
import LanguageSelector from "../LanguageSelector.vue";

import BottomActionRow from "./BottomActionRow.vue";
import ChatBubble from "./ChatBubble.vue";

const props = defineProps<{
  openingMessage: string;
  isDisconnected: boolean;
  disableAllButtons: boolean;
  disableFaqRestart: boolean;
  isActionProcessing?: boolean;
  isStartingConsult?: boolean;
  isPreparingRecording?: boolean;
  faqOpen: boolean;
  buttonPosition: ActionButtonPosition;
}>();

const emit = defineEmits<{
  startChat: [];
  restart: [];
  faq: [];
  blockedAction: [];
  languageChange: [lang: string];
  reload: [];
  buttonPositionClick: [];
}>();

const { t } = useI18n();
const actionButtons = computed(() => ACTION_BUTTON_LAYOUTS[props.buttonPosition]);
const isStartActionPending = computed(
  () =>
    Boolean(props.isStartingConsult) ||
    Boolean(props.disableAllButtons && props.isActionProcessing && !props.isPreparingRecording)
);

function emitStartChat() {
  if (props.disableAllButtons) {
    emit("blockedAction");
    return;
  }
  emit("startChat");
}

function emitFaq() {
  if (props.disableFaqRestart) {
    emit("blockedAction");
    return;
  }
  emit("faq");
}

function emitRestart() {
  if (props.disableFaqRestart) {
    emit("blockedAction");
    return;
  }
  emit("restart");
}

const startPress = usePressReleaseAction(emitStartChat, {
  disabled: () => props.disableAllButtons || Boolean(props.isPreparingRecording)
});
const faqPress = usePressReleaseAction(emitFaq, {
  disabled: () => props.disableFaqRestart
});
const restartPress = usePressReleaseAction(emitRestart, {
  disabled: () => props.disableFaqRestart
});
</script>

<template>
  <div>
    <!-- Header: logo (left) + language selector (right), horizontally aligned -->
    <div class="ready-header-row">
      <div class="logo-column">
        <div class="logo-wrapper" @click.stop="emit('reload')">
          <img :src="HOSPITAL_LOGO_IMAGE" alt="Logo" class="ready-logo" />
        </div>
        <button
          class="button-position-hotspot"
          :aria-label="t('confirm.button-position-title')"
          @click.stop="emit('buttonPositionClick')"
        ></button>
      </div>
      <div class="header-right-row" @click.stop>
        <ConnectionWarning :show="isDisconnected" />
        <div class="header-right-stack">
          <LanguageSelector
            :disabled="disableAllButtons"
            @language-change="emit('languageChange', $event)"
          />
          <div v-if="buttonPosition === 'bottom'" class="ready-bottom-qr">
            <p class="ready-bottom-qr-title">{{ t("qr.title") }}</p>
            <img :src="QR_CODE_IMAGE" alt="QR Code" class="ready-bottom-qr-image" />
          </div>
        </div>
      </div>
    </div>

    <!-- Opening message bubble — top layout -->
    <div
      v-if="openingMessage && !faqOpen && buttonPosition === 'top'"
      class="ready-message"
      :style="{
        left: `${READY_TOP_MESSAGE.left}px`,
        top: `${READY_TOP_MESSAGE.top}px`
      }"
      @click.stop
    >
      <ChatBubble role="ai" :text="openingMessage" :max-chars="AI_DIALOG_MAX_CHARS" />
    </div>

    <!-- Opening message bubble — bottom layout -->
    <div
      v-if="openingMessage && !faqOpen && buttonPosition === 'bottom'"
      class="ready-bottom-message"
      :style="{
        left: `${READY_BOTTOM_MESSAGE.left}px`,
        bottom: `${READY_BOTTOM_MESSAGE.bottom}px`
      }"
      @click.stop
    >
      <ChatBubble role="ai" :text="openingMessage" :max-chars="AI_DIALOG_MAX_CHARS" />
    </div>

    <!-- Action buttons -->
    <!-- TOP layout: circle buttons (right-side) — hidden when FAQ panel is open to avoid visual overlap -->
    <template v-if="!faqOpen">
      <template v-if="buttonPosition === 'top'">
        <!-- FAQ button -->
        <button
          class="circle-btn faq-btn"
          :style="{
            left: `${actionButtons.faq.left}px`,
            top: `${actionButtons.faq.top}px`,
            width: `${actionButtons.faq.size}px`,
            height: `${actionButtons.faq.size}px`
          }"
          :disabled="disableFaqRestart"
          :class="{ 'cursor-not-allowed opacity-50': disableFaqRestart }"
          @pointerdown.stop.prevent="faqPress.onPointerdown"
          @pointerup.stop.prevent="faqPress.onPointerup"
          @pointercancel.stop="faqPress.onPointercancel"
          @pointerleave="faqPress.onPointerleave"
          @click.stop="faqPress.onClick"
        >
          <div class="circle-btn-content">
            <div
              class="icon-wrapper"
              :style="{ width: `${ACTION_ICON_SIZE}px`, height: `${ACTION_ICON_SIZE}px` }"
            >
              <FaqIcon :size="ACTION_ICON_SIZE" />
            </div>
            <span class="btn-text">
              {{ isActionProcessing ? t("button.loading") : t("button.faq") }}
            </span>
          </div>
        </button>

        <!-- Start conversation button -->
        <button
          class="start-btn ripple-button"
          :style="{
            left: `${actionButtons.main.left}px`,
            top: `${actionButtons.main.top}px`,
            width: `${actionButtons.main.size}px`,
            height: `${actionButtons.main.size}px`
          }"
          :disabled="disableAllButtons || isPreparingRecording"
          @pointerdown.stop.prevent="startPress.onPointerdown"
          @pointerup.stop.prevent="startPress.onPointerup"
          @pointercancel.stop="startPress.onPointercancel"
          @pointerleave="startPress.onPointerleave"
          @click.stop="startPress.onClick"
        >
          <div class="start-icon-wrapper">
            <MicIcon class="start-btn-icon" :size="80" />
          </div>
          <span class="start-btn-text">
            {{
              isPreparingRecording
                ? t("button.preparing-recording")
                : isStartActionPending
                  ? t("button.loading")
                  : t("button.start-chat")
            }}
          </span>
        </button>

        <!-- Restart button -->
        <button
          class="circle-btn restart-btn"
          :style="{
            left: `${actionButtons.restart.left}px`,
            top: `${actionButtons.restart.top}px`,
            width: `${actionButtons.restart.size}px`,
            height: `${actionButtons.restart.size}px`
          }"
          :disabled="disableFaqRestart"
          :class="{ 'cursor-not-allowed opacity-50': disableFaqRestart }"
          @pointerdown.stop.prevent="restartPress.onPointerdown"
          @pointerup.stop.prevent="restartPress.onPointerup"
          @pointercancel.stop="restartPress.onPointercancel"
          @pointerleave="restartPress.onPointerleave"
          @click.stop="restartPress.onClick"
        >
          <div
            class="icon-wrapper"
            :style="{ width: `${ACTION_ICON_SIZE}px`, height: `${ACTION_ICON_SIZE}px` }"
          >
            <RestartIcon :size="ACTION_ICON_SIZE" />
          </div>
          <span class="btn-text">
            {{ isActionProcessing ? t("button.loading") : t("button.restart-chat") }}
          </span>
        </button>
      </template>
    </template>

    <!-- BOTTOM layout: wheelchair stacked bar — visible regardless of FAQ panel state (no visual overlap) -->
    <template v-if="buttonPosition === 'bottom'">
      <!-- Translucent banner container -->
      <div class="ready-bottom-container"></div>

      <!-- Start-chat primary bar -->
      <button
        class="ready-bottom-start-bar"
        :disabled="disableAllButtons || isPreparingRecording"
        @pointerdown.stop.prevent="startPress.onPointerdown"
        @pointerup.stop.prevent="startPress.onPointerup"
        @pointercancel.stop="startPress.onPointercancel"
        @pointerleave="startPress.onPointerleave"
        @click.stop="startPress.onClick"
      >
        <MicIcon :size="READY_BOTTOM_START_BAR.iconSize" class="ready-bottom-bar-icon" />
        <span class="ready-bottom-bar-text">
          {{
            isPreparingRecording
              ? t("button.preparing-recording")
              : isStartActionPending
                ? t("button.loading")
                : t("button.start-chat")
          }}
        </span>
      </button>

      <!-- Restart + FAQ row -->
      <BottomActionRow
        :disabled="disableFaqRestart"
        :is-processing="isActionProcessing"
        @restart="emitRestart"
        @faq="emitFaq"
        @blocked-action="emit('blockedAction')"
      />
    </template>

    <!-- QR code section — top layout (bottom-right) -->
    <div
      v-if="buttonPosition === 'top'"
      class="ready-qr-section"
      :style="{
        left: `${TOP_FOOTER_QR.left}px`,
        top: `${TOP_FOOTER_QR.top}px`,
        width: `${TOP_FOOTER_QR.width}px`
      }"
      @click.stop
    >
      <p class="ready-qr-title">{{ t("qr.title") }}</p>
      <img :src="QR_CODE_IMAGE" alt="QR Code" class="ready-qr-image" />
    </div>

    <!-- Footer disclaimer — top layout (bottom-left) -->
    <div
      v-if="buttonPosition === 'top'"
      class="ready-disclaimer"
      :style="{
        left: `${TOP_FOOTER_DISCLAIMER.left}px`,
        top: `${TOP_FOOTER_DISCLAIMER.top}px`,
        width: `${TOP_FOOTER_DISCLAIMER.width}px`
      }"
      @click.stop
    >
      <p>{{ t("footer.topDisclaimer") }}</p>
    </div>

    <!-- Footer disclaimer — bottom layout (top-left) -->
    <div v-if="buttonPosition === 'bottom'" class="bottom-disclaimer" @click.stop>
      <p>{{ t("footer.disclaimer") }}</p>
    </div>
  </div>
</template>

<style src="./shared-action-buttons.css" scoped></style>

<style scoped>
.btn-text {
  font-size: v-bind("`${BUTTON_FONT_SIZE}px`");
}

.qr-title {
  font-size: v-bind("`${SUBTITLE_FONT_SIZE}px`");
}

.bottom-disclaimer {
  font-size: v-bind("`${SUBTITLE_FONT_SIZE}px`");
}

.ready-header-row {
  position: absolute;
  top: 1.6%;
  left: 2.4%;
  right: 3.3%;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.logo-column {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  height: 72px;
  cursor: pointer;
}

.ready-logo {
  width: 365px;
  height: auto;
  pointer-events: none;
}

.button-position-hotspot {
  position: absolute;
  top: 84px;
  left: 0;
  width: 684px;
  height: 276px;
  border: none;
  background: transparent;
  opacity: 0;
  cursor: pointer;
}

.header-right-row {
  position: relative;
  display: flex;
  align-items: flex-start;
}

.header-right-row :deep(.connection-warning) {
  position: absolute;
  right: calc(100% + 20px);
  top: 36px;
  transform: translateY(-50%);
}

/* Wraps LanguageSelector + (bottom-mode) QR so they auto-center horizontally. */
.header-right-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: v-bind("`${READY_BOTTOM_HEADER_QR_GAP}px`");
}

.ready-message {
  position: absolute;
  left: v-bind("`${READY_TOP_MESSAGE.left}px`");
  top: v-bind("`${READY_TOP_MESSAGE.top}px`");
  z-index: 20;
  display: flex;
  align-items: center;
}

.restart-btn .btn-text {
  font-size: v-bind("`${BUTTON_FONT_SIZE}px`");
  letter-spacing: 0.86px;
}

/* Start button — teal color matching Figma design */
.start-btn {
  position: absolute;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.3);
  background: #5593b5;
  cursor: pointer;
  touch-action: manipulation;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transition: all 0.2s ease;
}

.start-btn:active:not(:disabled) {
  filter: brightness(1.16);
  transform: scale(0.9);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 0 0 6px rgba(255, 255, 255, 0.22);
}

.start-icon-wrapper {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.start-btn-icon {
  width: 80px;
  height: 80px;
}

.start-btn-text {
  display: block;
  width: 100%;
  max-width: 150px;
  color: #fff;
  font-size: v-bind("`${BUTTON_FONT_SIZE}px`");
  font-weight: 700;
  line-height: 1.15;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: center;
  letter-spacing: 0.5px;
}

.ready-qr-section {
  position: absolute;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.ready-qr-title {
  width: 100%;
  margin: 0;
  color: white;
  font-size: v-bind("`${SUBTITLE_FONT_SIZE}px`");
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.25);
  white-space: nowrap;
}

.ready-qr-image {
  width: v-bind("`${TOP_FOOTER_QR.imageSize}px`");
  height: v-bind("`${TOP_FOOTER_QR.imageSize}px`");
}

.ready-disclaimer {
  position: absolute;
  z-index: 20;
  color: white;
  font-size: v-bind("`${TOP_FOOTER_DISCLAIMER.fontSize}px`");
  font-weight: 700;
  text-shadow: 0 1px 15.3px rgba(0, 0, 0, 0.3);
  line-height: v-bind("`${TOP_FOOTER_DISCLAIMER.lineHeight}px`");
}

.ready-disclaimer p {
  margin: 0;
  white-space: pre-line;
}

/* ── Ready mode bottom layout (wheelchair variant) ─────────────────── */

.ready-bottom-container {
  position: absolute;
  left: v-bind("`${READY_BOTTOM_CONTAINER.left}px`");
  top: v-bind("`${READY_BOTTOM_CONTAINER.top}px`");
  width: v-bind("`${READY_BOTTOM_CONTAINER.width}px`");
  height: v-bind("`${READY_BOTTOM_CONTAINER.height}px`");
  background: v-bind("READY_BOTTOM_CONTAINER.bg");
  z-index: 15;
  pointer-events: none;
}

.ready-bottom-message {
  position: absolute;
  left: v-bind("`${READY_BOTTOM_MESSAGE.left}px`");
  bottom: v-bind("`${READY_BOTTOM_MESSAGE.bottom}px`");
  z-index: 20;
}

.ready-bottom-start-bar {
  position: absolute;
  left: v-bind("`${READY_BOTTOM_START_BAR.left}px`");
  top: v-bind("`${READY_BOTTOM_START_BAR.top}px`");
  width: v-bind("`${READY_BOTTOM_START_BAR.width}px`");
  height: v-bind("`${READY_BOTTOM_START_BAR.height}px`");
  border-radius: v-bind("`${READY_BOTTOM_START_BAR.radius}px`");
  background: v-bind("READY_BOTTOM_START_BAR.bg");
  border: none;
  cursor: pointer;
  touch-action: manipulation;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transition: all 0.2s ease;
}

.ready-bottom-start-bar:active:not(:disabled) {
  filter: brightness(1.16);
  transform: scale(0.96);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 0 0 4px rgba(255, 255, 255, 0.22);
}

.ready-bottom-start-bar:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ready-bottom-bar-text {
  color: #fff;
  font-size: v-bind("`${DIALOG_FONT_SIZE}px`");
  font-weight: 700;
  white-space: nowrap;
}

.ready-bottom-qr {
  width: v-bind("`${READY_BOTTOM_QR.width}px`");
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: v-bind("`${READY_BOTTOM_QR.titleImageGap}px`");
}

.ready-bottom-qr-title {
  color: white;
  font-size: v-bind("`${SUBTITLE_FONT_SIZE}px`");
  font-weight: 700;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.25);
}

.ready-bottom-qr-image {
  width: v-bind("`${READY_BOTTOM_QR.imageSize}px`");
  height: v-bind("`${READY_BOTTOM_QR.imageSize}px`");
}
</style>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { usePressReleaseAction } from "../../composables/usePressReleaseAction";
import { HOSPITAL_LOGO_IMAGE, QR_CODE_IMAGE } from "../../constants/media";
import {
  ACTION_BUTTON_LAYOUTS,
  ACTION_ICON_SIZE,
  BUTTON_FONT_SIZE,
  COLOR_SECONDARY,
  CONVERSATION_BOTTOM_BAR,
  CONVERSATION_BOTTOM_CONTAINER,
  READY_BOTTOM_QR,
  STANDBY_BOTTOM_BAR,
  STANDBY_BOTTOM_CONTAINER,
  STANDBY_BOTTOM_QR,
  SUBTITLE_FONT_SIZE,
  TOP_FOOTER_DISCLAIMER,
  TOP_FOOTER_QR,
  type ActionButtonPosition
} from "../../constants/ui";
import ConnectionWarning from "../ConnectionWarning.vue";
import ConsultButton from "../ConsultButton.vue";
import CancelIcon from "../icons/CancelIcon.vue";
import MicIcon from "../icons/MicIcon.vue";
import RestartIcon from "../icons/RestartIcon.vue";
import LanguageSelector from "../LanguageSelector.vue";

import BottomActionRow from "./BottomActionRow.vue";
import SoundwaveLottie from "./SoundwaveLottie.vue";

const props = defineProps<{
  isRecording: boolean;
  isPreparingRecording?: boolean;
  isConsulting: boolean;
  isDisconnected: boolean;
  disableAllButtons: boolean;
  disableFaqRestart: boolean;
  isActionProcessing?: boolean;
  isStartingConsult?: boolean;
  shouldShowInterruptButton: boolean;
  chatMode: "standby" | "conversation";
  faqOpen: boolean;
  buttonPosition: ActionButtonPosition;
}>();

const emit = defineEmits<{
  consultClick: [];
  recordingClick: [];
  interrupt: [];
  languageChange: [lang: string];
  restart: [];
  reload: [];
  faqClick: [];
  blockedAction: [];
  buttonPositionClick: [];
}>();

const { t } = useI18n();
const actionButtons = computed(() => ACTION_BUTTON_LAYOUTS[props.buttonPosition]);
const isMainActionPending = computed(
  () =>
    Boolean(props.isStartingConsult) ||
    Boolean(props.disableAllButtons && props.isActionProcessing && !props.isPreparingRecording)
);

function emitConsultClick() {
  if (props.disableAllButtons) {
    emit("blockedAction");
    return;
  }
  emit("consultClick");
}

function emitRecordingClick() {
  if (props.isPreparingRecording) {
    emit("blockedAction");
    return;
  }
  emit("recordingClick");
}

function emitInterrupt() {
  if (props.disableAllButtons) {
    emit("blockedAction");
    return;
  }
  emit("interrupt");
}

function emitRestartClick() {
  if (props.disableFaqRestart) {
    emit("blockedAction");
    return;
  }
  emit("restart");
}

function emitFaqClick() {
  if (props.disableFaqRestart) {
    emit("blockedAction");
    return;
  }
  emit("faqClick");
}

const consultPress = usePressReleaseAction(emitConsultClick, {
  disabled: () => props.disableAllButtons
});
const recordingPress = usePressReleaseAction(emitRecordingClick, {
  disabled: () => Boolean(props.isPreparingRecording)
});
const interruptPress = usePressReleaseAction(emitInterrupt, {
  disabled: () => props.disableAllButtons
});
const faqPress = usePressReleaseAction(emitFaqClick, {
  disabled: () => props.disableFaqRestart
});
const restartPress = usePressReleaseAction(emitRestartClick, {
  disabled: () => props.disableFaqRestart
});
</script>

<template>
  <div>
    <!-- Header: logo (left) + language selector (right), always visible and horizontally aligned -->
    <div class="header-row">
      <div class="logo-column">
        <div class="logo-wrapper" @click.stop="emit('reload')">
          <img :src="HOSPITAL_LOGO_IMAGE" alt="Logo" class="hospital-logo" />
        </div>
        <button
          class="button-position-hotspot"
          :aria-label="t('confirm.button-position-title')"
          @click.stop="emit('buttonPositionClick')"
        ></button>
      </div>
      <!-- Right stack: connection warning + language selector; QR code only in standby -->
      <div class="right-stack" @click.stop>
        <div class="header-right-row">
          <ConnectionWarning :show="isDisconnected" />
          <LanguageSelector
            :disabled="disableAllButtons"
            @language-change="emit('languageChange', $event)"
          />
        </div>
        <div v-if="chatMode === 'standby' && buttonPosition === 'top'" class="qr-section-standby">
          <p class="qr-title">{{ t("qr.title") }}</p>
          <img :src="QR_CODE_IMAGE" alt="QR Code" class="qr-image" />
        </div>
      </div>
    </div>

    <!-- Standby mode: consult button -->
    <template v-if="chatMode === 'standby'">
      <!-- Top layout: right-side circle button -->
      <template v-if="buttonPosition === 'top'">
        <div class="standby-button-container" @click.stop>
          <ConsultButton
            :is-recording="isRecording"
            :is-preparing-recording="isPreparingRecording"
            :is-consulting="isConsulting"
            :disabled="disableAllButtons"
            :is-pending="isMainActionPending"
            :show-interrupt="shouldShowInterruptButton"
            @consult-click="emitConsultClick"
            @recording-click="emitRecordingClick"
            @interrupt="emitInterrupt"
          />
        </div>
      </template>

      <!-- Bottom layout: wheelchair mode — full-width bar, top-left disclaimer, bottom-right QR -->
      <template v-else>
        <div class="standby-bottom-layout" @click.stop>
          <div
            class="standby-qr-bottom"
            :style="{
              left: `${STANDBY_BOTTOM_QR.left}px`,
              top: `${STANDBY_BOTTOM_QR.top}px`,
              width: `${STANDBY_BOTTOM_QR.width}px`
            }"
          >
            <p class="qr-title">{{ t("qr.title") }}</p>
            <img :src="QR_CODE_IMAGE" alt="QR Code" class="qr-image" />
          </div>
          <div
            class="standby-bottom-container"
            :style="{
              left: `${STANDBY_BOTTOM_CONTAINER.left}px`,
              top: `${STANDBY_BOTTOM_CONTAINER.top}px`,
              width: `${STANDBY_BOTTOM_CONTAINER.width}px`,
              height: `${STANDBY_BOTTOM_CONTAINER.height}px`,
              background: STANDBY_BOTTOM_CONTAINER.bg
            }"
          ></div>
          <div
            class="standby-bar-wrapper"
            :style="{
              left: `${STANDBY_BOTTOM_BAR.left}px`,
              top: `${STANDBY_BOTTOM_BAR.top}px`,
              width: `${STANDBY_BOTTOM_BAR.width}px`,
              height: `${STANDBY_BOTTOM_BAR.height}px`
            }"
          >
            <button
              class="standby-bottom-btn"
              :style="{
                borderRadius: `${STANDBY_BOTTOM_BAR.radius}px`,
                background: STANDBY_BOTTOM_BAR.bg,
                fontSize: `${STANDBY_BOTTOM_BAR.fontSize}px`
              }"
              :disabled="disableAllButtons"
              @pointerdown.stop.prevent="consultPress.onPointerdown"
              @pointerup.stop.prevent="consultPress.onPointerup"
              @pointercancel.stop="consultPress.onPointercancel"
              @pointerleave="consultPress.onPointerleave"
              @click.stop="consultPress.onClick"
            >
              <MicIcon :size="STANDBY_BOTTOM_BAR.iconSize" />
              <span>{{ isMainActionPending ? t("button.loading") : t("button.start-chat") }}</span>
            </button>
          </div>
        </div>
      </template>
    </template>

    <!-- Conversation mode: branch on buttonPosition -->
    <template v-else>
      <!-- Top layout: circle buttons (existing behavior) -->
      <template v-if="buttonPosition === 'top'">
        <div
          class="qr-section"
          :style="{
            left: `${TOP_FOOTER_QR.left}px`,
            top: `${TOP_FOOTER_QR.top}px`,
            width: `${TOP_FOOTER_QR.width}px`
          }"
          @click.stop
        >
          <p class="qr-title">{{ t("qr.title") }}</p>
          <img :src="QR_CODE_IMAGE" alt="QR Code" class="qr-image" />
        </div>

        <div
          class="disclaimer-section"
          :style="{
            left: `${TOP_FOOTER_DISCLAIMER.left}px`,
            top: `${TOP_FOOTER_DISCLAIMER.top}px`,
            width: `${TOP_FOOTER_DISCLAIMER.width}px`
          }"
        >
          <p>{{ t("footer.topDisclaimer") }}</p>
        </div>

        <div v-if="!faqOpen" class="action-buttons-container" @click.stop>
          <!-- FAQ Button -->
          <button
            v-if="isConsulting"
            class="circle-btn faq-btn"
            :class="{ 'cursor-not-allowed opacity-50': disableFaqRestart }"
            :disabled="disableFaqRestart"
            :style="{
              left: `${actionButtons.faq.left}px`,
              top: `${actionButtons.faq.top}px`,
              width: `${actionButtons.faq.size}px`,
              height: `${actionButtons.faq.size}px`
            }"
            @pointerdown.stop.prevent="faqPress.onPointerdown"
            @pointerup.stop.prevent="faqPress.onPointerup"
            @pointercancel.stop="faqPress.onPointercancel"
            @pointerleave="faqPress.onPointerleave"
            @click.stop="faqPress.onClick"
          >
            <div class="circle-btn-content">
              <div
                class="faq-icon-container"
                :style="{ width: `${ACTION_ICON_SIZE}px`, height: `${ACTION_ICON_SIZE}px` }"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="faq-icon"
                  :style="{ width: `${ACTION_ICON_SIZE}px`, height: `${ACTION_ICON_SIZE}px` }"
                >
                  <path d="M12 17V11" stroke="white" stroke-width="2.5" stroke-linecap="round" />
                  <circle cx="12" cy="7" r="1.5" fill="white" />
                </svg>
              </div>
              <span class="btn-text">
                {{ isActionProcessing ? t("button.loading") : t("button.faq") }}
              </span>
            </div>
          </button>

          <!-- Consult / Recording / Interrupt button -->
          <div
            class="main-btn-wrapper"
            :style="{
              left: `${actionButtons.main.left}px`,
              top: `${actionButtons.main.top}px`
            }"
          >
            <ConsultButton
              :is-recording="isRecording"
              :is-preparing-recording="isPreparingRecording"
              :is-consulting="isConsulting"
              :disabled="disableAllButtons"
              :is-pending="isMainActionPending"
              :show-interrupt="shouldShowInterruptButton"
              @consult-click="emitConsultClick"
              @recording-click="emitRecordingClick"
              @interrupt="emitInterrupt"
            />
          </div>

          <!-- Restart button -->
          <button
            v-if="isConsulting"
            class="circle-btn restart-btn"
            :class="{ 'cursor-not-allowed opacity-50': disableFaqRestart }"
            :disabled="disableFaqRestart"
            :style="{
              left: `${actionButtons.restart.left}px`,
              top: `${actionButtons.restart.top}px`,
              width: `${actionButtons.restart.size}px`,
              height: `${actionButtons.restart.size}px`
            }"
            @pointerdown.stop.prevent="restartPress.onPointerdown"
            @pointerup.stop.prevent="restartPress.onPointerup"
            @pointercancel.stop="restartPress.onPointercancel"
            @pointerleave="restartPress.onPointerleave"
            @click.stop="restartPress.onClick"
          >
            <div
              class="restart-icon-container"
              :style="{ width: `${ACTION_ICON_SIZE}px`, height: `${ACTION_ICON_SIZE}px` }"
            >
              <RestartIcon :size="ACTION_ICON_SIZE" />
            </div>
            <span class="btn-text">
              {{ isActionProcessing ? t("button.loading") : t("button.restart-chat") }}
            </span>
          </button>
        </div>
      </template>

      <!-- Bottom layout: wheelchair full-width bar + restart/FAQ row -->
      <template v-else>
        <div class="conversation-bottom-layout" @click.stop>
          <!-- Top-left disclaimer -->
          <div class="bottom-disclaimer">
            <p>{{ t("footer.disclaimer") }}</p>
          </div>

          <!-- Top-right QR — uses READY_BOTTOM_QR so ready ↔ conversation are pixel-identical -->
          <div
            class="conversation-qr"
            :style="{
              left: `${READY_BOTTOM_QR.left}px`,
              top: `${READY_BOTTOM_QR.top}px`,
              width: `${READY_BOTTOM_QR.width}px`
            }"
          >
            <p class="qr-title">{{ t("qr.title") }}</p>
            <img :src="QR_CODE_IMAGE" alt="QR Code" class="qr-image conversation-qr-image" />
          </div>

          <!-- Translucent container -->
          <div
            class="conversation-bottom-container"
            :style="{
              left: `${CONVERSATION_BOTTOM_CONTAINER.left}px`,
              top: `${CONVERSATION_BOTTOM_CONTAINER.top}px`,
              width: `${CONVERSATION_BOTTOM_CONTAINER.width}px`,
              height: `${CONVERSATION_BOTTOM_CONTAINER.height}px`,
              background: CONVERSATION_BOTTOM_CONTAINER.bg
            }"
          ></div>

          <!-- Primary bar: recording / interrupt / idle states -->
          <div
            class="conversation-bar-wrapper"
            :style="{
              left: `${CONVERSATION_BOTTOM_BAR.left}px`,
              top: `${CONVERSATION_BOTTOM_BAR.top}px`,
              width: `${CONVERSATION_BOTTOM_BAR.width}px`,
              height: `${CONVERSATION_BOTTOM_BAR.height}px`
            }"
          >
            <button
              v-if="isRecording"
              class="conversation-bar-btn recording"
              :style="{
                borderRadius: `${CONVERSATION_BOTTOM_BAR.radius}px`,
                background: CONVERSATION_BOTTOM_BAR.bg,
                fontSize: `${CONVERSATION_BOTTOM_BAR.fontSize}px`
              }"
              @pointerdown.stop.prevent="recordingPress.onPointerdown"
              @pointerup.stop.prevent="recordingPress.onPointerup"
              @pointercancel.stop="recordingPress.onPointercancel"
              @pointerleave="recordingPress.onPointerleave"
              @click.stop="recordingPress.onClick"
            >
              <SoundwaveLottie />
              <span>{{ t("button.stop-recording") }}</span>
            </button>
            <button
              v-else-if="isPreparingRecording"
              class="conversation-bar-btn preparing"
              :style="{
                borderRadius: `${CONVERSATION_BOTTOM_BAR.radius}px`,
                background: CONVERSATION_BOTTOM_BAR.bg,
                fontSize: `${CONVERSATION_BOTTOM_BAR.fontSize}px`
              }"
              disabled
            >
              <MicIcon :size="CONVERSATION_BOTTOM_BAR.iconSize" />
              <span>{{ t("button.preparing-recording") }}</span>
            </button>
            <button
              v-else-if="shouldShowInterruptButton"
              class="conversation-bar-btn interrupt"
              :style="{
                borderRadius: `${CONVERSATION_BOTTOM_BAR.radius}px`,
                background: COLOR_SECONDARY,
                fontSize: `${CONVERSATION_BOTTOM_BAR.fontSize}px`
              }"
              :disabled="disableAllButtons"
              @pointerdown.stop.prevent="interruptPress.onPointerdown"
              @pointerup.stop.prevent="interruptPress.onPointerup"
              @pointercancel.stop="interruptPress.onPointercancel"
              @pointerleave="interruptPress.onPointerleave"
              @click.stop="interruptPress.onClick"
            >
              <CancelIcon :size="CONVERSATION_BOTTOM_BAR.iconSize" />
              <span>{{ t("button.interrupt") }}</span>
            </button>
            <button
              v-else
              class="conversation-bar-btn idle"
              :style="{
                borderRadius: `${CONVERSATION_BOTTOM_BAR.radius}px`,
                background: CONVERSATION_BOTTOM_BAR.bg,
                fontSize: `${CONVERSATION_BOTTOM_BAR.fontSize}px`
              }"
              :disabled="disableAllButtons"
              @pointerdown.stop.prevent="recordingPress.onPointerdown"
              @pointerup.stop.prevent="recordingPress.onPointerup"
              @pointercancel.stop="recordingPress.onPointercancel"
              @pointerleave="recordingPress.onPointerleave"
              @click.stop="recordingPress.onClick"
            >
              <MicIcon :size="CONVERSATION_BOTTOM_BAR.iconSize" />
              <span>{{ t("button.start-chat") }}</span>
            </button>
          </div>

          <!-- Restart + FAQ row -->
          <BottomActionRow
            :disabled="disableFaqRestart"
            :is-processing="isActionProcessing"
            @restart="emitRestartClick"
            @faq="emitFaqClick"
            @blocked-action="emit('blockedAction')"
          />
        </div>
      </template>
    </template>
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

.hospital-logo {
  width: 365px;
  height: auto;
}

/* --- Header (logo + language selector, all modes) --- */

.header-row {
  position: absolute;
  top: 2.1%;
  left: 3.3%;
  right: 3.3%;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.header-right-row {
  display: flex;
  align-items: center;
  position: relative;
}

.header-right-row :deep(.connection-warning) {
  position: absolute;
  right: calc(100% + 20px);
  top: 50%;
  transform: translateY(-50%);
}

.logo-column {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

/* Constrain logo wrapper to LanguageSelector height so both vertical-center align */
.logo-wrapper {
  display: flex;
  align-items: center;
  height: 72px;
  cursor: pointer;
}

.button-position-hotspot {
  position: absolute;
  top: 132px;
  left: 0;
  width: 186px;
  height: 261px;
  border: none;
  background: transparent;
  opacity: 0;
  cursor: pointer;
}

/* Right column: language selector on top, QR below (standby only) */
.right-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 104px;
  margin-top: -10px;
}

/* --- Standby mode --- */

.qr-section-standby {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}

.standby-button-container {
  position: absolute;
  right: 9.6%;
  top: 25.8%;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
}

.standby-button-container :deep(.consult-btn) {
  background: #5593b5;
  border-color: rgba(255, 255, 255, 0.3);
}

.standby-button-container :deep(.ripple-button::before),
.standby-button-container :deep(.ripple-button::after) {
  border-color: #5593b5;
  box-shadow: 0 0 5px #5593b5;
}

.credit-section {
  position: absolute;
  left: 3.3%;
  bottom: 2.3%;
  z-index: 20;
  color: white;
  font-size: 43px;
  font-weight: 700;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  line-height: 1.25;
}

/* --- Standby bottom (wheelchair) layout --- */

.standby-bottom-layout {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.standby-bottom-layout > * {
  pointer-events: auto;
}

.standby-qr-bottom {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
}

.standby-bottom-container {
  position: absolute;
  border-radius: 0;
}

.standby-bar-wrapper {
  position: absolute;
}

.standby-bottom-btn {
  width: 100%;
  height: 100%;
  border: none;
  color: white;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  cursor: pointer;
  touch-action: manipulation;
}

.standby-bottom-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* --- Conversation mode --- */

.qr-section {
  position: absolute;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.disclaimer-section {
  position: absolute;
  z-index: 20;
  color: white;
  font-size: v-bind("`${TOP_FOOTER_DISCLAIMER.fontSize}px`");
  font-weight: 700;
  text-shadow: 0 1px 15.3px rgba(0, 0, 0, 0.3);
  line-height: v-bind("`${TOP_FOOTER_DISCLAIMER.lineHeight}px`");
}

.disclaimer-section p {
  margin: 0;
  white-space: pre-line;
}

.action-buttons-container {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.action-buttons-container > * {
  pointer-events: auto;
}

.main-btn-wrapper {
  position: absolute;
}

.faq-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.restart-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* --- Conversation bottom (wheelchair) layout --- */

.conversation-bottom-layout {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.conversation-bottom-layout > * {
  pointer-events: auto;
}

.conversation-qr {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: v-bind("`${READY_BOTTOM_QR.titleImageGap}px`");
}

.conversation-qr-image {
  width: v-bind("`${READY_BOTTOM_QR.imageSize}px`");
  height: v-bind("`${READY_BOTTOM_QR.imageSize}px`");
}

.conversation-bottom-container {
  position: absolute;
  border-radius: 0;
}

.conversation-bar-wrapper {
  position: absolute;
}

.conversation-bar-btn {
  touch-action: manipulation;
  width: 100%;
  height: 100%;
  border: none;
  color: white;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  cursor: pointer;
  position: relative;
  overflow: visible;
  transition: all 0.2s ease;
}

.conversation-bar-btn:active:not(:disabled) {
  filter: brightness(1.16);
  transform: scale(0.96);
  box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.22);
}

.conversation-bar-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.conversation-bar-btn.idle,
.conversation-bar-btn.recording {
  background: #5593b5;
}

.conversation-bar-btn.interrupt {
  background: #5a6e78;
}
</style>

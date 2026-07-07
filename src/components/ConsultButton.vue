<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { usePressReleaseAction } from "../composables/usePressReleaseAction";
import { SUBTITLE_FONT_SIZE } from "../constants/ui";

import CancelIcon from "./icons/CancelIcon.vue";
import MicIcon from "./icons/MicIcon.vue";

const props = defineProps<{
  isRecording: boolean;
  isPreparingRecording?: boolean;
  isConsulting: boolean;
  disabled?: boolean;
  isPending?: boolean;
  showInterrupt?: boolean;
}>();

const emit = defineEmits<{
  consultClick: [];
  recordingClick: [];
  interrupt: [];
}>();

const { t } = useI18n();

function emitConsultClick() {
  if (props.disabled || props.isPending) {
    return;
  }
  emit("consultClick");
}

function emitRecordingClick() {
  if (props.isPreparingRecording) {
    return;
  }
  emit("recordingClick");
}

function emitIdleAction() {
  if (props.disabled) {
    return;
  }
  if (props.showInterrupt) {
    emit("interrupt");
    return;
  }
  emit("recordingClick");
}

const consultPress = usePressReleaseAction(emitConsultClick, {
  disabled: () => Boolean(props.disabled || props.isPending)
});
const recordingPress = usePressReleaseAction(emitRecordingClick);
const idlePress = usePressReleaseAction(emitIdleAction, {
  disabled: () => Boolean(props.disabled || props.isPreparingRecording)
});
</script>

<template>
  <div>
    <!-- Not consulting: Start conversation button -->
    <template v-if="!isConsulting">
      <button
        class="consult-btn ripple-button"
        :disabled="disabled || isPending"
        @pointerdown.stop.prevent="consultPress.onPointerdown"
        @pointerup.stop.prevent="consultPress.onPointerup"
        @pointercancel.stop="consultPress.onPointercancel"
        @pointerleave="consultPress.onPointerleave"
        @click.stop="consultPress.onClick"
      >
        <div class="icon-wrapper">
          <MicIcon class="consult-btn-icon" :size="80" />
        </div>
        <span class="consult-btn-text">
          {{ isPending ? t("button.loading") : t("button.start-chat") }}
        </span>
      </button>
    </template>

    <!-- Consulting: Recording/Interrupt controls -->
    <template v-else>
      <!-- Recording state -->
      <button
        v-if="isRecording"
        class="consult-btn recording"
        @pointerdown.stop.prevent="recordingPress.onPointerdown"
        @pointerup.stop.prevent="recordingPress.onPointerup"
        @pointercancel.stop="recordingPress.onPointercancel"
        @pointerleave="recordingPress.onPointerleave"
        @click.stop="recordingPress.onClick"
      >
        <div class="recording-animation">
          <div class="wave wave-1"></div>
          <div class="wave wave-2"></div>
          <div class="wave wave-3"></div>
        </div>
        <div class="recording-dot"></div>
        <span class="consult-btn-text recording-stop-text">{{ t("button.stop-recording") }}</span>
      </button>

      <!-- Idle / Interrupt state -->
      <button
        v-else
        class="consult-btn ripple-button"
        :class="{ 'interrupt-btn': showInterrupt, 'record-ready-btn': !showInterrupt }"
        :disabled="disabled || isPreparingRecording"
        @pointerdown.stop.prevent="idlePress.onPointerdown"
        @pointerup.stop.prevent="idlePress.onPointerup"
        @pointercancel.stop="idlePress.onPointercancel"
        @pointerleave="idlePress.onPointerleave"
        @click.stop="idlePress.onClick"
      >
        <template v-if="isPreparingRecording">
          <div class="icon-wrapper">
            <MicIcon class="consult-btn-icon" :size="80" />
          </div>
          <span class="consult-btn-text">{{ t("button.preparing-recording") }}</span>
        </template>
        <template v-else-if="showInterrupt">
          <div class="icon-wrapper">
            <CancelIcon class="cancel-icon" :size="80" />
          </div>
          <span class="consult-btn-text">{{ t("button.interrupt") }}</span>
        </template>
        <template v-else>
          <div class="icon-wrapper">
            <MicIcon class="consult-btn-icon" :size="80" />
          </div>
          <span class="consult-btn-text">{{ t("button.start-chat") }}</span>
        </template>
      </button>
    </template>
  </div>
</template>

<style scoped>
.consult-btn {
  --accent-light: #66b2d3;
  --accent-dark: #5593b5;
  --accent-wave: rgba(126, 194, 224, 0.82);
  --accent-wave-glow: rgba(126, 194, 224, 0.25);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 4px solid #5e91f3;
  background: linear-gradient(180deg, #0064f1 0%, #044cd7 50%, #4f96e2 100%);
  cursor: pointer;
  touch-action: manipulation;
  position: relative;
  padding: 10px;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transition: all 0.2s ease;
}

.consult-btn:active:not(:disabled) {
  filter: brightness(1.16);
  transform: scale(0.9);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 0 0 6px rgba(255, 255, 255, 0.22);
}

.interrupt-btn {
  background: var(--accent-dark);
  border-color: rgba(255, 255, 255, 0.3);
}

.record-ready-btn {
  background: var(--accent-light);
  border-color: rgba(255, 255, 255, 0.35);
}

.consult-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
}

.consult-btn-icon {
  width: 80px;
  height: 80px;
}

.cancel-icon {
  width: 80px;
  height: 80px;
}

.consult-btn-text {
  display: block;
  width: 100%;
  max-width: 132px;
  color: #fff;
  font-size: v-bind("`${SUBTITLE_FONT_SIZE}px`");
  font-weight: 700;
  line-height: 1.15;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: center;
}

/* Recording state */
.recording {
  overflow: visible;
  border-color: rgba(255, 255, 255, 0.35);
  background: var(--accent-light);
}

.recording-animation {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recording-dot {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: white;
  z-index: 10;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.2),
    0 0 0 6px rgba(255, 255, 255, 0.2);
}

.recording-stop-text {
  z-index: 10;
}

.wave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 114px;
  height: 115px;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(1);
  border: 9px solid var(--accent-wave);
  box-shadow: 0 0 10px var(--accent-wave-glow);
  pointer-events: none;
  will-change: transform, opacity;
}

.wave-1 {
  animation: ripple 2s linear infinite;
  z-index: 3;
}

.wave-2 {
  animation: ripple 2s linear infinite 0.6s;
  z-index: 2;
}

.wave-3 {
  animation: ripple 2s linear infinite 1.2s;
  z-index: 1;
}

/* Ripple effect */
.ripple-button {
  overflow: visible;
}

.ripple-button::before,
.ripple-button::after {
  content: "";
  position: absolute;
  inset: 0;
  border: 3px solid #5e91f3;
  border-radius: 50%;
  transform: scale(1);
  box-shadow: 0 0 5px #5e91f3;
}

.interrupt-btn::before,
.interrupt-btn::after {
  border-color: var(--accent-dark);
  box-shadow: 0 0 5px var(--accent-dark);
}

.record-ready-btn::before,
.record-ready-btn::after {
  border-color: var(--accent-light);
  box-shadow: 0 0 5px var(--accent-light);
}

.ripple-button:not(:disabled)::before {
  animation: ripple-main 2s linear infinite;
}

.ripple-button:not(:disabled)::after {
  animation: ripple-main 2s linear infinite 1s;
}

@keyframes ripple-main {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

@keyframes ripple {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.7;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.5);
    opacity: 0;
  }
}
</style>

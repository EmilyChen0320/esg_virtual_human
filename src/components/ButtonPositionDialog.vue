<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import {
  DIALOG_DISMISS_GUARD_MS,
  DIALOG_FONT_SIZE,
  type ActionButtonPosition
} from "../constants/ui";

const props = defineProps<{
  show: boolean;
  currentPosition: ActionButtonPosition;
}>();

const emit = defineEmits<{
  select: [position: ActionButtonPosition];
  cancel: [];
}>();

const { t } = useI18n();

const pendingPosition = shallowRef<ActionButtonPosition>(props.currentPosition);

// Backdrop dismiss guard — see RestartDialog.vue for rationale.
let pressStartedOnBackdrop = false;
let openedAt = 0;

watch(
  () => [props.show, props.currentPosition] as const,
  ([show, current]) => {
    if (show) {
      pendingPosition.value = current === "top" ? "bottom" : "top";
      openedAt = Date.now();
      pressStartedOnBackdrop = false;
    }
  },
  { immediate: true }
);

const dialogTextStyle = computed(() => ({ fontSize: `${DIALOG_FONT_SIZE}px` }));

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

function selectOption(position: ActionButtonPosition) {
  if (position === props.currentPosition) {
    return;
  }
  pendingPosition.value = position;
}

function confirmSelection() {
  emit("select", pendingPosition.value);
}
</script>

<template>
  <div
    v-if="show"
    class="button-position-overlay"
    @pointerdown.self="onBackdropPointerDown"
    @click.self="onBackdropClick"
  >
    <div class="button-position-card">
      <div class="button-position-content">
        <div class="button-position-options">
          <p class="button-position-title" :style="dialogTextStyle">
            {{ t("confirm.button-position-title") }}
          </p>
          <button
            class="button-position-option"
            :class="{
              'button-position-option--active': pendingPosition === 'top',
              'button-position-option--disabled': currentPosition === 'top'
            }"
            :disabled="currentPosition === 'top'"
            :style="dialogTextStyle"
            @click="selectOption('top')"
          >
            {{ t("confirm.button-position-top") }}
          </button>
          <button
            class="button-position-option"
            :class="{
              'button-position-option--active': pendingPosition === 'bottom',
              'button-position-option--disabled': currentPosition === 'bottom'
            }"
            :disabled="currentPosition === 'bottom'"
            :style="dialogTextStyle"
            @click="selectOption('bottom')"
          >
            {{ t("confirm.button-position-bottom") }}
          </button>
        </div>

        <button class="button-position-confirm" :style="dialogTextStyle" @click="confirmSelection">
          {{ t("confirm.button-position-confirm") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.button-position-overlay {
  position: fixed;
  inset: 0;
  z-index: 55;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.button-position-card {
  width: 722px;
  height: 511px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  position: relative;
}

.button-position-content {
  position: absolute;
  left: 39px;
  top: 32px;
  width: 641px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 60px;
}

.button-position-options {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 24px;
}

.button-position-title {
  margin: 0;
  width: 100%;
  font-weight: 700;
  line-height: normal;
  color: #5593b5;
  text-align: left;
}

.button-position-option {
  width: 100%;
  height: 96px;
  padding: 27px 34px;
  border: 4px solid #5593b5;
  border-radius: 12px;
  background: white;
  color: #5593b5;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}

.button-position-option--active {
  background: #5593b5;
  color: white;
}

.button-position-option--disabled {
  color: #aaa;
  border-color: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.button-position-confirm {
  width: 415px;
  height: 88px;
  border: none;
  border-radius: 12px;
  background: #5593b5;
  color: white;
  font-weight: 700;
  text-align: center;
  cursor: pointer;
}
</style>

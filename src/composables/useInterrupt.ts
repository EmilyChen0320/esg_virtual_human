import type { ShallowRef } from "vue";
import { onBeforeUnmount, shallowRef } from "vue";

import { chatApi } from "../api/chatApi";
import {
  INTERRUPT_COOLDOWN,
  INTERRUPT_SPEAKING_UNLOCK_DELAY,
  INTERRUPT_VIDEO_UNLOCK_DELAY
} from "../constants/timing";

export interface InterruptOptions {
  resumeIdleVideo?: boolean;
}

export interface InterruptDeps {
  sessionId: string;
  isSpeakingLocked: ShallowRef<boolean>;
  stopNotifyCheck: () => void;
  clearAllTimers: () => void;
  resetTimestamp: () => void;
  localVideo: {
    pauseCurrentVideo: () => void;
    playIdleVideo: () => void;
  };
  videoStreamRef: { value: { setMuted: (muted: boolean) => void } | null };
  isProcessing: { value: boolean };
  isAIResponding: { value: boolean };
  isEndingConsult: { value: boolean };
  showStreamVideo: { value: boolean };
  activeAiDialogText: { value: string };
  pendingAiDialogText: { value: string };
  activeAiImage: { value: string | undefined };
  firstFlag: { value: boolean };
}

export function useInterrupt(deps: InterruptDeps) {
  const isInterrupting = shallowRef(false);
  const isInterrupted = shallowRef(false);
  const videoStateLocked = shallowRef(false);

  let videoUnlockTimer: number | null = null;
  let speakingUnlockTimer: number | null = null;
  let cooldownTimer: number | null = null;

  function clearInterruptTimers() {
    if (videoUnlockTimer !== null) {
      clearTimeout(videoUnlockTimer);
      videoUnlockTimer = null;
    }
    if (speakingUnlockTimer !== null) {
      clearTimeout(speakingUnlockTimer);
      speakingUnlockTimer = null;
    }
    if (cooldownTimer !== null) {
      clearTimeout(cooldownTimer);
      cooldownTimer = null;
    }
  }

  async function handleInterrupt(options: InterruptOptions = {}) {
    if (isInterrupting.value) {
      return;
    }

    const { resumeIdleVideo = true } = options;

    try {
      isInterrupting.value = true;
      isInterrupted.value = true;
      deps.isSpeakingLocked.value = true;
      videoStateLocked.value = true;

      deps.localVideo.pauseCurrentVideo();
      deps.videoStreamRef.value?.setMuted(true);

      await chatApi.sendInterruptMessage(deps.sessionId);
      deps.stopNotifyCheck();
      deps.clearAllTimers();
      deps.resetTimestamp();

      deps.isProcessing.value = false;
      deps.isAIResponding.value = false;
      deps.isEndingConsult.value = false;
      deps.showStreamVideo.value = false;
      deps.activeAiDialogText.value = "";
      deps.pendingAiDialogText.value = "";
      deps.activeAiImage.value = undefined;
      deps.firstFlag.value = true;

      clearInterruptTimers();

      videoUnlockTimer = window.setTimeout(() => {
        videoStateLocked.value = false;
        if (resumeIdleVideo) {
          deps.localVideo.playIdleVideo();
        }
        videoUnlockTimer = null;
      }, INTERRUPT_VIDEO_UNLOCK_DELAY);

      speakingUnlockTimer = window.setTimeout(() => {
        deps.isSpeakingLocked.value = false;
        speakingUnlockTimer = null;
      }, INTERRUPT_SPEAKING_UNLOCK_DELAY);
    } catch (error) {
      console.error("[useInterrupt] Interrupt error:", error);
    } finally {
      cooldownTimer = window.setTimeout(() => {
        isInterrupting.value = false;
        cooldownTimer = null;
      }, INTERRUPT_COOLDOWN);
    }
  }

  onBeforeUnmount(clearInterruptTimers);

  return {
    isInterrupting,
    isInterrupted,
    videoStateLocked,
    handleInterrupt
  };
}

import type { ShallowRef } from "vue";
import { onBeforeUnmount } from "vue";

import {
  LAST_PROMPT_END_DELAY,
  PROCESSING_TIMEOUT,
  STREAM_HIDE_DELAY,
  STREAM_IDLE_CLOSE_DELAY
} from "../constants/timing";
import type { NotifyEvent } from "../types/chat";
import type { VideoStreamHandle } from "../types/mediaRefs";

export interface ChatNotifyDeps {
  localVideo: {
    pauseThinkingVideo: () => void;
    stopThinkingVideo: () => void;
  };
  isProcessing: ShallowRef<boolean>;
  isAIResponding: ShallowRef<boolean>;
  isConsulting: ShallowRef<boolean>;
  isLastPrompt: ShallowRef<boolean>;
  streamActive: ShallowRef<boolean>;
  showStreamVideo: ShallowRef<boolean>;
  activeAiDialogText: ShallowRef<string>;
  pendingAiDialogText: ShallowRef<string>;
  activeAiImage: ShallowRef<string | undefined>;
  videoStreamRef: { value: VideoStreamHandle | null };
  addDialog: (text: string, isUser: boolean, image?: string) => void;
  stopNotifyCheck: () => void;
  startNotifyCheck: (callbacks: {
    onStart: (event: NotifyEvent) => void;
    onEnd: () => void;
  }) => void;
  setAutoReloadTimer: () => void;
  handleEndConsult: (isTimeout: boolean) => Promise<void>;
}

export function useChatNotify(deps: ChatNotifyDeps) {
  let streamHideTimer: number | null = null;
  let streamCloseTimer: number | null = null;
  let lastPromptTimer: number | null = null;
  let processingTimeoutTimer: number | null = null;

  function clearProcessingTimeout() {
    if (processingTimeoutTimer !== null) {
      clearTimeout(processingTimeoutTimer);
      processingTimeoutTimer = null;
    }
  }

  function clearPendingCleanupTimers() {
    if (streamHideTimer !== null) {
      clearTimeout(streamHideTimer);
      streamHideTimer = null;
    }

    if (streamCloseTimer !== null) {
      clearTimeout(streamCloseTimer);
      streamCloseTimer = null;
    }

    if (lastPromptTimer !== null) {
      clearTimeout(lastPromptTimer);
      lastPromptTimer = null;
    }
  }

  function warmStream() {
    deps.streamActive.value = true;
    deps.videoStreamRef.value?.setMuted(true);
  }

  function isLikelyMatchingReply(pendingText: string, notifyText: string) {
    const normalizedPending = pendingText.trim();
    const normalizedNotify = notifyText.trim();

    if (!normalizedPending || !normalizedNotify) {
      return true;
    }

    if (
      normalizedPending === normalizedNotify ||
      normalizedPending.includes(normalizedNotify) ||
      normalizedNotify.includes(normalizedPending)
    ) {
      return true;
    }

    return normalizedPending.slice(0, 12) === normalizedNotify.slice(0, 12);
  }

  function handleNotifyStart(event: NotifyEvent) {
    if (
      deps.pendingAiDialogText.value &&
      !isLikelyMatchingReply(deps.pendingAiDialogText.value, event.event.text)
    ) {
      return;
    }

    const dialogText = deps.pendingAiDialogText.value || event.event.text;

    clearProcessingTimeout();
    clearPendingCleanupTimers();
    deps.streamActive.value = true;
    deps.localVideo.pauseThinkingVideo();
    deps.isProcessing.value = false;
    deps.addDialog(dialogText, false, deps.activeAiImage.value);
    deps.activeAiDialogText.value = dialogText;
    deps.pendingAiDialogText.value = "";
    deps.showStreamVideo.value = true;
    deps.videoStreamRef.value?.setMuted(false);
  }

  function handleNotifyEnd() {
    clearProcessingTimeout();
    clearPendingCleanupTimers();
    deps.isAIResponding.value = false;
    deps.stopNotifyCheck();
    deps.localVideo.stopThinkingVideo();
    deps.videoStreamRef.value?.setMuted(true);

    streamHideTimer = window.setTimeout(() => {
      streamHideTimer = null;
      deps.showStreamVideo.value = false;
      deps.activeAiDialogText.value = "";
      deps.pendingAiDialogText.value = "";
      deps.activeAiImage.value = undefined;
      streamCloseTimer = window.setTimeout(() => {
        streamCloseTimer = null;
        deps.streamActive.value = false;
      }, STREAM_IDLE_CLOSE_DELAY);
      if (deps.isConsulting.value) {
        deps.setAutoReloadTimer();
      }
      if (deps.isLastPrompt.value) {
        lastPromptTimer = window.setTimeout(() => {
          lastPromptTimer = null;
          deps.isLastPrompt.value = false;
          deps.handleEndConsult(true);
        }, LAST_PROMPT_END_DELAY);
      }
    }, STREAM_HIDE_DELAY);
  }

  // Business-level safety net above useNotifyEvents.startNotifyCheck.
  // Wraps the low-level polling with a PROCESSING_TIMEOUT that resets
  // stuck state if the AI response never arrives.
  function beginNotifyCheck() {
    clearProcessingTimeout();
    clearPendingCleanupTimers();
    warmStream();
    deps.startNotifyCheck({ onStart: handleNotifyStart, onEnd: handleNotifyEnd });
    processingTimeoutTimer = window.setTimeout(() => {
      processingTimeoutTimer = null;
      if (deps.isProcessing.value || deps.isAIResponding.value) {
        console.warn("[useChatNotify] Processing timeout — resetting stuck state");
        deps.stopNotifyCheck();
        deps.localVideo.stopThinkingVideo();
        deps.isProcessing.value = false;
        deps.isAIResponding.value = false;
        deps.streamActive.value = false;
        deps.showStreamVideo.value = false;
        deps.videoStreamRef.value?.setMuted(true);
        deps.activeAiDialogText.value = "";
        deps.pendingAiDialogText.value = "";
        deps.activeAiImage.value = undefined;
      }
    }, PROCESSING_TIMEOUT);
  }

  function cleanup() {
    clearProcessingTimeout();
    clearPendingCleanupTimers();
  }

  onBeforeUnmount(cleanup);

  return {
    handleNotifyStart,
    handleNotifyEnd,
    beginNotifyCheck
  };
}

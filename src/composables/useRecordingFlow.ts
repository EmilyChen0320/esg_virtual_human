import { nextTick, onBeforeUnmount, shallowRef } from "vue";

import { MAX_RECORDING_DURATION_SEC, RECORDING_TICK_INTERVAL } from "../constants/timing";
import type { TranscribeResponse } from "../types/chat";

import { INVALID_TRANSCRIBE_RESULT, type TranscribeFlowResult } from "./useChat";

interface RecordingFlowDeps {
  isDisconnected: { value: boolean };
  isRecording: { value: boolean };
  startAudioCapture: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => Promise<void>;
  isInterrupted: { value: boolean };
  firstFlag: { value: boolean };
  isProcessing: { value: boolean };
  isAIResponding: { value: boolean };
  localVideo: { startThinkingVideo: () => void; stopThinkingVideo: () => void };
  handleTranscribeResult: (
    audioBlob: Blob,
    onBeforeResponse?: () => boolean,
    userId?: string,
    onHumanSent?: () => void
  ) => Promise<TranscribeFlowResult>;
  handleAiResponsePayload: (result: TranscribeResponse) => void;
  userId: { value: string };
  beginNotifyCheck: () => void;
  clearAutoReloadTimer: () => void;
  clearAllTimers: () => void;
  stopNotifyCheck: () => void;
  muteStream: () => void;
  sendEmptySpeechToBackend: () => Promise<void>;
}

export function useRecordingFlow(deps: RecordingFlowDeps) {
  const recordingTime = shallowRef(0);
  const recordingTimer = shallowRef<number | null>(null);
  const isPreparingRecording = shallowRef(false);
  let isHandlingRecording = false;
  let isCleanedUp = false;

  async function sendEmptySpeechFallback() {
    deps.isAIResponding.value = true;
    await deps.sendEmptySpeechToBackend();
    deps.handleAiResponsePayload({});
    deps.beginNotifyCheck();
  }

  async function handleRecordingClick() {
    if (isCleanedUp) {
      return;
    }

    if (deps.isDisconnected.value) {
      return;
    }

    if (isHandlingRecording) {
      return;
    }
    isHandlingRecording = true;
    try {
      deps.clearAutoReloadTimer();
      deps.clearAllTimers();
      if (deps.isRecording.value) {
        if (recordingTimer.value) {
          clearInterval(recordingTimer.value);
          recordingTimer.value = null;
        }
        recordingTime.value = 0;

        deps.isInterrupted.value = false;
        deps.firstFlag.value = false;
        deps.isProcessing.value = true;
        deps.localVideo.startThinkingVideo();
        const stopStartedAt = Date.now();
        console.log("[useRecordingFlow] stop recording flow started");
        const audioBlob = await deps.stopRecording();
        if (audioBlob) {
          console.log(
            `[useRecordingFlow] audio ready duration=${Date.now() - stopStartedAt}ms size=${audioBlob.size}B type=${audioBlob.type || "unknown"}`
          );
          const response = await deps.handleTranscribeResult(
            audioBlob,
            () => {
              if (deps.isInterrupted.value) {
                return false;
              }
              return true;
            },
            deps.userId.value
          );
          if (response && typeof response === "object") {
            console.log(
              `[useRecordingFlow] transcribe flow completed duration=${Date.now() - stopStartedAt}ms`
            );
            deps.handleAiResponsePayload(response);
            deps.beginNotifyCheck();
          } else if (response === INVALID_TRANSCRIBE_RESULT) {
            await sendEmptySpeechFallback();
          }
        } else {
          console.warn(
            "[useRecordingFlow] empty audio after stopRecording — speech was not captured"
          );
          await sendEmptySpeechFallback();
        }
      } else {
        deps.muteStream();
        recordingTime.value = 0;
        isPreparingRecording.value = true;
        await deps.startAudioCapture();
        isPreparingRecording.value = false;
        if (isCleanedUp) {
          return;
        }
        await nextTick();
        if (recordingTimer.value) {
          clearInterval(recordingTimer.value);
        }
        recordingTimer.value = setInterval(() => {
          if (deps.isRecording.value) {
            recordingTime.value = (recordingTime.value || 0) + 1;
            if (recordingTime.value >= MAX_RECORDING_DURATION_SEC) {
              if (recordingTimer.value) {
                clearInterval(recordingTimer.value);
                recordingTimer.value = null;
              }
              handleRecordingClick();
            }
          }
        }, RECORDING_TICK_INTERVAL);
      }
    } catch (error: unknown) {
      if (recordingTimer.value) {
        clearInterval(recordingTimer.value);
        recordingTimer.value = null;
      }
      deps.isProcessing.value = false;
      deps.isAIResponding.value = false;
      isPreparingRecording.value = false;
      deps.localVideo.stopThinkingVideo();
      deps.stopNotifyCheck();
      console.error("[useRecordingFlow] handleRecordingClick failed:", error);
    } finally {
      isHandlingRecording = false;
    }
  }

  async function cancelActiveRecording() {
    if (!deps.isRecording.value) {
      isPreparingRecording.value = false;
      return;
    }

    if (recordingTimer.value) {
      clearInterval(recordingTimer.value);
      recordingTimer.value = null;
    }
    recordingTime.value = 0;
    isPreparingRecording.value = false;
    deps.isInterrupted.value = false;
    deps.firstFlag.value = false;
    await deps.cancelRecording();
  }

  function cleanup() {
    isCleanedUp = true;
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value);
      recordingTimer.value = null;
    }
    isPreparingRecording.value = false;
  }

  onBeforeUnmount(cleanup);

  return {
    recordingTime,
    recordingTimer,
    isPreparingRecording,
    handleRecordingClick,
    cancelActiveRecording,
    cleanup
  };
}

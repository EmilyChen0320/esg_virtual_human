import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { INVALID_TRANSCRIBE_RESULT } from "./useChat";
import { useRecordingFlow } from "./useRecordingFlow";

vi.mock("vue", async () => {
  const actual = await vi.importActual("vue");
  return {
    ...actual,
    nextTick: vi.fn().mockResolvedValue(undefined)
  };
});

const audioBlob = new Blob(["audio"], { type: "audio/wav" });

function createDeps() {
  return {
    isDisconnected: { value: false },
    isRecording: { value: false },
    startAudioCapture: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue(audioBlob),
    cancelRecording: vi.fn().mockResolvedValue(undefined),
    isInterrupted: { value: false },
    firstFlag: { value: true },
    isProcessing: { value: false },
    isAIResponding: { value: false },
    localVideo: { startThinkingVideo: vi.fn(), stopThinkingVideo: vi.fn() },
    handleTranscribeResult: vi.fn().mockResolvedValue({
      input_text: "你好",
      tts_text: "AI 回覆",
      options: null
    }),
    handleAiResponsePayload: vi.fn(),
    userId: { value: "user1" },
    beginNotifyCheck: vi.fn(),
    clearAutoReloadTimer: vi.fn(),
    clearAllTimers: vi.fn(),
    stopNotifyCheck: vi.fn(),
    muteStream: vi.fn(),
    sendEmptySpeechToBackend: vi.fn().mockResolvedValue(undefined)
  };
}

describe("useRecordingFlow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("start recording", () => {
    it("starts audio capture when not recording", async () => {
      const deps = createDeps();
      deps.isRecording.value = false;
      const { handleRecordingClick } = useRecordingFlow(deps);

      await handleRecordingClick();

      expect(deps.clearAutoReloadTimer).toHaveBeenCalled();
      expect(deps.clearAllTimers).toHaveBeenCalled();
      expect(deps.startAudioCapture).toHaveBeenCalledOnce();
    });

    it("does not start recording while disconnected", async () => {
      const deps = createDeps();
      deps.isDisconnected.value = true;
      const { handleRecordingClick } = useRecordingFlow(deps);

      await handleRecordingClick();

      expect(deps.startAudioCapture).not.toHaveBeenCalled();
      expect(deps.clearAutoReloadTimer).not.toHaveBeenCalled();
    });

    it("clears existing recording timer before creating a new one", async () => {
      const deps = createDeps();
      deps.isRecording.value = false;
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
      const { handleRecordingClick, recordingTimer } = useRecordingFlow(deps);

      await handleRecordingClick();
      const firstTimer = recordingTimer.value;
      expect(firstTimer).not.toBeNull();

      await handleRecordingClick();
      expect(clearIntervalSpy).toHaveBeenCalledWith(firstTimer);
      expect(recordingTimer.value).not.toBeNull();
      expect(recordingTimer.value).not.toBe(firstTimer);

      clearIntervalSpy.mockRestore();
    });

    it("mutes stream when starting recording", async () => {
      const deps = createDeps();
      deps.isRecording.value = false;
      const { handleRecordingClick } = useRecordingFlow(deps);

      await handleRecordingClick();

      expect(deps.muteStream).toHaveBeenCalledOnce();
    });

    it("sets preparing state while audio capture is pending", async () => {
      const deps = createDeps();
      deps.isRecording.value = false;
      let resolveStart!: () => void;
      deps.startAudioCapture.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveStart = resolve;
          })
      );
      const { handleRecordingClick, isPreparingRecording } = useRecordingFlow(deps);

      const startPromise = handleRecordingClick();

      expect(isPreparingRecording.value).toBe(true);
      expect(deps.startAudioCapture).toHaveBeenCalledOnce();

      resolveStart();
      await startPromise;

      expect(isPreparingRecording.value).toBe(false);
    });

    it("clears preparing state when audio capture fails", async () => {
      const deps = createDeps();
      deps.isRecording.value = false;
      deps.startAudioCapture.mockRejectedValue(new Error("mic failed"));
      const { handleRecordingClick, isPreparingRecording } = useRecordingFlow(deps);

      await handleRecordingClick();

      expect(isPreparingRecording.value).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });

    it("does not start recording twice while preparing", async () => {
      const deps = createDeps();
      deps.isRecording.value = false;
      let resolveStart!: () => void;
      deps.startAudioCapture.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveStart = resolve;
          })
      );
      const { handleRecordingClick } = useRecordingFlow(deps);

      const firstStart = handleRecordingClick();
      const secondStart = handleRecordingClick();

      expect(deps.startAudioCapture).toHaveBeenCalledOnce();

      resolveStart();
      await firstStart;
      await secondStart;
    });
  });

  describe("cancelActiveRecording", () => {
    it("cancels an active recording without sending audio", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      const { cancelActiveRecording } = useRecordingFlow(deps);

      await cancelActiveRecording();

      expect(deps.cancelRecording).toHaveBeenCalledOnce();
      expect(deps.stopRecording).not.toHaveBeenCalled();
      expect(deps.handleTranscribeResult).not.toHaveBeenCalled();
    });

    it("does nothing when recording is already inactive", async () => {
      const deps = createDeps();
      deps.isRecording.value = false;
      const { cancelActiveRecording } = useRecordingFlow(deps);

      await cancelActiveRecording();

      expect(deps.cancelRecording).not.toHaveBeenCalled();
    });
  });

  describe("stop recording", () => {
    it("stops recording, sends audio to backend STT, and begins notify check", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      const { handleRecordingClick } = useRecordingFlow(deps);

      await handleRecordingClick();

      expect(deps.stopRecording).toHaveBeenCalledOnce();
      expect(deps.localVideo.startThinkingVideo).toHaveBeenCalledOnce();
      expect(deps.handleTranscribeResult).toHaveBeenCalledWith(
        audioBlob,
        expect.any(Function),
        "user1"
      );
    });

    it("sets isProcessing true when stopping", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      const { handleRecordingClick } = useRecordingFlow(deps);

      await handleRecordingClick();

      expect(deps.firstFlag.value).toBe(false);
      expect(deps.isProcessing.value).toBe(true);
    });

    it("starts thinking video before waiting for audio processing", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      let resolveStopRecording!: (blob: Blob) => void;
      deps.stopRecording.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveStopRecording = resolve;
          })
      );
      const { handleRecordingClick } = useRecordingFlow(deps);

      const stopPromise = handleRecordingClick();

      expect(deps.localVideo.startThinkingVideo).toHaveBeenCalledOnce();
      expect(deps.handleTranscribeResult).not.toHaveBeenCalled();

      resolveStopRecording(audioBlob);
      await stopPromise;
    });

    it("blocks sending when interrupted after backend STT has started", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;

      let capturedOnBeforeResponse: (() => boolean) | undefined;
      deps.handleTranscribeResult.mockImplementation(
        (_blob, onBeforeResponse, _userId, _onHumanSent) => {
          capturedOnBeforeResponse = onBeforeResponse;
          return Promise.resolve({ input_text: "hi", tts_text: "hi" });
        }
      );

      const { handleRecordingClick } = useRecordingFlow(deps);
      await handleRecordingClick();

      deps.isInterrupted.value = true;
      expect(capturedOnBeforeResponse!()).toBe(false);
    });

    it("returns true from onBeforeResponse when not interrupted", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;

      let capturedOnBeforeResponse: (() => boolean) | undefined;
      deps.handleTranscribeResult.mockImplementation(
        (_blob, onBeforeResponse, _userId, _onHumanSent) => {
          capturedOnBeforeResponse = onBeforeResponse;
          return Promise.resolve({ input_text: "hi", tts_text: "hi" });
        }
      );

      const { handleRecordingClick } = useRecordingFlow(deps);
      await handleRecordingClick();

      deps.isInterrupted.value = false;
      expect(capturedOnBeforeResponse!()).toBe(true);
    });

    it("stores AI payload before starting notify polling", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      deps.handleTranscribeResult.mockResolvedValue({
        input_text: "hi",
        tts_text: "AI reply",
        image_url: "http://example.com/image.jpg"
      });

      const { handleRecordingClick } = useRecordingFlow(deps);
      await handleRecordingClick();

      expect(deps.handleAiResponsePayload).toHaveBeenCalledWith({
        input_text: "hi",
        tts_text: "AI reply",
        image_url: "http://example.com/image.jpg"
      });
      expect(deps.beginNotifyCheck).toHaveBeenCalledOnce();
    });

    it("forwards backend STT response payload for image handling", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      const response = {
        input_text: "hi",
        tts_text: "AI reply",
        image_url: "http://example.com/image.jpg"
      };
      deps.handleTranscribeResult.mockResolvedValue(response);
      const { handleRecordingClick } = useRecordingFlow(deps);

      await handleRecordingClick();

      expect(deps.handleAiResponsePayload).toHaveBeenCalledWith(response);
    });

    it("handles empty audio by triggering the fallback TTS playback flow", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      deps.stopRecording.mockResolvedValue(null);
      const { handleRecordingClick } = useRecordingFlow(deps);

      await handleRecordingClick();

      expect(deps.handleTranscribeResult).not.toHaveBeenCalled();
      expect(deps.isProcessing.value).toBe(true);
      expect(deps.isAIResponding.value).toBe(true);
      expect(deps.localVideo.startThinkingVideo).toHaveBeenCalledOnce();
      expect(deps.sendEmptySpeechToBackend).toHaveBeenCalledWith();
      expect(deps.handleAiResponsePayload).toHaveBeenCalledWith({});
      expect(deps.beginNotifyCheck).toHaveBeenCalledOnce();
    });

    it("handles meaningless STT as empty speech fallback", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      deps.handleTranscribeResult.mockResolvedValue(INVALID_TRANSCRIBE_RESULT);
      const { handleRecordingClick } = useRecordingFlow(deps);

      await handleRecordingClick();

      expect(deps.isAIResponding.value).toBe(true);
      expect(deps.sendEmptySpeechToBackend).toHaveBeenCalledOnce();
      expect(deps.handleAiResponsePayload).toHaveBeenCalledWith({});
      expect(deps.beginNotifyCheck).toHaveBeenCalledOnce();
    });

    it("resets recording time to 0 after stopping", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      const { recordingTime, handleRecordingClick } = useRecordingFlow(deps);

      await handleRecordingClick();

      expect(recordingTime.value).toBe(0);
    });
  });

  describe("30-second auto-stop", () => {
    it("auto-stops recording at 30 seconds", async () => {
      const deps = createDeps();
      deps.isRecording.value = false;
      const { handleRecordingClick, recordingTime } = useRecordingFlow(deps);

      await handleRecordingClick();

      deps.isRecording.value = true;

      for (let i = 0; i < 29; i++) {
        vi.advanceTimersByTime(1000);
      }
      expect(recordingTime.value).toBe(29);

      vi.advanceTimersByTime(1000);
      expect(recordingTime.value).toBe(0);
      expect(deps.stopRecording).toHaveBeenCalled();
    });
  });

  describe("concurrency guard", () => {
    it("blocks concurrent handleRecordingClick calls", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      let resolveHandleTranscribe: (value: unknown) => void;
      deps.handleTranscribeResult.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveHandleTranscribe = resolve;
          })
      );

      const { handleRecordingClick } = useRecordingFlow(deps);

      const firstCall = handleRecordingClick();
      const secondCall = handleRecordingClick();

      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      resolveHandleTranscribe!({ input_text: "ok", tts_text: "ok" });
      await firstCall;
      await secondCall;

      expect(deps.stopRecording).toHaveBeenCalledTimes(1);
      expect(deps.handleTranscribeResult).toHaveBeenCalledTimes(1);
    });

    it("allows new call after previous completes", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      const { handleRecordingClick } = useRecordingFlow(deps);

      await handleRecordingClick();
      expect(deps.stopRecording).toHaveBeenCalledTimes(1);

      deps.isRecording.value = false;
      await handleRecordingClick();
      expect(deps.startAudioCapture).toHaveBeenCalledTimes(1);
    });

    it("resets guard after error", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      deps.stopRecording.mockRejectedValue(new Error("fail"));
      const { handleRecordingClick } = useRecordingFlow(deps);

      await handleRecordingClick();
      expect(console.error).toHaveBeenCalled();

      deps.stopRecording.mockResolvedValue(audioBlob);
      deps.isRecording.value = true;
      await handleRecordingClick();
      expect(deps.handleTranscribeResult).toHaveBeenCalledOnce();
    });
  });

  describe("error handling", () => {
    it("resets state and logs error on failure", async () => {
      const deps = createDeps();
      deps.isRecording.value = true;
      deps.stopRecording.mockRejectedValue(new Error("mic error"));
      const { handleRecordingClick } = useRecordingFlow(deps);

      await handleRecordingClick();

      expect(deps.isProcessing.value).toBe(false);
      expect(deps.isAIResponding.value).toBe(false);
      expect(deps.stopNotifyCheck).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("clears recording timer", async () => {
      const deps = createDeps();
      deps.isRecording.value = false;
      const { handleRecordingClick, cleanup, recordingTimer } = useRecordingFlow(deps);

      await handleRecordingClick();
      expect(recordingTimer.value).not.toBeNull();

      cleanup();
      expect(recordingTimer.value).toBeNull();
    });

    it("clears preparing state", async () => {
      const deps = createDeps();
      deps.isRecording.value = false;
      let resolveStart!: () => void;
      deps.startAudioCapture.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveStart = resolve;
          })
      );
      const { handleRecordingClick, cleanup, isPreparingRecording, recordingTimer } =
        useRecordingFlow(deps);

      const startPromise = handleRecordingClick();
      expect(isPreparingRecording.value).toBe(true);

      cleanup();
      expect(isPreparingRecording.value).toBe(false);

      resolveStart();
      await startPromise;
      expect(recordingTimer.value).toBeNull();
    });
  });
});

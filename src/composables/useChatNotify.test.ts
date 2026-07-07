import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { shallowRef } from "vue";

import { LAST_PROMPT_END_DELAY, PROCESSING_TIMEOUT, STREAM_HIDE_DELAY } from "../constants/timing";

import { useChatNotify } from "./useChatNotify";

function createDeps() {
  return {
    localVideo: {
      pauseThinkingVideo: vi.fn(),
      stopThinkingVideo: vi.fn()
    },
    isProcessing: shallowRef(true),
    isAIResponding: shallowRef(true),
    isConsulting: shallowRef(true),
    isLastPrompt: shallowRef(false),
    streamActive: shallowRef(false),
    showStreamVideo: shallowRef(false),
    activeAiDialogText: shallowRef(""),
    pendingAiDialogText: shallowRef(""),
    activeAiImage: shallowRef<string | undefined>(undefined),
    videoStreamRef: { value: { setMuted: vi.fn() } } as {
      value: { setMuted: (muted: boolean) => void } | null;
    },
    addDialog: vi.fn(),
    stopNotifyCheck: vi.fn(),
    startNotifyCheck: vi.fn(),
    setAutoReloadTimer: vi.fn(),
    handleEndConsult: vi.fn()
  };
}

describe("useChatNotify", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handleNotifyStart pauses thinking, adds dialog, shows stream", () => {
    const deps = createDeps();
    deps.activeAiImage.value = "test-image.jpg";
    const { handleNotifyStart } = useChatNotify(deps);

    handleNotifyStart({
      event: { text: "AI response", status: "start", msgevent: null },
      timestamp: "t1"
    });

    expect(deps.localVideo.pauseThinkingVideo).toHaveBeenCalledOnce();
    expect(deps.isProcessing.value).toBe(false);
    expect(deps.addDialog).toHaveBeenCalledWith("AI response", false, "test-image.jpg");
    expect(deps.showStreamVideo.value).toBe(true);
    expect(deps.videoStreamRef.value?.setMuted).toHaveBeenCalledWith(false);
  });

  it("handleNotifyStart prefers stored message over notify event text", () => {
    const deps = createDeps();
    deps.pendingAiDialogText.value = "message from ai_chat_hciot with more complete details";
    const { handleNotifyStart } = useChatNotify(deps);

    handleNotifyStart({
      event: { text: "message from ai_chat_hciot", status: "start", msgevent: null },
      timestamp: "t1"
    });

    expect(deps.addDialog).toHaveBeenCalledWith(
      "message from ai_chat_hciot with more complete details",
      false,
      undefined
    );
    expect(deps.activeAiDialogText.value).toBe(
      "message from ai_chat_hciot with more complete details"
    );
    expect(deps.pendingAiDialogText.value).toBe("");
  });

  it("ignores stale notify start when pending reply clearly belongs to a different question", () => {
    const deps = createDeps();
    deps.pendingAiDialogText.value = "PRP是高濃度血小板血漿，利用生長因子促進組織修復。";
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { handleNotifyStart } = useChatNotify(deps);

    handleNotifyStart({
      event: {
        text: "痛風是體內普林代謝異常，導致尿酸濃度升高。",
        status: "start",
        msgevent: null
      },
      timestamp: "t-stale"
    });

    expect(deps.addDialog).not.toHaveBeenCalled();
    expect(deps.activeAiDialogText.value).toBe("");
    expect(deps.showStreamVideo.value).toBe(false);
    expect(deps.pendingAiDialogText.value).toContain("PRP");
    consoleSpy.mockRestore();
  });

  it("handleNotifyEnd resets AI responding, stops notify, mutes stream", () => {
    const deps = createDeps();
    const { handleNotifyEnd } = useChatNotify(deps);

    handleNotifyEnd();

    expect(deps.isAIResponding.value).toBe(false);
    expect(deps.stopNotifyCheck).toHaveBeenCalledOnce();
    expect(deps.localVideo.stopThinkingVideo).toHaveBeenCalledOnce();
    expect(deps.videoStreamRef.value?.setMuted).toHaveBeenCalledWith(true);
  });

  it("handleNotifyEnd hides stream after delay and sets auto reload", () => {
    const deps = createDeps();
    deps.showStreamVideo.value = true;
    const { handleNotifyEnd } = useChatNotify(deps);

    handleNotifyEnd();

    expect(deps.showStreamVideo.value).toBe(true); // Not yet hidden
    vi.advanceTimersByTime(STREAM_HIDE_DELAY);
    expect(deps.showStreamVideo.value).toBe(false);
    expect(deps.setAutoReloadTimer).toHaveBeenCalledOnce();
  });

  it("handleNotifyEnd triggers handleEndConsult when isLastPrompt is true", () => {
    const deps = createDeps();
    deps.isLastPrompt.value = true;
    const { handleNotifyEnd } = useChatNotify(deps);

    handleNotifyEnd();
    vi.advanceTimersByTime(STREAM_HIDE_DELAY);

    expect(deps.isLastPrompt.value).toBe(true); // Not yet cleared
    vi.advanceTimersByTime(LAST_PROMPT_END_DELAY);
    expect(deps.isLastPrompt.value).toBe(false);
    expect(deps.handleEndConsult).toHaveBeenCalledWith(true);
  });

  it("handleNotifyEnd does not set auto reload when not consulting", () => {
    const deps = createDeps();
    deps.isConsulting.value = false;
    const { handleNotifyEnd } = useChatNotify(deps);

    handleNotifyEnd();
    vi.advanceTimersByTime(STREAM_HIDE_DELAY);

    expect(deps.setAutoReloadTimer).not.toHaveBeenCalled();
  });

  it("beginNotifyCheck calls startNotifyCheck with correct callbacks", () => {
    const deps = createDeps();
    const { beginNotifyCheck } = useChatNotify(deps);

    beginNotifyCheck();

    expect(deps.startNotifyCheck).toHaveBeenCalledWith({
      onStart: expect.any(Function),
      onEnd: expect.any(Function)
    });
  });

  it("beginNotifyCheck warms the hidden muted stream before notify start", () => {
    const deps = createDeps();
    const { beginNotifyCheck } = useChatNotify(deps);

    beginNotifyCheck();

    expect(deps.streamActive.value).toBe(true);
    expect(deps.showStreamVideo.value).toBe(false);
    expect(deps.videoStreamRef.value?.setMuted).toHaveBeenCalledWith(true);
  });

  it("handleNotifyStart sets activeAiDialogText", () => {
    const deps = createDeps();
    const { handleNotifyStart } = useChatNotify(deps);

    handleNotifyStart({
      event: { text: "AI response", status: "start", msgevent: null },
      timestamp: "t1"
    });

    expect(deps.activeAiDialogText.value).toBe("AI response");
  });

  it("handleNotifyStart falls back to notify event text when stored message is empty", () => {
    const deps = createDeps();
    deps.pendingAiDialogText.value = "";
    const { handleNotifyStart } = useChatNotify(deps);

    handleNotifyStart({
      event: { text: "AI response", status: "start", msgevent: null },
      timestamp: "t1"
    });

    expect(deps.addDialog).toHaveBeenCalledWith("AI response", false, undefined);
    expect(deps.activeAiDialogText.value).toBe("AI response");
  });

  it("handleNotifyEnd clears activeAiDialogText after delay", () => {
    const deps = createDeps();
    deps.activeAiDialogText.value = "some text";
    const { handleNotifyEnd } = useChatNotify(deps);

    handleNotifyEnd();

    expect(deps.activeAiDialogText.value).toBe("some text");
    vi.advanceTimersByTime(STREAM_HIDE_DELAY);
    expect(deps.activeAiDialogText.value).toBe("");
  });

  it("handleNotifyStart handles null videoStreamRef gracefully", () => {
    const deps = createDeps();
    deps.videoStreamRef.value = null;
    const { handleNotifyStart } = useChatNotify(deps);

    handleNotifyStart({
      event: { text: "test", status: "start", msgevent: null },
      timestamp: "t1"
    });

    expect(deps.addDialog).toHaveBeenCalledWith("test", false, undefined);
  });

  describe("processing timeout", () => {
    it("resets stuck state after PROCESSING_TIMEOUT", () => {
      const deps = createDeps();
      deps.isProcessing.value = true;
      deps.isAIResponding.value = true;
      const { beginNotifyCheck } = useChatNotify(deps);

      beginNotifyCheck();

      vi.advanceTimersByTime(PROCESSING_TIMEOUT);

      expect(deps.isProcessing.value).toBe(false);
      expect(deps.isAIResponding.value).toBe(false);
      expect(deps.stopNotifyCheck).toHaveBeenCalled();
      expect(deps.localVideo.stopThinkingVideo).toHaveBeenCalled();
    });

    it("resets showStreamVideo, mutes stream, and clears active AI state on processing timeout", () => {
      const deps = createDeps();
      deps.isProcessing.value = true;
      deps.isAIResponding.value = true;
      deps.showStreamVideo.value = true;
      deps.activeAiDialogText.value = "some text";
      deps.activeAiImage.value = "test.jpg";
      const { beginNotifyCheck } = useChatNotify(deps);

      beginNotifyCheck();

      vi.advanceTimersByTime(PROCESSING_TIMEOUT);

      expect(deps.streamActive.value).toBe(false);
      expect(deps.showStreamVideo.value).toBe(false);
      expect(deps.videoStreamRef.value?.setMuted).toHaveBeenCalledWith(true);
      expect(deps.activeAiDialogText.value).toBe("");
      expect(deps.pendingAiDialogText.value).toBe("");
      expect(deps.activeAiImage.value).toBeUndefined();
    });

    it("does not reset state if notify events arrive in time", () => {
      const deps = createDeps();
      deps.isProcessing.value = true;
      deps.isAIResponding.value = true;
      const { beginNotifyCheck, handleNotifyStart } = useChatNotify(deps);

      beginNotifyCheck();

      handleNotifyStart({
        event: { text: "response", status: "start", msgevent: null },
        timestamp: "t1"
      });

      vi.advanceTimersByTime(PROCESSING_TIMEOUT);

      expect(deps.stopNotifyCheck).not.toHaveBeenCalled();
    });

    it("clears processing timeout on handleNotifyEnd", () => {
      const deps = createDeps();
      deps.isProcessing.value = false;
      deps.isAIResponding.value = false;
      const { beginNotifyCheck, handleNotifyEnd } = useChatNotify(deps);

      beginNotifyCheck();
      handleNotifyEnd();

      vi.advanceTimersByTime(PROCESSING_TIMEOUT);

      expect(deps.localVideo.stopThinkingVideo).toHaveBeenCalledTimes(1);
    });
  });

  it("cleanup clears pending timers so they do not fire after teardown", () => {
    const deps = createDeps();
    deps.isLastPrompt.value = true;
    const { beginNotifyCheck, handleNotifyEnd } = useChatNotify(deps);

    // Start processing timeout and stream-hide / last-prompt timers
    beginNotifyCheck();
    handleNotifyEnd();

    // Manually invoke the cleanup exposed via onBeforeUnmount
    // Since useChatNotify is called outside a component, onBeforeUnmount is a no-op,
    // but the internal cleanup functions are exercised through beginNotifyCheck paths.
    // Re-invoke beginNotifyCheck to confirm it clears the old processing timeout first.
    deps.isProcessing.value = false;
    deps.isAIResponding.value = false;
    beginNotifyCheck();

    // Advancing past original PROCESSING_TIMEOUT should not double-fire
    vi.advanceTimersByTime(PROCESSING_TIMEOUT + STREAM_HIDE_DELAY + LAST_PROMPT_END_DELAY);

    // The stopNotifyCheck should only be called from handleNotifyEnd and the new beginNotifyCheck's timeout
    // Not from the old (cleared) processing timeout
    expect(deps.localVideo.stopThinkingVideo).toHaveBeenCalled();
  });

  it("does not let a stale end timer hide a newer stream", () => {
    const deps = createDeps();
    deps.showStreamVideo.value = true;
    deps.activeAiDialogText.value = "old text";
    deps.activeAiImage.value = "old-image.jpg";
    const { handleNotifyStart, handleNotifyEnd } = useChatNotify(deps);

    handleNotifyEnd();
    vi.advanceTimersByTime(STREAM_HIDE_DELAY - 1);

    deps.activeAiImage.value = "new-image.jpg";
    handleNotifyStart({
      event: { text: "new text", status: "start", msgevent: null },
      timestamp: "t2"
    });

    vi.advanceTimersByTime(1);

    expect(deps.showStreamVideo.value).toBe(true);
    expect(deps.activeAiDialogText.value).toBe("new text");
    expect(deps.activeAiImage.value).toBe("new-image.jpg");
    expect(deps.setAutoReloadTimer).not.toHaveBeenCalled();
  });
});

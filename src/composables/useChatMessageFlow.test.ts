import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { shallowRef } from "vue";

import { INFO_BUTTON_COOLDOWN } from "../constants/timing";

import { useChatMessageFlow } from "./useChatMessageFlow";

function createDeps() {
  return {
    clearAutoReloadTimer: vi.fn(),
    clearAllTimers: vi.fn(),
    stopNotifyCheck: vi.fn(),
    localVideo: {
      startThinkingVideo: vi.fn(),
      stopThinkingVideo: vi.fn()
    },
    handleTextMessage: vi.fn().mockResolvedValue(false),
    isInterrupted: shallowRef(false),
    firstFlag: shallowRef(true),
    isProcessing: shallowRef(false),
    isInfoButtonOnCooldown: shallowRef(false),
    isAIResponding: shallowRef(false),
    userId: shallowRef("user-1"),
    pendingAiDialogText: shallowRef(""),
    activeAiImage: shallowRef<string | undefined>(undefined),
    beginNotifyCheck: vi.fn(),
    isDisconnected: { value: false }
  };
}

describe("useChatMessageFlow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("handleSendMessage", () => {
    it("sends message and starts thinking video", async () => {
      const deps = createDeps();
      const { handleSendMessage } = useChatMessageFlow(deps);

      await handleSendMessage("hello");

      expect(deps.clearAutoReloadTimer).toHaveBeenCalled();
      expect(deps.clearAllTimers).toHaveBeenCalled();
      expect(deps.localVideo.startThinkingVideo).toHaveBeenCalledWith();
      expect(deps.handleTextMessage).toHaveBeenCalledWith(
        "hello",
        "user-1",
        expect.any(Function),
        undefined,
        undefined
      );
    });

    it("sets isProcessing during message flow", async () => {
      const deps = createDeps();
      deps.handleTextMessage.mockImplementation(async () => {
        expect(deps.isProcessing.value).toBe(true);
        return false;
      });
      const { handleSendMessage } = useChatMessageFlow(deps);

      await handleSendMessage("hello");

      expect(deps.isProcessing.value).toBe(true); // still true since no error
    });

    it("skips when cooldown is active and skipCooldown is false", async () => {
      const deps = createDeps();
      deps.isInfoButtonOnCooldown.value = true;
      const { handleSendMessage } = useChatMessageFlow(deps);

      await handleSendMessage("hello", false);

      expect(deps.handleTextMessage).not.toHaveBeenCalled();
    });

    it("ignores cooldown when skipCooldown is true", async () => {
      const deps = createDeps();
      deps.isInfoButtonOnCooldown.value = true;
      const { handleSendMessage } = useChatMessageFlow(deps);

      await handleSendMessage("hello", true);

      expect(deps.handleTextMessage).toHaveBeenCalled();
    });

    it("sets cooldown timer when not skipped", async () => {
      const deps = createDeps();
      const { handleSendMessage } = useChatMessageFlow(deps);

      await handleSendMessage("hello", false);

      expect(deps.isInfoButtonOnCooldown.value).toBe(true);
      vi.advanceTimersByTime(INFO_BUTTON_COOLDOWN);
      expect(deps.isInfoButtonOnCooldown.value).toBe(false);
    });

    it("resets state and shows error on failure", async () => {
      const deps = createDeps();
      deps.handleTextMessage.mockRejectedValue(new Error("network error"));
      const { handleSendMessage } = useChatMessageFlow(deps);

      await handleSendMessage("hello");

      expect(deps.isProcessing.value).toBe(false);
      expect(deps.isAIResponding.value).toBe(false);
      expect(deps.localVideo.stopThinkingVideo).toHaveBeenCalled();
      expect(deps.stopNotifyCheck).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it("resets cooldown on error when not skipped", async () => {
      const deps = createDeps();
      deps.handleTextMessage.mockRejectedValue(new Error("fail"));
      const { handleSendMessage } = useChatMessageFlow(deps);

      await handleSendMessage("hello", false);

      expect(deps.isInfoButtonOnCooldown.value).toBe(false);
    });

    it("returns false from onBeforeResponse when interrupted", async () => {
      const deps = createDeps();

      let capturedOnBeforeResponse: (() => boolean) | undefined;
      deps.handleTextMessage.mockImplementation(
        async (_msg: string, _uid: string | undefined, onBefore?: () => boolean) => {
          capturedOnBeforeResponse = onBefore;
          // Simulate interrupt happening during the API call
          deps.isInterrupted.value = true;
          return false;
        }
      );

      const { handleSendMessage } = useChatMessageFlow(deps);
      await handleSendMessage("hello", true);

      expect(capturedOnBeforeResponse!()).toBe(false);
    });

    it("stores AI payload before starting notify polling", async () => {
      const deps = createDeps();
      deps.handleTextMessage.mockResolvedValue({
        message: "AI reply",
        options: null,
        image_url: "http://example.com/image.jpg"
      });

      const { handleSendMessage } = useChatMessageFlow(deps);
      await handleSendMessage("hello", true);

      expect(deps.pendingAiDialogText.value).toBe("AI reply");
      expect(deps.activeAiImage.value).toBe("http://example.com/image.jpg");
      expect(deps.beginNotifyCheck).toHaveBeenCalledOnce();
    });
  });

  describe("handleAiResponsePayload", () => {
    it("stores message for the AI dialog bubble", () => {
      const deps = createDeps();
      const { handleAiResponsePayload } = useChatMessageFlow(deps);

      handleAiResponsePayload({
        message: "normal response",
        options: null,
        tts_text: "normal response"
      });

      expect(deps.pendingAiDialogText.value).toBe("normal response");
    });

    it("accepts response payload without error", () => {
      const deps = createDeps();
      const { handleAiResponsePayload } = useChatMessageFlow(deps);

      handleAiResponsePayload({
        message: "normal response",
        options: null,
        tts_text: "normal response"
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { chatApi } from "../api/chatApi";

import { INVALID_TRANSCRIBE_RESULT, useChat } from "./useChat";

vi.mock("../api/chatApi", () => ({
  chatApi: {
    checkSpeakingStatus: vi.fn(),
    sendHumanMessage: vi.fn(),
    sendTextMessage: vi.fn(),
    transcribeAudio: vi.fn(),
    getCurrentConfig: vi.fn(),
    getAvatars: vi.fn(),
    getVoices: vi.fn()
  }
}));

vi.mock("vue", async () => {
  const actual = await vi.importActual("vue");
  return {
    ...actual,
    onBeforeUnmount: vi.fn()
  };
});

describe("useChat", () => {
  const audioBlob = new Blob(["audio"], { type: "audio/wav" });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("addDialog pushes to dialogHistory", () => {
    const { addDialog, dialogHistory } = useChat("1");
    addDialog("Hello", true);
    addDialog("Hi there", false);

    expect(dialogHistory.value).toEqual([
      { text: "Hello", isUser: true },
      { text: "Hi there", isUser: false }
    ]);
  });

  it("clearDialogHistory empties the array", () => {
    const { addDialog, clearDialogHistory, dialogHistory } = useChat("1");
    addDialog("test", true);
    clearDialogHistory();
    expect(dialogHistory.value).toEqual([]);
  });

  describe("handleTextMessage", () => {
    it("sends text to API and returns response", async () => {
      const mockResponse = {
        message: "AI says hello (display)",
        options: null,
        text: "AI says hello (text field)",
        tts_text: "AI says hello (tts)"
      };

      vi.mocked(chatApi.sendTextMessage).mockResolvedValue(mockResponse);
      vi.mocked(chatApi.sendHumanMessage).mockResolvedValue(undefined);

      const { handleTextMessage, dialogHistory } = useChat("1");
      const result = await handleTextMessage("Hello", "user1");

      expect(dialogHistory.value[0]).toEqual({ text: "Hello", isUser: true });
      expect(chatApi.sendTextMessage).toHaveBeenCalledWith("Hello", "user1");
      expect(chatApi.sendHumanMessage).toHaveBeenCalledWith(
        "AI says hello (display)",
        "1",
        "user1"
      );
      expect(result).toEqual(mockResponse);
    });

    it("uses displayText for the user bubble while still sending the raw text to API", async () => {
      vi.mocked(chatApi.sendTextMessage).mockResolvedValue({
        message: "AI says hello",
        options: null
      });
      vi.mocked(chatApi.sendHumanMessage).mockResolvedValue(undefined);

      const { handleTextMessage, dialogHistory } = useChat("1");
      await handleTextMessage(
        "什麼是痛風？",
        "user1",
        undefined,
        undefined,
        "骨科＋復健科/痛風常見問題/什麼是痛風？"
      );

      expect(dialogHistory.value[0]).toEqual({
        text: "骨科＋復健科/痛風常見問題/什麼是痛風？",
        isUser: true
      });
      expect(chatApi.sendTextMessage).toHaveBeenCalledWith("什麼是痛風？", "user1");
    });

    it("uses message when tts_text is missing", async () => {
      vi.mocked(chatApi.sendTextMessage).mockResolvedValue({
        options: null,
        message: "message fallback",
        text: "text fallback"
      });
      vi.mocked(chatApi.sendHumanMessage).mockResolvedValue(undefined);

      const { handleTextMessage } = useChat("1");
      await handleTextMessage("Hello", "user1");

      expect(chatApi.sendHumanMessage).toHaveBeenCalledWith("message fallback", "1", "user1");
    });

    it("uses message when text and tts_text are both present", async () => {
      vi.mocked(chatApi.sendTextMessage).mockResolvedValue({
        message: "message fallback",
        options: null,
        tts_text: "tts only"
      });
      vi.mocked(chatApi.sendHumanMessage).mockResolvedValue(undefined);

      const { handleTextMessage } = useChat("1");
      await handleTextMessage("Hello", "user1");

      expect(chatApi.sendHumanMessage).toHaveBeenCalledWith("message fallback", "1", "user1");
    });

    it("throws when message is missing even if tts_text exists", async () => {
      vi.mocked(chatApi.sendTextMessage).mockResolvedValue({
        options: null,
        tts_text: "tts only"
      });
      vi.mocked(chatApi.sendHumanMessage).mockResolvedValue(undefined);

      const { handleTextMessage } = useChat("1");
      await expect(handleTextMessage("Hello", "user1")).rejects.toThrow(
        "Text message response did not include message"
      );
      expect(chatApi.sendHumanMessage).not.toHaveBeenCalled();
    });

    it("stops when onBeforeResponse returns false", async () => {
      vi.mocked(chatApi.sendTextMessage).mockResolvedValue({
        message: "test",
        options: null,
        tts_text: "test"
      });

      const { handleTextMessage, isAIResponding } = useChat("1");
      const result = await handleTextMessage("Hello", "user1", () => false);

      expect(result).toBe(false);
      expect(chatApi.sendHumanMessage).not.toHaveBeenCalled();
      expect(isAIResponding.value).toBe(false);
    });

    it("throws when session_id is missing", async () => {
      const { handleTextMessage } = useChat("1");
      await expect(handleTextMessage("Hello")).rejects.toThrow(
        "Missing session_id for text message"
      );
      expect(chatApi.sendTextMessage).not.toHaveBeenCalled();
    });

    it("calls onHumanSent after sending human message", async () => {
      vi.mocked(chatApi.sendTextMessage).mockResolvedValue({
        message: "test",
        options: null,
        tts_text: "test"
      });
      vi.mocked(chatApi.sendHumanMessage).mockResolvedValue(undefined);

      const onHumanSent = vi.fn();
      const { handleTextMessage } = useChat("1");
      await handleTextMessage("Hello", "user1", undefined, onHumanSent);

      expect(onHumanSent).toHaveBeenCalledOnce();
    });

    it("sets isAIResponding and throws on error", async () => {
      vi.mocked(chatApi.sendTextMessage).mockRejectedValue(new Error("Network error"));

      const { handleTextMessage, isAIResponding } = useChat("1");
      await expect(handleTextMessage("Hello", "user1")).rejects.toThrow("Network error");
      expect(isAIResponding.value).toBe(false);
    });

    it("throws when the response has no message", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(chatApi.sendTextMessage).mockResolvedValue({
        options: null
      });

      const { handleTextMessage, isAIResponding } = useChat("1");

      await expect(handleTextMessage("Hello", "user1")).rejects.toThrow(
        "Text message response did not include message"
      );
      expect(chatApi.sendHumanMessage).not.toHaveBeenCalled();
      expect(isAIResponding.value).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[useChat] message flow error:",
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe("handleTranscribeResult", () => {
    it("sends audio to backend STT then forwards tts_text to human", async () => {
      vi.mocked(chatApi.transcribeAudio).mockResolvedValue({
        input_text: "user speech",
        text: "AI text reply",
        tts_text: "AI tts reply (speech)",
        options: null
      });
      vi.mocked(chatApi.sendHumanMessage).mockResolvedValue(undefined);

      const { handleTranscribeResult, dialogHistory } = useChat("1");
      const result = await handleTranscribeResult(audioBlob, undefined, "user1");

      expect(dialogHistory.value[0]).toEqual({ text: "user speech", isUser: true });
      expect(chatApi.transcribeAudio).toHaveBeenCalledWith(audioBlob, "1", "user1");
      expect(chatApi.sendHumanMessage).toHaveBeenCalledWith("AI tts reply (speech)", "1", "user1");
      expect(result).toEqual({
        input_text: "user speech",
        text: "AI text reply",
        tts_text: "AI tts reply (speech)",
        options: null
      });
    });

    it("stops when onBeforeResponse returns false", async () => {
      vi.mocked(chatApi.transcribeAudio).mockResolvedValue({
        input_text: "speech",
        tts_text: "AI tts reply",
        options: null
      });

      const { handleTranscribeResult } = useChat("1");
      const result = await handleTranscribeResult(audioBlob, () => false, "user1");

      expect(result).toBe(false);
      expect(chatApi.sendHumanMessage).not.toHaveBeenCalled();
    });

    it("uses text fallback when input_text is missing", async () => {
      vi.mocked(chatApi.transcribeAudio).mockResolvedValue({
        text: "fallback transcript",
        tts_text: "AI tts reply",
        options: null
      });
      vi.mocked(chatApi.sendHumanMessage).mockResolvedValue(undefined);

      const { handleTranscribeResult, dialogHistory } = useChat("1");
      await handleTranscribeResult(audioBlob, undefined, "user1");

      expect(dialogHistory.value[0].text).toBe("fallback transcript");
    });

    it("ignores a single punctuation transcript without adding a user bubble", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(chatApi.transcribeAudio).mockResolvedValue({
        input_text: ".",
        tts_text: "AI tts reply",
        options: null
      });

      const { handleTranscribeResult, dialogHistory } = useChat("1");
      const result = await handleTranscribeResult(audioBlob, undefined, "user1");

      expect(result).toBe(INVALID_TRANSCRIBE_RESULT);
      expect(dialogHistory.value).toEqual([]);
      expect(chatApi.sendHumanMessage).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("ignores whitespace and punctuation-only transcripts", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(chatApi.transcribeAudio).mockResolvedValue({
        input_text: " ... ，。",
        tts_text: "AI tts reply",
        options: null
      });

      const { handleTranscribeResult, dialogHistory } = useChat("1");
      const result = await handleTranscribeResult(audioBlob, undefined, "user1");

      expect(result).toBe(INVALID_TRANSCRIBE_RESULT);
      expect(dialogHistory.value).toEqual([]);
      expect(chatApi.sendHumanMessage).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe("startSpeakingCheck", () => {
    it("polls speaking status at 200ms interval", async () => {
      vi.mocked(chatApi.checkSpeakingStatus).mockResolvedValue({ data: false });

      const { startSpeakingCheck, isSpeaking } = useChat("1");
      await startSpeakingCheck();

      expect(chatApi.checkSpeakingStatus).toHaveBeenCalledTimes(1);
      expect(isSpeaking.value).toBe(false);

      vi.mocked(chatApi.checkSpeakingStatus).mockResolvedValue({ data: true });
      await vi.advanceTimersByTimeAsync(200);
      expect(isSpeaking.value).toBe(true);
    });

    it("respects isSpeakingLocked", async () => {
      const locked = { value: true };
      vi.mocked(chatApi.checkSpeakingStatus).mockResolvedValue({ data: true });

      const { startSpeakingCheck, isSpeaking } = useChat("1", locked);
      await startSpeakingCheck();

      expect(isSpeaking.value).toBe(false); // Locked, should not update
    });
  });

  describe("initializeSettings", () => {
    it("fetches config, avatars, and voices", async () => {
      vi.mocked(chatApi.getCurrentConfig).mockResolvedValue({ code: 0, data: {} });
      vi.mocked(chatApi.getAvatars).mockResolvedValue({
        code: 0,
        data: { a1: { id: "1", display_name: "Avatar1" } }
      });
      vi.mocked(chatApi.getVoices).mockResolvedValue({
        code: 0,
        data: { v1: { id: 1, name: "Voice1" } }
      });

      const { initializeSettings } = useChat("1");
      await initializeSettings();

      expect(chatApi.getCurrentConfig).toHaveBeenCalled();
      expect(chatApi.getAvatars).toHaveBeenCalled();
      expect(chatApi.getVoices).toHaveBeenCalled();
    });

    it("throws on config error", async () => {
      vi.mocked(chatApi.getCurrentConfig).mockRejectedValue(new Error("fail"));

      const { initializeSettings } = useChat("1");
      await expect(initializeSettings()).rejects.toThrow("Failed to initialize settings");
    });

    it("skips avatars/voices when config code is non-zero", async () => {
      vi.mocked(chatApi.getCurrentConfig).mockResolvedValue({ code: 1, data: {} });

      const { initializeSettings } = useChat("1");
      await initializeSettings();

      expect(chatApi.getAvatars).not.toHaveBeenCalled();
    });

    it("skips avatars/voices when their codes are non-zero", async () => {
      vi.mocked(chatApi.getCurrentConfig).mockResolvedValue({ code: 0, data: {} });
      vi.mocked(chatApi.getAvatars).mockResolvedValue({ code: 1, data: {} });
      vi.mocked(chatApi.getVoices).mockResolvedValue({ code: 1, data: {} });

      const { initializeSettings } = useChat("1");
      await initializeSettings();

      // Should not throw, just skip setting avatars/voices
      expect(chatApi.getAvatars).toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("clears speaking check interval", async () => {
      vi.mocked(chatApi.checkSpeakingStatus).mockResolvedValue({ data: false });

      const { startSpeakingCheck, cleanup } = useChat("1");
      await startSpeakingCheck();

      cleanup();

      // After cleanup, advancing timers should not call the API again
      vi.mocked(chatApi.checkSpeakingStatus).mockClear();
      await vi.advanceTimersByTimeAsync(1000);
      expect(chatApi.checkSpeakingStatus).not.toHaveBeenCalled();
    });
  });

  describe("checkSpeakingStatus error handling", () => {
    it("logs error and does not crash when checkSpeakingStatus throws", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(chatApi.checkSpeakingStatus).mockRejectedValue(new Error("network failure"));

      const { startSpeakingCheck, isSpeaking } = useChat("1");
      await startSpeakingCheck();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[useChat] checkSpeakingStatus failed:",
        expect.any(Error)
      );
      expect(isSpeaking.value).toBe(false);
      consoleErrorSpy.mockRestore();
    });
  });

  describe("handleTranscribeResult error handling", () => {
    it("sets isAIResponding to false and rethrows when transcribeAudio throws", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(chatApi.transcribeAudio).mockRejectedValue(new Error("send failed"));

      const { handleTranscribeResult, isAIResponding } = useChat("1");

      await expect(handleTranscribeResult(audioBlob, undefined, "user1")).rejects.toThrow(
        "send failed"
      );
      expect(isAIResponding.value).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[useChat] transcribe flow error:",
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it("sets isAIResponding to false and rethrows when sendHumanMessage throws", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(chatApi.transcribeAudio).mockResolvedValue({
        input_text: "hello",
        tts_text: "AI tts",
        options: null
      });
      vi.mocked(chatApi.sendHumanMessage).mockRejectedValue(new Error("human failed"));

      const { handleTranscribeResult, isAIResponding } = useChat("1");

      await expect(handleTranscribeResult(audioBlob, undefined, "user1")).rejects.toThrow(
        "human failed"
      );
      expect(isAIResponding.value).toBe(false);
      consoleErrorSpy.mockRestore();
    });
  });

  describe("onBeforeUnmount cleanup", () => {
    it("registers onBeforeUnmount hook that calls cleanup", async () => {
      const { onBeforeUnmount } = await import("vue");
      vi.mocked(chatApi.checkSpeakingStatus).mockResolvedValue({ data: false });

      const { startSpeakingCheck } = useChat("1");
      await startSpeakingCheck();

      // onBeforeUnmount should have been called with a function
      expect(onBeforeUnmount).toHaveBeenCalledWith(expect.any(Function));

      // Execute the registered cleanup callback
      const cleanupCallback = vi.mocked(onBeforeUnmount).mock.calls[0][0] as () => void;
      cleanupCallback();

      // After cleanup, advancing timers should not call the API again
      vi.mocked(chatApi.checkSpeakingStatus).mockClear();
      await vi.advanceTimersByTimeAsync(1000);
      expect(chatApi.checkSpeakingStatus).not.toHaveBeenCalled();
    });
  });

  describe("handleTranscribeResult callbacks", () => {
    it("calls onHumanSent callback after sending", async () => {
      vi.mocked(chatApi.transcribeAudio).mockResolvedValue({
        input_text: "speech",
        tts_text: "AI tts",
        options: null
      });
      vi.mocked(chatApi.sendHumanMessage).mockResolvedValue(undefined);

      const onHumanSent = vi.fn();
      const { handleTranscribeResult } = useChat("1");
      await handleTranscribeResult(audioBlob, undefined, "user1", onHumanSent);

      expect(onHumanSent).toHaveBeenCalledOnce();
    });

    it("treats missing transcript text as invalid speech", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(chatApi.transcribeAudio).mockResolvedValue({
        tts_text: "AI tts",
        options: null
      });

      const { handleTranscribeResult, dialogHistory } = useChat("1");
      const result = await handleTranscribeResult(audioBlob, undefined, "user1");

      expect(result).toBe(INVALID_TRANSCRIBE_RESULT);
      expect(dialogHistory.value).toEqual([]);
      expect(chatApi.sendHumanMessage).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });
});

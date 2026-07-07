import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  API_BASE_URL,
  API_NOTIFY_URL,
  API_SESSION_URL,
  API_TRANSCRIBE_URL,
  ENDPOINTS
} from "../constants/api";

import { chatApi } from "./chatApi";

describe("chatApi", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({}),
      text: () => Promise.resolve("")
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("startHciotChat", () => {
    it("sends POST with language", async () => {
      const mockResponse = { ok: true, session_id: "s1", message: "", language: "zh" };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve("")
      });

      const result = await chatApi.startHciotChat("zh");

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_SESSION_URL}${ENDPOINTS.HCIOT_CHAT_START}`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: "zh" })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server Error")
      });
      await expect(chatApi.startHciotChat("zh")).rejects.toThrow("[500] /hciot_chat_start");
    });
  });

  describe("checkSpeakingStatus", () => {
    it("sends POST with sessionid as integer", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: true }),
        text: () => Promise.resolve("")
      });

      const result = await chatApi.checkSpeakingStatus("1");

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}${ENDPOINTS.IS_SPEAKING}`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionid: 1 })
        })
      );
      expect(result).toEqual({ data: true });
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        text: () => Promise.resolve("Bad Gateway")
      });
      await expect(chatApi.checkSpeakingStatus("1")).rejects.toThrow("[502] /is_speaking");
    });
  });

  describe("sendHumanMessage", () => {
    it("sends POST with text, type, and sessionid", async () => {
      await chatApi.sendHumanMessage("hello", "1");

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}${ENDPOINTS.HUMAN}`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "hello", type: "echo", sessionid: 1 })
        })
      );
    });

    it("includes userId when provided", async () => {
      await chatApi.sendHumanMessage("hello", "1", "user1");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.userId).toBe("user1");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Error")
      });
      await expect(chatApi.sendHumanMessage("hello", "1")).rejects.toThrow("[500] /human");
    });
  });

  describe("sendInterruptMessage", () => {
    it("sends POST with interrupt flag", async () => {
      await chatApi.sendInterruptMessage("1");

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}${ENDPOINTS.HUMAN}`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "", type: "", sessionid: 1, interrupt: true })
        })
      );
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve("Unavailable")
      });
      await expect(chatApi.sendInterruptMessage("1")).rejects.toThrow("[503] /human");
    });
  });

  describe("transcribeAudio", () => {
    it("sends multipart audio to the backend STT endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ input_text: "hello", tts_text: "AI reply" }),
        text: () => Promise.resolve("")
      });
      const audioBlob = new Blob(["audio"], { type: "audio/wav" });

      const result = await chatApi.transcribeAudio(audioBlob, "1", "user1");

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_TRANSCRIBE_URL}${ENDPOINTS.TRANSCRIBE}`,
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData)
        })
      );
      const body = mockFetch.mock.calls[0][1].body as FormData;
      expect(body.get("sessionid")).toBe("1");
      expect(body.get("userId")).toBe("user1");
      expect(body.get("user_id")).toBeNull();
      expect(body.get("audio")).toBeInstanceOf(File);
      expect(result).toEqual({ input_text: "hello", tts_text: "AI reply" });
    });

    it("uses the English transcribe endpoint suffix and userId field when lang=en", async () => {
      window.history.pushState({}, "", "/chat?lang=en");
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ input_text: "hello", tts_text: "AI reply" }),
        text: () => Promise.resolve("")
      });

      await chatApi.transcribeAudio(new Blob(["audio"], { type: "audio/wav" }), "1", "user1");

      expect(mockFetch.mock.calls[0][0]).toBe(`${API_TRANSCRIBE_URL}${ENDPOINTS.TRANSCRIBE}_en`);
      const body = mockFetch.mock.calls[0][1].body as FormData;
      expect(body.get("userId")).toBe("user1");
      expect(body.get("user_id")).toBeNull();
      window.history.pushState({}, "", "/");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Error")
      });

      await expect(
        chatApi.transcribeAudio(new Blob(["audio"], { type: "audio/wav" }), "1")
      ).rejects.toThrow("[500] /transcribe5");
    });
  });

  describe("getCurrentConfig", () => {
    it("sends POST with sessionid", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ code: 0, data: {} }),
        text: () => Promise.resolve("")
      });

      await chatApi.getCurrentConfig("1");

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}${ENDPOINTS.GET_CURRENT_CONFIG}`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionid: 1 })
        })
      );
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not Found")
      });
      await expect(chatApi.getCurrentConfig("1")).rejects.toThrow("[404] /get_current_config");
    });
  });

  describe("getAvatars", () => {
    it("sends GET request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ code: 0, data: {} }),
        text: () => Promise.resolve("")
      });

      await chatApi.getAvatars();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}${ENDPOINTS.GET_AVATARS}`,
        expect.objectContaining({})
      );
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Error")
      });
      await expect(chatApi.getAvatars()).rejects.toThrow("[500] /get_avatars");
    });
  });

  describe("getVoices", () => {
    it("sends GET request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ code: 0, data: {} }),
        text: () => Promise.resolve("")
      });

      await chatApi.getVoices();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE_URL}${ENDPOINTS.GET_VOICES}`,
        expect.objectContaining({})
      );
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Error")
      });
      await expect(chatApi.getVoices()).rejects.toThrow("[500] /get_voices");
    });
  });

  describe("sendTextMessage", () => {
    it("sends POST with text and userId", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: "hi", options: null, tts_text: "hi" }),
        text: () => Promise.resolve("")
      });

      await chatApi.sendTextMessage("hello", "session-123");

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_SESSION_URL}${ENDPOINTS.AI_CHAT_HCIOT}`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "hello", userId: "session-123" })
        })
      );
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Error")
      });
      await expect(chatApi.sendTextMessage("hello", "session-123")).rejects.toThrow(
        "[500] /ai_chat_hciot"
      );
    });
  });

  describe("getTopics", () => {
    it("sends GET request to HCIOT_TOPICS endpoint", async () => {
      const mockData = { categories: [] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
        text: () => Promise.resolve("")
      });

      const result = await chatApi.getTopics("zh");

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_SESSION_URL}${ENDPOINTS.HCIOT_TOPICS}/zh`,
        expect.objectContaining({ method: "GET" })
      );
      expect(result).toEqual(mockData);
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Error")
      });
      await expect(chatApi.getTopics("en")).rejects.toThrow("[500] /hciot_topics/en");
    });
  });

  describe("getNotifyEvents", () => {
    it("sends POST with sessionid", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ code: 0, data: [] }),
        text: () => Promise.resolve("")
      });

      await chatApi.getNotifyEvents("1");

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_NOTIFY_URL}${ENDPOINTS.GET_NOTIFY_EVENTS}`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionid: 1 })
        })
      );
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Error")
      });
      await expect(chatApi.getNotifyEvents("1")).rejects.toThrow("[500] /get_notify_events");
    });
  });

  describe("ApiError", () => {
    it("creates aborted error on abort with non-empty message", async () => {
      const controller = new AbortController();
      controller.abort();
      mockFetch.mockRejectedValue(controller.signal.reason);

      await expect(chatApi.startHciotChat("zh")).rejects.toMatchObject({
        kind: "aborted",
        endpoint: ENDPOINTS.HCIOT_CHAT_START
      });
    });

    it("creates timeout error on TimeoutError DOMException", async () => {
      // fetchWithTimeout aborts with `new DOMException("...", "TimeoutError")`
      // so the fetch promise rejects with that exact reason. Verifies
      // wrapFetchError classifies it as "timeout" rather than "aborted".
      mockFetch.mockRejectedValue(new DOMException("request timeout", "TimeoutError"));

      await expect(chatApi.startHciotChat("zh")).rejects.toMatchObject({
        kind: "timeout",
        endpoint: ENDPOINTS.HCIOT_CHAT_START
      });
    });

    it("creates network error on Failed to fetch", async () => {
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(chatApi.checkSpeakingStatus("1")).rejects.toMatchObject({
        kind: "network",
        endpoint: ENDPOINTS.IS_SPEAKING
      });
    });
  });
});

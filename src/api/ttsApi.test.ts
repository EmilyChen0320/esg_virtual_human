import { beforeEach, describe, expect, it, vi } from "vitest";

import { ttsApi } from "./ttsApi";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("ttsApi", () => {
  it("posts text with the default TTS voice settings and returns the wav blob", async () => {
    const blob = new Blob(["wav"], { type: "audio/wav" });
    const response = {
      ok: true,
      blob: () => Promise.resolve(blob)
    };
    fetchMock.mockResolvedValue({
      ...response
    });

    const result = await ttsApi.streamSpeech("你好");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://talk-dev.aitago.tw:8001/tts_stream",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "你好",
          character: "hayley",
          replacement: "esg",
          seed: 2
        })
      })
    );
    expect(result).toBe(blob);
  });

  it("can return the raw stream response for MatesX playback", async () => {
    const response = {
      ok: true,
      body: new ReadableStream()
    };
    fetchMock.mockResolvedValue(response);

    const result = await ttsApi.fetchSpeechStream("你好");

    expect(result).toBe(response);
  });

  it("throws when the TTS endpoint returns an error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("boom")
    });

    await expect(ttsApi.streamSpeech("hello")).rejects.toThrow("TTS stream failed: 500 boom");
  });
});

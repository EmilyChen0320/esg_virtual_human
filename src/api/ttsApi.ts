const DEFAULT_TTS_STREAM_URL = "http://talk-dev.aitago.tw:8001/tts_stream";
const DEFAULT_TTS_CHARACTER = "hayley";
const DEFAULT_TTS_REPLACEMENT = "esg";
const DEFAULT_TTS_SEED = 2;

function getTtsStreamUrl() {
  return (import.meta.env.VITE_TTS_STREAM_URL as string | undefined) || DEFAULT_TTS_STREAM_URL;
}

function getTtsCharacter() {
  return (import.meta.env.VITE_TTS_CHARACTER as string | undefined) || DEFAULT_TTS_CHARACTER;
}

function getTtsReplacement() {
  return (import.meta.env.VITE_TTS_REPLACEMENT as string | undefined) || DEFAULT_TTS_REPLACEMENT;
}

function getTtsSeed() {
  const seed = Number(import.meta.env.VITE_TTS_SEED);
  return Number.isFinite(seed) ? seed : DEFAULT_TTS_SEED;
}

async function assertOk(response: Response) {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`TTS stream failed: ${response.status} ${message}`);
  }
}

export const ttsApi = {
  async streamSpeech(text: string, signal?: AbortSignal): Promise<Blob> {
    const response = await fetch(getTtsStreamUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        character: getTtsCharacter(),
        replacement: getTtsReplacement(),
        seed: getTtsSeed()
      }),
      signal
    });

    await assertOk(response);
    return response.blob();
  }
};

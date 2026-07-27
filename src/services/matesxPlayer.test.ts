import { afterEach, describe, expect, it, vi } from "vitest";

import { MatesxPlayer, getCharacterVideoSources } from "./matesxPlayer";

interface PlayerInternals {
  audioContext: unknown;
  instance: unknown;
  nextStartTime: number;
  playbackId: number;
  playPcmBytes(bytes: Uint8Array, playbackId: number): Promise<void>;
  stop(): void;
  waitForScheduledAudio(playbackId: number, signal?: AbortSignal): Promise<void>;
}

function createPlayer() {
  return new MatesxPlayer({
    assetBase: "/matesx",
    character: "aikka",
    canvas: {} as HTMLCanvasElement
  }) as unknown as PlayerInternals;
}

function createFakeMatesxInstance() {
  return {
    HEAPU8: { set: vi.fn() },
    _malloc: vi.fn(() => 0),
    _free: vi.fn(),
    _processSecret: vi.fn(),
    _setAudioBuffer: vi.fn(),
    _clearAudio: vi.fn(),
    stringToUTF8: vi.fn()
  };
}

describe("getCharacterVideoSources", () => {
  it("prefers webm assets before falling back to mp4 playback", () => {
    expect(getCharacterVideoSources("/matesx/assets/aikka")).toEqual([
      "/matesx/assets/aikka/01_opaque.webm",
      "/matesx/assets/aikka/01.webm",
      "/matesx/assets/aikka/01_opaque.mp4",
      "/matesx/assets/aikka/01.mp4"
    ]);
  });
});

describe("MatesxPlayer playback cancellation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not push stale PCM after playback is stopped during audio context resume", async () => {
    let resumeAudioContext: (() => void) | null = null;
    const rawAudioContext = globalThis.AudioContext;
    const fakeInstance = createFakeMatesxInstance();

    class FakeAudioContext {
      currentTime = 0;
      destination = {};
      sampleRate = 16_000;
      state = "suspended";

      createBuffer() {
        return { copyToChannel: vi.fn() };
      }

      createBufferSource() {
        return {
          buffer: null,
          connect: vi.fn(),
          onended: null,
          start: vi.fn(),
          stop: vi.fn()
        };
      }

      resume() {
        return new Promise<void>((resolve) => {
          resumeAudioContext = () => {
            this.state = "running";
            resolve();
          };
        });
      }
    }

    vi.stubGlobal("AudioContext", FakeAudioContext);

    const player = createPlayer();
    player.instance = fakeInstance;
    player.playbackId = 1;

    const playPromise = player.playPcmBytes(new Uint8Array([0, 0, 1, 0]), 1);
    await vi.waitFor(() => expect(resumeAudioContext).toBeTypeOf("function"));

    player.stop();
    const resume = resumeAudioContext as (() => void) | null;
    if (!resume) {
      throw new Error("Fake audio context did not suspend");
    }
    resume();

    await expect(playPromise).rejects.toMatchObject({ name: "AbortError" });
    expect(fakeInstance._setAudioBuffer).not.toHaveBeenCalled();

    vi.stubGlobal("AudioContext", rawAudioContext);
  });

  it("aborts scheduled audio waits immediately", async () => {
    const player = createPlayer();
    const controller = new AbortController();
    player.audioContext = { currentTime: 0 };
    player.nextStartTime = 30;
    player.playbackId = 1;

    const waitPromise = player.waitForScheduledAudio(1, controller.signal);
    controller.abort();

    await expect(waitPromise).rejects.toMatchObject({ name: "AbortError" });
  });
});

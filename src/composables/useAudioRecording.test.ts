import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import {
  AUDIO_SAMPLE_RATE,
  AUDIO_SAMPLE_SIZE,
  NO_SPEECH_TIMEOUT,
  SPEECH_END_SILENCE_DURATION,
  WAV_CHANNELS
} from "../constants/audio";

import { useAudioRecording } from "./useAudioRecording";

type DataHandler = ((event: { data: Blob }) => void) | null;

const trackStopMock = vi.fn();
const getUserMediaMock = vi.fn();
const closeMock = vi.fn().mockResolvedValue(undefined);
const decodeAudioDataMock = vi.fn();
const createBufferMock = vi.fn();
let analyserFrames: number[][] = [];
let animationFrameCallbacks: Array<(time: number) => void | Promise<void>> = [];

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);

  state: RecordingState = "inactive";
  ondataavailable: DataHandler = null;
  onstop: (() => void) | null = null;

  constructor(
    readonly stream: MediaStream,
    readonly options: MediaRecorderOptions
  ) {}

  start() {
    this.state = "recording";
    this.ondataavailable?.({ data: new Blob(["raw-audio"], { type: this.options.mimeType }) });
  }

  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}

class MockAudioContext {
  close = closeMock;
  decodeAudioData = decodeAudioDataMock;
  createBuffer = createBufferMock;

  createMediaStreamSource() {
    return { connect: vi.fn() };
  }

  createAnalyser() {
    return {
      fftSize: 0,
      smoothingTimeConstant: 0,
      frequencyBinCount: 4,
      getByteTimeDomainData: (dataArray: Uint8Array) => {
        const frame = analyserFrames.shift() ?? [128, 128, 128, 128];
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = frame[i] ?? 128;
        }
      }
    };
  }
}

function createAudioBuffer(channels: number) {
  const channelData = [
    new Float32Array([0, 0.25, -0.25, 0.5]),
    new Float32Array([0, 0.1, -0.1, 0.2])
  ];

  return {
    length: channelData[0].length,
    sampleRate: AUDIO_SAMPLE_RATE,
    numberOfChannels: channels,
    getChannelData: (channel: number) => channelData[channel]
  };
}

function createMediaStream() {
  return {
    getTracks: () => [{ stop: trackStopMock }]
  } as unknown as MediaStream;
}

async function flushInitialAnalysis() {
  await nextTick();
  await nextTick();
  await Promise.resolve();
}

async function runNextVolumeFrame(time = 0) {
  const callback = animationFrameCallbacks.shift();
  await callback?.(time);
  await nextTick();
  await Promise.resolve();
}

const speechFrame = [148, 108, 148, 108];
const silenceFrame = [128, 128, 128, 128];

describe("useAudioRecording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    analyserFrames = [];
    animationFrameCallbacks = [];
    getUserMediaMock.mockResolvedValue(createMediaStream());
    decodeAudioDataMock.mockResolvedValue(createAudioBuffer(1));
    createBufferMock.mockReturnValue(createAudioBuffer(1));
    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        animationFrameCallbacks.push(callback);
        return animationFrameCallbacks.length;
      })
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: getUserMediaMock
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts microphone capture with backend-STT recording constraints", async () => {
    const { isRecording, startAudioCapture } = useAudioRecording();

    await startAudioCapture();
    await flushInitialAnalysis();

    expect(getUserMediaMock).toHaveBeenCalledWith({
      audio: {
        channelCount: WAV_CHANNELS,
        sampleRate: AUDIO_SAMPLE_RATE,
        sampleSize: AUDIO_SAMPLE_SIZE
      },
      video: false
    });
    expect(isRecording.value).toBe(true);
    expect(MockMediaRecorder.isTypeSupported).toHaveBeenCalledWith("audio/webm;codecs=opus");
  });

  it("stops recording, converts chunks to wav, and releases the media stream", async () => {
    const { isRecording, startAudioCapture, stopRecording } = useAudioRecording();

    await startAudioCapture();
    await flushInitialAnalysis();
    const wavBlob = await stopRecording();

    expect(isRecording.value).toBe(false);
    expect(wavBlob?.type).toBe("audio/wav");
    expect(trackStopMock).toHaveBeenCalledOnce();

    const wavHeader = new TextDecoder().decode((await wavBlob!.arrayBuffer()).slice(0, 4));
    expect(wavHeader).toBe("RIFF");
  });

  it("cancels recording without returning audio", async () => {
    const { isRecording, startAudioCapture, cancelRecording } = useAudioRecording();

    await startAudioCapture();
    await flushInitialAnalysis();
    await cancelRecording();

    expect(isRecording.value).toBe(false);
    expect(trackStopMock).toHaveBeenCalledOnce();
    expect(decodeAudioDataMock).not.toHaveBeenCalled();
  });

  it("auto-stops shortly after detected speech turns silent", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    try {
      analyserFrames = [speechFrame, silenceFrame];
      const autoStopCallback = vi.fn();
      const { startAudioCapture, setAutoStopCallback } = useAudioRecording();
      setAutoStopCallback(autoStopCallback);

      await startAudioCapture();
      await flushInitialAnalysis();
      await runNextVolumeFrame();

      expect(autoStopCallback).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(SPEECH_END_SILENCE_DURATION - 1);
      expect(autoStopCallback).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(autoStopCallback).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("waits for the no-speech timeout when no speech was detected", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    try {
      vi.setSystemTime(0);
      analyserFrames = [silenceFrame, silenceFrame];
      const autoStopCallback = vi.fn();
      const { startAudioCapture, setAutoStopCallback } = useAudioRecording();
      setAutoStopCallback(autoStopCallback);

      await startAudioCapture();
      await flushInitialAnalysis();

      vi.setSystemTime(NO_SPEECH_TIMEOUT - 1);
      await runNextVolumeFrame();
      expect(autoStopCallback).not.toHaveBeenCalled();

      vi.setSystemTime(NO_SPEECH_TIMEOUT);
      await runNextVolumeFrame();
      expect(autoStopCallback).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});

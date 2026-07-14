interface MatesxModule {
  HEAPU8: Uint8Array;
  _malloc(size: number): number;
  _free(pointer: number): void;
  _processSecret(pointer: number): void;
  _setAudioBuffer(pointer: number, length: number, index: number): void;
  _clearAudio(): void;
  stringToUTF8(text: string, pointer: number, maxBytesToWrite: number): void;
}

interface CreateQtAppOptions {
  canvas: HTMLCanvasElement;
  locateFile(path: string, prefix?: string): string;
  onRuntimeInitialized?(): void;
}

interface PakoLike {
  inflate(data: Uint8Array, options: { to: "string" }): string;
}

declare global {
  interface Window {
    createQtAppInstance?: (options: CreateQtAppOptions) => Promise<MatesxModule>;
    matesxInstance?: MatesxModule;
    Module?: MatesxModule;
    pako?: PakoLike;
    characterVideo?: HTMLVideoElement;
  }
}

interface MatesxPlayerOptions {
  assetBase: string;
  character: string;
  canvas: HTMLCanvasElement;
}

interface ScriptState {
  promise: Promise<void> | null;
}

const DEFAULT_ASSET_BASE = "/matesx";
const DEFAULT_CHARACTER = "aikka";
const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2;
const PCM_CHUNK_BYTES = (SAMPLE_RATE / 10) * BYTES_PER_SAMPLE;
const PCM_PUSH_INTERVAL_MS = 10;
const MATESX_RUNTIME_VERSION = "20260708-6";

const scriptState: ScriptState = {
  promise: null
};

function getConfiguredAssetBase() {
  return (
    (import.meta.env.VITE_MATESX_ASSET_BASE as string | undefined) || DEFAULT_ASSET_BASE
  ).replace(/\/$/, "");
}

function getConfiguredCharacter() {
  return (import.meta.env.VITE_MATESX_CHARACTER as string | undefined) || DEFAULT_CHARACTER;
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

function ensureScripts(assetBase: string) {
  if (!scriptState.promise) {
    scriptState.promise = loadScript(`${assetBase}/js/pako.min.js`).then(() =>
      loadScript(`${assetBase}/js/DHLiveMini2.js?v=${MATESX_RUNTIME_VERSION}`)
    );
  }
  return scriptState.promise;
}

function int16ToFloat32(int16Data: Int16Array) {
  const float32Data = new Float32Array(int16Data.length);
  for (let i = 0; i < int16Data.length; i += 1) {
    float32Data[i] = int16Data[i] / 32768;
  }
  return float32Data;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function concatUint8(left: Uint8Array, right: Uint8Array) {
  const output = new Uint8Array(left.length + right.length);
  output.set(left, 0);
  output.set(right, left.length);
  return output;
}

function findDataChunkOffset(bytes: Uint8Array) {
  for (let i = 0; i <= bytes.length - 8; i += 1) {
    if (bytes[i] === 100 && bytes[i + 1] === 97 && bytes[i + 2] === 116 && bytes[i + 3] === 97) {
      return i + 8;
    }
  }
  return -1;
}

function decodeMatesxSecret(bytes: Uint8Array, pako: PakoLike) {
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (isGzip) {
    return pako.inflate(bytes, { to: "string" });
  }
  console.info("[esg] matesx character data is already decoded");
  return new TextDecoder().decode(bytes);
}

function loadVideoSource(video: HTMLVideoElement, source: string) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("canplay", handleLoaded);
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("error", handleError);
    };
    const handleLoaded = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error(`Failed to load MatesX character video: ${source}`));
    };

    video.addEventListener("canplay", handleLoaded, { once: true });
    video.addEventListener("loadedmetadata", handleLoaded, { once: true });
    video.addEventListener("error", handleError, { once: true });
    video.src = source;
    video.load();
  });
}

async function loadFirstPlayableVideo(video: HTMLVideoElement, sources: string[]) {
  const errors: Error[] = [];
  for (const source of sources) {
    try {
      await loadVideoSource(video, source);
      return source;
    } catch (error) {
      video.removeAttribute("src");
      video.load();
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      errors.push(normalizedError);
      console.warn("[esg] matesx video candidate failed", normalizedError);
    }
  }

  throw new Error(errors.map((error) => error.message).join("; "));
}

export function getCharacterVideoSources(characterPath: string) {
  return [
    `${characterPath}/01_opaque.mp4`,
    `${characterPath}/01.mp4`,
    `${characterPath}/01_opaque.webm`,
    `${characterPath}/01.webm`
  ];
}

export class MatesxPlayer {
  private readonly assetBase: string;

  private readonly character: string;

  private readonly canvas: HTMLCanvasElement;

  private instance: MatesxModule | null = null;

  private audioContext: AudioContext | null = null;

  private sources: AudioBufferSourceNode[] = [];

  private chunkIndex = 0;

  private nextStartTime = 0;

  constructor(options: MatesxPlayerOptions) {
    this.assetBase = options.assetBase;
    this.character = options.character;
    this.canvas = options.canvas;
  }

  static fromEnv(canvas: HTMLCanvasElement) {
    return new MatesxPlayer({
      assetBase: getConfiguredAssetBase(),
      character: getConfiguredCharacter(),
      canvas
    });
  }

  async initialize() {
    await ensureScripts(this.assetBase);
    const createQtAppInstance = window.createQtAppInstance;
    if (!createQtAppInstance) {
      throw new Error("MatesX runtime is not available");
    }

    const instance = await createQtAppInstance({
      canvas: this.canvas,
      locateFile: (path, prefix = "") => {
        if (path.endsWith(".wasm")) {
          return `${this.assetBase}/wasm/DHLiveMini2.wasm`;
        }
        return `${prefix}${path}`;
      }
    });

    this.instance = instance;
    window.matesxInstance = instance;
    window.Module = instance;
    await this.loadCharacter();
  }

  async playWavStream(response: Response, signal?: AbortSignal) {
    this.resetPlayback();
    this.instance?._clearAudio();
    const reader = response.body?.getReader();
    if (!reader) {
      await this.playWavBlob(await response.blob(), signal);
      return;
    }

    let pending = new Uint8Array();
    let didFindDataChunk = false;

    while (true) {
      if (signal?.aborted) {
        throw new DOMException("TTS playback aborted", "AbortError");
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }

      pending = concatUint8(pending, value);

      if (!didFindDataChunk) {
        const dataOffset = findDataChunkOffset(pending);
        if (dataOffset < 0) {
          continue;
        }
        pending = pending.slice(dataOffset);
        didFindDataChunk = true;
      }

      while (pending.length >= PCM_CHUNK_BYTES) {
        const chunk = pending.slice(0, PCM_CHUNK_BYTES);
        pending = pending.slice(PCM_CHUNK_BYTES);
        await this.playPcmBytes(chunk);
        await sleep(PCM_PUSH_INTERVAL_MS);
      }
    }

    const evenLength = pending.length - (pending.length % BYTES_PER_SAMPLE);
    if (evenLength > 0) {
      await this.playPcmBytes(pending.slice(0, evenLength));
    }

    await this.waitForScheduledAudio(signal);
  }

  stop() {
    this.resetPlayback();
    this.instance?._clearAudio();
  }

  dispose() {
    this.stop();
    this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
  }

  private async loadCharacter() {
    const instance = this.requireInstance();
    const pako = window.pako;
    if (!pako) {
      throw new Error("MatesX pako runtime is not available");
    }

    const characterPath = `${this.assetBase}/assets/${this.character}`;
    const response = await fetch(`${characterPath}/combined_data.json.gz`);
    if (!response.ok) {
      throw new Error(`Failed to load MatesX character data: ${response.status}`);
    }

    const characterData = new Uint8Array(await response.arrayBuffer());
    const secret = decodeMatesxSecret(characterData, pako);
    const encoder = new TextEncoder();
    const lengthBytes = encoder.encode(secret).length + 1;
    const pointer = instance._malloc(lengthBytes);
    instance.stringToUTF8(secret, pointer, lengthBytes);
    instance._processSecret(pointer);
    instance._free(pointer);

    if (window.characterVideo) {
      window.characterVideo.loop = true;
      window.characterVideo.muted = true;
      window.characterVideo.playsInline = true;
      const videoSource = await loadFirstPlayableVideo(
        window.characterVideo,
        getCharacterVideoSources(characterPath)
      );
      console.info("[esg] matesx character video loaded", videoSource);
      await window.characterVideo.play();
    }
  }

  private async playWavBlob(blob: Blob, signal?: AbortSignal) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const dataOffset = findDataChunkOffset(bytes);
    const pcmBytes = bytes.slice(dataOffset >= 0 ? dataOffset : 44);
    await this.playPcmBytes(pcmBytes);
    await this.waitForScheduledAudio(signal);
  }

  private async playPcmBytes(bytes: Uint8Array) {
    const audioContext = await this.ensureAudioContext();
    const rawBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const int16Data = new Int16Array(rawBuffer);
    const float32Data = int16ToFloat32(int16Data);
    const audioBuffer = audioContext.createBuffer(1, float32Data.length, SAMPLE_RATE);
    audioBuffer.copyToChannel(float32Data, 0);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.onended = () => {
      this.sources = this.sources.filter((activeSource) => activeSource !== source);
    };

    if (this.nextStartTime < audioContext.currentTime) {
      this.nextStartTime = audioContext.currentTime;
    }

    source.start(this.nextStartTime);
    this.sources.push(source);
    this.pushPcmToAvatar(new Uint8Array(rawBuffer));
    this.nextStartTime += float32Data.length / SAMPLE_RATE;
  }

  private pushPcmToAvatar(bytes: Uint8Array) {
    const instance = this.instance;
    if (!instance) {
      return;
    }

    const pointer = instance._malloc(bytes.byteLength);
    instance.HEAPU8.set(bytes, pointer);
    instance._setAudioBuffer(pointer, bytes.byteLength, this.chunkIndex);
    instance._free(pointer);
    this.chunkIndex += 1;
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    }
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  private resetPlayback() {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // Source can already be stopped when interrupting near chunk boundaries.
      }
    }
    this.sources = [];
    this.chunkIndex = 0;
    this.nextStartTime = this.audioContext?.currentTime || 0;
  }

  private async waitForScheduledAudio(signal?: AbortSignal) {
    const audioContext = this.audioContext;
    if (!audioContext) {
      return;
    }

    const waitMs = Math.max(0, (this.nextStartTime - audioContext.currentTime) * 1000);
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    if (signal?.aborted) {
      throw new DOMException("TTS playback aborted", "AbortError");
    }
  }

  private requireInstance() {
    if (!this.instance) {
      throw new Error("MatesX instance is not initialized");
    }
    return this.instance;
  }
}

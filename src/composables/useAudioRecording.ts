import { nextTick, shallowRef } from "vue";

import {
  AUDIO_BITS_PER_SECOND,
  AUDIO_SAMPLE_RATE,
  AUDIO_SAMPLE_SIZE,
  FFT_SIZE,
  NO_SPEECH_TIMEOUT,
  RECORDING_ANIMATION_SELECTOR,
  SMOOTHING_TIME_CONSTANT,
  SPEECH_END_SILENCE_DURATION,
  VOLUME_THRESHOLD,
  WAV_BITS_PER_SAMPLE,
  WAV_CHANNELS,
  WAV_HEADER_SIZE,
  WAV_SAMPLE_RATE
} from "../constants/audio";

export function useAudioRecording() {
  const isRecording = shallowRef(false);
  let mediaRecorder: MediaRecorder | null = null;
  let mediaStream: MediaStream | null = null;
  let audioChunks: Blob[] = [];
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let animationFrameId: number | null = null;
  let silenceTimer: number | null = null;
  let autoStopCallback: (() => void) | null = null;
  let recordingStartTime = 0;
  let hasDetectedSpeech = false;
  let autoStopRequested = false;

  function getRecordingElapsedMs(): number {
    return recordingStartTime > 0 ? Date.now() - recordingStartTime : 0;
  }

  async function audioBufferToWav(audioBuffer: AudioBuffer): Promise<ArrayBuffer> {
    const length = audioBuffer.length * 2;
    const buffer = new ArrayBuffer(WAV_HEADER_SIZE + length);
    const view = new DataView(buffer);

    const writeString = (target: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        target.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, "RIFF");
    view.setUint32(4, WAV_HEADER_SIZE + length - 8, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, WAV_CHANNELS, true);
    view.setUint32(24, WAV_SAMPLE_RATE, true);
    view.setUint32(28, WAV_SAMPLE_RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, WAV_BITS_PER_SAMPLE, true);
    writeString(view, 36, "data");
    view.setUint32(40, length, true);

    const channelData = audioBuffer.getChannelData(0);
    let offset = WAV_HEADER_SIZE;
    for (const channelSample of channelData) {
      const sample = Math.max(-1, Math.min(1, channelSample));
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, value, true);
      offset += 2;
    }

    return buffer;
  }

  async function processAudio(audioBlob: Blob): Promise<Blob> {
    const processingContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    try {
      const audioData = await audioBlob.arrayBuffer();
      const audioBuffer = await processingContext.decodeAudioData(audioData);
      const monoBuffer = processingContext.createBuffer(
        WAV_CHANNELS,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      const monoData = monoBuffer.getChannelData(0);

      if (audioBuffer.numberOfChannels === 2) {
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        for (let i = 0; i < audioBuffer.length; i++) {
          monoData[i] = (left[i] + right[i]) / 2;
        }
      } else {
        monoData.set(audioBuffer.getChannelData(0));
      }

      const wavBuffer = await audioBufferToWav(monoBuffer);
      return new Blob([wavBuffer], { type: "audio/wav" });
    } finally {
      await processingContext.close();
    }
  }

  function getRecordingMimeType(): string {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      return "audio/webm;codecs=opus";
    }

    return "audio/mp4";
  }

  function startRecording(stream: MediaStream) {
    mediaStream = stream;
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: getRecordingMimeType(),
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    isRecording.value = true;
    recordingStartTime = Date.now();
    hasDetectedSpeech = false;
    autoStopRequested = false;
    console.log("[useAudioRecording] recording started");
    nextTick(() => {
      startVolumeAnalysis(stream);
      mediaRecorder?.start();
    });
  }

  function clearSilenceTimer() {
    if (silenceTimer !== null) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  }

  function requestAutoStop(reason: string) {
    if (autoStopRequested) {
      return;
    }

    autoStopRequested = true;
    clearSilenceTimer();
    console.log(
      `[useAudioRecording] auto stop requested reason=${reason} elapsed=${getRecordingElapsedMs()}ms`
    );
    autoStopCallback?.();
  }

  function startVolumeAnalysis(stream: MediaStream) {
    if (!isRecording.value) {
      return;
    }

    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
    source.connect(analyser);

    const analyzeVolume = async () => {
      if (!analyser || !isRecording.value) {
        return;
      }

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      let maxAmplitude = 0;
      for (const dataPoint of dataArray) {
        const amplitude = Math.abs(dataPoint - 128);
        sum += amplitude;
        maxAmplitude = Math.max(maxAmplitude, amplitude);
      }

      const average = sum / dataArray.length;
      const normalizedVolume = Math.min(1, (average + maxAmplitude) / 256);
      const scale = 1.3 + Math.sqrt(normalizedVolume) * 3;
      const recordingElapsed = Date.now() - recordingStartTime;
      const hasVolume = normalizedVolume >= VOLUME_THRESHOLD;

      if (hasVolume) {
        if (!hasDetectedSpeech) {
          console.log(
            `[useAudioRecording] speech detected elapsed=${recordingElapsed}ms volume=${normalizedVolume.toFixed(3)}`
          );
        }
        hasDetectedSpeech = true;
        clearSilenceTimer();
      } else if (hasDetectedSpeech) {
        if (silenceTimer === null) {
          console.log(
            `[useAudioRecording] silence timer started elapsed=${recordingElapsed}ms duration=${SPEECH_END_SILENCE_DURATION}ms volume=${normalizedVolume.toFixed(3)}`
          );
          silenceTimer = window.setTimeout(() => {
            requestAutoStop("speech-end-silence");
          }, SPEECH_END_SILENCE_DURATION);
        }
      } else {
        if (recordingElapsed >= NO_SPEECH_TIMEOUT) {
          console.log(`[useAudioRecording] no speech timeout elapsed=${recordingElapsed}ms`);
          requestAutoStop("no-speech-timeout");
        }
      }

      await nextTick();

      const animationEl = document.querySelector(RECORDING_ANIMATION_SELECTOR);
      const waves = animationEl?.querySelectorAll(".wave") ?? [];
      for (const [index, wave] of waves.entries()) {
        const waveEl = wave as HTMLElement;
        const delay = index * 0.2;
        const waveScale = scale * (1 + delay * 0.4);
        waveEl.style.transform = `translate(-50%, -50%) scale(${waveScale})`;
        const opacityValue = 0.3 + Math.sqrt(normalizedVolume) * 0.5;
        waveEl.style.opacity = String(Math.min(0.8, opacityValue));
      }

      animationFrameId = requestAnimationFrame(analyzeVolume);
    };

    analyzeVolume();
  }

  async function cancelRecording(): Promise<void> {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      isRecording.value = false;
      audioChunks = [];
      cleanup();
      return;
    }

    await new Promise<void>((resolve) => {
      mediaRecorder!.onstop = () => {
        isRecording.value = false;
        audioChunks = [];
        cleanup();
        resolve();
      };
      mediaRecorder!.stop();
    });
  }

  async function stopRecording(): Promise<Blob | null> {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        isRecording.value = false;
        cleanup();
        resolve(null);
        return;
      }

      const stopRequestedAt = Date.now();
      console.log(
        `[useAudioRecording] stop requested elapsed=${getRecordingElapsedMs()}ms chunks=${audioChunks.length}`
      );
      mediaRecorder.onstop = async () => {
        const mediaStoppedAt = Date.now();
        const recordingElapsed = getRecordingElapsedMs();
        isRecording.value = false;
        const audioBlob = new Blob(audioChunks);
        console.log(
          `[useAudioRecording] media stopped stopDuration=${mediaStoppedAt - stopRequestedAt}ms elapsed=${recordingElapsed}ms size=${audioBlob.size}B type=${audioBlob.type || "unknown"}`
        );
        audioChunks = [];
        cleanup();

        try {
          const wavStartedAt = Date.now();
          console.log(
            `[useAudioRecording] wav conversion started size=${audioBlob.size}B type=${audioBlob.type || "unknown"}`
          );
          const processedBlob = await processAudio(audioBlob);
          console.log(
            `[useAudioRecording] wav conversion finished duration=${Date.now() - wavStartedAt}ms size=${processedBlob.size}B`
          );
          resolve(processedBlob);
        } catch (error) {
          reject(error);
        }
      };
      mediaRecorder.stop();
    });
  }

  function cleanup() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    if (mediaStream) {
      for (const track of mediaStream.getTracks()) {
        track.stop();
      }
      mediaStream = null;
    }
    clearSilenceTimer();
    mediaRecorder = null;
    recordingStartTime = 0;
    hasDetectedSpeech = false;
    autoStopRequested = false;
  }

  async function startAudioCapture(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: WAV_CHANNELS,
        sampleRate: AUDIO_SAMPLE_RATE,
        sampleSize: AUDIO_SAMPLE_SIZE
      },
      video: false
    });

    startRecording(stream);
  }

  function setAutoStopCallback(callback: () => void) {
    autoStopCallback = callback;
  }

  return {
    isRecording,
    startAudioCapture,
    stopRecording,
    cancelRecording,
    cleanup,
    setAutoStopCallback
  };
}

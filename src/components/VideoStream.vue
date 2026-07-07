<script setup lang="ts">
import { shallowRef, onBeforeUnmount, onMounted, watch } from "vue";

import { StreamService } from "../services/streamService";

const STREAM_CLOSE_DELAY = 1000;

const props = defineProps<{
  sessionId: string;
  active: boolean;
}>();

const emit = defineEmits<{
  error: [message: string];
}>();

const videoRef = shallowRef<HTMLVideoElement | null>(null);
const streamService = shallowRef<StreamService | null>(null);
const isHidden = shallowRef(false);
const streamError = shallowRef<string | null>(null);
let closeTimer: number | null = null;

function setMuted(muted: boolean) {
  if (videoRef.value) {
    videoRef.value.muted = muted;
  }
}

function clearCloseTimer() {
  if (closeTimer !== null) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function closeStream() {
  clearCloseTimer();
  streamService.value?.close();
  streamService.value = null;
}

function scheduleCloseStream() {
  clearCloseTimer();
  closeTimer = window.setTimeout(() => {
    closeTimer = null;
    closeStream();
  }, STREAM_CLOSE_DELAY);
}

async function startStream() {
  if (!videoRef.value || streamService.value) {
    return;
  }

  clearCloseTimer();
  isHidden.value = false;
  streamError.value = null;
  const service = new StreamService(videoRef.value);
  streamService.value = service;

  try {
    await service.startPlay(props.sessionId);
  } catch (reason: unknown) {
    if (streamService.value !== service) {
      return;
    }
    isHidden.value = true;
    streamError.value = String(reason);
    closeStream();
    console.error("[VideoStream] stream connection failed:", reason);
    emit("error", streamError.value);
  }
}

defineExpose({
  setMuted,
  error: streamError
});

watch(
  () => props.active,
  (active) => {
    if (active) {
      startStream();
      return;
    }
    scheduleCloseStream();
  },
  { immediate: true }
);

onMounted(() => {
  if (props.active) {
    startStream();
  }
});

onBeforeUnmount(() => {
  closeStream();
});
</script>

<template>
  <div id="media" style="width: 100%; height: 100%">
    <video
      ref="videoRef"
      class="chat-stream-video relative z-2"
      :class="{ hidden: isHidden }"
      autoplay
      muted
      playsinline
    ></video>
  </div>
</template>

<style scoped>
.chat-stream-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: transparent;
}
</style>

<script setup lang="ts">
import { useTemplateRef, type Ref } from "vue";

import { VIRTUAL_PERSON_FIRST_FRAME_IMAGE } from "../../constants/media";
import VideoStream from "../VideoStream.vue";

interface LocalVideoBindings {
  videoRefA: Ref<HTMLVideoElement | null>;
  videoRefB: Ref<HTMLVideoElement | null>;
  activeBuffer: Ref<"A" | "B">;
}

defineProps<{
  sessionId: string;
  showStreamVideo: boolean;
  streamActive: boolean;
  localVideo: LocalVideoBindings;
}>();

const videoStreamRef = useTemplateRef<InstanceType<typeof VideoStream>>("videoStreamRef");

function setMuted(muted: boolean) {
  videoStreamRef.value?.setMuted(muted);
}

defineExpose({
  setMuted
});
</script>

<template>
  <div>
    <img
      v-if="VIRTUAL_PERSON_FIRST_FRAME_IMAGE"
      :src="VIRTUAL_PERSON_FIRST_FRAME_IMAGE"
      alt=""
      aria-hidden="true"
      class="chat-first-frame"
    />

    <VideoStream
      ref="videoStreamRef"
      :session-id="sessionId"
      :active="streamActive"
      class="absolute inset-0"
      :class="{ 'stream-hidden': !showStreamVideo }"
      style="width: 100%; height: 100%"
    />

    <div class="absolute inset-0" :class="{ 'local-hidden': showStreamVideo }">
      <video
        :ref="localVideo.videoRefA"
        class="chat-local-video"
        :class="{ 'buffer-hidden': localVideo.activeBuffer.value === 'B' }"
        playsinline
        muted
      ></video>
      <video
        :ref="localVideo.videoRefB"
        class="chat-local-video"
        :class="{ 'buffer-hidden': localVideo.activeBuffer.value === 'A' }"
        playsinline
        muted
      ></video>
    </div>
  </div>
</template>

<style scoped>
.chat-local-video {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: transparent;
}

.buffer-hidden {
  opacity: 0;
  pointer-events: none;
}

.stream-hidden {
  opacity: 0;
  pointer-events: none;
}

.local-hidden {
  opacity: 0;
  pointer-events: none;
}

.chat-first-frame {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-drag: none;
}
</style>

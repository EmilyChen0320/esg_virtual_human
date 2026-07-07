<script setup lang="ts">
import type { AnimationItem } from "lottie-web";
import lottie from "lottie-web/build/player/lottie_light";
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from "vue";

import { BOTTOM_RECORDING_LOTTIE_PATH } from "../../constants/media";

const container = useTemplateRef<HTMLDivElement>("container");
const animation = shallowRef<AnimationItem | null>(null);

onMounted(() => {
  if (!container.value) {
    return;
  }
  animation.value = lottie.loadAnimation({
    container: container.value,
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: BOTTOM_RECORDING_LOTTIE_PATH
  });
});

onBeforeUnmount(() => {
  animation.value?.destroy();
  animation.value = null;
});
</script>

<template>
  <div ref="container" class="soundwave-lottie" aria-hidden="true"></div>
</template>

<style scoped>
.soundwave-lottie {
  width: 161px;
  height: 70px;
  pointer-events: none;
}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from "vue";

interface Props {
  baseWidth?: number;
  baseHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  baseWidth: 1440,
  baseHeight: 2560
});

const viewportWidth = shallowRef(
  typeof window !== "undefined" ? window.innerWidth : props.baseWidth
);
const viewportHeight = shallowRef(
  typeof window !== "undefined" ? window.innerHeight : props.baseHeight
);

const designScale = computed(() =>
  Math.min(viewportWidth.value / props.baseWidth, viewportHeight.value / props.baseHeight)
);

const designCanvasStyle = computed(() => ({
  width: `${props.baseWidth}px`,
  height: `${props.baseHeight}px`,
  transform: `translate(-50%, -50%) scale(${designScale.value})`
}));

const updateViewport = () => {
  viewportWidth.value = window.innerWidth;
  viewportHeight.value = window.innerHeight;
};

onMounted(() => {
  updateViewport();
  window.addEventListener("resize", updateViewport);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateViewport);
});
</script>

<template>
  <div class="design-canvas-wrapper">
    <div class="design-canvas" :style="designCanvasStyle">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.design-canvas-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.design-canvas {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: center center;
}
</style>

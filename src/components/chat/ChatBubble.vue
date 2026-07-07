<script setup lang="ts">
import { computed } from "vue";

import {
  DIALOG_BUBBLE_AI_PADDING_X,
  DIALOG_BUBBLE_AI_PADDING_Y,
  DIALOG_BUBBLE_RADIUS,
  DIALOG_BUBBLE_USER_PADDING,
  DIALOG_FONT_SIZE,
  DIALOG_LINE_HEIGHT
} from "../../constants/ui";

const props = withDefaults(
  defineProps<{
    role: "user" | "ai";
    text: string;
    maxChars: number;
    image?: string;
    showImage?: boolean;
  }>(),
  {
    image: undefined,
    showImage: true
  }
);

const emit = defineEmits<{
  imageLoad: [];
  imageError: [];
}>();

const isUser = computed(() => props.role === "user");
const textMaxWidth = computed(() => `${props.maxChars}em`);
</script>

<template>
  <div class="dialog-bubble" :class="{ 'dialog-bubble-user': isUser }">
    <p class="dialog-text" :class="{ 'dialog-text-user': isUser }">
      {{ text }}
    </p>
    <div v-if="image && showImage" class="dialog-image-container">
      <img
        :src="image"
        alt=""
        class="dialog-image"
        @load="emit('imageLoad')"
        @error="emit('imageError')"
      />
    </div>
  </div>
</template>

<style scoped>
.dialog-bubble {
  width: max-content;
  max-width: 100%;
  border-radius: v-bind("`${DIALOG_BUBBLE_RADIUS}px`");
  background: rgba(255, 255, 255, 0.9);
  padding: v-bind("`${DIALOG_BUBBLE_AI_PADDING_Y}px ${DIALOG_BUBBLE_AI_PADDING_X}px`");
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
}

.dialog-bubble-user {
  background: #5593b5;
  padding: v-bind("`${DIALOG_BUBBLE_USER_PADDING}px`");
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.dialog-text {
  color: #5a6e78;
  font-size: v-bind("`${DIALOG_FONT_SIZE}px`");
  font-weight: 500;
  line-height: v-bind("`${DIALOG_LINE_HEIGHT}px`");
  letter-spacing: 0;
  word-break: break-word;
  max-width: v-bind(textMaxWidth);
}

.dialog-text-user {
  color: white;
}

.dialog-image-container {
  margin-top: 20px;
  padding-left: 36px;
  display: flex;
  justify-content: flex-start;
}

.dialog-image {
  width: 557px;
  max-width: 100%;
  max-height: 557px;
  border-radius: 8px;
  object-fit: contain;
}
</style>

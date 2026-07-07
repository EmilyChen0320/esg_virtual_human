<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useTemplateRef, watch } from "vue";

import {
  AI_DIALOG_MAX_CHARS,
  CONVERSATION_BOTTOM_DIALOG_VIEWPORT,
  CONVERSATION_TOP_DIALOG_VIEWPORT,
  USER_DIALOG_MAX_CHARS
} from "../../constants/ui";
import type { Dialog } from "../../types/chat";

import ChatBubble from "./ChatBubble.vue";

const props = defineProps<{
  dialogHistory: Dialog[];
  bottomViewport?: boolean;
}>();

const historyViewport = useTemplateRef<HTMLDivElement>("historyViewport");
const failedImageKeys = shallowRef<Record<string, true>>({});

function getDialogKey(item: Dialog, index: number): string {
  return `${index}-${item.isUser ? "user" : "ai"}-${item.text}`;
}

function handleImageError(key: string) {
  failedImageKeys.value[key] = true;
  failedImageKeys.value = { ...failedImageKeys.value };
}

function scrollToBottom() {
  if (!historyViewport.value) {
    return;
  }
  historyViewport.value.scrollTop = historyViewport.value.scrollHeight;
}

watch(
  () => props.dialogHistory.length,
  async (nextLength, previousLength) => {
    if (!historyViewport.value || nextLength <= previousLength) {
      return;
    }

    await nextTick();
    scrollToBottom();
  },
  { flush: "post" }
);

watch(
  () => props.dialogHistory,
  () => {
    failedImageKeys.value = {};
  }
);

watch(
  () => props.bottomViewport,
  async () => {
    if (!historyViewport.value || props.dialogHistory.length === 0) {
      return;
    }

    await nextTick();
    scrollToBottom();
  },
  { flush: "post" }
);

onMounted(() => {
  if (props.dialogHistory.length === 0) {
    return;
  }

  nextTick(() => {
    scrollToBottom();
  });
});

const viewportStyle = computed(() => {
  return {
    height: `${
      props.bottomViewport
        ? CONVERSATION_BOTTOM_DIALOG_VIEWPORT.height
        : CONVERSATION_TOP_DIALOG_VIEWPORT.height
    }px`
  };
});

const overlayStyle = computed(() => {
  if (props.bottomViewport) {
    return {
      left: `${CONVERSATION_BOTTOM_DIALOG_VIEWPORT.left}px`,
      right: `${CONVERSATION_BOTTOM_DIALOG_VIEWPORT.right}px`,
      top: `${CONVERSATION_BOTTOM_DIALOG_VIEWPORT.top}px`
    };
  }
  return {
    left: `${CONVERSATION_TOP_DIALOG_VIEWPORT.left}px`,
    right: `${CONVERSATION_TOP_DIALOG_VIEWPORT.right}px`,
    top: `${CONVERSATION_TOP_DIALOG_VIEWPORT.top}px`
  };
});
</script>

<template>
  <div v-if="dialogHistory.length > 0" class="dialog-overlay" :style="overlayStyle" @click.stop>
    <div
      ref="historyViewport"
      class="dialog-history-viewport"
      :class="{
        'dialog-history-viewport-bottom': bottomViewport,
        'dialog-history-viewport-gradient': true
      }"
      :style="viewportStyle"
    >
      <div
        class="dialog-history-content"
        :class="{ 'dialog-history-content-bottom': bottomViewport }"
      >
        <div
          v-for="(item, index) in dialogHistory"
          :key="getDialogKey(item, index)"
          class="dialog-history-item"
          :class="{ 'dialog-history-item-user': item.isUser }"
        >
          <ChatBubble
            :role="item.isUser ? 'user' : 'ai'"
            :text="item.text"
            :max-chars="item.isUser ? USER_DIALOG_MAX_CHARS : AI_DIALOG_MAX_CHARS"
            :image="item.image"
            :show-image="!failedImageKeys[getDialogKey(item, index)]"
            @image-load="scrollToBottom()"
            @image-error="handleImageError(getDialogKey(item, index))"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: absolute;
  left: 34px;
  right: 34px;
  top: 1016px;
  z-index: 20;
}

.dialog-history-viewport {
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.dialog-history-viewport-bottom {
  display: flex;
  flex-direction: column;
}

.dialog-history-viewport-gradient {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 120px);
  mask-image: linear-gradient(to bottom, transparent 0%, black 120px);
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}

.dialog-history-viewport::-webkit-scrollbar {
  display: none;
}

.dialog-history-content {
  display: flex;
  flex-direction: column;
  gap: 89px;
}

.dialog-history-content-bottom {
  min-height: 100%;
}

.dialog-history-content-bottom > .dialog-history-item:first-child {
  margin-top: auto;
}

.dialog-history-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.dialog-history-item-user {
  align-items: flex-end;
}
</style>

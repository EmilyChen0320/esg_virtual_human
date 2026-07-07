import type { ShallowRef } from "vue";
import { onBeforeUnmount } from "vue";

import { INFO_BUTTON_COOLDOWN } from "../constants/timing";
import type { ChatMessageResponse } from "../types/chat";

type AiResponsePayload = Partial<ChatMessageResponse> & {
  image_url?: string | null;
};

export interface ChatMessageFlowDeps {
  clearAutoReloadTimer: () => void;
  clearAllTimers: () => void;
  stopNotifyCheck: () => void;
  localVideo: {
    startThinkingVideo: () => void;
    stopThinkingVideo: () => void;
  };
  handleTextMessage: (
    text: string,
    userId?: string,
    onBeforeResponse?: () => void | boolean,
    onHumanSent?: () => void,
    displayText?: string
  ) => Promise<ChatMessageResponse | false>;
  isInterrupted: ShallowRef<boolean>;
  firstFlag: ShallowRef<boolean>;
  isProcessing: ShallowRef<boolean>;
  isInfoButtonOnCooldown: ShallowRef<boolean>;
  isAIResponding: ShallowRef<boolean>;
  userId: ShallowRef<string>;
  pendingAiDialogText: ShallowRef<string>;
  activeAiImage: ShallowRef<string | undefined>;
  beginNotifyCheck: () => void;
  isDisconnected: { value: boolean };
}

export function useChatMessageFlow(deps: ChatMessageFlowDeps) {
  let cooldownTimer: number | null = null;

  function handleAiResponsePayload(result: AiResponsePayload) {
    deps.pendingAiDialogText.value = result.message ?? "";
    deps.activeAiImage.value = result.image_url ?? undefined;
  }

  async function handleSendMessage(message: string, skipCooldown = false, displayText?: string) {
    if (deps.isDisconnected.value) {
      return;
    }

    try {
      if (!skipCooldown && deps.isInfoButtonOnCooldown.value) {
        return;
      }

      deps.clearAutoReloadTimer();

      if (!skipCooldown) {
        deps.isInfoButtonOnCooldown.value = true;
        if (cooldownTimer !== null) {
          clearTimeout(cooldownTimer);
        }
        cooldownTimer = window.setTimeout(() => {
          cooldownTimer = null;
          deps.isInfoButtonOnCooldown.value = false;
        }, INFO_BUTTON_COOLDOWN);
      }

      deps.clearAllTimers();
      deps.isInterrupted.value = false;
      deps.firstFlag.value = false;
      deps.isProcessing.value = true;

      deps.localVideo.startThinkingVideo();

      const textResult = await deps.handleTextMessage(
        message,
        deps.userId.value,
        () => {
          if (deps.isInterrupted.value) {
            return false;
          }
          return true;
        },
        undefined,
        displayText
      );

      if (textResult && typeof textResult === "object") {
        handleAiResponsePayload(textResult);
        deps.beginNotifyCheck();
      }
    } catch (error: unknown) {
      if (!skipCooldown) {
        deps.isInfoButtonOnCooldown.value = false;
        if (cooldownTimer !== null) {
          clearTimeout(cooldownTimer);
          cooldownTimer = null;
        }
      }
      deps.isProcessing.value = false;
      deps.isAIResponding.value = false;
      deps.localVideo.stopThinkingVideo();
      deps.stopNotifyCheck();
      console.error("[handleSendMessage]", error);
    }
  }

  onBeforeUnmount(() => {
    if (cooldownTimer !== null) {
      clearTimeout(cooldownTimer);
      cooldownTimer = null;
    }
  });

  return {
    handleSendMessage,
    handleAiResponsePayload
  };
}

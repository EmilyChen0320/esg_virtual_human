import { shallowRef, onBeforeUnmount } from "vue";

import { chatApi } from "../api/chatApi";
import { SPEAKING_POLL_INTERVAL } from "../constants/timing";
import type { ChatMessageResponse, Dialog, Avatar, Voice, TranscribeResponse } from "../types/chat";

export const INVALID_TRANSCRIBE_RESULT = "invalid-transcribe-result" as const;
export type TranscribeFlowResult = TranscribeResponse | false | typeof INVALID_TRANSCRIBE_RESULT;

export function useChat(sessionId: string, isSpeakingLocked?: { value: boolean }) {
  const dialogHistory = shallowRef<Dialog[]>([]);
  const isSpeaking = shallowRef(false);
  const isConsulting = shallowRef(false);
  const isAIResponding = shallowRef(false);
  const avatars = shallowRef<Avatar[]>([]);
  const voices = shallowRef<Voice[]>([]);
  let speakingCheckInterval: number | null = null;
  let isSpeakingCheckPending = false;

  function addDialog(text: string, isUser: boolean, image?: string) {
    dialogHistory.value = [...dialogHistory.value, { text, isUser, image }];
  }

  function clearDialogHistory() {
    dialogHistory.value = [];
  }

  function getSpeechText(response: ChatMessageResponse): string {
    const speechText = response.message;

    if (!speechText) {
      throw new Error("Text message response did not include message");
    }

    return speechText;
  }

  function getTranscribeSpeechText(response: TranscribeResponse): string {
    const speechText = response.tts_text ?? response.message ?? response.text;

    if (!speechText) {
      throw new Error("Transcribe response did not include a usable speech text");
    }

    return speechText;
  }

  function getTranscribeDisplayText(response: TranscribeResponse): string {
    return response.input_text ?? response.text ?? "";
  }

  function isMeaninglessTranscript(text: string): boolean {
    const trimmedText = text.trim();
    return !trimmedText || /^[\p{P}\p{S}\s]+$/u.test(trimmedText);
  }

  async function checkSpeakingStatus() {
    if (isSpeakingCheckPending) {
      return;
    }
    isSpeakingCheckPending = true;
    try {
      const response = await chatApi.checkSpeakingStatus(sessionId);

      if (isSpeakingLocked && isSpeakingLocked.value) {
        return;
      }

      isSpeaking.value = response.data;
    } catch (error) {
      console.error("[useChat] checkSpeakingStatus failed:", error);
    } finally {
      isSpeakingCheckPending = false;
    }
  }

  async function startSpeakingCheck() {
    if (!speakingCheckInterval) {
      await checkSpeakingStatus();
      speakingCheckInterval = window.setInterval(checkSpeakingStatus, SPEAKING_POLL_INTERVAL);
      console.log(`[useChat] speaking polling started interval=${SPEAKING_POLL_INTERVAL}ms`);
    }
  }

  async function sendMessageFlow(
    text: string,
    userId: string,
    onBeforeResponse?: () => void | boolean,
    onHumanSent?: () => void,
    displayText?: string
  ): Promise<ChatMessageResponse | false> {
    isAIResponding.value = true;
    try {
      addDialog(displayText ?? text, true);
      const response = await chatApi.sendTextMessage(text, userId);

      if (onBeforeResponse) {
        const shouldContinue = onBeforeResponse();
        if (shouldContinue === false) {
          isAIResponding.value = false;
          return false;
        }
      }

      await chatApi.sendHumanMessage(getSpeechText(response), sessionId, userId);

      if (onHumanSent) {
        onHumanSent();
      }

      return response;
    } catch (error) {
      console.error("[useChat] message flow error:", error);
      isAIResponding.value = false;
      throw error;
    }
  }

  async function handleTranscribeResult(
    audioBlob: Blob,
    onBeforeResponse?: () => void | boolean,
    userId?: string,
    onHumanSent?: () => void
  ): Promise<TranscribeFlowResult> {
    isAIResponding.value = true;
    const startedAt = Date.now();
    console.log(
      `[useChat] transcribe flow started size=${audioBlob.size}B type=${audioBlob.type || "unknown"}`
    );
    try {
      const response = await chatApi.transcribeAudio(audioBlob, sessionId, userId);
      console.log(`[useChat] transcribe response received duration=${Date.now() - startedAt}ms`);

      if (onBeforeResponse) {
        const shouldContinue = onBeforeResponse();
        if (shouldContinue === false) {
          isAIResponding.value = false;
          return false;
        }
      }

      const displayText = getTranscribeDisplayText(response);
      if (isMeaninglessTranscript(displayText)) {
        console.warn("[useChat] ignored meaningless transcript:", displayText);
        isAIResponding.value = false;
        return INVALID_TRANSCRIBE_RESULT;
      }

      const speechText = getTranscribeSpeechText(response);
      addDialog(displayText, true);
      console.log(
        `[useChat] transcribe dialog added duration=${Date.now() - startedAt}ms textLength=${displayText.length}`
      );
      await chatApi.sendHumanMessage(speechText, sessionId, userId);
      console.log(`[useChat] human sent duration=${Date.now() - startedAt}ms`);

      if (onHumanSent) {
        onHumanSent();
      }

      return response;
    } catch (error) {
      console.error("[useChat] transcribe flow error:", error);
      isAIResponding.value = false;
      throw error;
    }
  }

  async function initializeSettings() {
    try {
      const configData = await chatApi.getCurrentConfig(sessionId);
      if (configData.code === 0) {
        const avatarsData = await chatApi.getAvatars();
        const voicesData = await chatApi.getVoices();

        if (avatarsData.code === 0 && voicesData.code === 0) {
          avatars.value = Object.values(avatarsData.data);
          voices.value = Object.values(voicesData.data);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error("Failed to initialize settings", { cause: error });
      }
      throw error;
    }
  }

  function cleanup() {
    if (speakingCheckInterval) {
      clearInterval(speakingCheckInterval);
      speakingCheckInterval = null;
      console.log("[useChat] speaking polling stopped");
    }
  }

  onBeforeUnmount(() => {
    cleanup();
  });

  async function handleTextMessage(
    text: string,
    userId?: string,
    onBeforeResponse?: () => void | boolean,
    onHumanSent?: () => void,
    displayText?: string
  ): Promise<ChatMessageResponse | false> {
    if (!userId) {
      throw new Error("Missing session_id for text message");
    }
    return sendMessageFlow(text, userId, onBeforeResponse, onHumanSent, displayText);
  }

  function getSpeakingDebugState() {
    return {
      isSpeakingCheckPending,
      hasInterval: speakingCheckInterval !== null
    };
  }

  return {
    dialogHistory,
    isSpeaking,
    isConsulting,
    isAIResponding,
    avatars,
    voices,
    clearDialogHistory,
    addDialog,
    startSpeakingCheck,
    handleTranscribeResult,
    handleTextMessage,
    initializeSettings,
    getSpeakingDebugState,
    cleanup
  };
}

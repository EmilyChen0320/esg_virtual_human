import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
  watch
} from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

import { chatApi } from "../api/chatApi";
import { getSessionIdFromSearch, LOCALE_ENGLISH } from "../constants/api";
import {
  BYE_VIDEO_PATH,
  IDLE_VIDEO_PATH,
  THINKING_VIDEO_PATH,
  WAITING_COMMAND_VIDEO_PATH
} from "../constants/media";
import {
  CONSULT_FLAG_DELAY,
  END_DIALOG_TIMEOUT,
  INTERRUPT_SETTLE_DELAY,
  KIOSK_HEALTH_LOG_INTERVAL
} from "../constants/timing";
import {
  ACTION_BUTTON_POSITION_STORAGE_KEY,
  DEFAULT_ACTION_BUTTON_POSITION,
  type ActionButtonPosition
} from "../constants/ui";
import type { FaqQuestionSelection } from "../types/chat";
import type { VideoStreamHandle } from "../types/mediaRefs";
import { loadSrsSdk } from "../utils/srs";

import { useAudioRecording } from "./useAudioRecording";
import { useAutoReload } from "./useAutoReload";
import { useChat } from "./useChat";
import { useChatMessageFlow } from "./useChatMessageFlow";
import { useChatNotify } from "./useChatNotify";
import { useConnectionMonitor } from "./useConnectionMonitor";
import { useFaq } from "./useFaq";
import { useInterrupt, type InterruptOptions } from "./useInterrupt";
import { useLocalVideo } from "./useLocalVideo";
import { useNightServiceRedirect } from "./useNightServiceRedirect";
import { useNotifyEvents } from "./useNotifyEvents";
import { usePageLanguage } from "./usePageLanguage";
import { useRecordingFlow } from "./useRecordingFlow";
import { useRestartFlow } from "./useRestartFlow";

function isActionButtonPosition(value: string | null): value is ActionButtonPosition {
  return value === "top" || value === "bottom";
}

function getStoredActionButtonPosition(): ActionButtonPosition {
  try {
    const storedPosition = localStorage.getItem(ACTION_BUTTON_POSITION_STORAGE_KEY);

    if (isActionButtonPosition(storedPosition)) {
      return storedPosition;
    }
  } catch {
    return DEFAULT_ACTION_BUTTON_POSITION;
  }

  return DEFAULT_ACTION_BUTTON_POSITION;
}

function storeActionButtonPosition(position: ActionButtonPosition) {
  try {
    localStorage.setItem(ACTION_BUTTON_POSITION_STORAGE_KEY, position);
  } catch {
    // Keep the UI preference usable even when storage is unavailable.
  }
}

function getReadyOpeningMessage(
  apiOpeningMessage: string | undefined,
  locale: string,
  t: (key: string) => string
): string {
  if (locale === LOCALE_ENGLISH) {
    return apiOpeningMessage ?? "";
  }

  return t("message.ready-opening");
}

interface PerformanceMemoryInfo {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

function getPerformanceMemory(): PerformanceMemoryInfo | null {
  const performanceWithMemory = performance as Performance & { memory?: PerformanceMemoryInfo };
  return performanceWithMemory.memory ?? null;
}

export function useChatPage() {
  const { locale, t } = useI18n();
  const { applyLocale } = usePageLanguage(locale);
  useNightServiceRedirect();

  const route = useRoute();
  const rawSession = route && typeof route.query?.session === "string" ? route.query.session : "";
  const sessionId = getSessionIdFromSearch(rawSession ? `?session=${rawSession}` : "");
  const userId = shallowRef("");

  const localVideo = useLocalVideo(IDLE_VIDEO_PATH, THINKING_VIDEO_PATH);
  const { setAutoReloadTimer, clearAutoReloadTimer } = useAutoReload();
  const {
    isDisconnected,
    startMonitoring: startConnectionMonitor,
    getConnectionDebugState
  } = useConnectionMonitor(sessionId);
  const { startNotifyCheck, stopNotifyCheck, resetTimestamp, getNotifyDebugState } =
    useNotifyEvents(sessionId, {
      isDisconnected
    });

  const {
    isRecording,
    startAudioCapture,
    stopRecording,
    cancelRecording,
    cleanup: cleanupAudio,
    setAutoStopCallback
  } = useAudioRecording();

  const isSpeakingLocked = shallowRef(false);

  const {
    dialogHistory,
    isSpeaking,
    isConsulting,
    isAIResponding,
    initializeSettings,
    startSpeakingCheck,
    handleTranscribeResult,
    handleTextMessage,
    clearDialogHistory,
    addDialog,
    getSpeakingDebugState,
    cleanup: cleanupChat
  } = useChat(sessionId, isSpeakingLocked);

  const videoStreamRef = useTemplateRef<VideoStreamHandle>("videoStream");
  const isEndingConsult = shallowRef(false);
  const isInitializingChatPage = shallowRef(true);
  const isProcessing = shallowRef(false);
  const isStartingConsult = shallowRef(false);
  const isInfoButtonOnCooldown = shallowRef(false);
  const streamActive = shallowRef(false);
  const showStreamVideo = shallowRef(false);
  const isLastPrompt = shallowRef(false);
  const firstFlag = shallowRef(true);
  const showEndDialogBox = shallowRef(false);
  const activeAiDialogText = shallowRef("");
  const pendingAiDialogText = shallowRef("");
  const activeAiImage = shallowRef<string | undefined>(undefined);
  const chatMode = shallowRef<"standby" | "ready" | "conversation">("standby");
  const openingMessage = shallowRef("");
  const showButtonPositionDialog = shallowRef(false);
  const actionButtonPosition = shallowRef<ActionButtonPosition>(getStoredActionButtonPosition());
  let consultFlagTimer: number | null = null;
  let endDialogTimer: number | null = null;
  let kioskHealthTimer: number | null = null;

  function handleButtonPositionTrigger() {
    showButtonPositionDialog.value = true;
  }

  function handleButtonPositionSelect(position: ActionButtonPosition) {
    actionButtonPosition.value = position;
    storeActionButtonPosition(position);
    showButtonPositionDialog.value = false;
  }

  function cancelButtonPositionDialog() {
    showButtonPositionDialog.value = false;
  }

  function playBaseVideo(src: string) {
    localVideo.setBaseVideoSource(src);
    localVideo.playIdleVideo();
  }

  function clearAllTimers() {
    stopNotifyCheck();
    clearAutoReloadTimer();
    isLastPrompt.value = false;
  }

  function nextTickResumeLocalVideo() {
    nextTick(() => {
      videoStreamRef.value?.setMuted(false);
      const currentVideoRef = localVideo.getCurrentVideoRef();
      if (currentVideoRef?.paused) {
        currentVideoRef.play()?.catch(() => {});
      }
    });
  }

  const { beginNotifyCheck } = useChatNotify({
    localVideo,
    isProcessing,
    isAIResponding,
    isConsulting,
    isLastPrompt,
    streamActive,
    showStreamVideo,
    activeAiDialogText,
    pendingAiDialogText,
    activeAiImage,
    videoStreamRef,
    addDialog,
    stopNotifyCheck,
    startNotifyCheck,
    setAutoReloadTimer,
    handleEndConsult
  });

  const { isInterrupted, handleInterrupt: rawHandleInterrupt } = useInterrupt({
    sessionId,
    isSpeakingLocked,
    stopNotifyCheck,
    clearAllTimers,
    resetTimestamp,
    localVideo,
    videoStreamRef,
    isProcessing,
    isAIResponding,
    isEndingConsult,
    showStreamVideo,
    activeAiDialogText,
    pendingAiDialogText,
    activeAiImage,
    firstFlag
  });

  const handleInterrupt = async (options?: InterruptOptions) => {
    await rawHandleInterrupt(options);
    streamActive.value = false;
  };

  const { handleSendMessage, handleAiResponsePayload } = useChatMessageFlow({
    clearAutoReloadTimer,
    clearAllTimers,
    stopNotifyCheck,
    localVideo,
    handleTextMessage,
    isInterrupted,
    firstFlag,
    isProcessing,
    isInfoButtonOnCooldown,
    isAIResponding,
    userId,
    pendingAiDialogText,
    activeAiImage,
    beginNotifyCheck,
    isDisconnected
  });

  const {
    handleRecordingClick,
    cancelActiveRecording,
    isPreparingRecording,
    cleanup: cleanupRecording
  } = useRecordingFlow({
    isDisconnected,
    isRecording,
    startAudioCapture,
    stopRecording,
    cancelRecording,
    isInterrupted,
    firstFlag,
    isProcessing,
    isAIResponding,
    localVideo,
    handleTranscribeResult,
    handleAiResponsePayload,
    userId,
    beginNotifyCheck,
    clearAutoReloadTimer,
    clearAllTimers,
    stopNotifyCheck,
    muteStream: () => {
      videoStreamRef.value?.setMuted(true);
    },
    sendEmptySpeechToBackend: async () => {
      const emptySpeechText = t("message.empty-speech");
      await chatApi.sendHumanMessage(emptySpeechText, sessionId, userId.value);
    }
  });

  const faq = useFaq();

  const {
    showRestartDialog,
    restartDialogTitle,
    restartDialogBody,
    handleLanguageChange,
    handleRestart,
    confirmRestart,
    cancelRestart
  } = useRestartFlow({
    localVideo,
    showStreamVideo,
    isProcessing,
    isAIResponding,
    isSpeaking,
    isConsulting,
    isRecording,
    chatMode,
    userId,
    openingMessage,
    applyLocale,
    cancelActiveRecording,
    handleInterrupt,
    clearAllTimers,
    clearDialogHistory,
    closeFaq: () => faq.close()
  });

  const chatPhase = computed(() => {
    if (!isConsulting.value) {
      return "idle";
    }
    if (isRecording.value) {
      return "recording";
    }
    if (isProcessing.value) {
      return "processing";
    }
    if (isAIResponding.value) {
      return "responding";
    }
    if (isSpeaking.value) {
      return "speaking";
    }
    return "ready";
  });

  const shouldShowInterruptButton = computed(
    () => isProcessing.value || isAIResponding.value || isSpeaking.value || showStreamVideo.value
  );

  const disableAllButtons = computed(
    () =>
      isInitializingChatPage.value ||
      isEndingConsult.value ||
      isStartingConsult.value ||
      isPreparingRecording.value
  );
  const disableFaqRestart = computed(
    () => isProcessing.value || isEndingConsult.value || isStartingConsult.value
  );
  const isActionProcessing = computed(
    () => isInitializingChatPage.value || isProcessing.value || isStartingConsult.value
  );

  function logKioskHealth() {
    const activeVideo = localVideo.getCurrentVideoRef();
    const memory = getPerformanceMemory();
    console.log("[kioskHealth]", {
      chatMode: chatMode.value,
      isInitializingChatPage: isInitializingChatPage.value,
      isDisconnected: isDisconnected.value,
      isRecording: isRecording.value,
      isPreparingRecording: isPreparingRecording.value,
      isProcessing: isProcessing.value,
      isAIResponding: isAIResponding.value,
      isSpeaking: isSpeaking.value,
      showStreamVideo: showStreamVideo.value,
      localVideo: activeVideo
        ? {
            src: activeVideo.currentSrc || activeVideo.src,
            readyState: activeVideo.readyState,
            paused: activeVideo.paused
          }
        : null,
      notify: getNotifyDebugState(),
      connection: getConnectionDebugState(),
      speaking: getSpeakingDebugState(),
      memory
    });
  }

  function startKioskHealthLogging() {
    if (kioskHealthTimer !== null) {
      return;
    }
    logKioskHealth();
    kioskHealthTimer = window.setInterval(logKioskHealth, KIOSK_HEALTH_LOG_INTERVAL);
  }

  function stopKioskHealthLogging() {
    if (kioskHealthTimer !== null) {
      clearInterval(kioskHealthTimer);
      kioskHealthTimer = null;
    }
  }

  async function handleConsultClick(options?: { autoStartRecording?: boolean }) {
    if (isInitializingChatPage.value || isDisconnected.value) {
      return;
    }

    if (isStartingConsult.value) {
      return;
    }

    try {
      isStartingConsult.value = true;
      const autoStartRecording = options?.autoStartRecording ?? true;
      clearAutoReloadTimer();
      openingMessage.value = "";
      const result = await chatApi.startHciotChat(locale.value);
      if (!result.ok) {
        throw new Error(result.message || "Failed to start session");
      }
      userId.value = result.session_id;

      clearDialogHistory();
      const readyOpeningMessage = getReadyOpeningMessage(result.opening_message, locale.value, t);
      if (readyOpeningMessage) {
        openingMessage.value = readyOpeningMessage;
        addDialog(readyOpeningMessage, false);
      }
      resetTimestamp();
      streamActive.value = false;
      showStreamVideo.value = false;
      isLastPrompt.value = false;

      if (chatMode.value === "standby") {
        await localVideo.transitionToBaseVideo(WAITING_COMMAND_VIDEO_PATH);
        chatMode.value = "ready";
        return;
      }

      isConsulting.value = true;
      firstFlag.value = false;
      nextTickResumeLocalVideo();
      if (autoStartRecording) {
        await handleRecordingClick();
      }
    } catch (error: unknown) {
      openingMessage.value = "";
      console.error("[handleConsultClick] failed:", error);
    } finally {
      isStartingConsult.value = false;
    }
  }

  function enterConversationMode() {
    chatMode.value = "conversation";
    isConsulting.value = true;
    firstFlag.value = false;
    playBaseVideo(WAITING_COMMAND_VIDEO_PATH);
    nextTickResumeLocalVideo();
  }

  async function handleStartConversation() {
    if (disableAllButtons.value) {
      return;
    }

    try {
      enterConversationMode();
      await handleRecordingClick();
    } catch (error: unknown) {
      console.error("[handleStartConversation]", error);
    }
  }

  async function handleEndConsult(isTimeout = false, showEndDialog = true) {
    try {
      if (isProcessing.value || isAIResponding.value || isSpeaking.value) {
        await handleInterrupt();
        await new Promise((resolve) => setTimeout(resolve, INTERRUPT_SETTLE_DELAY));
      }

      clearAllTimers();
      clearDialogHistory();
      userId.value = "";
      streamActive.value = false;
      showStreamVideo.value = false;
      isProcessing.value = false;
      isAIResponding.value = false;
      isSpeaking.value = false;
      isEndingConsult.value = false;

      if (consultFlagTimer !== null) {
        clearTimeout(consultFlagTimer);
      }
      nextTick(() => {
        consultFlagTimer = window.setTimeout(() => {
          consultFlagTimer = null;
          isConsulting.value = false;
          chatMode.value = "standby";
          openingMessage.value = "";
          playBaseVideo(IDLE_VIDEO_PATH);
        }, CONSULT_FLAG_DELAY);
      });

      if (!isTimeout && showEndDialog) {
        showEndDialogBox.value = true;
      }
      if (showEndDialog) {
        if (endDialogTimer !== null) {
          clearTimeout(endDialogTimer);
        }
        endDialogTimer = window.setTimeout(() => {
          endDialogTimer = null;
          showEndDialogBox.value = false;
        }, END_DIALOG_TIMEOUT);
      }
    } catch (error: unknown) {
      console.error("[handleEndConsult]", error);
    } finally {
      isProcessing.value = false;
      isAIResponding.value = false;
      isConsulting.value = false;
      isEndingConsult.value = false;
      showStreamVideo.value = false;
    }
  }

  async function handleQuickAction(message: string, displayText?: string) {
    if (isRecording.value) {
      await cancelActiveRecording();
    }
    if (!isConsulting.value) {
      await handleConsultClick({ autoStartRecording: false });
      await nextTick();
    }
    if (chatMode.value !== "conversation") {
      enterConversationMode();
    }
    if (isProcessing.value || isAIResponding.value || isSpeaking.value) {
      await handleInterrupt({ resumeIdleVideo: false });
      await new Promise((resolve) => setTimeout(resolve, INTERRUPT_SETTLE_DELAY));
    }
    await handleSendMessage(message, true, displayText);
  }

  async function handleFaqClick() {
    if (disableFaqRestart.value) {
      return;
    }

    faq.open();
    await faq.loadTopics();
  }

  async function handleFaqQuestionSelect(selection: FaqQuestionSelection) {
    faq.close();
    await handleQuickAction(selection.displayText, selection.displayText);
  }

  const handleReload = () => window.location.reload();

  const hasBeenDisconnected = shallowRef(false);

  function handleDisconnect() {
    hasBeenDisconnected.value = true;
    if (showStreamVideo.value) {
      showStreamVideo.value = false;
      videoStreamRef.value?.setMuted(true);
    }
    streamActive.value = false;
    if (isProcessing.value || isAIResponding.value) {
      isProcessing.value = false;
      isAIResponding.value = false;
      stopNotifyCheck();
    }
    isStartingConsult.value = false;
    isPreparingRecording.value = false;
    const baseSrc =
      chatMode.value === "conversation" ? WAITING_COMMAND_VIDEO_PATH : IDLE_VIDEO_PATH;
    localVideo.setBaseVideoSource(baseSrc);
    localVideo.enterOfflineLoop();
  }

  function handleReconnect() {
    if (!hasBeenDisconnected.value) {
      return;
    }
    hasBeenDisconnected.value = false;
    window.location.reload();
  }

  onMounted(async () => {
    try {
      localVideo.initializeVideos();
      localVideo.preloadAll([
        IDLE_VIDEO_PATH,
        THINKING_VIDEO_PATH,
        WAITING_COMMAND_VIDEO_PATH,
        BYE_VIDEO_PATH
      ]);
      startConnectionMonitor();
      setAutoStopCallback(() => {
        if (isRecording.value) {
          handleRecordingClick();
        }
      });
      await loadSrsSdk();
      await initializeSettings();
      await startSpeakingCheck();
      isInitializingChatPage.value = false;
      startKioskHealthLogging();
    } catch (error: unknown) {
      console.error("[useChatPage:onMounted]", error);
    }
  });

  watch(isSpeaking, (newVal) => {
    if (
      !newVal &&
      isConsulting.value &&
      !isProcessing.value &&
      !isRecording.value &&
      !isInterrupted.value
    ) {
      if (firstFlag.value) {
        firstFlag.value = false;
      }
    }
  });

  watch(isDisconnected, (disconnected) => (disconnected ? handleDisconnect() : handleReconnect()));

  onBeforeUnmount(() => {
    cleanupAudio();
    cleanupChat();
    cleanupRecording();
    clearAllTimers();
    clearAutoReloadTimer();
    stopKioskHealthLogging();
    localVideo.cleanup();
    if (consultFlagTimer !== null) {
      clearTimeout(consultFlagTimer);
      consultFlagTimer = null;
    }
    if (endDialogTimer !== null) {
      clearTimeout(endDialogTimer);
      endDialogTimer = null;
    }
  });

  return {
    sessionId,
    isDisconnected,
    localVideo,
    streamActive,
    showStreamVideo,
    dialogHistory,
    activeAiDialogText,
    isRecording,
    isPreparingRecording,
    isConsulting,
    isProcessing,
    isInitializingChatPage,
    isStartingConsult,
    isSpeaking,
    isAIResponding,
    isInfoButtonOnCooldown,
    showEndDialogBox,
    chatPhase,
    chatMode,
    openingMessage,
    showButtonPositionDialog,
    actionButtonPosition,
    disableAllButtons,
    disableFaqRestart,
    isActionProcessing,
    shouldShowInterruptButton,
    videoStreamRef,
    handleConsultClick,
    handleStartConversation,
    handleRecordingClick,
    handleInterrupt,
    handleQuickAction,
    handleFaqClick,
    handleFaqQuestionSelect,
    faq,
    handleButtonPositionTrigger,
    handleButtonPositionSelect,
    cancelButtonPositionDialog,
    handleLanguageChange,
    showRestartDialog,
    restartDialogTitle,
    restartDialogBody,
    handleRestart,
    confirmRestart,
    cancelRestart,
    handleReload
  };
}

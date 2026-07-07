import { computed, shallowRef, type ShallowRef } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { LANG_QUERY_PARAM } from "../constants/api";
import { isAuthSessionValid } from "../constants/auth";
import { BYE_VIDEO_PATH, IDLE_VIDEO_PATH, WAITING_COMMAND_VIDEO_PATH } from "../constants/media";
import { INTERRUPT_SETTLE_DELAY, RESTART_ACTION_TIMEOUT } from "../constants/timing";

import type { InterruptOptions } from "./useInterrupt";
import type { LocalVideoHandle } from "./useLocalVideo";

type PendingRestartAction = "restart" | "switch-language-chat" | "switch-language-home" | null;

type ChatMode = "standby" | "ready" | "conversation";

export interface RestartFlowDeps {
  localVideo: LocalVideoHandle;
  showStreamVideo: ShallowRef<boolean>;
  isProcessing: ShallowRef<boolean>;
  isAIResponding: ShallowRef<boolean>;
  isSpeaking: ShallowRef<boolean>;
  isConsulting: ShallowRef<boolean>;
  isRecording: ShallowRef<boolean>;
  chatMode: ShallowRef<ChatMode>;
  userId: ShallowRef<string>;
  openingMessage: ShallowRef<string>;
  applyLocale: (lang: string) => void;
  cancelActiveRecording: () => Promise<void>;
  handleInterrupt: (options?: InterruptOptions) => Promise<void>;
  clearAllTimers: () => void;
  clearDialogHistory: () => void;
  closeFaq: () => void;
}

// Note: awaitWithTimeout resolves (not rejects) on timeout to avoid blocking
// teardown when an action is stuck — this is intentional.
async function awaitWithTimeout(action: Promise<void>, timeoutMs: number): Promise<void> {
  let timeoutId: number | undefined;
  try {
    await Promise.race([
      action,
      new Promise<void>((resolve) => {
        timeoutId = window.setTimeout(resolve, timeoutMs);
      })
    ]);
  } finally {
    if (typeof timeoutId === "number") {
      clearTimeout(timeoutId);
    }
  }
}

export function useRestartFlow(deps: RestartFlowDeps) {
  const {
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
    closeFaq
  } = deps;

  const { t } = useI18n();
  const router = useRouter();

  const showRestartDialog = shallowRef(false);
  const pendingRestartAction = shallowRef<PendingRestartAction>(null);
  const pendingLanguage = shallowRef("");
  const restartDialogPreviousStreamVisible = shallowRef(false);

  const restartDialogTitle = computed(() => {
    if (
      pendingRestartAction.value === "switch-language-chat" ||
      pendingRestartAction.value === "switch-language-home"
    ) {
      return t("confirm.language-change-title");
    }

    return t("confirm.restart-chat-title");
  });

  const restartDialogBody = computed(() => {
    if (pendingRestartAction.value === "switch-language-chat") {
      return t("confirm.restart-lang");
    }

    if (pendingRestartAction.value === "switch-language-home") {
      return t("confirm.home-lang");
    }

    return t("confirm.restart-chat-body");
  });

  function switchToStandbyVideo() {
    localVideo.setBaseVideoSource(IDLE_VIDEO_PATH);
    localVideo.playIdleVideo();
  }

  function syncBaseVideoForCurrentMode() {
    localVideo.setBaseVideoSource(
      chatMode.value === "conversation" ? WAITING_COMMAND_VIDEO_PATH : IDLE_VIDEO_PATH
    );
  }

  function restoreVideoAfterRestartDialog() {
    syncBaseVideoForCurrentMode();

    if (restartDialogPreviousStreamVisible.value) {
      showStreamVideo.value = true;
      restartDialogPreviousStreamVisible.value = false;
      return;
    }

    restartDialogPreviousStreamVisible.value = false;

    if (isProcessing.value) {
      localVideo.startThinkingVideo();
      return;
    }

    localVideo.playIdleVideo();
  }

  function openRestartDialog(action: Exclude<PendingRestartAction, null>, lang = "") {
    pendingRestartAction.value = action;
    pendingLanguage.value = lang;
    restartDialogPreviousStreamVisible.value = showStreamVideo.value;
    showStreamVideo.value = false;
    syncBaseVideoForCurrentMode();
    localVideo.playVideoOnce(BYE_VIDEO_PATH).catch(() => {});
    showRestartDialog.value = true;
  }

  function closeRestartDialog() {
    showRestartDialog.value = false;
    pendingRestartAction.value = null;
    pendingLanguage.value = "";
  }

  async function teardownSession() {
    closeRestartDialog();
    closeFaq();

    if (isRecording.value) {
      await awaitWithTimeout(cancelActiveRecording(), RESTART_ACTION_TIMEOUT);
    }

    if (isProcessing.value || isAIResponding.value || isSpeaking.value) {
      await awaitWithTimeout(handleInterrupt(), RESTART_ACTION_TIMEOUT);
      await new Promise((resolve) => setTimeout(resolve, INTERRUPT_SETTLE_DELAY));
    }

    clearAllTimers();
    clearDialogHistory();
    showStreamVideo.value = false;
    isProcessing.value = false;
    isAIResponding.value = false;
    isConsulting.value = false;
    userId.value = "";
    chatMode.value = "standby";
    openingMessage.value = "";
    switchToStandbyVideo();
  }

  async function executeRestart() {
    await teardownSession();

    const session = router.currentRoute?.value?.query?.session as string | undefined;
    const lang = router.currentRoute?.value?.query?.[LANG_QUERY_PARAM] as string | undefined;
    const query: Record<string, string> = {};
    if (session) {
      query.session = session;
    }
    if (lang) {
      query[LANG_QUERY_PARAM] = lang;
    }
    await router.push({ path: "/", query });
  }

  async function executeChatLanguageChange(lang: string) {
    await teardownSession();

    applyLocale(lang);
    const session = router.currentRoute?.value?.query?.session as string | undefined;
    const query: Record<string, string> = { [LANG_QUERY_PARAM]: lang };
    if (session) {
      query.session = session;
    }
    await router.replace({ path: "/chat", query });
  }

  async function executeHomeLanguageChange(lang: string) {
    await teardownSession();

    applyLocale(lang);
    const session = router.currentRoute?.value?.query?.session as string | undefined;
    const query: Record<string, string> = { [LANG_QUERY_PARAM]: lang };
    if (session) {
      query.session = session;
    }
    await router.push({ path: "/", query });
  }

  async function handleLanguageChange(lang: string) {
    if (isAuthSessionValid()) {
      openRestartDialog("switch-language-chat", lang);
      return;
    }

    openRestartDialog("switch-language-home", lang);
  }

  async function handleRestart() {
    if (chatMode.value !== "standby") {
      openRestartDialog("restart");
      return;
    }
    await executeRestart();
  }

  async function confirmRestart() {
    if (pendingRestartAction.value === "switch-language-chat") {
      await executeChatLanguageChange(pendingLanguage.value);
      return;
    }

    if (pendingRestartAction.value === "switch-language-home") {
      await executeHomeLanguageChange(pendingLanguage.value);
      return;
    }

    await executeRestart();
  }

  function cancelRestart() {
    closeRestartDialog();
    restoreVideoAfterRestartDialog();
  }

  return {
    showRestartDialog,
    restartDialogTitle,
    restartDialogBody,
    handleLanguageChange,
    handleRestart,
    confirmRestart,
    cancelRestart
  };
}

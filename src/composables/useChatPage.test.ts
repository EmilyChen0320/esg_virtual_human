import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef, type ShallowRef } from "vue";

import { AUTH_STORAGE_KEY, AUTH_TTL_MS } from "../constants/auth";
import { INTERRUPT_SETTLE_DELAY, RESTART_ACTION_TIMEOUT } from "../constants/timing";
import { ACTION_BUTTON_POSITION_STORAGE_KEY } from "../constants/ui";
import type { FaqQuestionSelection } from "../types/chat";

const routerMocks = vi.hoisted(() => ({
  push: vi.fn().mockResolvedValue(undefined),
  replace: vi.fn().mockResolvedValue(undefined)
}));

const routeMocks = vi.hoisted(() => ({
  query: {} as Record<string, string>
}));

const applyLocaleMock = vi.hoisted(() => vi.fn());
const interruptMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const cancelActiveRecordingMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const loadSrsSdkMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const initializeSettingsMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const startSpeakingCheckMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const useNightServiceRedirectMock = vi.hoisted(() => vi.fn());
const localVideoMocks = vi.hoisted(() => ({
  videoRefA: { value: null },
  videoRefB: { value: null },
  activeBuffer: { value: "A" as const },
  initializeVideos: vi.fn(),
  getCurrentVideoRef: vi.fn(() => null),
  pauseCurrentVideo: vi.fn(),
  playIdleVideo: vi.fn(),
  startThinkingVideo: vi.fn(),
  stopThinkingVideo: vi.fn(),
  setBaseVideoSource: vi.fn(),
  playVideoOnce: vi.fn().mockResolvedValue(undefined),
  transitionToBaseVideo: vi.fn().mockResolvedValue(undefined),
  preloadBytes: vi.fn(),
  preloadAll: vi.fn(),
  enterOfflineLoop: vi.fn(),
  cleanup: vi.fn()
}));
const startHciotChatMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    ok: true,
    session_id: "faq-session-1",
    opening_message: "歡迎訊息"
  })
);
const addDialogMock = vi.hoisted(() => vi.fn());
const READY_OPENING_MESSAGE =
  "你好，歡迎來到元復醫院，我是元復醫院的智慧AI小元。如果你想了解門診資訊、衛教或醫療相關問題，歡迎使用「開始對話」按鈕與我互動，很高興為您服務。";
const handleSendMessageMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const faqMocks = vi.hoisted(() => ({
  isOpen: { value: false },
  currentLayer: { value: "categories" },
  categories: { value: [] },
  selectedTopic: { value: null as Record<string, unknown> | null },
  isLoading: { value: false },
  error: { value: "" },
  open: vi.fn(),
  close: vi.fn(),
  goBack: vi.fn(),
  selectTopic: vi.fn(),
  getQuestions: vi.fn(() => []),
  getTopicLabel: vi.fn(() => ""),
  getCategoryLabel: vi.fn(() => ""),
  buildQuestionSelection: vi.fn((question: string) => ({
    question,
    displayText: `骨科＋復健科/痛風常見問題/${question}`,
    categoryLabel: "骨科＋復健科",
    topicLabel: "痛風常見問題"
  })),
  loadTopics: vi.fn().mockResolvedValue(undefined)
}));

function makeFaqSelection(question: string): FaqQuestionSelection {
  return {
    question,
    displayText: `骨科＋復健科/痛風常見問題/${question}`,
    categoryLabel: "骨科＋復健科",
    topicLabel: "痛風常見問題"
  };
}

interface SharedState {
  isRecording: ShallowRef<boolean>;
  isConsulting: ShallowRef<boolean>;
  isProcessing: ShallowRef<boolean>;
  isPreparingRecording: ShallowRef<boolean>;
  isSpeaking: ShallowRef<boolean>;
  isAIResponding: ShallowRef<boolean>;
  isInfoButtonOnCooldown: ShallowRef<boolean>;
  showEndDialogBox: ShallowRef<boolean>;
  dialogHistory: ShallowRef<string[]>;
}

let sharedState: SharedState;

function createSharedState(): SharedState {
  return {
    isRecording: shallowRef(false),
    isConsulting: shallowRef(false),
    isProcessing: shallowRef(false),
    isPreparingRecording: shallowRef(false),
    isSpeaking: shallowRef(false),
    isAIResponding: shallowRef(false),
    isInfoButtonOnCooldown: shallowRef(false),
    showEndDialogBox: shallowRef(false),
    dialogHistory: shallowRef<string[]>([])
  };
}

vi.mock("vue-router", () => ({
  useRouter: () => routerMocks,
  useRoute: () => routeMocks
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    locale: { value: "zh" },
    t: (key: string) =>
      (
        ({
          "confirm.language-change-title": "確定要切換語言嗎？",
          "confirm.restart-lang": "切換語言將重新開始，是否確認？",
          "confirm.home-lang": "切換語言將回到首頁，並需要重新輸入密碼，是否確認？",
          "confirm.button-position-title": "是否變更按鈕位置？",
          "message.ready-opening": READY_OPENING_MESSAGE,
          "confirm.restart-chat-title": "確定要重新啟動系統嗎？",
          "confirm.restart-chat-body": "重新啟動後，目前的對話內容將不會保留。"
        }) as Record<string, string>
      )[key] ?? key
  })
}));

vi.mock("../utils/srs", () => ({
  loadSrsSdk: loadSrsSdkMock
}));

vi.mock("../api/chatApi", () => ({
  chatApi: {
    startHciotChat: startHciotChatMock
  }
}));

vi.mock("./usePageLanguage", () => ({
  usePageLanguage: () => ({
    applyLocale: applyLocaleMock,
    syncLocaleFromQuery: vi.fn()
  })
}));

vi.mock("./useLocalVideo", () => ({
  useLocalVideo: () => localVideoMocks
}));

vi.mock("./useNightServiceRedirect", () => ({
  useNightServiceRedirect: useNightServiceRedirectMock
}));

vi.mock("./useAutoReload", () => ({
  useAutoReload: () => ({
    setAutoReloadTimer: vi.fn(),
    clearAutoReloadTimer: vi.fn()
  })
}));

vi.mock("./useNotifyEvents", () => ({
  useNotifyEvents: (_sessionId: string, _deps: { isDisconnected: { value: boolean } }) => ({
    startNotifyCheck: vi.fn(),
    stopNotifyCheck: vi.fn(),
    resetTimestamp: vi.fn(),
    getNotifyDebugState: vi.fn(() => ({ isChecking: false, hasInterval: false, cancelled: true }))
  })
}));

vi.mock("./useConnectionMonitor", () => ({
  useConnectionMonitor: () => ({
    isDisconnected: shallowRef(false),
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
    getConnectionDebugState: vi.fn(() => ({
      isHeartbeatPending: false,
      hasTimer: false,
      consecutiveFailures: 0
    }))
  })
}));

vi.mock("./useAudioRecording", () => ({
  useAudioRecording: () => ({
    isRecording: sharedState.isRecording,
    startAudioCapture: vi.fn(),
    stopRecording: vi.fn().mockResolvedValue(new Blob(["audio"], { type: "audio/wav" })),
    cancelRecording: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn(),
    setAutoStopCallback: vi.fn()
  })
}));

vi.mock("./useChat", () => ({
  useChat: () => ({
    dialogHistory: sharedState.dialogHistory,
    isSpeaking: sharedState.isSpeaking,
    isConsulting: sharedState.isConsulting,
    isAIResponding: sharedState.isAIResponding,
    initializeSettings: initializeSettingsMock,
    startSpeakingCheck: startSpeakingCheckMock,
    handleTranscribeResult: vi.fn(),
    handleTextMessage: vi.fn(),
    clearDialogHistory: vi.fn(),
    addDialog: addDialogMock,
    getSpeakingDebugState: vi.fn(() => ({ isSpeakingCheckPending: false, hasInterval: true })),
    cleanup: vi.fn()
  })
}));

vi.mock("./useChatNotify", () => ({
  useChatNotify: () => ({
    beginNotifyCheck: vi.fn()
  })
}));

vi.mock("./useFaq", () => ({
  useFaq: () => ({
    isOpen: faqMocks.isOpen,
    currentLayer: faqMocks.currentLayer,
    categories: faqMocks.categories,
    selectedTopic: faqMocks.selectedTopic,
    isLoading: faqMocks.isLoading,
    error: faqMocks.error,
    open: faqMocks.open.mockImplementation(() => {
      faqMocks.isOpen.value = true;
    }),
    close: faqMocks.close.mockImplementation(() => {
      faqMocks.isOpen.value = false;
    }),
    goBack: faqMocks.goBack,
    selectTopic: faqMocks.selectTopic,
    getQuestions: faqMocks.getQuestions,
    getTopicLabel: faqMocks.getTopicLabel,
    getCategoryLabel: faqMocks.getCategoryLabel,
    buildQuestionSelection: faqMocks.buildQuestionSelection,
    loadTopics: faqMocks.loadTopics
  })
}));

vi.mock("./useInterrupt", () => ({
  useInterrupt: () => ({
    isInterrupted: { value: false },
    handleInterrupt: interruptMock
  })
}));

vi.mock("./useChatMessageFlow", () => ({
  useChatMessageFlow: () => ({
    handleSendMessage: handleSendMessageMock,
    handleAiResponsePayload: vi.fn()
  })
}));

vi.mock("./useRecordingFlow", () => ({
  useRecordingFlow: () => ({
    handleRecordingClick: vi.fn(),
    cancelActiveRecording: cancelActiveRecordingMock,
    isPreparingRecording: sharedState.isPreparingRecording,
    cleanup: vi.fn()
  })
}));

import { useChatPage } from "./useChatPage";

const Harness = defineComponent({
  setup(_, { expose }) {
    const chatPage = useChatPage();
    expose(chatPage);
    return () => h("div");
  }
});

function createAuthSession(expiresAt: number) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ expiresAt }));
}

function mountHarness() {
  return mount(Harness);
}

describe("useChatPage", () => {
  beforeEach(() => {
    localStorage.clear();
    sharedState = createSharedState();
    addDialogMock.mockClear();
    routerMocks.push.mockClear();
    routerMocks.replace.mockClear();
    applyLocaleMock.mockClear();
    interruptMock.mockClear();
    cancelActiveRecordingMock.mockClear();
    loadSrsSdkMock.mockReset();
    loadSrsSdkMock.mockResolvedValue(undefined);
    initializeSettingsMock.mockReset();
    initializeSettingsMock.mockResolvedValue(undefined);
    startSpeakingCheckMock.mockReset();
    startSpeakingCheckMock.mockResolvedValue(undefined);
    useNightServiceRedirectMock.mockClear();
    localVideoMocks.initializeVideos.mockClear();
    localVideoMocks.getCurrentVideoRef.mockClear();
    localVideoMocks.pauseCurrentVideo.mockClear();
    localVideoMocks.playIdleVideo.mockClear();
    localVideoMocks.startThinkingVideo.mockClear();
    localVideoMocks.setBaseVideoSource.mockClear();
    localVideoMocks.playVideoOnce.mockClear();
    localVideoMocks.transitionToBaseVideo.mockClear();
    localVideoMocks.preloadBytes.mockClear();
    localVideoMocks.preloadAll.mockClear();
    localVideoMocks.enterOfflineLoop.mockClear();
    localVideoMocks.cleanup.mockClear();
    startHciotChatMock.mockClear();
    handleSendMessageMock.mockClear();
    faqMocks.isOpen.value = false;
    faqMocks.open.mockClear();
    faqMocks.close.mockClear();
    faqMocks.loadTopics.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts the night service redirect scheduler", () => {
    mountHarness();

    expect(useNightServiceRedirectMock).toHaveBeenCalledOnce();
  });

  it("shows the chat restart dialog and stays on chat after confirming within the auth window", async () => {
    createAuthSession(Date.now() + AUTH_TTL_MS);
    const wrapper = mountHarness();
    await flushPromises();

    await (wrapper.vm as any).handleLanguageChange("en");

    expect((wrapper.vm as any).showRestartDialog).toBe(true);
    expect((wrapper.vm as any).restartDialogTitle).toBe("確定要切換語言嗎？");
    expect((wrapper.vm as any).restartDialogBody).toBe("切換語言將重新開始，是否確認？");
    expect(applyLocaleMock).not.toHaveBeenCalled();
    expect(localVideoMocks.playVideoOnce).toHaveBeenCalledWith("/video/bye.mp4");

    await (wrapper.vm as any).confirmRestart();

    expect(applyLocaleMock).toHaveBeenCalledWith("en");
    expect(localVideoMocks.setBaseVideoSource).toHaveBeenCalledWith("/video/idle.mp4");
    expect(routerMocks.replace).toHaveBeenCalledWith({ path: "/chat", query: { lang: "en" } });
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("shows the home language dialog and returns to home after confirmation", async () => {
    createAuthSession(Date.now() - 1000);
    const wrapper = mountHarness();
    await flushPromises();

    await (wrapper.vm as any).handleLanguageChange("en");

    expect((wrapper.vm as any).showRestartDialog).toBe(true);
    expect((wrapper.vm as any).restartDialogTitle).toBe("確定要切換語言嗎？");
    expect((wrapper.vm as any).restartDialogBody).toBe(
      "切換語言將回到首頁，並需要重新輸入密碼，是否確認？"
    );
    expect(localVideoMocks.playVideoOnce).toHaveBeenCalledWith("/video/bye.mp4");

    await (wrapper.vm as any).confirmRestart();

    expect(applyLocaleMock).toHaveBeenCalledWith("en");
    expect(localVideoMocks.setBaseVideoSource).toHaveBeenCalledWith("/video/idle.mp4");
    expect(routerMocks.push).toHaveBeenCalledWith({ path: "/", query: { lang: "en" } });
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("chat language change still completes when cancelActiveRecording hangs", async () => {
    vi.useFakeTimers();
    try {
      createAuthSession(Date.now() + AUTH_TTL_MS);
      sharedState.isRecording.value = true;
      cancelActiveRecordingMock.mockImplementation(() => new Promise<void>(() => {}));
      const wrapper = mountHarness();
      await flushPromises();

      await (wrapper.vm as any).handleLanguageChange("en");

      const confirmPromise = (wrapper.vm as any).confirmRestart();
      await vi.advanceTimersByTimeAsync(RESTART_ACTION_TIMEOUT);
      await confirmPromise;

      expect(applyLocaleMock).toHaveBeenCalledWith("en");
      expect(localVideoMocks.setBaseVideoSource).toHaveBeenCalledWith("/video/idle.mp4");
      expect(routerMocks.replace).toHaveBeenCalledWith({ path: "/chat", query: { lang: "en" } });
      expect(routerMocks.push).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("home language change still completes when interrupt hangs", async () => {
    vi.useFakeTimers();
    try {
      createAuthSession(Date.now() - 1000);
      sharedState.isSpeaking.value = true;
      interruptMock.mockImplementation(() => new Promise<void>(() => {}));
      const wrapper = mountHarness();
      await flushPromises();

      await (wrapper.vm as any).handleLanguageChange("en");

      const confirmPromise = (wrapper.vm as any).confirmRestart();
      await vi.advanceTimersByTimeAsync(RESTART_ACTION_TIMEOUT + INTERRUPT_SETTLE_DELAY);
      await confirmPromise;

      expect(applyLocaleMock).toHaveBeenCalledWith("en");
      expect(localVideoMocks.setBaseVideoSource).toHaveBeenCalledWith("/video/idle.mp4");
      expect(routerMocks.push).toHaveBeenCalledWith({ path: "/", query: { lang: "en" } });
      expect(routerMocks.replace).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not navigate when the expired-session language change is canceled", async () => {
    createAuthSession(Date.now() - 1000);
    const wrapper = mountHarness();
    await flushPromises();

    await (wrapper.vm as any).handleLanguageChange("en");
    (wrapper.vm as any).cancelRestart();

    expect(applyLocaleMock).not.toHaveBeenCalled();
    expect(localVideoMocks.playVideoOnce).toHaveBeenCalledWith("/video/bye.mp4");
    expect(localVideoMocks.setBaseVideoSource).toHaveBeenLastCalledWith("/video/idle.mp4");
    expect(localVideoMocks.playIdleVideo).toHaveBeenCalled();
    expect(routerMocks.push).not.toHaveBeenCalled();
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("restarts the chat state and routes back to home", async () => {
    sharedState.isConsulting.value = true;
    sharedState.isProcessing.value = true;
    sharedState.isAIResponding.value = true;
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.handleRestart();

    expect(interruptMock).toHaveBeenCalledOnce();
    expect(localVideoMocks.playVideoOnce).not.toHaveBeenCalled();
    expect(localVideoMocks.setBaseVideoSource).toHaveBeenCalledWith("/video/idle.mp4");
    expect(vm.isConsulting).toBe(false);
    expect(vm.isProcessing).toBe(false);
    expect(vm.isAIResponding).toBe(false);
    expect(routerMocks.push).toHaveBeenCalledWith({ path: "/", query: {} });
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("restart still resets state when cancelActiveRecording hangs during recording", async () => {
    vi.useFakeTimers();
    try {
      sharedState.isConsulting.value = true;
      sharedState.isRecording.value = true;
      cancelActiveRecordingMock.mockImplementation(() => new Promise<void>(() => {}));
      const wrapper = mountHarness();
      await flushPromises();
      const vm = wrapper.vm as any;

      const restartPromise = vm.handleRestart();
      await vi.advanceTimersByTimeAsync(RESTART_ACTION_TIMEOUT);
      await restartPromise;

      expect(localVideoMocks.playVideoOnce).not.toHaveBeenCalled();
      expect(vm.isConsulting).toBe(false);
      expect(vm.chatMode).toBe("standby");
      expect(routerMocks.push).toHaveBeenCalledWith({ path: "/", query: {} });
      expect(routerMocks.replace).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("restart still resets state when interrupt hangs during speaking", async () => {
    vi.useFakeTimers();
    try {
      sharedState.isConsulting.value = true;
      sharedState.isSpeaking.value = true;
      interruptMock.mockImplementation(() => new Promise<void>(() => {}));
      const wrapper = mountHarness();
      await flushPromises();
      const vm = wrapper.vm as any;

      const restartPromise = vm.handleRestart();
      await vi.advanceTimersByTimeAsync(RESTART_ACTION_TIMEOUT + INTERRUPT_SETTLE_DELAY);
      await restartPromise;

      expect(localVideoMocks.playVideoOnce).not.toHaveBeenCalled();
      expect(vm.isConsulting).toBe(false);
      expect(vm.chatMode).toBe("standby");
      expect(routerMocks.push).toHaveBeenCalledWith({ path: "/", query: {} });
      expect(routerMocks.replace).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows restart dialog instead of executing restart when not in standby", async () => {
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;
    vm.chatMode = "conversation";

    vm.handleRestart();

    expect(vm.showRestartDialog).toBe(true);
    expect(vm.chatMode).toBe("conversation");
  });

  it("executes restart when confirmRestart is called after dialog shown", async () => {
    sharedState.isConsulting.value = true;
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;
    vm.chatMode = "conversation";

    vm.handleRestart();
    expect(vm.showRestartDialog).toBe(true);
    expect(localVideoMocks.playVideoOnce).toHaveBeenCalledWith("/video/bye.mp4");

    await vm.confirmRestart();

    expect(vm.showRestartDialog).toBe(false);
    expect(vm.isConsulting).toBe(false);
    expect(vm.chatMode).toBe("standby");
  });

  it("hides restart dialog when cancelRestart is called", async () => {
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;
    vm.chatMode = "conversation";

    vm.handleRestart();
    expect(vm.showRestartDialog).toBe(true);
    expect(localVideoMocks.playVideoOnce).toHaveBeenCalledWith("/video/bye.mp4");

    vm.cancelRestart();
    expect(vm.showRestartDialog).toBe(false);
    expect(vm.chatMode).toBe("conversation");
    expect(localVideoMocks.setBaseVideoSource).toHaveBeenLastCalledWith(
      "/video/waiting-command.mp4"
    );
    expect(localVideoMocks.playIdleVideo).toHaveBeenCalled();
  });

  it("shows the restart dialog and stays on chat when switching language outside standby", async () => {
    createAuthSession(Date.now() + AUTH_TTL_MS);
    const wrapper = mountHarness();
    await flushPromises();
    (wrapper.vm as any).chatMode = "conversation";

    await (wrapper.vm as any).handleLanguageChange("en");

    expect((wrapper.vm as any).showRestartDialog).toBe(true);
    expect((wrapper.vm as any).restartDialogTitle).toBe("確定要切換語言嗎？");
    expect((wrapper.vm as any).restartDialogBody).toBe("切換語言將重新開始，是否確認？");
    expect(applyLocaleMock).not.toHaveBeenCalled();
    expect(localVideoMocks.playVideoOnce).toHaveBeenCalledWith("/video/bye.mp4");

    await (wrapper.vm as any).confirmRestart();

    expect(faqMocks.close).toHaveBeenCalled();
    expect(applyLocaleMock).toHaveBeenCalledWith("en");
    expect(localVideoMocks.setBaseVideoSource).toHaveBeenCalledWith("/video/idle.mp4");
    expect(routerMocks.replace).toHaveBeenCalledWith({ path: "/chat", query: { lang: "en" } });
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("enters conversation mode and sends the question when selecting FAQ from standby", async () => {
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.handleFaqQuestionSelect(makeFaqSelection("這是 FAQ 問題"));

    expect(startHciotChatMock).toHaveBeenCalledWith("zh");
    expect(handleSendMessageMock).toHaveBeenCalledWith(
      "骨科＋復健科/痛風常見問題/這是 FAQ 問題",
      true,
      "骨科＋復健科/痛風常見問題/這是 FAQ 問題"
    );
    expect(localVideoMocks.setBaseVideoSource).toHaveBeenCalledWith("/video/waiting-command.mp4");
    expect(localVideoMocks.playIdleVideo).toHaveBeenCalled();
    expect(vm.chatMode).toBe("conversation");
    expect(vm.isConsulting).toBe(true);
    expect(vm.faq.isOpen.value).toBe(false);
  });

  it("interrupts the active AI response before sending a newly selected FAQ question", async () => {
    interruptMock.mockResolvedValue(undefined);
    sharedState.isConsulting.value = true;
    sharedState.isAIResponding.value = true;
    const wrapper = mountHarness();
    await flushPromises();
    (wrapper.vm as any).chatMode = "conversation";
    const vm = wrapper.vm as any;

    await vm.handleFaqQuestionSelect(makeFaqSelection("打斷後的 FAQ 問題"));

    expect(interruptMock).toHaveBeenCalledOnce();
    expect(handleSendMessageMock).toHaveBeenCalledWith(
      "骨科＋復健科/痛風常見問題/打斷後的 FAQ 問題",
      true,
      "骨科＋復健科/痛風常見問題/打斷後的 FAQ 問題"
    );
    expect(interruptMock.mock.invocationCallOrder[0]).toBeLessThan(
      handleSendMessageMock.mock.invocationCallOrder[0]
    );
  });

  it("still sends the selected FAQ question when info-button cooldown is active", async () => {
    sharedState.isInfoButtonOnCooldown.value = true;
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.handleFaqQuestionSelect(makeFaqSelection("冷卻中的 FAQ 問題"));

    expect(startHciotChatMock).toHaveBeenCalledWith("zh");
    expect(handleSendMessageMock).toHaveBeenCalledWith(
      "骨科＋復健科/痛風常見問題/冷卻中的 FAQ 問題",
      true,
      "骨科＋復健科/痛風常見問題/冷卻中的 FAQ 問題"
    );
    expect(vm.chatMode).toBe("conversation");
  });

  it("switches the local base video to waiting-command after starting conversation", async () => {
    const wrapper = mountHarness();
    await flushPromises();

    await (wrapper.vm as any).handleStartConversation();

    expect(localVideoMocks.setBaseVideoSource).toHaveBeenCalledWith("/video/waiting-command.mp4");
    expect(localVideoMocks.playIdleVideo).toHaveBeenCalled();
    expect((wrapper.vm as any).chatMode).toBe("conversation");
  });

  it("switches to waiting-command.mp4 when entering ready mode from standby", async () => {
    const wrapper = mountHarness();
    await flushPromises();

    await (wrapper.vm as any).handleConsultClick();

    expect(localVideoMocks.transitionToBaseVideo).toHaveBeenCalledWith(
      "/video/waiting-command.mp4"
    );
    expect((wrapper.vm as any).chatMode).toBe("ready");
  });

  it("locks buttons while starting the chat session without exposing a status pill state", async () => {
    let resolveStart!: (value: {
      ok: boolean;
      session_id: string;
      opening_message: string;
    }) => void;
    startHciotChatMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStart = resolve;
      })
    );
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;

    const startPromise = vm.handleConsultClick();

    expect(vm.isStartingConsult).toBe(true);
    expect(vm.disableAllButtons).toBe(true);
    expect("interactionStatusText" in vm).toBe(false);

    await vm.handleConsultClick();
    expect(startHciotChatMock).toHaveBeenCalledOnce();

    resolveStart({ ok: true, session_id: "user-1", opening_message: "歡迎訊息" });
    await startPromise;

    expect(vm.isStartingConsult).toBe(false);
  });

  it("uses the VH-300 ready opening copy in zh mode", async () => {
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.handleConsultClick();

    expect(vm.openingMessage).toBe(READY_OPENING_MESSAGE);
    expect(addDialogMock).toHaveBeenCalledWith(READY_OPENING_MESSAGE, false);
  });

  it("preloads all video clips on mount", async () => {
    mountHarness();
    await flushPromises();

    expect(localVideoMocks.preloadAll).toHaveBeenCalledWith([
      "/video/idle.mp4",
      "/video/thinking.mp4",
      "/video/waiting-command.mp4",
      "/video/bye.mp4"
    ]);
  });

  it("keeps chat actions disabled until page initialization completes", async () => {
    let resolveSettings!: () => void;
    initializeSettingsMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveSettings = resolve;
      })
    );

    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;

    expect(vm.isInitializingChatPage).toBe(true);
    expect(vm.disableAllButtons).toBe(true);
    expect(vm.isActionProcessing).toBe(true);

    await vm.handleConsultClick();
    expect(startHciotChatMock).not.toHaveBeenCalled();

    resolveSettings();
    await flushPromises();

    expect(vm.isInitializingChatPage).toBe(false);
    expect(vm.disableAllButtons).toBe(false);
  });

  it("opens FAQ panel and loads topics", async () => {
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;

    await vm.handleFaqClick();

    expect(faqMocks.open).toHaveBeenCalledOnce();
    expect(faqMocks.loadTopics).toHaveBeenCalledOnce();
    expect(vm.faq.isOpen.value).toBe(true);
  });

  it("disableFaqRestart is true when isProcessing is true", async () => {
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;

    expect(vm.disableFaqRestart).toBe(false);
    expect(vm.isActionProcessing).toBe(false);
    vm.isProcessing = true;
    expect(vm.disableFaqRestart).toBe(true);
    expect(vm.isActionProcessing).toBe(true);
    expect(vm.disableAllButtons).toBe(false);
  });

  it("keeps FAQ and restart available while microphone capture is preparing", async () => {
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;

    sharedState.isPreparingRecording.value = true;

    expect(vm.disableAllButtons).toBe(true);
    expect(vm.disableFaqRestart).toBe(false);
  });

  it("reloads the page when handleReload is called", async () => {
    const reloadSpy = vi.spyOn(window.location, "reload").mockImplementation(() => {});
    const wrapper = mountHarness();
    await flushPromises();

    (wrapper.vm as any).handleReload();

    expect(reloadSpy).toHaveBeenCalledOnce();
  });

  it("cleans up local video resources on unmount", async () => {
    const wrapper = mountHarness();
    await flushPromises();

    wrapper.unmount();

    expect(localVideoMocks.cleanup).toHaveBeenCalledOnce();
  });

  it("opens and closes the button-position dialog without changing the current layout on cancel", async () => {
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;

    expect(vm.actionButtonPosition).toBe("top");
    expect(vm.showButtonPositionDialog).toBe(false);

    vm.handleButtonPositionTrigger();
    expect(vm.showButtonPositionDialog).toBe(true);

    vm.cancelButtonPositionDialog();
    expect(vm.showButtonPositionDialog).toBe(false);
    expect(vm.actionButtonPosition).toBe("top");
  });

  it("initializes the action-button position from localStorage when stored value is valid", async () => {
    localStorage.setItem(ACTION_BUTTON_POSITION_STORAGE_KEY, "bottom");

    const wrapper = mountHarness();
    await flushPromises();

    expect((wrapper.vm as any).actionButtonPosition).toBe("bottom");
  });

  it("falls back to top when the stored action-button position is invalid", async () => {
    localStorage.setItem(ACTION_BUTTON_POSITION_STORAGE_KEY, "left");

    const wrapper = mountHarness();
    await flushPromises();

    expect((wrapper.vm as any).actionButtonPosition).toBe("top");
  });

  it("updates the selected action-button position from the dialog", async () => {
    const wrapper = mountHarness();
    await flushPromises();
    const vm = wrapper.vm as any;

    vm.handleButtonPositionTrigger();
    vm.handleButtonPositionSelect("bottom");

    expect(vm.showButtonPositionDialog).toBe(false);
    expect(vm.actionButtonPosition).toBe("bottom");
    expect(localStorage.getItem(ACTION_BUTTON_POSITION_STORAGE_KEY)).toBe("bottom");
  });
});

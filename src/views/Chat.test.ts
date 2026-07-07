import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick, shallowRef } from "vue";
import { createI18n } from "vue-i18n";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const startHciotChatMock = vi.fn();
const READY_OPENING_MESSAGE =
  "你好，歡迎來到元復醫院，我是元復醫院的智慧AI小元。如果你想了解門診資訊、衛教或醫療相關問題，歡迎使用「開始對話」按鈕與我互動，很高興為您服務。";
const loadSrsSdkMock = vi.fn();
const initializeSettingsMock = vi.fn();
const startSpeakingCheckMock = vi.fn();
const handleTextMessageMock = vi.fn();
const clearDialogHistoryMock = vi.fn();
const addDialogMock = vi.fn();
const stopNotifyCheckMock = vi.fn();
const startNotifyCheckMock = vi.fn();
const resetTimestampMock = vi.fn();
const handleInterruptMock = vi.fn();
const handleRecordingClickMock = vi.fn();
const cancelActiveRecordingMock = vi.fn();
const setBaseVideoSourceMock = vi.fn();
const playIdleVideoMock = vi.fn();
const playVideoOnceMock = vi.fn();
const transitionToBaseVideoMock = vi.fn();
const preloadBytesMock = vi.fn();
const cleanupAudioMock = vi.fn();
const cleanupChatMock = vi.fn();
const cleanupRecordingMock = vi.fn();
const setAutoReloadTimerMock = vi.fn();
const clearAutoReloadTimerMock = vi.fn();
const setAutoStopCallbackMock = vi.fn();

const isRecording = shallowRef(false);
const isPreparingRecording = shallowRef(false);
const isSpeaking = shallowRef(false);
const isConsulting = shallowRef(false);
const isAIResponding = shallowRef(false);
const isInterrupted = shallowRef(false);
const isInterrupting = shallowRef(false);
const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

const ChatActionControlsStub = defineComponent({
  props: {
    isRecording: { type: Boolean, default: false },
    isPreparingRecording: { type: Boolean, default: false },
    isConsulting: { type: Boolean, default: false },
    disableAllButtons: { type: Boolean, default: false },
    shouldShowInterruptButton: { type: Boolean, default: false },
    buttonPosition: { type: String, default: "top" }
  },
  emits: [
    "consultClick",
    "recordingClick",
    "interrupt",
    "languageChange",
    "restart",
    "reload",
    "buttonPositionClick"
  ],
  template: `
    <div>
      <span class="interrupt-state" :data-interrupt="shouldShowInterruptButton">{{ shouldShowInterruptButton }}</span>
      <span class="button-position-state">{{ buttonPosition }}</span>
      <button class="consult-action" @click="$emit('consultClick')">consult</button>
      <button class="interrupt-action" @click="$emit('interrupt')">interrupt</button>
      <button class="language-action" @click="$emit('languageChange', 'en')">language</button>
      <button class="restart-action" @click="$emit('restart')">restart</button>
      <button class="reload-action" @click="$emit('reload')">reload</button>
      <button class="button-position-action" @click="$emit('buttonPositionClick')">position</button>
    </div>
  `
});

const ChatMediaLayerStub = defineComponent({
  setup(_, { expose }) {
    expose({ setMuted: vi.fn() });
  },
  template: `<div></div>`
});

const ChatFooterOverlayStub = defineComponent({
  emits: ["closeEndDialog"],
  template: `
    <div>
      <button class="close-dialog-action" @click="$emit('closeEndDialog')">close</button>
    </div>
  `
});

const ChatReadyOverlayStub = defineComponent({
  props: {
    openingMessage: { type: String, default: "" },
    isPreparingRecording: { type: Boolean, default: false },
    disableAllButtons: { type: Boolean, default: false },
    buttonPosition: { type: String, default: "top" }
  },
  emits: ["startChat", "restart", "faq", "languageChange", "reload", "buttonPositionClick"],
  template: `
    <div>
      <span class="ready-opening-message">{{ openingMessage }}</span>
      <span class="ready-button-position-state">{{ buttonPosition }}</span>
      <button class="ready-language-action" @click="$emit('languageChange', 'en')">language</button>
      <button class="start-chat-action" @click="$emit('startChat')">start</button>
      <button class="ready-restart-action" @click="$emit('restart')">restart</button>
      <button class="ready-button-position-action" @click="$emit('buttonPositionClick')">position</button>
    </div>
  `
});

function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: "zh",
    messages: {
      zh: {
        confirm: {
          "language-change-title": "確定要切換語言嗎？",
          "restart-lang": "切換語言將重新開始，是否確認？",
          "home-lang": "切換回首頁?",
          "button-position-title": "是否變更按鈕位置？",
          "button-position-top": "上方顯示",
          "button-position-bottom": "下方顯示",
          "button-position-confirm": "確認切換",
          "restart-chat-title": "確定要重新啟動系統嗎？",
          "restart-chat-body": "重新啟動後，目前的對話內容將不會保留。",
          "restart-yes": "是",
          "restart-no": "否"
        },
        intro: {
          welcome: "歡迎"
        },
        button: {
          "restart-chat": "重新開始",
          "start-chat": "開始對話",
          loading: "處理中...",
          faq: "常見問題"
        },
        message: {
          "ready-opening": READY_OPENING_MESSAGE
        },
        prompt: {},
        qr: {
          title: "官方帳號"
        },
        footer: {
          disclaimer: "本虛擬人僅提供資訊協助\n如有健康問題，請洽詢專業醫師",
          topDisclaimer: "本虛擬人僅提供資訊協助，不構成醫療建議。\n如有健康問題，請洽詢專業醫師。"
        }
      },
      en: {
        confirm: {
          "language-change-title": "Are you sure you want to switch languages?",
          "restart-lang": "Switching language will restart. Are you sure?",
          "home-lang": "Return to home?",
          "button-position-title": "Change button position?",
          "button-position-top": "Show on top",
          "button-position-bottom": "Show on bottom",
          "button-position-confirm": "Confirm",
          "restart-chat-title": "Are you sure you want to restart?",
          "restart-chat-body": "After restarting, the current conversation will not be preserved.",
          "restart-yes": "Yes",
          "restart-no": "No"
        }
      }
    }
  });
}

async function loadChatComponent() {
  vi.resetModules();

  vi.doMock("vue-router", () => ({
    useRouter: () => ({
      push: pushMock,
      replace: replaceMock,
      currentRoute: {
        value: {
          query: Object.fromEntries(new URLSearchParams(window.location.search))
        }
      }
    }),
    useRoute: () => ({
      query: Object.fromEntries(new URLSearchParams(window.location.search))
    })
  }));

  vi.doMock("../api/chatApi", () => ({
    chatApi: {
      startHciotChat: startHciotChatMock
    }
  }));

  vi.doMock("../utils/srs", () => ({
    loadSrsSdk: loadSrsSdkMock
  }));

  vi.doMock("../composables/useAudioRecording", () => ({
    useAudioRecording: () => ({
      isRecording,
      startAudioCapture: vi.fn(),
      stopRecording: vi.fn().mockResolvedValue(new Blob(["audio"], { type: "audio/wav" })),
      cancelRecording: vi.fn().mockResolvedValue(undefined),
      cleanup: cleanupAudioMock,
      setAutoStopCallback: setAutoStopCallbackMock
    })
  }));

  vi.doMock("../composables/useChat", () => ({
    useChat: () => ({
      dialogHistory: shallowRef([]),
      isSpeaking,
      isConsulting,
      isAIResponding,
      initializeSettings: initializeSettingsMock,
      startSpeakingCheck: startSpeakingCheckMock,
      handleTranscribeResult: vi.fn(),
      handleTextMessage: handleTextMessageMock,
      clearDialogHistory: clearDialogHistoryMock,
      addDialog: addDialogMock,
      getSpeakingDebugState: vi.fn(() => ({ isSpeakingCheckPending: false, hasInterval: true })),
      cleanup: cleanupChatMock
    })
  }));

  vi.doMock("../composables/useAutoReload", () => ({
    useAutoReload: () => ({
      setAutoReloadTimer: setAutoReloadTimerMock,
      clearAutoReloadTimer: clearAutoReloadTimerMock
    })
  }));

  vi.doMock("../composables/useNotifyEvents", () => ({
    useNotifyEvents: () => ({
      startNotifyCheck: startNotifyCheckMock,
      stopNotifyCheck: stopNotifyCheckMock,
      resetTimestamp: resetTimestampMock,
      getNotifyDebugState: vi.fn(() => ({ isChecking: false, hasInterval: false, cancelled: true }))
    })
  }));

  vi.doMock("../composables/useConnectionMonitor", () => ({
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

  vi.doMock("../composables/useInterrupt", () => ({
    useInterrupt: () => ({
      isInterrupting,
      isInterrupted,
      handleInterrupt: handleInterruptMock
    })
  }));

  vi.doMock("../composables/useLocalVideo", () => ({
    useLocalVideo: () => ({
      videoRefA: shallowRef<HTMLVideoElement | null>(null),
      videoRefB: shallowRef<HTMLVideoElement | null>(null),
      activeBuffer: shallowRef<"A" | "B">("A"),
      initializeVideos: vi.fn(),
      getCurrentVideoRef: vi.fn(() => ({ paused: true, play: vi.fn() })),
      setBaseVideoSource: setBaseVideoSourceMock,
      pauseCurrentVideo: vi.fn(),
      playIdleVideo: playIdleVideoMock,
      playVideoOnce: playVideoOnceMock,
      transitionToBaseVideo: transitionToBaseVideoMock,
      preloadBytes: preloadBytesMock,
      preloadAll: vi.fn(),
      startThinkingVideo: vi.fn(),
      pauseThinkingVideo: vi.fn(),
      stopThinkingVideo: vi.fn(),
      cleanup: vi.fn()
    })
  }));

  vi.doMock("../composables/useRecordingFlow", () => ({
    useRecordingFlow: () => ({
      handleRecordingClick: handleRecordingClickMock,
      cancelActiveRecording: cancelActiveRecordingMock,
      isPreparingRecording,
      cleanup: cleanupRecordingMock
    })
  }));

  const mod = await import("./Chat.vue");
  return mod.default;
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width
  });

  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: height
  });
}

describe("Chat", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    pushMock.mockReset();
    replaceMock.mockReset();
    startHciotChatMock.mockReset();
    loadSrsSdkMock.mockReset();
    initializeSettingsMock.mockReset();
    startSpeakingCheckMock.mockReset();
    handleTextMessageMock.mockReset();
    clearDialogHistoryMock.mockReset();
    addDialogMock.mockReset();
    stopNotifyCheckMock.mockReset();
    startNotifyCheckMock.mockReset();
    resetTimestampMock.mockReset();
    handleInterruptMock.mockReset();
    handleRecordingClickMock.mockReset();
    cancelActiveRecordingMock.mockReset();
    setBaseVideoSourceMock.mockReset();
    playIdleVideoMock.mockReset();
    playVideoOnceMock.mockReset();
    transitionToBaseVideoMock.mockReset();
    transitionToBaseVideoMock.mockResolvedValue(undefined);
    preloadBytesMock.mockReset();
    cleanupAudioMock.mockReset();
    cleanupChatMock.mockReset();
    cleanupRecordingMock.mockReset();
    setAutoReloadTimerMock.mockReset();
    clearAutoReloadTimerMock.mockReset();
    setAutoStopCallbackMock.mockReset();

    isRecording.value = false;
    isPreparingRecording.value = false;
    isSpeaking.value = false;
    isConsulting.value = false;
    isAIResponding.value = false;
    isInterrupted.value = false;
    isInterrupting.value = false;
    setViewport(originalInnerWidth, originalInnerHeight);

    startHciotChatMock.mockResolvedValue({
      ok: true,
      session_id: "user-1",
      opening_message: "歡迎訊息"
    });
    loadSrsSdkMock.mockResolvedValue(undefined);
    initializeSettingsMock.mockResolvedValue(undefined);
    startSpeakingCheckMock.mockResolvedValue(undefined);
    handleTextMessageMock.mockResolvedValue(false);
    playVideoOnceMock.mockResolvedValue(undefined);
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true)
    );
  });

  async function mountChat() {
    const Chat = await loadChatComponent();

    const wrapper = mount(Chat, {
      global: {
        plugins: [createTestI18n()],
        stubs: {
          ChatActionControls: ChatActionControlsStub,
          ChatMediaLayer: ChatMediaLayerStub,
          ChatFooterOverlay: ChatFooterOverlayStub,
          ChatReadyOverlay: ChatReadyOverlayStub
        }
      }
    });
    await flushPromises();
    return wrapper;
  }

  it("cancels recording before restarting", async () => {
    isRecording.value = true;
    const wrapper = await mountChat();

    await wrapper.find(".restart-action").trigger("click");
    await flushPromises();

    expect(playVideoOnceMock).not.toHaveBeenCalled();
    expect(cancelActiveRecordingMock).toHaveBeenCalledOnce();
    expect(pushMock).toHaveBeenCalledWith({ path: "/", query: {} });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("transitions to ready mode when the consult button is pressed", async () => {
    const wrapper = await mountChat();

    await wrapper.find(".consult-action").trigger("click");
    await flushPromises();

    expect(startHciotChatMock).toHaveBeenCalledWith("zh");
    expect(addDialogMock).toHaveBeenCalledWith(READY_OPENING_MESSAGE, false);
    expect(transitionToBaseVideoMock).toHaveBeenCalledWith("/video/waiting-command.mp4");
    expect(handleRecordingClickMock).not.toHaveBeenCalled();
    expect(wrapper.find(".ready-opening-message").text()).toBe(READY_OPENING_MESSAGE);
  });

  it("does not render the removed status pill while the consult start API is pending", async () => {
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
    const wrapper = await mountChat();

    await wrapper.find(".consult-action").trigger("click");
    await nextTick();

    expect(wrapper.find(".chat-interaction-feedback").exists()).toBe(false);

    resolveStart({ ok: true, session_id: "user-1", opening_message: "歡迎訊息" });
    await flushPromises();
  });

  it("starts recording when start-chat is clicked in ready mode", async () => {
    const wrapper = await mountChat();

    await wrapper.find(".consult-action").trigger("click");
    await flushPromises();

    await wrapper.find(".start-chat-action").trigger("click");
    await flushPromises();

    expect(handleRecordingClickMock).toHaveBeenCalled();
  });

  it("shows the confirmation dialog when switching language in ready mode", async () => {
    const ttl = 24 * 60 * 60 * 1000;
    localStorage.setItem("auth_session", JSON.stringify({ expiresAt: Date.now() + ttl }));
    const wrapper = await mountChat();

    await wrapper.find(".consult-action").trigger("click");
    await flushPromises();

    await wrapper.find(".ready-language-action").trigger("click");
    expect(wrapper.find(".restart-overlay").exists()).toBe(true);
    expect(playVideoOnceMock).toHaveBeenCalledWith("/video/bye.mp4");

    await wrapper.find(".restart-btn--confirm").trigger("click");
    await flushPromises();

    expect(document.documentElement.lang).toBe("en");
    expect(replaceMock).toHaveBeenCalledWith({ path: "/chat", query: { lang: "en" } });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("changes language after confirmation and routes to home", async () => {
    const wrapper = await mountChat();

    await wrapper.find(".language-action").trigger("click");
    expect(wrapper.find(".restart-overlay").exists()).toBe(true);
    expect(playVideoOnceMock).toHaveBeenCalledWith("/video/bye.mp4");

    await wrapper.find(".restart-btn--confirm").trigger("click");
    await flushPromises();

    expect(document.documentElement.lang).toBe("en");
    expect(pushMock).toHaveBeenCalledWith({ path: "/", query: { lang: "en" } });
  });

  it("cancels recording before changing language", async () => {
    isRecording.value = true;
    const wrapper = await mountChat();

    await wrapper.find(".language-action").trigger("click");
    expect(playVideoOnceMock).toHaveBeenCalledWith("/video/bye.mp4");
    await wrapper.find(".restart-btn--confirm").trigger("click");
    await flushPromises();

    expect(cancelActiveRecordingMock).toHaveBeenCalledOnce();
    expect(document.documentElement.lang).toBe("en");
    expect(pushMock).toHaveBeenCalledWith({ path: "/", query: { lang: "en" } });
  });

  it("interrupts active playback before restarting", async () => {
    isSpeaking.value = true;
    const wrapper = await mountChat();

    await wrapper.find(".restart-action").trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 350));
    await flushPromises();

    expect(playVideoOnceMock).not.toHaveBeenCalled();
    expect(handleInterruptMock).toHaveBeenCalledOnce();
    expect(clearDialogHistoryMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith({ path: "/", query: {} });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("runs the recording handler when auto-stop fires while recording", async () => {
    isRecording.value = true;
    await mountChat();

    const autoStopCallback = setAutoStopCallbackMock.mock.calls[0][0] as () => void;
    autoStopCallback();

    expect(handleRecordingClickMock).toHaveBeenCalledOnce();
  });

  it("cleans up resources on unmount", async () => {
    const wrapper = await mountChat();

    wrapper.unmount();

    expect(cleanupAudioMock).toHaveBeenCalledOnce();
    expect(cleanupChatMock).toHaveBeenCalledOnce();
    expect(cleanupRecordingMock).toHaveBeenCalledOnce();
    expect(clearAutoReloadTimerMock).toHaveBeenCalled();
  });

  it("handleRestart interrupts if active, clears state and routes back to home", async () => {
    isConsulting.value = true;
    isSpeaking.value = true;

    const wrapper = await mountChat();

    await wrapper.find(".restart-action").trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 350));
    await flushPromises();

    expect(playVideoOnceMock).not.toHaveBeenCalled();
    expect(handleInterruptMock).toHaveBeenCalledOnce();
    expect(clearDialogHistoryMock).toHaveBeenCalled();
    expect(stopNotifyCheckMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith({ path: "/", query: {} });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("handleRestart routes back to home without interrupting when already idle", async () => {
    isConsulting.value = true;
    isSpeaking.value = false;

    const wrapper = await mountChat();

    await wrapper.find(".restart-action").trigger("click");
    await flushPromises();

    expect(playVideoOnceMock).not.toHaveBeenCalled();
    expect(handleInterruptMock).not.toHaveBeenCalled();
    expect(clearDialogHistoryMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith({ path: "/", query: {} });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("handleLanguageChange does nothing when user cancels confirmation", async () => {
    const wrapper = await mountChat();

    await wrapper.find(".language-action").trigger("click");
    expect(playVideoOnceMock).toHaveBeenCalledWith("/video/bye.mp4");
    await wrapper.find(".restart-btn--cancel").trigger("click");
    await flushPromises();

    expect(playIdleVideoMock).toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("handleLanguageChange applies locale and pushes route on confirm", async () => {
    const wrapper = await mountChat();

    await wrapper.find(".language-action").trigger("click");
    expect(playVideoOnceMock).toHaveBeenCalledWith("/video/bye.mp4");
    await wrapper.find(".restart-btn--confirm").trigger("click");
    await flushPromises();

    expect(document.documentElement.lang).toBe("en");
    expect(pushMock).toHaveBeenCalledWith({ path: "/", query: { lang: "en" } });
  });

  it("handleLanguageChange interrupts TTS before navigating when speaking", async () => {
    vi.useFakeTimers();
    try {
      isSpeaking.value = true;

      const wrapper = await mountChat();

      await wrapper.find(".language-action").trigger("click");
      expect(playVideoOnceMock).toHaveBeenCalledWith("/video/bye.mp4");
      const confirmPromise = wrapper.find(".restart-btn--confirm").trigger("click");
      await vi.advanceTimersByTimeAsync(500);
      await confirmPromise;
      await flushPromises();

      expect(handleInterruptMock).toHaveBeenCalledOnce();
      expect(pushMock).toHaveBeenCalledWith({ path: "/", query: { lang: "en" } });
    } finally {
      vi.useRealTimers();
    }
  });

  it("handleLanguageChange does not interrupt when not speaking", async () => {
    isSpeaking.value = false;

    const wrapper = await mountChat();

    await wrapper.find(".language-action").trigger("click");
    expect(playVideoOnceMock).toHaveBeenCalledWith("/video/bye.mp4");
    await wrapper.find(".restart-btn--confirm").trigger("click");
    await flushPromises();

    expect(handleInterruptMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith({ path: "/", query: { lang: "en" } });
  });

  it("interrupt calls handleInterrupt", async () => {
    isConsulting.value = true;
    isSpeaking.value = true;
    const wrapper = await mountChat();

    await wrapper.find(".interrupt-action").trigger("click");
    await flushPromises();

    expect(handleInterruptMock).toHaveBeenCalledWith(undefined);
  });

  it("shouldShowInterruptButton is true when isAIResponding is true even if isSpeaking is false", async () => {
    isConsulting.value = true;
    isAIResponding.value = true;
    isSpeaking.value = false;

    const wrapper = await mountChat();
    await flushPromises();

    expect(wrapper.find(".interrupt-state").attributes("data-interrupt")).toBe("true");
  });

  it("shouldShowInterruptButton is true when AI is responding", async () => {
    isConsulting.value = true;
    isAIResponding.value = true;

    const wrapper = await mountChat();
    await flushPromises();

    expect(wrapper.find(".interrupt-state").attributes("data-interrupt")).toBe("true");
  });

  it("shouldShowInterruptButton is true when isSpeaking is true", async () => {
    isConsulting.value = true;
    isSpeaking.value = true;

    const wrapper = await mountChat();
    await flushPromises();

    expect(wrapper.find(".interrupt-state").attributes("data-interrupt")).toBe("true");
  });

  it("shouldShowInterruptButton is false when idle (not processing, not responding, not speaking)", async () => {
    isConsulting.value = true;
    isSpeaking.value = false;
    isAIResponding.value = false;

    const wrapper = await mountChat();
    await flushPromises();

    expect(wrapper.find(".interrupt-state").attributes("data-interrupt")).toBe("false");
  });

  it("opens the button-position dialog and applies the selected side", async () => {
    const wrapper = await mountChat();

    expect(wrapper.find(".button-position-overlay").exists()).toBe(false);

    await wrapper.find(".button-position-action").trigger("click");
    expect(wrapper.find(".button-position-overlay").exists()).toBe(true);

    await wrapper.findAll(".button-position-option")[1].trigger("click");
    await wrapper.find(".button-position-confirm").trigger("click");
    await flushPromises();

    expect(wrapper.find(".button-position-overlay").exists()).toBe(false);
    expect(wrapper.find(".button-position-state").text()).toBe("bottom");
  });

  it("renders chat in a fixed 1440x2560 design canvas", async () => {
    setViewport(1440, 2560);
    const wrapper = await mountChat();
    const designCanvasStyle = wrapper.get(".design-canvas").attributes("style");

    expect(designCanvasStyle).toContain("width: 1440px;");
    expect(designCanvasStyle).toContain("height: 2560px;");
  });

  it("updates design scale from viewport dimensions", async () => {
    setViewport(1920, 1080);
    const wrapper = await mountChat();

    const expectedInitialScale = Math.min(1920 / 1440, 1080 / 2560);
    expect(wrapper.get(".design-canvas").attributes("style")).toContain(
      `scale(${expectedInitialScale})`
    );

    setViewport(1080, 1920);
    window.dispatchEvent(new Event("resize"));
    await nextTick();

    const expectedResizedScale = Math.min(1080 / 1440, 1920 / 2560);
    expect(wrapper.get(".design-canvas").attributes("style")).toContain(
      `scale(${expectedResizedScale})`
    );
  });

  it("preserves session query when redirecting to home on language switch", async () => {
    window.history.replaceState({}, "", "/chat?session=999");
    const wrapper = await mountChat();

    await wrapper.find(".language-action").trigger("click");
    expect(wrapper.find(".restart-overlay").exists()).toBe(true);

    await wrapper.find(".restart-btn--confirm").trigger("click");
    await flushPromises();

    expect(pushMock).toHaveBeenCalledWith({ path: "/", query: { lang: "en", session: "999" } });
  });

  it("preserves session query when restarting the conversation", async () => {
    window.history.replaceState({}, "", "/chat?session=777");
    const wrapper = await mountChat();

    await wrapper.find(".restart-action").trigger("click");
    await flushPromises();

    expect(pushMock).toHaveBeenCalledWith({ path: "/", query: { session: "777" } });
  });
});

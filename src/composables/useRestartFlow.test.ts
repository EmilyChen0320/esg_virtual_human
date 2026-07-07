import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef, type ShallowRef } from "vue";

import { AUTH_STORAGE_KEY, AUTH_TTL_MS } from "../constants/auth";
import { INTERRUPT_SETTLE_DELAY, RESTART_ACTION_TIMEOUT } from "../constants/timing";

const routerMocks = vi.hoisted(() => ({
  push: vi.fn().mockResolvedValue(undefined),
  replace: vi.fn().mockResolvedValue(undefined),
  currentRoute: {
    value: {
      query: {} as Record<string, string>
    }
  }
}));

vi.mock("vue-router", () => ({
  useRouter: () => routerMocks
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    locale: { value: "zh" },
    t: (key: string) =>
      (
        ({
          "confirm.language-change-title": "lang-title",
          "confirm.restart-lang": "restart-lang",
          "confirm.home-lang": "home-lang",
          "confirm.restart-chat-title": "restart-title",
          "confirm.restart-chat-body": "restart-body"
        }) as Record<string, string>
      )[key] ?? key
  })
}));

import { useRestartFlow } from "./useRestartFlow";

function createAuthSession(expiresAt: number) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ expiresAt }));
}

interface LocalVideoMock {
  setBaseVideoSource: ReturnType<typeof vi.fn>;
  playIdleVideo: ReturnType<typeof vi.fn>;
  startThinkingVideo: ReturnType<typeof vi.fn>;
  playVideoOnce: ReturnType<typeof vi.fn>;
}

interface HarnessRefs {
  showStreamVideo: ShallowRef<boolean>;
  isProcessing: ShallowRef<boolean>;
  isAIResponding: ShallowRef<boolean>;
  isSpeaking: ShallowRef<boolean>;
  isConsulting: ShallowRef<boolean>;
  isRecording: ShallowRef<boolean>;
  chatMode: ShallowRef<"standby" | "ready" | "conversation">;
  userId: ShallowRef<string>;
  openingMessage: ShallowRef<string>;
}

interface HarnessMocks {
  applyLocale: ReturnType<typeof vi.fn>;
  cancelActiveRecording: ReturnType<typeof vi.fn>;
  handleInterrupt: ReturnType<typeof vi.fn>;
  clearAllTimers: ReturnType<typeof vi.fn>;
  clearDialogHistory: ReturnType<typeof vi.fn>;
  closeFaq: ReturnType<typeof vi.fn>;
  localVideo: LocalVideoMock;
}

function createHarness(opts?: {
  initialMode?: "standby" | "ready" | "conversation";
  cancelActiveRecording?: () => Promise<void>;
  handleInterrupt?: () => Promise<void>;
}) {
  const refs: HarnessRefs = {
    showStreamVideo: shallowRef(false),
    isProcessing: shallowRef(false),
    isAIResponding: shallowRef(false),
    isSpeaking: shallowRef(false),
    isConsulting: shallowRef(false),
    isRecording: shallowRef(false),
    chatMode: shallowRef(opts?.initialMode ?? "standby"),
    userId: shallowRef(""),
    openingMessage: shallowRef("")
  };

  const mocks: HarnessMocks = {
    applyLocale: vi.fn(),
    cancelActiveRecording:
      opts?.cancelActiveRecording !== undefined
        ? vi.fn(opts.cancelActiveRecording)
        : vi.fn().mockResolvedValue(undefined),
    handleInterrupt:
      opts?.handleInterrupt !== undefined
        ? vi.fn(opts.handleInterrupt)
        : vi.fn().mockResolvedValue(undefined),
    clearAllTimers: vi.fn(),
    clearDialogHistory: vi.fn(),
    closeFaq: vi.fn(),
    localVideo: {
      setBaseVideoSource: vi.fn(),
      playIdleVideo: vi.fn(),
      startThinkingVideo: vi.fn(),
      playVideoOnce: vi.fn().mockResolvedValue(undefined)
    }
  };

  const Harness = defineComponent({
    setup(_, { expose }) {
      const flow = useRestartFlow({
        localVideo: mocks.localVideo as unknown as Parameters<
          typeof useRestartFlow
        >[0]["localVideo"],
        showStreamVideo: refs.showStreamVideo,
        isProcessing: refs.isProcessing,
        isAIResponding: refs.isAIResponding,
        isSpeaking: refs.isSpeaking,
        isConsulting: refs.isConsulting,
        isRecording: refs.isRecording,
        chatMode: refs.chatMode,
        userId: refs.userId,
        openingMessage: refs.openingMessage,
        applyLocale: mocks.applyLocale as unknown as (lang: string) => void,
        cancelActiveRecording: mocks.cancelActiveRecording as unknown as () => Promise<void>,
        handleInterrupt: mocks.handleInterrupt as unknown as Parameters<
          typeof useRestartFlow
        >[0]["handleInterrupt"],
        clearAllTimers: mocks.clearAllTimers as unknown as () => void,
        clearDialogHistory: mocks.clearDialogHistory as unknown as () => void,
        closeFaq: mocks.closeFaq as unknown as () => void
      });
      expose({ ...flow, refs, mocks });
      return () => h("div");
    }
  });

  const wrapper = mount(Harness);
  return { wrapper, refs, mocks };
}

describe("useRestartFlow", () => {
  beforeEach(() => {
    localStorage.clear();
    routerMocks.push.mockClear();
    routerMocks.replace.mockClear();
    routerMocks.currentRoute.value.query = {};
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("opens chat-language dialog when auth session is valid", async () => {
    createAuthSession(Date.now() + AUTH_TTL_MS);
    const { wrapper, mocks } = createHarness();
    await flushPromises();

    await (wrapper.vm as any).handleLanguageChange("en");

    expect((wrapper.vm as any).showRestartDialog).toBe(true);
    expect((wrapper.vm as any).restartDialogTitle).toBe("lang-title");
    expect((wrapper.vm as any).restartDialogBody).toBe("restart-lang");
    expect(mocks.localVideo.playVideoOnce).toHaveBeenCalledWith("/video/bye.mp4");
    expect(mocks.applyLocale).not.toHaveBeenCalled();

    await (wrapper.vm as any).confirmRestart();

    expect(mocks.applyLocale).toHaveBeenCalledWith("en");
    expect(routerMocks.replace).toHaveBeenCalledWith({ path: "/chat", query: { lang: "en" } });
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("opens home-language dialog when auth session has expired", async () => {
    createAuthSession(Date.now() - 1000);
    const { wrapper, mocks } = createHarness();
    await flushPromises();

    await (wrapper.vm as any).handleLanguageChange("en");

    expect((wrapper.vm as any).showRestartDialog).toBe(true);
    expect((wrapper.vm as any).restartDialogBody).toBe("home-lang");

    await (wrapper.vm as any).confirmRestart();

    expect(mocks.applyLocale).toHaveBeenCalledWith("en");
    expect(routerMocks.push).toHaveBeenCalledWith({ path: "/", query: { lang: "en" } });
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("handleRestart in standby executes restart immediately", async () => {
    const { wrapper, refs, mocks } = createHarness({ initialMode: "standby" });
    refs.isConsulting.value = true;

    await (wrapper.vm as any).handleRestart();

    expect((wrapper.vm as any).showRestartDialog).toBe(false);
    expect(mocks.localVideo.playVideoOnce).not.toHaveBeenCalled();
    expect(mocks.localVideo.setBaseVideoSource).toHaveBeenCalledWith("/video/idle.mp4");
    expect(refs.isConsulting.value).toBe(false);
    expect(refs.chatMode.value).toBe("standby");
  });

  it("handleRestart in standby preserves lang query parameter", async () => {
    routerMocks.currentRoute.value.query = { lang: "en", session: "123" };
    const { wrapper } = createHarness({ initialMode: "standby" });

    await (wrapper.vm as any).handleRestart();

    expect(routerMocks.push).toHaveBeenCalledWith({
      path: "/",
      query: { lang: "en", session: "123" }
    });
  });

  it("handleRestart in conversation opens dialog", async () => {
    const { wrapper, mocks } = createHarness({ initialMode: "conversation" });

    await (wrapper.vm as any).handleRestart();

    expect((wrapper.vm as any).showRestartDialog).toBe(true);
    expect((wrapper.vm as any).restartDialogTitle).toBe("restart-title");
    expect(mocks.localVideo.playVideoOnce).toHaveBeenCalledWith("/video/bye.mp4");
  });

  it("confirmRestart executes restart after dialog shown", async () => {
    const { wrapper, refs, mocks } = createHarness({ initialMode: "conversation" });
    refs.isConsulting.value = true;

    await (wrapper.vm as any).handleRestart();
    expect((wrapper.vm as any).showRestartDialog).toBe(true);

    await (wrapper.vm as any).confirmRestart();

    expect((wrapper.vm as any).showRestartDialog).toBe(false);
    expect(refs.isConsulting.value).toBe(false);
    expect(refs.chatMode.value).toBe("standby");
    expect(mocks.clearAllTimers).toHaveBeenCalled();
    expect(mocks.clearDialogHistory).toHaveBeenCalled();
  });

  it("cancelRestart hides dialog and restores video source", async () => {
    const { wrapper, mocks } = createHarness({ initialMode: "conversation" });

    await (wrapper.vm as any).handleRestart();
    expect((wrapper.vm as any).showRestartDialog).toBe(true);

    (wrapper.vm as any).cancelRestart();

    expect((wrapper.vm as any).showRestartDialog).toBe(false);
    expect(mocks.localVideo.setBaseVideoSource).toHaveBeenLastCalledWith(
      "/video/waiting-command.mp4"
    );
    expect(mocks.localVideo.playIdleVideo).toHaveBeenCalled();
  });

  it("cancelRestart restores stream when it was previously visible", async () => {
    const { wrapper, refs } = createHarness({ initialMode: "conversation" });
    refs.showStreamVideo.value = true;

    await (wrapper.vm as any).handleRestart();
    expect(refs.showStreamVideo.value).toBe(false);

    (wrapper.vm as any).cancelRestart();
    expect(refs.showStreamVideo.value).toBe(true);
  });

  it("cancelRestart resumes thinking video when processing was active", async () => {
    const { wrapper, refs, mocks } = createHarness({ initialMode: "conversation" });
    refs.isProcessing.value = true;

    await (wrapper.vm as any).handleRestart();
    (wrapper.vm as any).cancelRestart();

    expect(mocks.localVideo.startThinkingVideo).toHaveBeenCalled();
  });

  it("teardown still completes when cancelActiveRecording hangs", async () => {
    vi.useFakeTimers();
    try {
      createAuthSession(Date.now() + AUTH_TTL_MS);
      const { wrapper, refs, mocks } = createHarness({
        cancelActiveRecording: () => new Promise<void>(() => {})
      });
      refs.isRecording.value = true;

      await (wrapper.vm as any).handleLanguageChange("en");
      const confirmPromise = (wrapper.vm as any).confirmRestart();
      await vi.advanceTimersByTimeAsync(RESTART_ACTION_TIMEOUT);
      await confirmPromise;

      expect(mocks.applyLocale).toHaveBeenCalledWith("en");
      expect(routerMocks.replace).toHaveBeenCalledWith({ path: "/chat", query: { lang: "en" } });
    } finally {
      vi.useRealTimers();
    }
  });

  it("teardown still completes when handleInterrupt hangs", async () => {
    vi.useFakeTimers();
    try {
      createAuthSession(Date.now() - 1000);
      const { wrapper, refs, mocks } = createHarness({
        handleInterrupt: () => new Promise<void>(() => {})
      });
      refs.isSpeaking.value = true;

      await (wrapper.vm as any).handleLanguageChange("en");
      const confirmPromise = (wrapper.vm as any).confirmRestart();
      await vi.advanceTimersByTimeAsync(RESTART_ACTION_TIMEOUT + INTERRUPT_SETTLE_DELAY);
      await confirmPromise;

      expect(mocks.applyLocale).toHaveBeenCalledWith("en");
      expect(routerMocks.push).toHaveBeenCalledWith({ path: "/", query: { lang: "en" } });
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes FAQ during teardown", async () => {
    const { wrapper, refs, mocks } = createHarness({ initialMode: "conversation" });
    refs.isConsulting.value = true;

    await (wrapper.vm as any).handleRestart();
    await (wrapper.vm as any).confirmRestart();

    expect(mocks.closeFaq).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { chatApi } from "../api/chatApi";
import { INTERRUPT_COOLDOWN } from "../constants/timing";

import { useInterrupt } from "./useInterrupt";

vi.mock("../api/chatApi", () => ({
  chatApi: {
    sendInterruptMessage: vi.fn()
  }
}));

function createDeps() {
  return {
    sessionId: "0",
    isSpeakingLocked: { value: false },
    stopNotifyCheck: vi.fn(),
    clearAllTimers: vi.fn(),
    resetTimestamp: vi.fn(),
    localVideo: {
      pauseCurrentVideo: vi.fn(),
      playIdleVideo: vi.fn()
    },
    videoStreamRef: { value: { setMuted: vi.fn() } } as {
      value: { setMuted: (muted: boolean) => void } | null;
    },
    isProcessing: { value: false },
    isAIResponding: { value: false },
    isEndingConsult: { value: false },
    showStreamVideo: { value: true },
    activeAiDialogText: { value: "some dialog" },
    pendingAiDialogText: { value: "pending dialog" },
    activeAiImage: { value: "image.jpg" as string | undefined },
    firstFlag: { value: false }
  };
}

describe("useInterrupt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets isInterrupting and isInterrupted on interrupt", async () => {
    vi.mocked(chatApi.sendInterruptMessage).mockResolvedValue(undefined);
    const deps = createDeps();
    const { isInterrupting, isInterrupted, handleInterrupt } = useInterrupt(deps as any);

    const promise = handleInterrupt();
    expect(isInterrupting.value).toBe(true);
    expect(isInterrupted.value).toBe(true);

    await promise;

    // isInterrupting stays true until cooldown
    expect(isInterrupting.value).toBe(true);
    vi.advanceTimersByTime(INTERRUPT_COOLDOWN);
    expect(isInterrupting.value).toBe(false);
  });

  it("locks isSpeakingLocked and unlocks after 1500ms", async () => {
    vi.mocked(chatApi.sendInterruptMessage).mockResolvedValue(undefined);
    const deps = createDeps();
    const { handleInterrupt } = useInterrupt(deps as any);

    await handleInterrupt();

    expect(deps.isSpeakingLocked.value).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(deps.isSpeakingLocked.value).toBe(false);
  });

  it("unlocks videoStateLocked and plays idle video after 300ms", async () => {
    vi.mocked(chatApi.sendInterruptMessage).mockResolvedValue(undefined);
    const deps = createDeps();
    const { videoStateLocked, handleInterrupt } = useInterrupt(deps as any);

    await handleInterrupt();

    expect(videoStateLocked.value).toBe(true);
    vi.advanceTimersByTime(300);
    expect(videoStateLocked.value).toBe(false);
    expect(deps.localVideo.playIdleVideo).toHaveBeenCalledOnce();
  });

  it("calls API and resets state", async () => {
    vi.mocked(chatApi.sendInterruptMessage).mockResolvedValue(undefined);
    const deps = createDeps();
    deps.isProcessing.value = true;
    deps.isAIResponding.value = true;
    deps.showStreamVideo.value = true;

    const { handleInterrupt } = useInterrupt(deps as any);
    await handleInterrupt();

    expect(chatApi.sendInterruptMessage).toHaveBeenCalledWith("0");
    expect(deps.stopNotifyCheck).toHaveBeenCalledOnce();
    expect(deps.clearAllTimers).toHaveBeenCalledOnce();
    expect(deps.resetTimestamp).toHaveBeenCalledOnce();
    expect(deps.isProcessing.value).toBe(false);
    expect(deps.isAIResponding.value).toBe(false);
    expect(deps.showStreamVideo.value).toBe(false);
    expect(deps.firstFlag.value).toBe(true);
  });

  it("does not clear existing dialog history on interrupt", async () => {
    vi.mocked(chatApi.sendInterruptMessage).mockResolvedValue(undefined);
    const deps = createDeps();
    const { handleInterrupt } = useInterrupt(deps as any);

    await handleInterrupt();

    expect("clearDialogHistory" in deps).toBe(false);
  });

  it("clears activeAiDialogText on interrupt", async () => {
    vi.mocked(chatApi.sendInterruptMessage).mockResolvedValue(undefined);
    const deps = createDeps();
    deps.activeAiDialogText.value = "AI response";
    deps.pendingAiDialogText.value = "Pending response";
    deps.activeAiImage.value = "stale-image.jpg";
    const { handleInterrupt } = useInterrupt(deps as any);

    await handleInterrupt();

    expect(deps.activeAiDialogText.value).toBe("");
    expect(deps.pendingAiDialogText.value).toBe("");
    expect(deps.activeAiImage.value).toBeUndefined();
  });

  it("can skip idle video resume", async () => {
    vi.mocked(chatApi.sendInterruptMessage).mockResolvedValue(undefined);
    const deps = createDeps();
    const { handleInterrupt } = useInterrupt(deps as any);

    await handleInterrupt({ resumeIdleVideo: false });

    vi.advanceTimersByTime(300);
    expect(deps.localVideo.playIdleVideo).not.toHaveBeenCalled();
  });

  it("prevents re-entry while interrupting", async () => {
    vi.mocked(chatApi.sendInterruptMessage).mockResolvedValue(undefined);
    const deps = createDeps();
    const { handleInterrupt } = useInterrupt(deps as any);

    await handleInterrupt();
    // Still in cooldown — isInterrupting is true
    await handleInterrupt();

    expect(chatApi.sendInterruptMessage).toHaveBeenCalledTimes(1);
  });

  it("handles API error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(chatApi.sendInterruptMessage).mockRejectedValue(new Error("network"));
    const deps = createDeps();
    const { isInterrupting, handleInterrupt } = useInterrupt(deps as any);

    await handleInterrupt();

    expect(consoleSpy).toHaveBeenCalledWith("[useInterrupt] Interrupt error:", expect.any(Error));
    // Still resets isInterrupting after cooldown
    vi.advanceTimersByTime(INTERRUPT_COOLDOWN);
    expect(isInterrupting.value).toBe(false);
    consoleSpy.mockRestore();
  });

  it("mutes video stream on interrupt", async () => {
    vi.mocked(chatApi.sendInterruptMessage).mockResolvedValue(undefined);
    const deps = createDeps();
    const { handleInterrupt } = useInterrupt(deps as any);

    await handleInterrupt();

    expect(deps.localVideo.pauseCurrentVideo).toHaveBeenCalledOnce();
    expect(deps.videoStreamRef.value?.setMuted).toHaveBeenCalledWith(true);
  });

  it("handles null videoStreamRef gracefully", async () => {
    vi.mocked(chatApi.sendInterruptMessage).mockResolvedValue(undefined);
    const deps = createDeps();
    deps.videoStreamRef.value = null;
    const { handleInterrupt } = useInterrupt(deps as any);

    await expect(handleInterrupt()).resolves.toBeUndefined();
  });
});

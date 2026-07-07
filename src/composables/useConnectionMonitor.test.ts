import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { chatApi } from "../api/chatApi";
import {
  HEARTBEAT_FAIL_THRESHOLD,
  HEARTBEAT_FAST_INTERVAL,
  HEARTBEAT_INTERVAL
} from "../constants/timing";

import { useConnectionMonitor } from "./useConnectionMonitor";

vi.mock("../api/chatApi", () => ({
  chatApi: {
    checkSpeakingStatus: vi.fn()
  }
}));

describe("useConnectionMonitor", () => {
  let onlineListeners: Array<() => void>;
  let offlineListeners: Array<() => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    onlineListeners = [];
    offlineListeners = [];

    vi.spyOn(window, "addEventListener").mockImplementation((event, handler) => {
      if (event === "online") {
        onlineListeners.push(handler as () => void);
      }
      if (event === "offline") {
        offlineListeners.push(handler as () => void);
      }
    });
    vi.spyOn(window, "removeEventListener").mockImplementation(() => {});
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.mocked(chatApi.checkSpeakingStatus).mockResolvedValue({ data: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function fireOffline() {
    for (const fn of offlineListeners) {
      fn();
    }
  }

  function fireOnline() {
    for (const fn of onlineListeners) {
      fn();
    }
  }

  it("starts as connected when navigator.onLine is true", async () => {
    const { isDisconnected, startMonitoring, stopMonitoring } = useConnectionMonitor("0");
    startMonitoring();
    await vi.advanceTimersByTimeAsync(0);

    expect(isDisconnected.value).toBe(false);
    stopMonitoring();
  });

  it("starts as disconnected when navigator.onLine is false", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { isDisconnected, startMonitoring, stopMonitoring } = useConnectionMonitor("0");
    startMonitoring();

    expect(isDisconnected.value).toBe(true);
    expect(chatApi.checkSpeakingStatus).not.toHaveBeenCalled();
    stopMonitoring();
  });

  it("sets disconnected on offline event", async () => {
    const { isDisconnected, startMonitoring, stopMonitoring } = useConnectionMonitor("0");
    startMonitoring();
    await vi.advanceTimersByTimeAsync(0);

    fireOffline();
    expect(isDisconnected.value).toBe(true);
    stopMonitoring();
  });

  it("recovers on online event after heartbeat succeeds", async () => {
    const { isDisconnected, startMonitoring, stopMonitoring } = useConnectionMonitor("0");
    startMonitoring();
    await vi.advanceTimersByTimeAsync(0);

    fireOffline();
    expect(isDisconnected.value).toBe(true);

    fireOnline();
    // heartbeat fires immediately on startHeartbeat
    await vi.advanceTimersByTimeAsync(0);
    expect(isDisconnected.value).toBe(false);
    stopMonitoring();
  });

  it("sets disconnected after consecutive heartbeat failures", async () => {
    vi.mocked(chatApi.checkSpeakingStatus).mockRejectedValue(new Error("timeout"));

    const { isDisconnected, startMonitoring, stopMonitoring } = useConnectionMonitor("0");
    startMonitoring();

    // First failure (initial heartbeat call)
    await vi.advanceTimersByTimeAsync(0);
    expect(isDisconnected.value).toBe(false);

    // Advance to next heartbeat interval for second failure
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL);
    expect(isDisconnected.value).toBe(true);
    stopMonitoring();
  });

  it("recovers when heartbeat succeeds after being disconnected", async () => {
    vi.mocked(chatApi.checkSpeakingStatus).mockRejectedValue(new Error("timeout"));

    const { isDisconnected, startMonitoring, stopMonitoring } = useConnectionMonitor("0");
    startMonitoring();

    // Fail HEARTBEAT_FAIL_THRESHOLD times
    await vi.advanceTimersByTimeAsync(0);
    for (let i = 1; i < HEARTBEAT_FAIL_THRESHOLD; i++) {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL);
    }
    expect(isDisconnected.value).toBe(true);

    // Now succeed
    vi.mocked(chatApi.checkSpeakingStatus).mockResolvedValue({ data: false });
    await vi.advanceTimersByTimeAsync(HEARTBEAT_FAST_INTERVAL);
    expect(isDisconnected.value).toBe(false);
    stopMonitoring();
  });

  it("switches to fast interval after disconnect", async () => {
    vi.mocked(chatApi.checkSpeakingStatus).mockRejectedValue(new Error("timeout"));

    const { isDisconnected, startMonitoring, stopMonitoring } = useConnectionMonitor("0");
    startMonitoring();

    // Trigger disconnect
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL);
    expect(isDisconnected.value).toBe(true);

    vi.clearAllMocks();

    // Fast interval should fire sooner than normal interval
    await vi.advanceTimersByTimeAsync(HEARTBEAT_FAST_INTERVAL);
    expect(chatApi.checkSpeakingStatus).toHaveBeenCalled();
    stopMonitoring();
  });

  it("cleans up on stopMonitoring", async () => {
    const { startMonitoring, stopMonitoring } = useConnectionMonitor("0");
    startMonitoring();
    await vi.advanceTimersByTimeAsync(0);

    stopMonitoring();

    expect(window.removeEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith("offline", expect.any(Function));

    vi.clearAllMocks();
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL * 2);
    expect(chatApi.checkSpeakingStatus).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useAutoReload } from "./useAutoReload";

describe("useAutoReload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("setAutoReloadTimer triggers reload after 120s", () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
      configurable: true
    });

    const { setAutoReloadTimer } = useAutoReload();
    setAutoReloadTimer();

    vi.advanceTimersByTime(119_999);
    expect(reloadMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it("clearAutoReloadTimer cancels the reload", () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
      configurable: true
    });

    const { setAutoReloadTimer, clearAutoReloadTimer } = useAutoReload();
    setAutoReloadTimer();
    clearAutoReloadTimer();

    vi.advanceTimersByTime(200_000);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("setAutoReloadTimer clears previous timer before setting new one", () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
      configurable: true
    });

    const { setAutoReloadTimer } = useAutoReload();
    setAutoReloadTimer();
    vi.advanceTimersByTime(60_000);

    // Set again — should reset the 120s countdown
    setAutoReloadTimer();
    vi.advanceTimersByTime(60_000);
    expect(reloadMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    expect(reloadMock).toHaveBeenCalledOnce();
  });
});

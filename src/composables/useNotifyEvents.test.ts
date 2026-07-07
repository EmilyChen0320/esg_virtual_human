import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { chatApi } from "../api/chatApi";
import type { NotifyEventsResponse } from "../types/chat";

import { useNotifyEvents } from "./useNotifyEvents";

vi.mock("../api/chatApi", () => ({
  chatApi: {
    getNotifyEvents: vi.fn()
  }
}));

describe("useNotifyEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts polling and calls onStart when start event received", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();

    // Initial check returns empty
    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: []
    });

    const { startNotifyCheck, stopNotifyCheck } = useNotifyEvents("1", {
      isDisconnected: { value: false }
    });
    startNotifyCheck({ onStart, onEnd });

    // Wait for the initial async check to complete
    await vi.advanceTimersByTimeAsync(0);

    // Mock a start event for the next poll
    const futureTime = new Date(Date.now() + 10000).toISOString();
    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: [
        {
          timestamp: futureTime,
          event: { status: "start", text: "Hello", msgevent: null }
        }
      ]
    });

    // Trigger next interval (100ms)
    await vi.advanceTimersByTimeAsync(100);

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ status: "start", text: "Hello" })
      })
    );

    stopNotifyCheck();
  });

  it("does not drop events that were created after resetTimestamp but before polling starts", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();

    const baseTime = new Date("2026-04-10T00:00:00.000Z");
    vi.setSystemTime(baseTime);

    const { startNotifyCheck, stopNotifyCheck, resetTimestamp } = useNotifyEvents("1", {
      isDisconnected: { value: false }
    });
    resetTimestamp();

    const eventTime = new Date(baseTime.getTime() + 1000).toISOString();
    vi.setSystemTime(new Date(baseTime.getTime() + 5000));
    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: [
        {
          timestamp: eventTime,
          event: { status: "start", text: "Buffered reply", msgevent: null }
        }
      ]
    });

    startNotifyCheck({ onStart, onEnd });
    await vi.advanceTimersByTimeAsync(0);

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: eventTime,
        event: expect.objectContaining({ status: "start", text: "Buffered reply" })
      })
    );

    stopNotifyCheck();
  });

  it("calls onEnd when end event received after start", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();

    const startTime = new Date(Date.now() + 5000).toISOString();
    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: [
        {
          timestamp: startTime,
          event: { status: "start", text: "AI reply", msgevent: null }
        }
      ]
    });

    const { startNotifyCheck, stopNotifyCheck } = useNotifyEvents("1", {
      isDisconnected: { value: false }
    });
    startNotifyCheck({ onStart, onEnd });
    await vi.advanceTimersByTimeAsync(0);

    expect(onStart).toHaveBeenCalled();

    const endTime = new Date(Date.now() + 10000).toISOString();
    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: [
        {
          timestamp: endTime,
          event: { status: "end", text: "", msgevent: null }
        }
      ]
    });

    await vi.advanceTimersByTimeAsync(100);
    expect(onEnd).toHaveBeenCalled();

    stopNotifyCheck();
  });

  it("does not let an older end in the same batch close a newer start", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();

    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: []
    });

    const { startNotifyCheck, stopNotifyCheck, resetTimestamp } = useNotifyEvents("1", {
      isDisconnected: { value: false }
    });
    startNotifyCheck({ onStart, onEnd });
    await vi.advanceTimersByTimeAsync(0);

    const baseTime = new Date(Date.now() + 10000).getTime();
    resetTimestamp();

    const olderEndTime = new Date(baseTime + 1000).toISOString();
    const newerStartTime = new Date(baseTime + 2000).toISOString();
    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: [
        {
          timestamp: olderEndTime,
          event: { status: "end", text: "old reply", msgevent: null }
        },
        {
          timestamp: newerStartTime,
          event: { status: "start", text: "new reply", msgevent: null }
        }
      ]
    });

    await vi.advanceTimersByTimeAsync(100);

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: newerStartTime,
        event: expect.objectContaining({ status: "start", text: "new reply" })
      })
    );
    expect(onEnd).not.toHaveBeenCalled();

    stopNotifyCheck();
  });

  it("ignores stale end events when no start event received in this polling session", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();

    const staleEndTime = new Date(Date.now() + 5000).toISOString();
    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: [
        {
          timestamp: staleEndTime,
          event: { status: "end", text: "", msgevent: null }
        }
      ]
    });

    const { startNotifyCheck, stopNotifyCheck } = useNotifyEvents("1", {
      isDisconnected: { value: false }
    });
    startNotifyCheck({ onStart, onEnd });
    await vi.advanceTimersByTimeAsync(0);

    expect(onEnd).not.toHaveBeenCalled();

    stopNotifyCheck();
  });

  it("stopNotifyCheck stops polling", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();

    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: []
    });

    const { startNotifyCheck, stopNotifyCheck } = useNotifyEvents("1", {
      isDisconnected: { value: false }
    });
    startNotifyCheck({ onStart, onEnd });
    await vi.advanceTimersByTimeAsync(0);

    stopNotifyCheck();

    vi.mocked(chatApi.getNotifyEvents).mockClear();
    await vi.advanceTimersByTimeAsync(500);

    expect(chatApi.getNotifyEvents).not.toHaveBeenCalled();
  });

  it("ignores events with non-zero code", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();

    vi.mocked(chatApi.getNotifyEvents).mockResolvedValue({
      code: 1,
      data: []
    });

    const { startNotifyCheck, stopNotifyCheck } = useNotifyEvents("1", {
      isDisconnected: { value: false }
    });
    startNotifyCheck({ onStart, onEnd });
    await vi.advanceTimersByTimeAsync(100);

    expect(onStart).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();

    stopNotifyCheck();
  });

  it("returns early when checkNotifyEvents is called while already checking", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();

    // Make the first API call hang until we resolve it
    let resolveFirst!: (value: { code: number; data: never[] }) => void;
    vi.mocked(chatApi.getNotifyEvents).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
    );

    const { startNotifyCheck, stopNotifyCheck } = useNotifyEvents("1", {
      isDisconnected: { value: false }
    });
    startNotifyCheck({ onStart, onEnd });

    // The first checkNotifyEvents is now in-flight (isChecking = true).
    // Advance timer to trigger the interval — second call should be skipped.
    await vi.advanceTimersByTimeAsync(100);

    // Only one call should have been made (the initial one), the interval call was skipped
    expect(chatApi.getNotifyEvents).toHaveBeenCalledTimes(1);

    // Resolve the pending call so cleanup is clean
    resolveFirst({ code: 0, data: [] });
    await vi.advanceTimersByTimeAsync(0);

    stopNotifyCheck();
  });

  it("does not process events if cancelled during fetch", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();

    // Initial check returns empty
    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: []
    });

    const { startNotifyCheck, stopNotifyCheck } = useNotifyEvents("1", {
      isDisconnected: { value: false }
    });
    startNotifyCheck({ onStart, onEnd });
    await vi.advanceTimersByTimeAsync(0);

    // Set up a slow API call where we cancel mid-flight
    const futureTime = new Date(Date.now() + 10000).toISOString();
    let resolveSecond!: (value: NotifyEventsResponse) => void;
    vi.mocked(chatApi.getNotifyEvents).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        })
    );

    // Trigger the interval poll
    await vi.advanceTimersByTimeAsync(100);

    // Cancel while the fetch is in-flight
    stopNotifyCheck();

    // Now resolve the fetch — events should be ignored
    resolveSecond({
      code: 0,
      data: [
        {
          timestamp: futureTime,
          event: { status: "start", text: "Ignored", msgevent: null }
        }
      ]
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(onStart).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("sorts events by timestamp and uses the latest start event", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();

    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: []
    });

    const { startNotifyCheck, stopNotifyCheck } = useNotifyEvents("1", {
      isDisconnected: { value: false }
    });
    startNotifyCheck({ onStart, onEnd });
    await vi.advanceTimersByTimeAsync(0);

    // Return events in reverse chronological order — the composable should sort them
    // so that "Second" (later timestamp) becomes the lastStartEvent
    const time1 = new Date(Date.now() + 10000).toISOString();
    const time2 = new Date(Date.now() + 20000).toISOString();
    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: [
        {
          timestamp: time2,
          event: { status: "start", text: "Second", msgevent: null }
        },
        {
          timestamp: time1,
          event: { status: "start", text: "First", msgevent: null }
        }
      ]
    });

    await vi.advanceTimersByTimeAsync(100);

    // After sorting by timestamp, events are processed in order: First then Second.
    // The composable only calls onStart with the last start event encountered.
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: time2,
        event: expect.objectContaining({ status: "start", text: "Second" })
      })
    );

    stopNotifyCheck();
  });

  it("resetTimestamp updates lastProcessedTimestamp so old events are ignored", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();

    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: []
    });

    const { startNotifyCheck, stopNotifyCheck, resetTimestamp } = useNotifyEvents("1", {
      isDisconnected: { value: false }
    });
    startNotifyCheck({ onStart, onEnd });
    await vi.advanceTimersByTimeAsync(0);

    // Advance time significantly, then reset timestamp
    vi.advanceTimersByTime(30000);
    resetTimestamp();

    // Return an event with a timestamp BEFORE the reset — should be ignored
    const oldTime = new Date(Date.now() - 5000).toISOString();
    vi.mocked(chatApi.getNotifyEvents).mockResolvedValueOnce({
      code: 0,
      data: [
        {
          timestamp: oldTime,
          event: { status: "start", text: "Old event", msgevent: null }
        }
      ]
    });

    await vi.advanceTimersByTimeAsync(100);

    expect(onStart).not.toHaveBeenCalled();

    stopNotifyCheck();
  });

  it("handles API errors gracefully", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(chatApi.getNotifyEvents).mockRejectedValueOnce(new Error("Network error"));

    const { startNotifyCheck, stopNotifyCheck } = useNotifyEvents("1", {
      isDisconnected: { value: false }
    });
    startNotifyCheck({ onStart, onEnd });
    await vi.advanceTimersByTimeAsync(0);

    expect(consoleSpy).toHaveBeenCalledWith(
      "[useNotifyEvents] Error checking notify events:",
      expect.any(Error)
    );
    expect(onStart).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();

    stopNotifyCheck();
  });
});

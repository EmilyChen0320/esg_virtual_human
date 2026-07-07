import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { loadSrsSdk } from "./srs";

describe("loadSrsSdk", () => {
  let appendChildSpy: any;

  beforeEach(() => {
    delete (window as any).SrsRtcWhipWhepAsync;
    appendChildSpy = vi.spyOn(document.head, "appendChild").mockImplementation((el) => el);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).SrsRtcWhipWhepAsync;
  });

  it("resolves immediately when SDK is already loaded", async () => {
    (window as any).SrsRtcWhipWhepAsync = vi.fn();

    await expect(loadSrsSdk()).resolves.toBeUndefined();
    expect(appendChildSpy).not.toHaveBeenCalled();
  });

  it("creates script element and resolves on load", async () => {
    appendChildSpy.mockImplementation((el: HTMLScriptElement) => {
      // Simulate successful load
      setTimeout(() => el.onload?.(new Event("load")), 0);
      return el;
    });

    await expect(loadSrsSdk()).resolves.toBeUndefined();

    expect(appendChildSpy).toHaveBeenCalledOnce();
    const script = appendChildSpy.mock.calls[0][0] as HTMLScriptElement;
    expect(script.src).toContain("/lib/srs.sdk.js");
  });

  it("rejects on script load error", async () => {
    appendChildSpy.mockImplementation((el: HTMLScriptElement) => {
      setTimeout(() => el.onerror?.(new Event("error") as any), 0);
      return el;
    });

    await expect(loadSrsSdk()).rejects.toThrow("Failed to load srs.sdk.js");
  });
});

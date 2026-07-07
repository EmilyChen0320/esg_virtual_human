import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const NIGHT_SERVICE_STORAGE_KEY = "kiosk_hc_night_service_enabled";

async function importNightService() {
  vi.resetModules();
  return import("./nightService");
}

describe("nightService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    window.history.replaceState({}, "", "/chat?lang=en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("does not enter night service before 18:00 Asia/Taipei", async () => {
    const { isTaipeiNightServiceTime } = await importNightService();

    expect(isTaipeiNightServiceTime(new Date("2026-06-29T09:59:00.000Z"))).toBe(false);
  });

  it("enters night service at 18:00 Asia/Taipei", async () => {
    const { isTaipeiNightServiceTime } = await importNightService();

    expect(isTaipeiNightServiceTime(new Date("2026-06-29T10:00:00.000Z"))).toBe(true);
  });

  it("uses Asia/Taipei instead of the machine local timezone", async () => {
    const { isTaipeiNightServiceTime } = await importNightService();

    expect(isTaipeiNightServiceTime(new Date("2026-06-29T10:00:00.000Z"))).toBe(true);
  });

  it("calculates delay until the next 18:00 Asia/Taipei", async () => {
    const { getNextNightServiceDelayMs } = await importNightService();

    expect(getNextNightServiceDelayMs(new Date("2026-06-29T09:59:00.000Z"))).toBe(60_000);
  });

  it("returns zero delay after 18:00 Asia/Taipei", async () => {
    const { getNextNightServiceDelayMs } = await importNightService();

    expect(getNextNightServiceDelayMs(new Date("2026-06-29T10:01:00.000Z"))).toBe(0);
  });

  it("builds an hc-phone URL with kiosk source and current language", async () => {
    vi.stubEnv("VITE_HC_PHONE_URL", "https://phone.example/chat?existing=1");
    const { buildNightServiceUrl } = await importNightService();

    expect(buildNightServiceUrl("?lang=en")).toBe(
      "https://phone.example/chat?existing=1&source=kiosk&lang=en"
    );
  });

  it("returns null when VITE_HC_PHONE_URL is missing", async () => {
    vi.stubEnv("VITE_HC_PHONE_URL", "");
    const { buildNightServiceUrl } = await importNightService();

    expect(buildNightServiceUrl("?lang=en")).toBeNull();
  });

  it("keeps storage failures from crashing the page", async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    try {
      const { isNightServiceEnabled, enableNightService, clearNightService } =
        await importNightService();

      expect(isNightServiceEnabled()).toBe(false);
      expect(() => enableNightService()).not.toThrow();
      expect(() => clearNightService()).not.toThrow();
    } finally {
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
      removeItemSpy.mockRestore();
    }
  });

  it("does not redirect when hc-phone URL is missing", async () => {
    vi.stubEnv("VITE_HC_PHONE_URL", "");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const replace = vi.fn();
    const { attemptNightServiceRedirect } = await importNightService();

    expect(
      attemptNightServiceRedirect({
        now: new Date("2026-06-29T10:00:00.000Z"),
        search: "?lang=en",
        replace
      })
    ).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(NIGHT_SERVICE_STORAGE_KEY)).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[nightService] VITE_HC_PHONE_URL is not configured; skip redirect"
    );
  });

  it("stores the night service flag and redirects when conditions match", async () => {
    vi.stubEnv("VITE_HC_PHONE_URL", "https://phone.example/chat");
    const replace = vi.fn();
    const { attemptNightServiceRedirect } = await importNightService();

    expect(
      attemptNightServiceRedirect({
        now: new Date("2026-06-29T10:00:00.000Z"),
        search: "?lang=en",
        replace
      })
    ).toBe(true);
    expect(replace).toHaveBeenCalledWith("https://phone.example/chat?source=kiosk&lang=en");
    expect(localStorage.getItem(NIGHT_SERVICE_STORAGE_KEY)).toBe(
      JSON.stringify({ enabledDate: "2026-06-29" })
    );
  });

  it("redirects before 09:00 when the previous night service flag already exists", async () => {
    vi.stubEnv("VITE_HC_PHONE_URL", "https://phone.example/chat");
    localStorage.setItem(NIGHT_SERVICE_STORAGE_KEY, JSON.stringify({ enabledDate: "2026-06-29" }));
    const replace = vi.fn();
    const { attemptNightServiceRedirect } = await importNightService();

    expect(
      attemptNightServiceRedirect({
        now: new Date("2026-06-30T00:59:00.000Z"),
        search: "?lang=zh",
        replace
      })
    ).toBe(true);
    expect(replace).toHaveBeenCalledWith("https://phone.example/chat?source=kiosk&lang=zh");
  });

  it("clears the previous night service flag at 09:00 and stays on virtual human", async () => {
    vi.stubEnv("VITE_HC_PHONE_URL", "https://phone.example/chat");
    localStorage.setItem(NIGHT_SERVICE_STORAGE_KEY, JSON.stringify({ enabledDate: "2026-06-29" }));
    const replace = vi.fn();
    const { attemptNightServiceRedirect } = await importNightService();

    expect(
      attemptNightServiceRedirect({
        now: new Date("2026-06-30T01:00:00.000Z"),
        search: "?lang=zh",
        replace
      })
    ).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(NIGHT_SERVICE_STORAGE_KEY)).toBeNull();
  });

  it("expires legacy night service flags after 09:00", async () => {
    localStorage.setItem(NIGHT_SERVICE_STORAGE_KEY, "1");
    const { isNightServiceEnabled } = await importNightService();

    expect(isNightServiceEnabled(new Date("2026-06-30T01:00:00.000Z"))).toBe(false);
    expect(localStorage.getItem(NIGHT_SERVICE_STORAGE_KEY)).toBeNull();
  });
});

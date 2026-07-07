import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { AUTH_STORAGE_KEY, AUTH_TTL_MS } from "../constants/auth";

const nightServiceMocks = vi.hoisted(() => ({
  attemptNightServiceRedirect: vi.fn(() => false)
}));

vi.mock("../utils/nightService", () => nightServiceMocks);

function createAuthSession(expiresAt: number) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ expiresAt }));
}

async function createTestRouter() {
  const { default: router } = await import("./index");
  return router;
}

describe("Router guard", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    nightServiceMocks.attemptNightServiceRedirect.mockReturnValue(false);
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("redirects to Home when no auth session exists", async () => {
    const router = await createTestRouter();
    await router.push("/chat");
    expect(router.currentRoute.value.name).toBe("Home");
  });

  it("redirects to Home when auth session is expired", async () => {
    createAuthSession(Date.now() - 1000);
    const router = await createTestRouter();
    await router.push("/chat");
    expect(router.currentRoute.value.name).toBe("Home");
  });

  it("clears expired auth session on redirect", async () => {
    createAuthSession(Date.now() - 1000);
    const router = await createTestRouter();
    await router.push("/chat");
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("allows navigation to Chat when auth session is valid", async () => {
    createAuthSession(Date.now() + AUTH_TTL_MS);
    const router = await createTestRouter();
    await router.push("/chat");
    expect(router.currentRoute.value.name).toBe("Chat");
  });

  it("preserves lang query param on redirect", async () => {
    const router = await createTestRouter();
    await router.push("/chat?lang=en");
    expect(router.currentRoute.value.name).toBe("Home");
    expect(router.currentRoute.value.query.lang).toBe("en");
  });

  it("allows navigation to Home without auth", async () => {
    const router = await createTestRouter();
    await router.push("/");
    expect(router.currentRoute.value.name).toBe("Home");
  });

  it("checks night service before entering Home", async () => {
    const router = await createTestRouter();
    await router.push("/?lang=en");

    expect(nightServiceMocks.attemptNightServiceRedirect).toHaveBeenCalledWith({
      search: "?lang=en"
    });
  });

  it("stops internal navigation when night service redirects", async () => {
    nightServiceMocks.attemptNightServiceRedirect.mockReturnValue(true);

    const router = await createTestRouter();
    await router.push("/chat?lang=en");

    expect(router.currentRoute.value.name).toBeUndefined();
  });

  it("runs night service before the auth guard", async () => {
    nightServiceMocks.attemptNightServiceRedirect.mockReturnValue(true);

    const router = await createTestRouter();
    await router.push("/chat?lang=en");

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(router.currentRoute.value.name).toBeUndefined();
  });
});

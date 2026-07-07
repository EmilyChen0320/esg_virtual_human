import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";

const nightServiceMocks = vi.hoisted(() => ({
  attemptNightServiceRedirect: vi.fn(() => false),
  getNextNightServiceDelayMs: vi.fn(() => 60_000)
}));

vi.mock("../utils/nightService", () => nightServiceMocks);

import { useNightServiceRedirect } from "./useNightServiceRedirect";

const TestComponent = defineComponent({
  setup() {
    useNightServiceRedirect();
    return {};
  },
  template: "<div />"
});

describe("useNightServiceRedirect", () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    nightServiceMocks.attemptNightServiceRedirect.mockReturnValue(false);
    nightServiceMocks.getNextNightServiceDelayMs.mockReturnValue(60_000);
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("checks immediately and schedules the next night service cutoff", () => {
    wrapper = mount(TestComponent);

    expect(nightServiceMocks.attemptNightServiceRedirect).toHaveBeenCalledOnce();
    expect(nightServiceMocks.getNextNightServiceDelayMs).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(60_000);

    expect(nightServiceMocks.attemptNightServiceRedirect).toHaveBeenCalledTimes(2);
  });

  it("does not schedule another timer after a redirect attempt succeeds", () => {
    nightServiceMocks.attemptNightServiceRedirect.mockReturnValue(true);

    wrapper = mount(TestComponent);
    vi.advanceTimersByTime(60_000);

    expect(nightServiceMocks.attemptNightServiceRedirect).toHaveBeenCalledOnce();
    expect(nightServiceMocks.getNextNightServiceDelayMs).not.toHaveBeenCalled();
  });

  it("rechecks when the page returns to focus", () => {
    wrapper = mount(TestComponent);
    window.dispatchEvent(new Event("focus"));

    expect(nightServiceMocks.attemptNightServiceRedirect).toHaveBeenCalledTimes(2);
  });

  it("rechecks when the page becomes visible again", () => {
    wrapper = mount(TestComponent);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false
    });

    document.dispatchEvent(new Event("visibilitychange"));

    expect(nightServiceMocks.attemptNightServiceRedirect).toHaveBeenCalledTimes(2);
  });

  it("cleans timers and listeners on unmount", () => {
    wrapper = mount(TestComponent);

    wrapper.unmount();
    wrapper = null;
    vi.advanceTimersByTime(60_000);
    window.dispatchEvent(new Event("focus"));

    expect(nightServiceMocks.attemptNightServiceRedirect).toHaveBeenCalledOnce();
  });
});

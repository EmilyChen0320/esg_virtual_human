import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import ScaledDesignCanvas from "./ScaledDesignCanvas.vue";

const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

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

describe("ScaledDesignCanvas", () => {
  afterEach(() => {
    setViewport(originalInnerWidth, originalInnerHeight);
    vi.restoreAllMocks();
  });

  it("renders slot content with default 1440x2560 design size", () => {
    setViewport(1440, 2560);

    const wrapper = mount(ScaledDesignCanvas, {
      slots: {
        default: "<div class='slot-content'>content</div>"
      }
    });

    const style = wrapper.get(".design-canvas").attributes("style");
    expect(style).toContain("width: 1440px;");
    expect(style).toContain("height: 2560px;");
    expect(style).toContain("scale(1)");
    expect(wrapper.get(".slot-content").text()).toBe("content");
  });

  it("updates scale when viewport changes", async () => {
    setViewport(1920, 1080);
    const wrapper = mount(ScaledDesignCanvas);

    const initialScale = Math.min(1920 / 1440, 1080 / 2560);
    expect(wrapper.get(".design-canvas").attributes("style")).toContain(`scale(${initialScale})`);

    setViewport(1080, 1920);
    window.dispatchEvent(new Event("resize"));
    await nextTick();

    const resizedScale = Math.min(1080 / 1440, 1920 / 2560);
    expect(wrapper.get(".design-canvas").attributes("style")).toContain(`scale(${resizedScale})`);
  });

  it("supports custom base dimensions", () => {
    setViewport(1000, 1000);

    const wrapper = mount(ScaledDesignCanvas, {
      props: {
        baseWidth: 1000,
        baseHeight: 500
      }
    });

    const style = wrapper.get(".design-canvas").attributes("style");
    expect(style).toContain("width: 1000px;");
    expect(style).toContain("height: 500px;");
    expect(style).toContain("scale(1)");
  });
});

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ChatBubble from "./ChatBubble.vue";

describe("ChatBubble", () => {
  it("renders ai text without user modifier classes", () => {
    const wrapper = mount(ChatBubble, {
      props: { role: "ai", text: "AI 回覆", maxChars: 26 }
    });

    expect(wrapper.text()).toContain("AI 回覆");
    expect(wrapper.find(".dialog-bubble").exists()).toBe(true);
    expect(wrapper.find(".dialog-bubble-user").exists()).toBe(false);
    expect(wrapper.find(".dialog-text-user").exists()).toBe(false);
  });

  it("renders user text with user modifier classes", () => {
    const wrapper = mount(ChatBubble, {
      props: { role: "user", text: "使用者", maxChars: 20 }
    });

    expect(wrapper.find(".dialog-bubble-user").exists()).toBe(true);
    expect(wrapper.find(".dialog-text-user").exists()).toBe(true);
  });

  it("shows image when image url provided and showImage is true", () => {
    const wrapper = mount(ChatBubble, {
      props: {
        role: "ai",
        text: "AI 回覆",
        maxChars: 26,
        image: "https://example.com/a.png"
      }
    });

    expect(wrapper.find(".dialog-image").exists()).toBe(true);
  });

  it("hides image when showImage is false", () => {
    const wrapper = mount(ChatBubble, {
      props: {
        role: "ai",
        text: "AI 回覆",
        maxChars: 26,
        image: "https://example.com/a.png",
        showImage: false
      }
    });

    expect(wrapper.find(".dialog-image").exists()).toBe(false);
  });

  it("emits imageError when image fails to load", async () => {
    const wrapper = mount(ChatBubble, {
      props: {
        role: "ai",
        text: "AI 回覆",
        maxChars: 26,
        image: "https://example.com/broken.png"
      }
    });

    await wrapper.get(".dialog-image").trigger("error");

    expect(wrapper.emitted("imageError")).toHaveLength(1);
  });

  it("emits imageLoad when image finishes loading", async () => {
    const wrapper = mount(ChatBubble, {
      props: {
        role: "ai",
        text: "AI 回覆",
        maxChars: 26,
        image: "https://example.com/a.png"
      }
    });

    await wrapper.get(".dialog-image").trigger("load");

    expect(wrapper.emitted("imageLoad")).toHaveLength(1);
  });
});

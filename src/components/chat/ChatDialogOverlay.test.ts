import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";

import {
  BOTTOM_DIALOG_BUBBLE_BOTTOM_Y,
  CONVERSATION_BOTTOM_DIALOG_VIEWPORT,
  CONVERSATION_TOP_DIALOG_VIEWPORT
} from "../../constants/ui";

import ChatDialogOverlay from "./ChatDialogOverlay.vue";

describe("ChatDialogOverlay", () => {
  it("renders the full dialog history with AI and user bubble styling", () => {
    const wrapper = mount(ChatDialogOverlay, {
      props: {
        dialogHistory: [
          { text: "AI 回應內容", isUser: false },
          { text: "使用者回覆", isUser: true }
        ]
      }
    });

    const items = wrapper.findAll(".dialog-history-item");
    expect(wrapper.find(".dialog-overlay").exists()).toBe(true);
    expect(items).toHaveLength(2);
    expect(items[0].classes()).not.toContain("dialog-history-item-user");
    expect(items[1].classes()).toContain("dialog-history-item-user");
    expect(wrapper.text()).toContain("AI 回應內容");
    expect(wrapper.text()).toContain("使用者回覆");
    expect(wrapper.find(".dialog-bubble-user").exists()).toBe(true);
  });

  it("does not render when dialog history is empty", () => {
    const wrapper = mount(ChatDialogOverlay, {
      props: {
        dialogHistory: []
      }
    });

    expect(wrapper.find(".dialog-overlay").exists()).toBe(false);
  });

  it("scrolls to the newest dialog when history grows", async () => {
    const wrapper = mount(ChatDialogOverlay, {
      attachTo: document.body,
      props: {
        dialogHistory: [{ text: "第一句", isUser: false }]
      }
    });

    const viewport = wrapper.get(".dialog-history-viewport").element as HTMLDivElement;

    Object.defineProperty(viewport, "scrollHeight", {
      configurable: true,
      value: 360
    });
    Object.defineProperty(viewport, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0
    });

    await wrapper.setProps({
      dialogHistory: [
        { text: "第一句", isUser: false },
        { text: "第二句", isUser: true }
      ]
    });

    expect(viewport.scrollTop).toBe(360);
    wrapper.unmount();
  });

  it("hides citation image when image loading fails", async () => {
    const wrapper = mount(ChatDialogOverlay, {
      props: {
        dialogHistory: [
          { text: "AI 回應內容", isUser: false, image: "https://example.com/broken.png" }
        ]
      }
    });

    const image = wrapper.get(".dialog-image");
    await image.trigger("error");

    expect(wrapper.find(".dialog-image").exists()).toBe(false);
  });

  it("keeps chronological order when bottomViewport is true", () => {
    const wrapper = mount(ChatDialogOverlay, {
      props: {
        dialogHistory: [
          { text: "第一句", isUser: false },
          { text: "第二句", isUser: true },
          { text: "第三句", isUser: false }
        ],
        bottomViewport: true
      }
    });

    const items = wrapper.findAll(".dialog-history-item");
    expect(items).toHaveLength(3);
    expect(items[0].text()).toContain("第一句");
    expect(items[1].text()).toContain("第二句");
    expect(items[2].text()).toContain("第三句");
  });

  it("uses bottom-anchored layout classes when bottomViewport is true", () => {
    const wrapper = mount(ChatDialogOverlay, {
      props: {
        dialogHistory: [
          { text: "第一句", isUser: false },
          { text: "第二句", isUser: true }
        ],
        bottomViewport: true
      }
    });

    expect(wrapper.get(".dialog-history-viewport").classes()).toContain(
      "dialog-history-viewport-bottom"
    );
    expect(wrapper.get(".dialog-history-content").classes()).toContain(
      "dialog-history-content-bottom"
    );
  });

  it("applies gradient mask class in top and bottom layouts", async () => {
    const wrapper = mount(ChatDialogOverlay, {
      props: {
        dialogHistory: [{ text: "第一句", isUser: false }]
      }
    });

    expect(wrapper.get(".dialog-history-viewport").classes()).toContain(
      "dialog-history-viewport-gradient"
    );

    await wrapper.setProps({ bottomViewport: true });

    expect(wrapper.get(".dialog-history-viewport").classes()).toContain(
      "dialog-history-viewport-gradient"
    );
  });

  it("uses explicit viewport heights for top and bottom layouts", async () => {
    const wrapper = mount(ChatDialogOverlay, {
      props: {
        dialogHistory: [{ text: "第一句", isUser: false }]
      }
    });

    expect(wrapper.get(".dialog-history-viewport").attributes("style")).toContain(
      `height: ${CONVERSATION_TOP_DIALOG_VIEWPORT.height}px`
    );

    await wrapper.setProps({ bottomViewport: true });

    expect(wrapper.get(".dialog-history-viewport").attributes("style")).toContain(
      `height: ${CONVERSATION_BOTTOM_DIALOG_VIEWPORT.height}px`
    );
  });

  it("anchors top and bottom conversation viewports to the same bottom edge", () => {
    expect(CONVERSATION_TOP_DIALOG_VIEWPORT.top + CONVERSATION_TOP_DIALOG_VIEWPORT.height).toBe(
      BOTTOM_DIALOG_BUBBLE_BOTTOM_Y
    );
    expect(
      CONVERSATION_BOTTOM_DIALOG_VIEWPORT.top + CONVERSATION_BOTTOM_DIALOG_VIEWPORT.height
    ).toBe(BOTTOM_DIALOG_BUBBLE_BOTTOM_Y);
  });

  it("does not use justify-content flex-end on bottom content to preserve scroll", () => {
    const wrapper = mount(ChatDialogOverlay, {
      props: {
        dialogHistory: [
          { text: "第一句", isUser: false },
          { text: "第二句", isUser: true }
        ],
        bottomViewport: true
      }
    });

    const contentEl = wrapper.get(".dialog-history-content-bottom").element as HTMLDivElement;
    const computedStyle = window.getComputedStyle(contentEl);
    expect(computedStyle.justifyContent).not.toBe("flex-end");
  });

  it("anchors bottom content to the bottom edge via auto-margin on first child", () => {
    const wrapper = mount(ChatDialogOverlay, {
      props: {
        dialogHistory: [
          { text: "第一句", isUser: false },
          { text: "第二句", isUser: true }
        ],
        bottomViewport: true
      }
    });

    const firstChildEl = wrapper.get(".dialog-history-content-bottom > .dialog-history-item")
      .element as HTMLDivElement;
    const computedStyle = window.getComputedStyle(firstChildEl);
    const marginTop = computedStyle.marginTop;
    expect(marginTop).not.toBe("0px");
  });

  it("scrolls to bottom when bottomViewport is true and history grows", async () => {
    const wrapper = mount(ChatDialogOverlay, {
      attachTo: document.body,
      props: {
        dialogHistory: [{ text: "第一句", isUser: false }],
        bottomViewport: true
      }
    });

    const viewport = wrapper.get(".dialog-history-viewport").element as HTMLDivElement;

    Object.defineProperty(viewport, "scrollHeight", {
      configurable: true,
      value: 360
    });
    Object.defineProperty(viewport, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0
    });

    await wrapper.setProps({
      dialogHistory: [
        { text: "第一句", isUser: false },
        { text: "第二句", isUser: true }
      ]
    });

    expect(viewport.scrollTop).toBe(360);
    wrapper.unmount();
  });

  it("scrolls to bottom when switching between top and bottom layouts", async () => {
    const wrapper = mount(ChatDialogOverlay, {
      attachTo: document.body,
      props: {
        dialogHistory: [
          { text: "第一句", isUser: false },
          { text: "第二句", isUser: true }
        ]
      }
    });

    const viewport = wrapper.get(".dialog-history-viewport").element as HTMLDivElement;

    Object.defineProperty(viewport, "scrollHeight", {
      configurable: true,
      value: 720
    });
    Object.defineProperty(viewport, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0
    });

    await wrapper.setProps({ bottomViewport: true });
    await nextTick();

    expect(viewport.scrollTop).toBe(720);

    viewport.scrollTop = 0;

    await wrapper.setProps({ bottomViewport: false });
    await nextTick();

    expect(viewport.scrollTop).toBe(720);
    wrapper.unmount();
  });
});

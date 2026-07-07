import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";

import {
  BOTTOM_ACTION_ROW_CONTAINER,
  BOTTOM_BTN_LEFT,
  BOTTOM_PRIMARY_BAR_WIDTH
} from "../../constants/ui";

import BottomActionRow from "./BottomActionRow.vue";

function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: "zh",
    messages: {
      zh: {
        button: { "restart-chat": "重啟", faq: "常見問題", loading: "處理中..." }
      }
    }
  });
}

function mountRow(props: { disabled?: boolean; isProcessing?: boolean } = {}) {
  return mount(BottomActionRow, {
    props: { disabled: false, ...props },
    global: { plugins: [createTestI18n()] }
  });
}

describe("BottomActionRow", () => {
  it("renders restart and FAQ buttons", () => {
    const wrapper = mountRow();
    expect(wrapper.find(".row-btn.restart").exists()).toBe(true);
    expect(wrapper.find(".row-btn.faq").exists()).toBe(true);
  });

  it("renders FaqIcon SVG in FAQ button", () => {
    const wrapper = mountRow();
    expect(wrapper.find(".row-btn.faq svg").exists()).toBe(true);
  });

  it("renders RestartIcon SVG in restart button", () => {
    const wrapper = mountRow();
    expect(wrapper.find(".row-btn.restart svg").exists()).toBe(true);
  });

  it("emits restart when restart button clicked", async () => {
    const wrapper = mountRow();
    await wrapper.find(".row-btn.restart").trigger("click");
    expect(wrapper.emitted("restart")).toBeDefined();
  });

  it("does not emit restart from pointerdown before the click", async () => {
    const wrapper = mountRow();
    const restart = wrapper.find(".row-btn.restart");

    await restart.trigger("pointerdown");

    expect(wrapper.emitted("restart")).toBeUndefined();
  });

  it("emits restart once on pointer release and ignores the follow-up click", async () => {
    const wrapper = mountRow();
    const restart = wrapper.find(".row-btn.restart");

    await restart.trigger("pointerdown", { pointerId: 1 });
    await restart.trigger("pointerup", { pointerId: 1 });
    await restart.trigger("click");

    expect(wrapper.emitted("restart")).toHaveLength(1);
  });

  it("does not emit when the pointer leaves before release", async () => {
    const wrapper = mountRow();
    const restart = wrapper.find(".row-btn.restart");

    await restart.trigger("pointerdown", { pointerId: 1 });
    await restart.trigger("pointerleave", { pointerId: 1 });
    await restart.trigger("pointerup", { pointerId: 1 });

    expect(wrapper.emitted("restart")).toBeUndefined();
  });

  it("emits faq when FAQ button clicked", async () => {
    const wrapper = mountRow();
    await wrapper.find(".row-btn.faq").trigger("click");
    expect(wrapper.emitted("faq")).toBeDefined();
  });

  it("marks both buttons as blocked when disabled prop is true", () => {
    const wrapper = mountRow({ disabled: true });
    expect(wrapper.find(".row-btn.restart").attributes("disabled")).toBeDefined();
    expect(wrapper.find(".row-btn.faq").attributes("disabled")).toBeDefined();
    expect(wrapper.find(".row-btn.restart").classes()).toContain("row-btn--disabled");
    expect(wrapper.find(".row-btn.faq").classes()).toContain("row-btn--disabled");
  });

  it("marks both buttons as available when disabled prop is false", () => {
    const wrapper = mountRow({ disabled: false });
    expect(wrapper.find(".row-btn.restart").attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".row-btn.faq").attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".row-btn.restart").classes()).not.toContain("row-btn--disabled");
    expect(wrapper.find(".row-btn.faq").classes()).not.toContain("row-btn--disabled");
  });

  it("does not emit restart, faq, or blockedAction when disabled", async () => {
    const wrapper = mountRow({ disabled: true });

    await wrapper.find(".row-btn.restart").trigger("click");
    await wrapper.find(".row-btn.faq").trigger("click");

    expect(wrapper.emitted("blockedAction")).toBeUndefined();
    expect(wrapper.emitted("restart")).toBeUndefined();
    expect(wrapper.emitted("faq")).toBeUndefined();
  });

  it("shows processing text while disabled by an active request", () => {
    const wrapper = mountRow({ disabled: true, isProcessing: true });
    expect(wrapper.find(".row-btn.restart").text()).toContain("處理中...");
    expect(wrapper.find(".row-btn.faq").text()).toContain("處理中...");
  });

  describe("alignment with primary bar (regression guard)", () => {
    const containerRight = BOTTOM_ACTION_ROW_CONTAINER.left + BOTTOM_ACTION_ROW_CONTAINER.width;
    const primaryRight = BOTTOM_BTN_LEFT + BOTTOM_PRIMARY_BAR_WIDTH;

    it("right edge aligns with primary bar right edge", () => {
      expect(containerRight).toBe(primaryRight);
    });

    it("horizontal center aligns with primary bar center", () => {
      const containerCenter =
        BOTTOM_ACTION_ROW_CONTAINER.left + BOTTOM_ACTION_ROW_CONTAINER.width / 2;
      const primaryCenter = BOTTOM_BTN_LEFT + BOTTOM_PRIMARY_BAR_WIDTH / 2;
      expect(containerCenter).toBe(primaryCenter);
    });
  });
});

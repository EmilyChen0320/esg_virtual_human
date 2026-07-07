import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";

import { DIALOG_FONT_SIZE } from "../constants/ui";

import ButtonPositionDialog from "./ButtonPositionDialog.vue";

function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: "zh",
    messages: {
      zh: {
        confirm: {
          "button-position-title": "是否變更按鈕位置？",
          "button-position-top": "上方顯示",
          "button-position-bottom": "下方顯示",
          "button-position-confirm": "確認切換"
        }
      }
    }
  });
}

describe("ButtonPositionDialog", () => {
  it("does not render when show is false", () => {
    const wrapper = mount(ButtonPositionDialog, {
      props: {
        show: false,
        currentPosition: "bottom"
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    expect(wrapper.find(".button-position-overlay").exists()).toBe(false);
  });

  it("renders title, both options, and confirm button", () => {
    const wrapper = mount(ButtonPositionDialog, {
      props: {
        show: true,
        currentPosition: "bottom"
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    expect(wrapper.find(".button-position-title").text()).toBe("是否變更按鈕位置？");
    expect(wrapper.findAll(".button-position-option")).toHaveLength(2);
    expect(wrapper.find(".button-position-option--active").text()).toBe("上方顯示");
    expect(wrapper.find(".button-position-confirm").text()).toBe("確認切換");
  });

  it("highlights the pending option without emitting until confirm is clicked", async () => {
    const wrapper = mount(ButtonPositionDialog, {
      props: {
        show: true,
        currentPosition: "bottom"
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    await wrapper.findAll(".button-position-option")[0].trigger("click");

    expect(wrapper.emitted("select")).toBeUndefined();
    expect(wrapper.find(".button-position-option--active").text()).toBe("上方顯示");

    await wrapper.find(".button-position-confirm").trigger("click");

    expect(wrapper.emitted("select")).toEqual([["top"]]);
  });

  it("confirms the opposite position when no option is changed", async () => {
    const wrapper = mount(ButtonPositionDialog, {
      props: {
        show: true,
        currentPosition: "bottom"
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    await wrapper.find(".button-position-confirm").trigger("click");

    expect(wrapper.emitted("select")).toEqual([["top"]]);
  });

  it("emits cancel when the backdrop is clicked", async () => {
    vi.useFakeTimers();
    const wrapper = mount(ButtonPositionDialog, {
      props: {
        show: true,
        currentPosition: "bottom"
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    await wrapper.find(".button-position-overlay").trigger("pointerdown");
    vi.advanceTimersByTime(500);
    await wrapper.find(".button-position-overlay").trigger("click");

    expect(wrapper.emitted("cancel")).toHaveLength(1);
    vi.useRealTimers();
  });

  it("resets pending to opposite of currentPosition each time the dialog reopens", async () => {
    const wrapper = mount(ButtonPositionDialog, {
      props: {
        show: true,
        currentPosition: "bottom"
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    // currentPosition="bottom" → pendingPosition = "top" (opposite)
    await wrapper.findAll(".button-position-option")[0].trigger("click");
    expect(wrapper.find(".button-position-option--active").text()).toBe("上方顯示");

    await wrapper.setProps({ show: false });
    await wrapper.setProps({ currentPosition: "top" as const });
    await wrapper.setProps({ show: true });

    // currentPosition="top" → pendingPosition resets to "bottom" (opposite)
    expect(wrapper.find(".button-position-option--active").text()).toBe("下方顯示");
  });

  it("applies DIALOG_FONT_SIZE to title, options, and confirm", () => {
    const wrapper = mount(ButtonPositionDialog, {
      props: {
        show: true,
        currentPosition: "top"
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    const expected = `${DIALOG_FONT_SIZE}px`;
    expect((wrapper.find(".button-position-title").element as HTMLElement).style.fontSize).toBe(
      expected
    );
    expect(
      (wrapper.findAll(".button-position-option")[0].element as HTMLElement).style.fontSize
    ).toBe(expected);
    expect((wrapper.find(".button-position-confirm").element as HTMLElement).style.fontSize).toBe(
      expected
    );
  });

  it("disables the option matching currentPosition and pre-selects the opposite", () => {
    const wrapper = mount(ButtonPositionDialog, {
      props: { show: true, currentPosition: "top" },
      global: { plugins: [createTestI18n()] }
    });

    const options = wrapper.findAll(".button-position-option");
    // "上方顯示" (top) is disabled; "下方顯示" (bottom) is pre-selected
    expect(options[0].classes()).toContain("button-position-option--disabled");
    expect((options[0].element as HTMLButtonElement).disabled).toBe(true);
    expect(options[1].classes()).toContain("button-position-option--active");
    expect(options[1].classes()).not.toContain("button-position-option--disabled");
  });

  it("clicking the disabled (current) option does not change the selection", async () => {
    const wrapper = mount(ButtonPositionDialog, {
      props: { show: true, currentPosition: "bottom" },
      global: { plugins: [createTestI18n()] }
    });

    // Pending starts as "top" (opposite of "bottom")
    expect(wrapper.find(".button-position-option--active").text()).toBe("上方顯示");

    // Try clicking the disabled "下方顯示" button (currentPosition)
    await wrapper.findAll(".button-position-option")[1].trigger("click");

    // Selection must remain "上方顯示"
    expect(wrapper.find(".button-position-option--active").text()).toBe("上方顯示");
  });
});

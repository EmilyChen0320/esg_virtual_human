import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";

import { RESTART_DIALOG_LOGO_IMAGE } from "../constants/media";
import { DIALOG_FONT_SIZE } from "../constants/ui";

import RestartDialog from "./RestartDialog.vue";
import restartDialogSource from "./RestartDialog.vue?raw";

function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: "zh",
    messages: {
      zh: {
        confirm: {
          "restart-chat-title": "確定要重新啟動系統嗎？",
          "restart-chat-body": "重新啟動後，目前的對話內容將不會保留。",
          "restart-yes": "是",
          "restart-no": "否"
        }
      }
    }
  });
}

describe("RestartDialog", () => {
  it("does not render when show is false", () => {
    const wrapper = mount(RestartDialog, {
      props: {
        show: false
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    expect(wrapper.find(".restart-overlay").exists()).toBe(false);
  });

  it("renders with correct content when show is true", () => {
    const wrapper = mount(RestartDialog, {
      props: {
        show: true
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    expect(wrapper.find(".restart-overlay").exists()).toBe(true);
    expect(wrapper.find(".restart-logo").attributes("src")).toBe(RESTART_DIALOG_LOGO_IMAGE);
    expect(wrapper.find(".restart-title").text()).toBe("確定要重新啟動系統嗎？");
    expect(wrapper.find(".restart-body").text()).toBe("重新啟動後，目前的對話內容將不會保留。");
    expect(wrapper.find(".restart-btn--cancel").text()).toBe("否");
    expect(wrapper.find(".restart-btn--confirm").text()).toBe("是");
  });

  it("renders override title and body when provided", () => {
    const wrapper = mount(RestartDialog, {
      props: {
        show: true,
        title: "切換語言",
        body: "切換語言將重新開始，是否確認？"
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    expect(wrapper.find(".restart-text").text()).toContain("切換語言");
    expect(wrapper.find(".restart-text").text()).toContain("切換語言將重新開始，是否確認？");
  });

  it("emits cancel when cancel button is clicked", async () => {
    const wrapper = mount(RestartDialog, {
      props: {
        show: true
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    await wrapper.find(".restart-btn--cancel").trigger("click");
    expect(wrapper.emitted("cancel")).toBeTruthy();
  });

  it("emits confirm when confirm button is clicked", async () => {
    const wrapper = mount(RestartDialog, {
      props: {
        show: true
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    await wrapper.find(".restart-btn--confirm").trigger("click");
    expect(wrapper.emitted("confirm")).toBeTruthy();
  });

  it("applies DIALOG_FONT_SIZE to title and body", () => {
    const wrapper = mount(RestartDialog, {
      props: {
        show: true
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    const expected = `${DIALOG_FONT_SIZE}px`;
    expect((wrapper.find(".restart-title").element as HTMLElement).style.fontSize).toBe(expected);
    expect((wrapper.find(".restart-body").element as HTMLElement).style.fontSize).toBe(expected);
  });

  it("defines a pressed touch state for confirm and cancel buttons", () => {
    expect(restartDialogSource).toContain(".restart-btn:active:not(:disabled)");
    expect(restartDialogSource).toContain("touch-action: manipulation");
    expect(restartDialogSource).toContain("transform: scale(0.94)");
  });

  it("emits cancel when clicking on the overlay backdrop", async () => {
    const wrapper = mount(RestartDialog, {
      props: {
        show: true
      },
      global: {
        plugins: [createTestI18n()]
      }
    });

    await wrapper.find(".restart-overlay").trigger("pointerdown");
    // click.self - only triggers if element itself is clicked
    await wrapper.find(".restart-overlay").trigger("click");
    expect(wrapper.emitted("cancel")).toBeTruthy();
  });
});

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";

import {
  TOP_FOOTER_DISCLAIMER,
  TOP_FOOTER_QR,
  type ActionButtonPosition
} from "../../constants/ui";

import chatReadyOverlaySource from "./ChatReadyOverlay.vue?raw";
import ChatReadyOverlay from "./ChatReadyOverlay.vue";

function createTestI18n() {
  return createI18n({
    legacy: false,
    locale: "zh",
    messages: {
      zh: {
        qr: { title: "官方帳號" },
        footer: {
          disclaimer: "本虛擬人僅提供資訊協助\n不構成醫療建議。\n如有健康問題\n請洽詢專業醫師。",
          topDisclaimer: "本虛擬人僅提供資訊協助，不構成醫療建議。\n如有健康問題，請洽詢專業醫師。"
        },
        button: {
          "restart-chat": "重啟",
          "start-chat": "開始對話",
          loading: "處理中...",
          "preparing-recording": "準備中...",
          faq: "常見問題"
        },
        confirm: { "button-position-title": "是否變更按鈕位置？" }
      }
    }
  });
}

const BASE_PROPS: {
  openingMessage: string;
  isDisconnected: boolean;
  disableAllButtons: boolean;
  disableFaqRestart: boolean;
  isActionProcessing?: boolean;
  isStartingConsult?: boolean;
  isPreparingRecording?: boolean;
  faqOpen: boolean;
  buttonPosition: ActionButtonPosition;
} = {
  openingMessage: "您好，請問有什麼需要幫忙？",
  isDisconnected: false,
  disableAllButtons: false,
  disableFaqRestart: false,
  faqOpen: false,
  buttonPosition: "top"
};

function mountOverlay(props: Partial<typeof BASE_PROPS> = {}) {
  return mount(ChatReadyOverlay, {
    props: { ...BASE_PROPS, ...props },
    global: { plugins: [createTestI18n()] }
  });
}

describe("ChatReadyOverlay", () => {
  describe("top layout (default circle buttons)", () => {
    it("renders circle FAQ button", () => {
      expect(mountOverlay().find(".faq-btn").exists()).toBe(true);
    });

    it("renders circle start button", () => {
      expect(mountOverlay().find(".start-btn").exists()).toBe(true);
    });

    it("renders circle restart button", () => {
      expect(mountOverlay().find(".restart-btn").exists()).toBe(true);
    });

    it("renders FaqIcon and RestartIcon inside circle buttons (regression: missing imports)", () => {
      const wrapper = mountOverlay();
      expect(wrapper.find(".faq-btn").findComponent({ name: "FaqIcon" }).exists()).toBe(true);
      expect(wrapper.find(".restart-btn").findComponent({ name: "RestartIcon" }).exists()).toBe(
        true
      );
    });

    it("renders opening message", () => {
      const wrapper = mountOverlay();
      expect(wrapper.find(".ready-message").exists()).toBe(true);
      expect(wrapper.find(".ready-message .dialog-bubble").text()).toContain(
        "您好，請問有什麼需要幫忙？"
      );
    });

    it("renders QR section at bottom-right", () => {
      expect(mountOverlay().find(".ready-qr-section").exists()).toBe(true);
    });

    it("keeps the top QR title centered on a single line for English copy", () => {
      const wrapper = mount(ChatReadyOverlay, {
        props: BASE_PROPS,
        global: {
          plugins: [
            createI18n({
              legacy: false,
              locale: "en",
              messages: {
                en: {
                  qr: { title: "Line" },
                  footer: {
                    disclaimer: "",
                    topDisclaimer: ""
                  },
                  button: {
                    "restart-chat": "Restart",
                    "start-chat": "start",
                    loading: "Processing",
                    "preparing-recording": "Preparing",
                    faq: "FAQ"
                  },
                  confirm: { "button-position-title": "Change button position?" }
                }
              }
            })
          ]
        }
      });

      expect(wrapper.get(".ready-qr-title").text()).toBe("Line");
      expect(chatReadyOverlaySource).toContain(".ready-qr-title {");
      expect(chatReadyOverlaySource).toContain("width: 100%;");
      expect(chatReadyOverlaySource).toContain("margin: 0;");
      expect(chatReadyOverlaySource).toContain("text-align: center;");
      expect(chatReadyOverlaySource).toContain("white-space: nowrap;");
    });

    it("supports wrapped English text for top circular action buttons", () => {
      const wrapper = mount(ChatReadyOverlay, {
        props: {
          ...BASE_PROPS,
          isActionProcessing: true,
          disableAllButtons: true,
          disableFaqRestart: true
        },
        global: {
          plugins: [
            createI18n({
              legacy: false,
              locale: "en",
              messages: {
                en: {
                  qr: { title: "Line" },
                  footer: {
                    disclaimer: "",
                    topDisclaimer: ""
                  },
                  button: {
                    "restart-chat": "Restart",
                    "start-chat": "start",
                    loading: "Processing",
                    "preparing-recording": "Preparing",
                    faq: "FAQ"
                  },
                  confirm: { "button-position-title": "Change button position?" }
                }
              }
            })
          ]
        }
      });

      expect(wrapper.find(".start-btn").text()).toContain("Processing");
      expect(wrapper.find(".faq-btn").text()).toContain("Processing");
      expect(wrapper.find(".restart-btn").text()).toContain("Processing");
      expect(chatReadyOverlaySource).toContain("max-width: 150px;");
      expect(chatReadyOverlaySource).toContain("white-space: normal;");
      expect(chatReadyOverlaySource).toContain("text-align: center;");
    });

    it("renders disclaimer at bottom-left", () => {
      expect(mountOverlay().find(".ready-disclaimer").exists()).toBe(true);
    });

    it("uses compact two-line footer copy beside the QR code", () => {
      const wrapper = mountOverlay();
      const disclaimer = wrapper.get(".ready-disclaimer");

      expect(disclaimer.text()).toBe(
        "本虛擬人僅提供資訊協助，不構成醫療建議。\n如有健康問題，請洽詢專業醫師。"
      );
      expect(disclaimer.attributes("style")).toContain(`left: ${TOP_FOOTER_DISCLAIMER.left}px;`);
      expect(disclaimer.attributes("style")).toContain(`width: ${TOP_FOOTER_DISCLAIMER.width}px;`);
      expect(wrapper.get(".ready-qr-section").attributes("style")).toContain(
        `left: ${TOP_FOOTER_QR.left}px;`
      );
    });

    it("emits startChat when start button clicked", async () => {
      const wrapper = mountOverlay();
      await wrapper.find(".start-btn").trigger("click");
      expect(wrapper.emitted("startChat")).toBeDefined();
    });

    it("does not emit startChat from pointerdown before the click", async () => {
      const wrapper = mountOverlay();
      const start = wrapper.find(".start-btn");

      await start.trigger("pointerdown");

      expect(wrapper.emitted("startChat")).toBeUndefined();
    });

    it("emits startChat once on pointer release and ignores the follow-up click", async () => {
      const wrapper = mountOverlay();
      const start = wrapper.find(".start-btn");

      await start.trigger("pointerdown", { pointerId: 1 });
      await start.trigger("pointerup", { pointerId: 1 });
      await start.trigger("click");

      expect(wrapper.emitted("startChat")).toHaveLength(1);
    });

    it("emits faq when FAQ button clicked", async () => {
      const wrapper = mountOverlay();
      await wrapper.find(".faq-btn").trigger("click");
      expect(wrapper.emitted("faq")).toBeDefined();
    });

    it("emits restart when restart button clicked", async () => {
      const wrapper = mountOverlay();
      await wrapper.find(".restart-btn").trigger("click");
      expect(wrapper.emitted("restart")).toBeDefined();
    });
  });

  describe("bottom layout (wheelchair stacked bar)", () => {
    it("renders translucent container banner", () => {
      expect(
        mountOverlay({ buttonPosition: "bottom" }).find(".ready-bottom-container").exists()
      ).toBe(true);
    });

    it("renders start-chat bar", () => {
      expect(
        mountOverlay({ buttonPosition: "bottom" }).find(".ready-bottom-start-bar").exists()
      ).toBe(true);
    });

    it("renders restart and FAQ in row", () => {
      const wrapper = mountOverlay({ buttonPosition: "bottom" });
      expect(wrapper.find(".bottom-action-row").exists()).toBe(true);
    });

    it("keeps bottom action bars visible when faqOpen is true (no visual overlap with FAQ panel)", () => {
      const wrapper = mountOverlay({ buttonPosition: "bottom", faqOpen: true });
      expect(wrapper.find(".ready-bottom-container").exists()).toBe(true);
      expect(wrapper.find(".ready-bottom-start-bar").exists()).toBe(true);
      expect(wrapper.find(".bottom-action-row").exists()).toBe(true);
    });

    it("hides top-layout circle buttons when faqOpen is true (regression guard)", () => {
      const wrapper = mountOverlay({ buttonPosition: "top", faqOpen: true });
      expect(wrapper.find(".start-btn").exists()).toBe(false);
      expect(wrapper.find(".faq-btn").exists()).toBe(false);
      expect(wrapper.find(".restart-btn").exists()).toBe(false);
    });

    it("renders opening message bubble in bottom position", () => {
      const wrapper = mountOverlay({ buttonPosition: "bottom" });
      expect(wrapper.find(".ready-bottom-message").exists()).toBe(true);
      expect(wrapper.find(".ready-bottom-message .dialog-bubble").text()).toContain(
        "您好，請問有什麼需要幫忙？"
      );
    });

    it("renders QR section at top-right", () => {
      expect(mountOverlay({ buttonPosition: "bottom" }).find(".ready-bottom-qr").exists()).toBe(
        true
      );
    });

    it("nests QR inside the header-right-stack so it auto-centers under the language selector", () => {
      const wrapper = mountOverlay({ buttonPosition: "bottom" });
      expect(wrapper.find(".header-right-stack .ready-bottom-qr").exists()).toBe(true);
    });

    it("does not render bottom-mode QR in top layout", () => {
      const wrapper = mountOverlay({ buttonPosition: "top" });
      expect(wrapper.find(".ready-bottom-qr").exists()).toBe(false);
    });

    it("renders disclaimer at top-left", () => {
      expect(mountOverlay({ buttonPosition: "bottom" }).find(".bottom-disclaimer").exists()).toBe(
        true
      );
    });

    it("emits startChat when start bar clicked", async () => {
      const wrapper = mountOverlay({ buttonPosition: "bottom" });
      await wrapper.find(".ready-bottom-start-bar").trigger("click");
      expect(wrapper.emitted("startChat")).toBeDefined();
    });

    it("emits faq when FAQ button clicked", async () => {
      const wrapper = mountOverlay({ buttonPosition: "bottom" });
      await wrapper
        .findComponent({ name: "BottomActionRow" })
        .find(".row-btn.faq")
        .trigger("click");
      expect(wrapper.emitted("faq")).toBeDefined();
    });

    it("does not emit bottom FAQ or blockedAction when disabled", async () => {
      const wrapper = mountOverlay({ buttonPosition: "bottom", disableFaqRestart: true });

      await wrapper
        .findComponent({ name: "BottomActionRow" })
        .find(".row-btn.faq")
        .trigger("click");

      expect(wrapper.emitted("blockedAction")).toBeUndefined();
      expect(wrapper.emitted("faq")).toBeUndefined();
    });

    it("emits restart when restart button clicked", async () => {
      const wrapper = mountOverlay({ buttonPosition: "bottom" });
      await wrapper
        .findComponent({ name: "BottomActionRow" })
        .find(".row-btn.restart")
        .trigger("click");
      expect(wrapper.emitted("restart")).toBeDefined();
    });

    it("bottom buttons have no ripple-button class", () => {
      const wrapper = mountOverlay({ buttonPosition: "bottom" });
      expect(wrapper.find(".ready-bottom-start-bar").classes()).not.toContain("ripple-button");
      expect(
        wrapper.findComponent({ name: "BottomActionRow" }).find(".row-btn").classes()
      ).not.toContain("ripple-button");
    });
  });

  describe("disabled states", () => {
    it("disables start bar when disableAllButtons is true", () => {
      const wrapper = mountOverlay({ buttonPosition: "bottom", disableAllButtons: true });
      expect((wrapper.find(".ready-bottom-start-bar").element as HTMLButtonElement).disabled).toBe(
        true
      );
    });

    it("shows loading and disables start buttons while starting consult", () => {
      const top = mountOverlay({ isStartingConsult: true, disableAllButtons: true });
      expect(top.find(".start-btn").text()).toContain("處理中...");
      expect((top.find(".start-btn").element as HTMLButtonElement).disabled).toBe(true);

      const bottom = mountOverlay({
        buttonPosition: "bottom",
        isStartingConsult: true,
        disableAllButtons: true
      });
      expect(bottom.find(".ready-bottom-start-bar").text()).toContain("處理中...");
      expect((bottom.find(".ready-bottom-start-bar").element as HTMLButtonElement).disabled).toBe(
        true
      );
    });

    it("shows loading while page initialization disables start buttons", () => {
      const top = mountOverlay({ isActionProcessing: true, disableAllButtons: true });
      expect(top.find(".start-btn").text()).toContain("處理中...");
      expect((top.find(".start-btn").element as HTMLButtonElement).disabled).toBe(true);

      const bottom = mountOverlay({
        buttonPosition: "bottom",
        isActionProcessing: true,
        disableAllButtons: true
      });
      expect(bottom.find(".ready-bottom-start-bar").text()).toContain("處理中...");
      expect((bottom.find(".ready-bottom-start-bar").element as HTMLButtonElement).disabled).toBe(
        true
      );
    });

    it("shows preparing and disables start buttons while audio capture is starting", () => {
      const top = mountOverlay({
        isPreparingRecording: true,
        disableAllButtons: true
      });
      expect(top.find(".start-btn").text()).toContain("準備中...");
      expect((top.find(".start-btn").element as HTMLButtonElement).disabled).toBe(true);

      const bottom = mountOverlay({
        buttonPosition: "bottom",
        isPreparingRecording: true,
        disableAllButtons: true
      });
      expect(bottom.find(".ready-bottom-start-bar").text()).toContain("準備中...");
      expect((bottom.find(".ready-bottom-start-bar").element as HTMLButtonElement).disabled).toBe(
        true
      );
    });

    it("disables restart and FAQ when disableFaqRestart is true", () => {
      const wrapper = mountOverlay({ buttonPosition: "bottom", disableFaqRestart: true });
      const row = wrapper.findComponent({ name: "BottomActionRow" });
      expect(row.props("disabled")).toBe(true);
    });

    it("shows processing text on FAQ and restart actions while an action is processing", () => {
      const top = mountOverlay({ disableFaqRestart: true, isActionProcessing: true });
      expect(top.find(".faq-btn").text()).toContain("處理中...");
      expect(top.find(".restart-btn").text()).toContain("處理中...");

      const bottom = mountOverlay({
        buttonPosition: "bottom",
        disableFaqRestart: true,
        isActionProcessing: true
      });
      const row = bottom.findComponent({ name: "BottomActionRow" });
      expect(row.props("isProcessing")).toBe(true);
      expect(row.find(".row-btn.faq").text()).toContain("處理中...");
      expect(row.find(".row-btn.restart").text()).toContain("處理中...");
    });

    it("start bar stays enabled when only disableFaqRestart is true", () => {
      const wrapper = mountOverlay({ buttonPosition: "bottom", disableFaqRestart: true });
      expect((wrapper.find(".ready-bottom-start-bar").element as HTMLButtonElement).disabled).toBe(
        false
      );
    });
  });

  describe("buttonPositionClick hotspot", () => {
    it("emits buttonPositionClick when hotspot clicked", async () => {
      const wrapper = mountOverlay();
      await wrapper.find(".button-position-hotspot").trigger("click");
      expect(wrapper.emitted("buttonPositionClick")).toBeDefined();
    });
  });

  describe("no circle buttons in bottom layout", () => {
    it("does not render circle faq button when bottom", () => {
      expect(mountOverlay({ buttonPosition: "bottom" }).find(".faq-btn").exists()).toBe(false);
    });

    it("does not render circle start button when bottom", () => {
      expect(mountOverlay({ buttonPosition: "bottom" }).find(".start-btn").exists()).toBe(false);
    });
  });
});

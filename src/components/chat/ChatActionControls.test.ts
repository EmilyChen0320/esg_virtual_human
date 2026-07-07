import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";

import {
  BUTTON_FONT_SIZE,
  SUBTITLE_FONT_SIZE,
  TOP_FOOTER_DISCLAIMER,
  TOP_FOOTER_QR
} from "../../constants/ui";

import ChatActionControls from "./ChatActionControls.vue";

vi.mock("../../constants/media", () => ({
  HOSPITAL_LOGO_IMAGE: "/images/hospital-logo.png",
  QR_CODE_IMAGE: "/images/qr-mobile-support.png",
  BOTTOM_RECORDING_LOTTIE_PATH: "/lottie/soundwave.json"
}));

vi.mock("lottie-web", () => ({
  default: {
    loadAnimation: vi.fn(() => ({ destroy: vi.fn() }))
  }
}));

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
          "start-chat": "開始對話",
          loading: "處理中...",
          "preparing-recording": "準備中...",
          "stop-recording": "停止錄音",
          "restart-chat": "重啟",
          faq: "常見問題",
          consult: "開始諮詢",
          recording: "錄音中",
          interrupt: "中斷"
        },
        confirm: { "button-position-title": "是否變更按鈕位置？" }
      }
    }
  });
}

const BASE_PROPS: {
  isRecording: boolean;
  isPreparingRecording?: boolean;
  isConsulting: boolean;
  isDisconnected: boolean;
  disableAllButtons: boolean;
  disableFaqRestart: boolean;
  isActionProcessing?: boolean;
  shouldShowInterruptButton: boolean;
  chatMode: "standby" | "conversation";
  faqOpen: boolean;
  buttonPosition: "top" | "bottom";
} = {
  isRecording: false,
  isConsulting: false,
  isDisconnected: false,
  disableAllButtons: false,
  disableFaqRestart: false,
  shouldShowInterruptButton: false,
  chatMode: "standby" as const,
  faqOpen: false,
  buttonPosition: "top" as const
};

function mountControls(props: Partial<typeof BASE_PROPS> = {}) {
  return mount(ChatActionControls, {
    props: { ...BASE_PROPS, ...props },
    global: { plugins: [createTestI18n()] }
  });
}

describe("ChatActionControls", () => {
  describe("conversation top layout", () => {
    it("uses compact two-line footer copy beside the QR code", () => {
      const wrapper = mountControls({
        chatMode: "conversation",
        isConsulting: true,
        buttonPosition: "top"
      });
      const disclaimer = wrapper.get(".disclaimer-section");

      expect(disclaimer.text()).toBe(
        "本虛擬人僅提供資訊協助，不構成醫療建議。\n如有健康問題，請洽詢專業醫師。"
      );
      expect(disclaimer.attributes("style")).toContain(`left: ${TOP_FOOTER_DISCLAIMER.left}px;`);
      expect(disclaimer.attributes("style")).toContain(`width: ${TOP_FOOTER_DISCLAIMER.width}px;`);
      expect(wrapper.get(".qr-section").attributes("style")).toContain(
        `left: ${TOP_FOOTER_QR.left}px;`
      );
    });

    it("renders the shared English QR title in the footer QR block", () => {
      const wrapper = mount(ChatActionControls, {
        props: {
          ...BASE_PROPS,
          chatMode: "conversation",
          isConsulting: true,
          buttonPosition: "top"
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
                    "start-chat": "start",
                    loading: "Processing",
                    "preparing-recording": "Preparing",
                    "stop-recording": "Stop Recording",
                    "restart-chat": "Restart",
                    faq: "FAQ",
                    consult: "Consult",
                    recording: "Recording",
                    interrupt: "Interrupt"
                  },
                  confirm: { "button-position-title": "Change button position?" }
                }
              }
            })
          ]
        }
      });

      const qrTitle = wrapper.get(".qr-title");

      expect(qrTitle.text()).toBe("Line");
    });
  });

  describe("standby bottom layout", () => {
    it("does not render bottom-disclaimer in standby bottom layout", () => {
      const wrapper = mountControls({ buttonPosition: "bottom" });
      expect(wrapper.find(".bottom-disclaimer").exists()).toBe(false);
    });

    it("renders QR title in bottom layout", () => {
      const wrapper = mountControls({ buttonPosition: "bottom" });
      expect(wrapper.find(".qr-title").exists()).toBe(true);
    });
  });

  describe("initialization disabled state", () => {
    it("shows loading on the start action while initialization is processing", () => {
      const top = mountControls({
        disableAllButtons: true,
        isActionProcessing: true,
        buttonPosition: "top"
      });
      expect(top.find(".consult-btn").text()).toContain("處理中...");

      const bottom = mountControls({
        disableAllButtons: true,
        isActionProcessing: true,
        buttonPosition: "bottom"
      });
      expect(bottom.find(".standby-bottom-btn").text()).toContain("處理中...");
    });
  });

  describe("conversation bottom layout", () => {
    it("renders bottom-disclaimer in conversation bottom layout", () => {
      const wrapper = mountControls({
        chatMode: "conversation",
        isConsulting: true,
        buttonPosition: "bottom"
      });
      expect(wrapper.find(".bottom-disclaimer").exists()).toBe(true);
    });

    it("renders BottomActionRow with FaqIcon in conversation mode (VH-153 regression guard)", () => {
      const wrapper = mountControls({
        chatMode: "conversation",
        isConsulting: true,
        buttonPosition: "bottom"
      });
      const row = wrapper.findComponent({ name: "BottomActionRow" });
      expect(row.exists()).toBe(true);
      expect(row.find(".row-btn.faq").exists()).toBe(true);
      expect(row.find(".row-btn.faq svg").exists()).toBe(true);
    });

    it("emits faqClick when FAQ button in BottomActionRow is clicked", async () => {
      const wrapper = mountControls({
        chatMode: "conversation",
        isConsulting: true,
        buttonPosition: "bottom"
      });
      const row = wrapper.findComponent({ name: "BottomActionRow" });
      await row.find(".row-btn.faq").trigger("click");
      expect(wrapper.emitted("faqClick")).toBeDefined();
    });

    it("does not emit faqClick or blockedAction when BottomActionRow is disabled", async () => {
      const wrapper = mountControls({
        chatMode: "conversation",
        isConsulting: true,
        buttonPosition: "bottom",
        disableFaqRestart: true
      });
      const row = wrapper.findComponent({ name: "BottomActionRow" });

      await row.find(".row-btn.faq").trigger("click");

      expect(wrapper.emitted("blockedAction")).toBeUndefined();
      expect(wrapper.emitted("faqClick")).toBeUndefined();
    });

    it("shows processing text on bottom FAQ and restart row during processing", () => {
      const wrapper = mountControls({
        chatMode: "conversation",
        isConsulting: true,
        buttonPosition: "bottom",
        disableFaqRestart: true,
        isActionProcessing: true
      });
      const row = wrapper.findComponent({ name: "BottomActionRow" });
      expect(row.props("isProcessing")).toBe(true);
      expect(row.find(".row-btn.faq").text()).toContain("處理中...");
      expect(row.find(".row-btn.restart").text()).toContain("處理中...");
    });

    it("shows preparing state instead of recording animation while audio capture starts", () => {
      const wrapper = mountControls({
        chatMode: "conversation",
        isConsulting: true,
        buttonPosition: "bottom",
        isPreparingRecording: true,
        disableAllButtons: true
      });

      expect(wrapper.find(".conversation-bar-btn.preparing").text()).toContain("準備中...");
      expect(wrapper.find(".conversation-bar-btn.recording").exists()).toBe(false);
      expect(
        (wrapper.find(".conversation-bar-btn.preparing").element as HTMLButtonElement).disabled
      ).toBe(true);
    });

    it("shows the stop recording label while recording", () => {
      const wrapper = mountControls({
        chatMode: "conversation",
        isConsulting: true,
        buttonPosition: "bottom",
        isRecording: true
      });

      expect(wrapper.find(".conversation-bar-btn.recording .soundwave-lottie").exists()).toBe(true);
      expect(wrapper.find(".conversation-bar-btn.recording").text()).toContain("停止錄音");
    });
  });

  describe("font size constants are referenced (regression guard)", () => {
    it("BUTTON_FONT_SIZE is at least 20px", () => {
      expect(BUTTON_FONT_SIZE).toBeGreaterThanOrEqual(20);
    });

    it("SUBTITLE_FONT_SIZE is at least 24px", () => {
      expect(SUBTITLE_FONT_SIZE).toBeGreaterThanOrEqual(24);
    });
  });
});

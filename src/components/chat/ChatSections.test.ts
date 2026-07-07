import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, shallowRef } from "vue";
import { createI18n } from "vue-i18n";

import { VIRTUAL_PERSON_FIRST_FRAME_IMAGE } from "../../constants/media";
import {
  ACTION_BUTTONS,
  ACTION_BUTTON_LAYOUTS,
  ACTION_ICON_SIZE,
  BOTTOM_BTN_HEIGHT,
  BOTTOM_CONTAINER_HEIGHT,
  BOTTOM_CONTAINER_TOP,
  BOTTOM_DIALOG_BUBBLE_BOTTOM_Y,
  BOTTOM_DIALOG_BUBBLE_GAP,
  BOTTOM_PRIMARY_BAR_TOP,
  BOTTOM_ROW_TOP,
  BOTTOM_STACKED_CONTROLS_GAP,
  CANVAS_HEIGHT,
  CONVERSATION_BOTTOM_BAR,
  CONVERSATION_BOTTOM_CONTAINER,
  CONVERSATION_BOTTOM_DIALOG_VIEWPORT,
  READY_BOTTOM_CONTAINER,
  READY_BOTTOM_MESSAGE,
  READY_BOTTOM_START_BAR,
  STANDBY_BOTTOM_BAR,
  STANDBY_BOTTOM_CONTAINER,
  TOP_FOOTER_DISCLAIMER,
  TOP_FOOTER_QR
} from "../../constants/ui";

vi.mock("lottie-web", () => ({
  default: {
    loadAnimation: vi.fn(() => ({ destroy: vi.fn() }))
  }
}));

import ChatActionControls from "./ChatActionControls.vue";
import chatActionControlsSource from "./ChatActionControls.vue?raw";
import ChatFooterOverlay from "./ChatFooterOverlay.vue";
import ChatMediaLayer from "./ChatMediaLayer.vue";
import ChatReadyOverlay from "./ChatReadyOverlay.vue";
import chatReadyOverlaySource from "./ChatReadyOverlay.vue?raw";

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
          "stop-recording": "停止錄音",
          loading: "處理中...",
          faq: "常見問題",
          interrupt: "中斷"
        },
        confirm: {
          "button-position-title": "是否變更按鈕位置？"
        },
        "end-dialog": {
          body: "很高興為您服務",
          suffix: "向展位人員領取"
        }
      }
    }
  });
}

const ConsultButtonStub = defineComponent({
  emits: ["consultClick", "recordingClick", "interrupt"],
  template: `
    <div>
      <button class="consult-stub" @click="$emit('consultClick')">consult</button>
      <button class="recording-stub" @click="$emit('recordingClick')">record</button>
      <button class="interrupt-stub" @click="$emit('interrupt')">interrupt</button>
    </div>
  `
});

const LanguageSelectorStub = defineComponent({
  emits: ["languageChange"],
  template: `<button class="language-stub" @click="$emit('languageChange', 'en')">lang</button>`
});

const EndDialogStub = defineComponent({
  props: { show: Boolean, code: String, disabled: Boolean },
  emits: ["close"],
  template: `
    <div class="end-dialog-stub">
      <span class="dialog-state">{{ show ? 'open' : 'closed' }}</span>
      <button class="close-stub" @click="$emit('close')">close</button>
    </div>
  `
});

const setMutedMock = vi.fn();

const VideoStreamStub = defineComponent({
  props: { sessionId: String, active: Boolean },
  emits: ["error"],
  setup(_, { expose }) {
    expose({ setMuted: setMutedMock });
  },
  template: `
    <div class="video-stream-stub">
      <span class="session-id">{{ sessionId }}</span>
      <span class="active-state">{{ active }}</span>
      <button class="video-error-stub" @click="$emit('error', 'stream failed')">error</button>
    </div>
  `
});

describe("ChatActionControls", () => {
  it("renders standby layout: QR top-right, ConsultButton", async () => {
    const wrapper = mount(ChatActionControls, {
      props: {
        isRecording: false,
        isConsulting: false,
        isDisconnected: false,
        disableAllButtons: false,
        disableFaqRestart: false,
        shouldShowInterruptButton: false,
        chatMode: "standby" as const,
        faqOpen: false,
        buttonPosition: "top" as const
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          ConsultButton: ConsultButtonStub,
          LanguageSelector: LanguageSelectorStub
        }
      }
    });

    expect(wrapper.find(".hospital-logo").exists()).toBe(true);
    expect(wrapper.find(".qr-section-standby").exists()).toBe(true);
    expect(wrapper.find(".standby-button-container").exists()).toBe(true);
    expect(wrapper.find(".qr-image").exists()).toBe(true);
    expect(wrapper.find(".action-buttons-container").exists()).toBe(false);
    expect(wrapper.find(".disclaimer-section").exists()).toBe(false);
  });

  it("renders standby bottom layout: no disclaimer, bottom QR, bar button; no circle button", async () => {
    const wrapper = mount(ChatActionControls, {
      props: {
        isRecording: false,
        isConsulting: false,
        isDisconnected: false,
        disableAllButtons: false,
        disableFaqRestart: false,
        shouldShowInterruptButton: false,
        chatMode: "standby" as const,
        faqOpen: false,
        buttonPosition: "bottom" as const
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          ConsultButton: ConsultButtonStub,
          LanguageSelector: LanguageSelectorStub
        }
      }
    });

    expect(wrapper.find(".standby-bottom-layout").exists()).toBe(true);
    expect(wrapper.find(".standby-bar-wrapper").exists()).toBe(true);
    expect(wrapper.find(".bottom-disclaimer").exists()).toBe(false);
    expect(wrapper.find(".standby-qr-bottom").exists()).toBe(true);
    expect(wrapper.find(".standby-bottom-container").exists()).toBe(true);
    expect(wrapper.find(".qr-section-standby").exists()).toBe(false);
    expect(wrapper.find(".standby-button-container").exists()).toBe(false);
    expect(wrapper.find(".credit-section").exists()).toBe(false);

    await wrapper.find(".standby-bottom-btn").trigger("click");
    expect(wrapper.emitted("consultClick")).toHaveLength(1);
  });

  it("renders conversation layout and relays child events", async () => {
    const wrapper = mount(ChatActionControls, {
      props: {
        isRecording: false,
        isConsulting: false,
        isDisconnected: false,
        disableAllButtons: false,
        disableFaqRestart: false,
        shouldShowInterruptButton: true,
        chatMode: "conversation" as const,
        faqOpen: false,
        buttonPosition: "top" as const
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          ConsultButton: ConsultButtonStub,
          LanguageSelector: LanguageSelectorStub
        }
      }
    });

    expect(wrapper.find(".hospital-logo").exists()).toBe(true);
    expect(wrapper.find(".qr-section").exists()).toBe(true);
    expect(wrapper.find(".disclaimer-section").exists()).toBe(true);
    expect(wrapper.text()).toContain("官方帳號");
    expect(wrapper.find(".qr-image").exists()).toBe(true);

    await wrapper.find(".consult-stub").trigger("click");
    await wrapper.find(".recording-stub").trigger("click");
    await wrapper.find(".interrupt-stub").trigger("click");
    await wrapper.find(".language-stub").trigger("click");
    await wrapper.find(".logo-wrapper").trigger("click");
    await wrapper.find(".button-position-hotspot").trigger("click");

    expect(wrapper.emitted("consultClick")).toHaveLength(1);
    expect(wrapper.emitted("recordingClick")).toHaveLength(1);
    expect(wrapper.emitted("interrupt")).toHaveLength(1);
    expect(wrapper.emitted("languageChange")).toEqual([["en"]]);
    expect(wrapper.emitted("reload")).toHaveLength(1);
    expect(wrapper.emitted("buttonPositionClick")).toHaveLength(1);
  });

  it("shows restart button only when consulting", async () => {
    const wrapper = mount(ChatActionControls, {
      props: {
        isRecording: false,
        isConsulting: false,
        isDisconnected: false,
        disableAllButtons: false,
        disableFaqRestart: false,
        shouldShowInterruptButton: false,
        chatMode: "conversation" as const,
        faqOpen: false,
        buttonPosition: "top" as const
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          ConsultButton: ConsultButtonStub,
          LanguageSelector: LanguageSelectorStub
        }
      }
    });

    expect(wrapper.find(".restart-btn").exists()).toBe(false);

    await wrapper.setProps({ isConsulting: true });
    expect(wrapper.find(".restart-btn").exists()).toBe(true);

    await wrapper.find(".restart-btn").trigger("click");
    expect(wrapper.emitted("restart")).toHaveLength(1);
  });

  it("renders buttons in Figma order: FAQ → ConsultButton → Restart", async () => {
    const wrapper = mount(ChatActionControls, {
      props: {
        isRecording: false,
        isConsulting: true,
        isDisconnected: false,
        disableAllButtons: false,
        disableFaqRestart: false,
        shouldShowInterruptButton: false,
        chatMode: "conversation" as const,
        faqOpen: false,
        buttonPosition: "top" as const
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          ConsultButton: ConsultButtonStub,
          LanguageSelector: LanguageSelectorStub
        }
      }
    });

    const container = wrapper.find(".action-buttons-container");
    const children = container.element.children;
    expect(children[0].classList.contains("faq-btn")).toBe(true);
    // ConsultButton stub is the second child (wrapped in a div)
    expect(children[1].querySelector(".consult-stub")).toBeTruthy();
    expect(children[2].classList.contains("restart-btn")).toBe(true);
  });

  it("shows QR section always according to design", async () => {
    const wrapper = mount(ChatActionControls, {
      props: {
        isRecording: false,
        isConsulting: true,
        isDisconnected: false,
        disableAllButtons: false,
        disableFaqRestart: false,
        shouldShowInterruptButton: false,
        chatMode: "conversation" as const,
        faqOpen: false,
        buttonPosition: "top" as const
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          ConsultButton: ConsultButtonStub,
          LanguageSelector: LanguageSelectorStub
        }
      }
    });

    expect(wrapper.find(".qr-section").exists()).toBe(true);
  });

  it("uses top-side positions when buttonPosition is top", () => {
    const wrapper = mount(ChatActionControls, {
      props: {
        isRecording: false,
        isConsulting: true,
        isDisconnected: false,
        disableAllButtons: false,
        disableFaqRestart: false,
        shouldShowInterruptButton: false,
        chatMode: "conversation" as const,
        faqOpen: false,
        buttonPosition: "top" as const
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          ConsultButton: ConsultButtonStub,
          LanguageSelector: LanguageSelectorStub
        }
      }
    });

    expect(wrapper.find(".faq-btn").attributes("style")).toContain(
      `left: ${ACTION_BUTTON_LAYOUTS.top.faq.left}px;`
    );
    expect(wrapper.find(".main-btn-wrapper").attributes("style")).toContain(
      `left: ${ACTION_BUTTON_LAYOUTS.top.main.left}px;`
    );
    expect(wrapper.find(".restart-btn").attributes("style")).toContain(
      `left: ${ACTION_BUTTON_LAYOUTS.top.restart.left}px;`
    );
  });

  it("top QR and disclaimer use shared footer constants to prevent position jump after FAQ question click", () => {
    expect(chatActionControlsSource).toContain("TOP_FOOTER_QR");
    expect(chatActionControlsSource).toContain("TOP_FOOTER_DISCLAIMER");
    expect(chatReadyOverlaySource).toContain("TOP_FOOTER_QR");
    expect(chatReadyOverlaySource).toContain("TOP_FOOTER_DISCLAIMER");
    expect(TOP_FOOTER_QR.top).toBe(2272);
    expect(TOP_FOOTER_DISCLAIMER.top).toBe(2348);
    expect(TOP_FOOTER_DISCLAIMER.width).toBe(1040);
  });

  describe("bottom conversation layout", () => {
    it("renders idle bar state with MicIcon and localized label", async () => {
      const wrapper = mount(ChatActionControls, {
        props: {
          isRecording: false,
          isConsulting: true,
          isDisconnected: false,
          disableAllButtons: false,
          disableFaqRestart: false,
          shouldShowInterruptButton: false,
          chatMode: "conversation" as const,
          faqOpen: false,
          buttonPosition: "bottom" as const
        },
        global: {
          plugins: [createTestI18n()],
          stubs: {
            LanguageSelector: LanguageSelectorStub
          }
        }
      });

      expect(wrapper.find(".conversation-bar-btn.idle").exists()).toBe(true);
      expect(wrapper.find(".conversation-bar-btn.idle").text()).toContain("開始對話");
    });

    it("renders recording bar state with the bottom recording asset and stop label", async () => {
      const wrapper = mount(ChatActionControls, {
        props: {
          isRecording: true,
          isConsulting: true,
          isDisconnected: false,
          disableAllButtons: false,
          disableFaqRestart: false,
          shouldShowInterruptButton: false,
          chatMode: "conversation" as const,
          faqOpen: false,
          buttonPosition: "bottom" as const
        },
        global: {
          plugins: [createTestI18n()],
          stubs: {
            LanguageSelector: LanguageSelectorStub
          }
        }
      });

      expect(wrapper.find(".conversation-bar-btn.recording").exists()).toBe(true);
      expect(wrapper.find(".conversation-bar-btn.recording .soundwave-lottie").exists()).toBe(true);
      expect(wrapper.find(".conversation-bar-btn.recording").text()).toContain("停止錄音");
    });

    it("renders interrupt bar state with CancelIcon and localized label", async () => {
      const wrapper = mount(ChatActionControls, {
        props: {
          isRecording: false,
          isConsulting: true,
          isDisconnected: false,
          disableAllButtons: false,
          disableFaqRestart: false,
          shouldShowInterruptButton: true,
          chatMode: "conversation" as const,
          faqOpen: false,
          buttonPosition: "bottom" as const
        },
        global: {
          plugins: [createTestI18n()],
          stubs: {
            LanguageSelector: LanguageSelectorStub
          }
        }
      });

      expect(wrapper.find(".conversation-bar-btn.interrupt").exists()).toBe(true);
      expect(wrapper.find(".conversation-bar-btn.interrupt").text()).toContain("中斷");
    });

    it("emits recordingClick when idle bar clicked", async () => {
      const wrapper = mount(ChatActionControls, {
        props: {
          isRecording: false,
          isConsulting: true,
          isDisconnected: false,
          disableAllButtons: false,
          disableFaqRestart: false,
          shouldShowInterruptButton: false,
          chatMode: "conversation" as const,
          faqOpen: false,
          buttonPosition: "bottom" as const
        },
        global: {
          plugins: [createTestI18n()],
          stubs: {
            LanguageSelector: LanguageSelectorStub
          }
        }
      });

      await wrapper.find(".conversation-bar-btn.idle").trigger("click");
      expect(wrapper.emitted("recordingClick")).toHaveLength(1);
    });

    it("emits interrupt when interrupt bar clicked", async () => {
      const wrapper = mount(ChatActionControls, {
        props: {
          isRecording: false,
          isConsulting: true,
          isDisconnected: false,
          disableAllButtons: false,
          disableFaqRestart: false,
          shouldShowInterruptButton: true,
          chatMode: "conversation" as const,
          faqOpen: false,
          buttonPosition: "bottom" as const
        },
        global: {
          plugins: [createTestI18n()],
          stubs: {
            LanguageSelector: LanguageSelectorStub
          }
        }
      });

      await wrapper.find(".conversation-bar-btn.interrupt").trigger("click");
      expect(wrapper.emitted("interrupt")).toHaveLength(1);
    });

    it("renders restart and FAQ row buttons", async () => {
      const wrapper = mount(ChatActionControls, {
        props: {
          isRecording: false,
          isConsulting: true,
          isDisconnected: false,
          disableAllButtons: false,
          disableFaqRestart: false,
          shouldShowInterruptButton: false,
          chatMode: "conversation" as const,
          faqOpen: false,
          buttonPosition: "bottom" as const
        },
        global: {
          plugins: [createTestI18n()],
          stubs: {
            LanguageSelector: LanguageSelectorStub
          }
        }
      });

      expect(wrapper.find(".bottom-action-row").exists()).toBe(true);
    });

    it("shows restart/FAQ row even when faqOpen is true (bottom layout, no visual overlap with FAQ panel)", async () => {
      const wrapper = mount(ChatActionControls, {
        props: {
          isRecording: false,
          isConsulting: true,
          isDisconnected: false,
          disableAllButtons: false,
          disableFaqRestart: false,
          shouldShowInterruptButton: false,
          chatMode: "conversation" as const,
          faqOpen: true,
          buttonPosition: "bottom" as const
        },
        global: {
          plugins: [createTestI18n()],
          stubs: {
            LanguageSelector: LanguageSelectorStub
          }
        }
      });

      expect(wrapper.find(".bottom-action-row").exists()).toBe(true);
    });

    it("hides action-buttons-container when faqOpen is true (top layout, prevents overlap with FAQ panel)", async () => {
      const wrapper = mount(ChatActionControls, {
        props: {
          isRecording: false,
          isConsulting: true,
          isDisconnected: false,
          disableAllButtons: false,
          disableFaqRestart: false,
          shouldShowInterruptButton: false,
          chatMode: "conversation" as const,
          faqOpen: true,
          buttonPosition: "top" as const
        },
        global: {
          plugins: [createTestI18n()],
          stubs: {
            ConsultButton: ConsultButtonStub,
            LanguageSelector: LanguageSelectorStub
          }
        }
      });

      expect(wrapper.find(".action-buttons-container").exists()).toBe(false);
    });

    it("marks row buttons as blocked when disableFaqRestart is true", async () => {
      const wrapper = mount(ChatActionControls, {
        props: {
          isRecording: false,
          isConsulting: true,
          isDisconnected: false,
          disableAllButtons: false,
          disableFaqRestart: true,
          shouldShowInterruptButton: false,
          chatMode: "conversation" as const,
          faqOpen: false,
          buttonPosition: "bottom" as const
        },
        global: {
          plugins: [createTestI18n()],
          stubs: {
            LanguageSelector: LanguageSelectorStub
          }
        }
      });

      expect(wrapper.find(".row-btn.restart").attributes("disabled")).toBeDefined();
      expect(wrapper.find(".row-btn.faq").attributes("disabled")).toBeDefined();
      expect(wrapper.find(".row-btn.restart").classes()).toContain("row-btn--disabled");
      expect(wrapper.find(".row-btn.faq").classes()).toContain("row-btn--disabled");
    });

    it("emits restart when restart button clicked", async () => {
      const wrapper = mount(ChatActionControls, {
        props: {
          isRecording: false,
          isConsulting: true,
          isDisconnected: false,
          disableAllButtons: false,
          disableFaqRestart: false,
          shouldShowInterruptButton: false,
          chatMode: "conversation" as const,
          faqOpen: false,
          buttonPosition: "bottom" as const
        },
        global: {
          plugins: [createTestI18n()],
          stubs: {
            LanguageSelector: LanguageSelectorStub
          }
        }
      });

      const row = wrapper.findComponent({ name: "BottomActionRow" });
      await row.find(".row-btn.restart").trigger("click");
      expect(wrapper.emitted("restart")).toHaveLength(1);
    });

    it("emits faqClick when FAQ button clicked", async () => {
      const wrapper = mount(ChatActionControls, {
        props: {
          isRecording: false,
          isConsulting: true,
          isDisconnected: false,
          disableAllButtons: false,
          disableFaqRestart: false,
          shouldShowInterruptButton: false,
          chatMode: "conversation" as const,
          faqOpen: false,
          buttonPosition: "bottom" as const
        },
        global: {
          plugins: [createTestI18n()],
          stubs: {
            LanguageSelector: LanguageSelectorStub
          }
        }
      });

      const row = wrapper.findComponent({ name: "BottomActionRow" });
      await row.find(".row-btn.faq").trigger("click");
      expect(wrapper.emitted("faqClick")).toHaveLength(1);
    });
  });
});

describe("ChatFooterOverlay", () => {
  it("relays close event from EndDialog", async () => {
    const wrapper = mount(ChatFooterOverlay, {
      props: {
        disableAllButtons: false,
        showEndDialogBox: true
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          EndDialog: EndDialogStub
        }
      }
    });

    await wrapper.find(".close-stub").trigger("click");
    expect(wrapper.emitted("closeEndDialog")).toHaveLength(1);
  });
});

describe("ChatMediaLayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMutedMock.mockReset();
  });

  it("renders first frame and binds local video refs", async () => {
    const localVideo = {
      videoRefA: shallowRef<HTMLVideoElement | null>(null),
      videoRefB: shallowRef<HTMLVideoElement | null>(null),
      activeBuffer: shallowRef<"A" | "B">("A")
    };

    const wrapper = mount(ChatMediaLayer, {
      props: {
        sessionId: "session-1",
        streamActive: false,
        showStreamVideo: false,
        localVideo
      },
      global: {
        stubs: {
          VideoStream: VideoStreamStub
        }
      }
    });

    if (VIRTUAL_PERSON_FIRST_FRAME_IMAGE) {
      expect(wrapper.get(".chat-first-frame").attributes("src")).toBe(
        VIRTUAL_PERSON_FIRST_FRAME_IMAGE
      );
    } else {
      expect(wrapper.find(".chat-first-frame").exists()).toBe(false);
    }
    expect(wrapper.find(".active-state").text()).toBe("false");
    expect(localVideo.videoRefA.value).toBeInstanceOf(HTMLVideoElement);

    (wrapper.vm as unknown as { setMuted: (muted: boolean) => void }).setMuted(false);
    expect(setMutedMock).toHaveBeenCalledWith(false);
  });

  it("switches buffers with hidden classes instead of fade wrappers", async () => {
    const localVideo = {
      videoRefA: shallowRef<HTMLVideoElement | null>(null),
      videoRefB: shallowRef<HTMLVideoElement | null>(null),
      activeBuffer: shallowRef<"A" | "B">("A")
    };

    const wrapper = mount(ChatMediaLayer, {
      props: {
        sessionId: "session-1",
        streamActive: false,
        showStreamVideo: false,
        localVideo
      },
      global: {
        stubs: {
          VideoStream: VideoStreamStub
        }
      }
    });

    expect(wrapper.html()).not.toContain("local-fade");
    expect(wrapper.html()).not.toContain("stream-fade");
    expect(wrapper.findAll("video")[0].classes()).not.toContain("buffer-hidden");
    expect(wrapper.findAll("video")[1].classes()).toContain("buffer-hidden");

    localVideo.activeBuffer.value = "B";
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll("video")[0].classes()).toContain("buffer-hidden");
    expect(wrapper.findAll("video")[1].classes()).not.toContain("buffer-hidden");
  });
});

describe("ChatReadyOverlay", () => {
  it("renders opening message, action buttons, QR section, and disclaimer", () => {
    const wrapper = mount(ChatReadyOverlay, {
      props: {
        openingMessage: "歡迎來到元復醫院",
        isDisconnected: false,
        disableAllButtons: false,
        disableFaqRestart: false,
        faqOpen: false,
        buttonPosition: "top" as const
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          LanguageSelector: LanguageSelectorStub
        }
      }
    });

    expect(wrapper.find(".ready-message .dialog-bubble").text()).toBe("歡迎來到元復醫院");
    expect(wrapper.text()).toContain("常見問題");
    expect(wrapper.text()).toContain("開始對話");
    expect(wrapper.text()).toContain("重啟");
    expect(wrapper.text()).toContain("官方帳號");
    expect(wrapper.find(".ready-qr-image").exists()).toBe(true);
    expect(wrapper.text()).toContain("本虛擬人僅提供資訊協助");
  });

  it("emits startChat, restart, faq events from action buttons", async () => {
    const wrapper = mount(ChatReadyOverlay, {
      props: {
        openingMessage: "歡迎",
        isDisconnected: false,
        disableAllButtons: false,
        disableFaqRestart: false,
        faqOpen: false,
        buttonPosition: "top" as const
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          LanguageSelector: LanguageSelectorStub
        }
      }
    });

    await wrapper.find(".faq-btn").trigger("click");
    await wrapper.find(".restart-btn").trigger("click");
    await wrapper.find(".start-btn").trigger("click");
    await wrapper.find(".button-position-hotspot").trigger("click");
    await wrapper.find(".logo-wrapper").trigger("click");

    expect(wrapper.emitted("faq")).toHaveLength(1);
    expect(wrapper.emitted("restart")).toHaveLength(1);
    expect(wrapper.emitted("startChat")).toHaveLength(1);
    expect(wrapper.emitted("buttonPositionClick")).toHaveLength(1);
    expect(wrapper.emitted("reload")).toHaveLength(1);
  });

  it("renders buttons in Figma order: FAQ → Start → Restart", () => {
    const wrapper = mount(ChatReadyOverlay, {
      props: {
        openingMessage: "歡迎",
        isDisconnected: false,
        disableAllButtons: false,
        disableFaqRestart: false,
        faqOpen: false,
        buttonPosition: "top" as const
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          LanguageSelector: LanguageSelectorStub
        }
      }
    });

    expect(wrapper.find(".faq-btn").exists()).toBe(true);
    expect(wrapper.find(".start-btn").exists()).toBe(true);
    expect(wrapper.find(".restart-btn").exists()).toBe(true);
  });

  it("hides opening message when empty", () => {
    const wrapper = mount(ChatReadyOverlay, {
      props: {
        openingMessage: "",
        isDisconnected: false,
        disableAllButtons: false,
        disableFaqRestart: false,
        faqOpen: false,
        buttonPosition: "bottom" as const
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          LanguageSelector: LanguageSelectorStub
        }
      }
    });

    expect(wrapper.find(".ready-message").exists()).toBe(false);
  });

  it("stores the scaled ready-state geometry in the component styles", () => {
    expect(chatReadyOverlaySource).toContain("width: 365px;");
    expect(chatReadyOverlaySource).toContain("READY_TOP_MESSAGE");
    expect(chatReadyOverlaySource).toContain("READY_BOTTOM_MESSAGE");
    expect(chatReadyOverlaySource).toContain("READY_BOTTOM_CONTAINER");
    expect(chatReadyOverlaySource).toContain("READY_BOTTOM_START_BAR.left");
    expect(chatReadyOverlaySource).toContain("TOP_FOOTER_QR.imageSize");
    expect(chatReadyOverlaySource).toContain("READY_BOTTOM_QR.imageSize");

    // Button positions/sizes now come from shared button layout constants
    expect(chatReadyOverlaySource).toContain("ACTION_BUTTON_LAYOUTS");
    expect(ACTION_BUTTONS.faq.left).toBe(1265);
    expect(ACTION_BUTTONS.faq.size).toBe(120);
    expect(ACTION_BUTTONS.main.left).toBe(1081);
    expect(ACTION_BUTTONS.main.size).toBe(200);
    expect(ACTION_BUTTONS.restart.left).toBe(1270);
    expect(ACTION_BUTTONS.restart.size).toBe(120);

    // Icon size for FAQ and restart buttons comes from shared constant
    expect(ACTION_ICON_SIZE).toBe(50);
    expect(chatReadyOverlaySource).toContain("ACTION_ICON_SIZE");
  });

  it("anchors ready-bottom and conversation-bottom bubbles to the same shared bottom edge", () => {
    expect(BOTTOM_DIALOG_BUBBLE_GAP).toBe(24);
    expect(BOTTOM_DIALOG_BUBBLE_BOTTOM_Y).toBe(BOTTOM_CONTAINER_TOP - BOTTOM_DIALOG_BUBBLE_GAP);

    // Ready-mode bubble bottom edge derived from the shared anchor
    expect(READY_BOTTOM_MESSAGE.bottom).toBe(CANVAS_HEIGHT - BOTTOM_DIALOG_BUBBLE_BOTTOM_Y);

    // Conversation viewport bottom edge equals the shared anchor (no jump on transition)
    expect(
      CONVERSATION_BOTTOM_DIALOG_VIEWPORT.top + CONVERSATION_BOTTOM_DIALOG_VIEWPORT.height
    ).toBe(BOTTOM_DIALOG_BUBBLE_BOTTOM_Y);

    // Left alignment unified between ready and conversation bottom layouts
    expect(READY_BOTTOM_MESSAGE.left).toBe(CONVERSATION_BOTTOM_DIALOG_VIEWPORT.left);

    // Component now uses bottom anchor (not top) for ready-bottom bubble
    expect(chatReadyOverlaySource).toContain("READY_BOTTOM_MESSAGE.bottom");
  });

  it("centers wheelchair bottom controls inside their translucent containers", () => {
    const stackedTopPadding = BOTTOM_PRIMARY_BAR_TOP - BOTTOM_CONTAINER_TOP;
    const stackedBottomPadding =
      BOTTOM_CONTAINER_TOP + BOTTOM_CONTAINER_HEIGHT - (BOTTOM_ROW_TOP + BOTTOM_BTN_HEIGHT);
    const standbyContainerCenter =
      STANDBY_BOTTOM_CONTAINER.top + STANDBY_BOTTOM_CONTAINER.height / 2;
    const standbyBarCenter = STANDBY_BOTTOM_BAR.top + STANDBY_BOTTOM_BAR.height / 2;

    expect(BOTTOM_ROW_TOP - (BOTTOM_PRIMARY_BAR_TOP + BOTTOM_BTN_HEIGHT)).toBe(
      BOTTOM_STACKED_CONTROLS_GAP
    );
    expect(Math.abs(stackedTopPadding - stackedBottomPadding)).toBeLessThanOrEqual(1);

    expect(STANDBY_BOTTOM_CONTAINER.top).toBe(BOTTOM_CONTAINER_TOP);
    expect(STANDBY_BOTTOM_CONTAINER.height).toBe(BOTTOM_CONTAINER_HEIGHT);
    expect(Math.abs(standbyContainerCenter - standbyBarCenter)).toBeLessThanOrEqual(0.5);

    expect(READY_BOTTOM_CONTAINER.top).toBe(BOTTOM_CONTAINER_TOP);
    expect(READY_BOTTOM_CONTAINER.height).toBe(BOTTOM_CONTAINER_HEIGHT);
    expect(READY_BOTTOM_START_BAR.top).toBe(BOTTOM_PRIMARY_BAR_TOP);

    expect(CONVERSATION_BOTTOM_CONTAINER.top).toBe(BOTTOM_CONTAINER_TOP);
    expect(CONVERSATION_BOTTOM_CONTAINER.height).toBe(BOTTOM_CONTAINER_HEIGHT);
    expect(CONVERSATION_BOTTOM_BAR.top).toBe(BOTTOM_PRIMARY_BAR_TOP);
  });

  it("uses top-side positions in ready mode when buttonPosition is top", () => {
    const wrapper = mount(ChatReadyOverlay, {
      props: {
        openingMessage: "歡迎",
        isDisconnected: false,
        disableAllButtons: false,
        disableFaqRestart: false,
        faqOpen: false,
        buttonPosition: "top" as const
      },
      global: {
        plugins: [createTestI18n()],
        stubs: {
          LanguageSelector: LanguageSelectorStub
        }
      }
    });

    expect(wrapper.find(".faq-btn").attributes("style")).toContain(
      `left: ${ACTION_BUTTON_LAYOUTS.top.faq.left}px;`
    );
    expect(wrapper.find(".start-btn").attributes("style")).toContain(
      `left: ${ACTION_BUTTON_LAYOUTS.top.main.left}px;`
    );
    expect(wrapper.find(".restart-btn").attributes("style")).toContain(
      `left: ${ACTION_BUTTON_LAYOUTS.top.restart.left}px;`
    );
  });
});

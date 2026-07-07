import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import { createI18n } from "vue-i18n";

import consultButtonSource from "./ConsultButton.vue?raw";
import ConsultButton from "./ConsultButton.vue";

const i18n = createI18n({
  legacy: false,
  locale: "zh",
  messages: {
    zh: {
      button: {
        "start-chat": "開始對話",
        loading: "處理中...",
        "preparing-recording": "準備中...",
        "stop-recording": "停止錄音",
        interrupt: "中斷"
      }
    }
  }
});

function mountButton(props: Record<string, any> = {}) {
  return mount(ConsultButton, {
    props: { isRecording: false, isConsulting: false, ...props },
    global: { plugins: [i18n] }
  });
}

describe("ConsultButton", () => {
  it("shows start chat button when not consulting", () => {
    const wrapper = mountButton();
    expect(wrapper.text()).toContain("開始對話");
  });

  it("emits consultClick when start button clicked", async () => {
    const wrapper = mountButton();
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("consultClick")).toHaveLength(1);
  });

  it("does not emit consultClick from pointerdown before the click", async () => {
    const wrapper = mountButton();
    const button = wrapper.find("button");

    await button.trigger("pointerdown");

    expect(wrapper.emitted("consultClick")).toBeUndefined();
  });

  it("emits consultClick once on pointer release and ignores the follow-up click", async () => {
    const wrapper = mountButton();
    const button = wrapper.find("button");

    await button.trigger("pointerdown", { pointerId: 1 });
    await button.trigger("pointerup", { pointerId: 1 });
    await button.trigger("click");

    expect(wrapper.emitted("consultClick")).toHaveLength(1);
  });

  it("shows loading state and blocks start while pending", async () => {
    const wrapper = mountButton({ isPending: true });

    expect(wrapper.text()).toContain("處理中...");
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();

    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("consultClick")).toBeUndefined();

    await wrapper.find("button").trigger("pointerdown", { pointerId: 1 });
    await wrapper.find("button").trigger("pointerup", { pointerId: 1 });
    expect(wrapper.emitted("consultClick")).toBeUndefined();
  });

  it("disables button and blocks click when disabled prop is true", async () => {
    const wrapper = mountButton({ disabled: true });
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();

    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("consultClick")).toBeUndefined();
  });

  it("shows recording button when consulting and recording", () => {
    const wrapper = mountButton({ isConsulting: true, isRecording: true });
    expect(wrapper.find(".recording").exists()).toBe(true);
    expect(wrapper.find(".recording-dot").exists()).toBe(true);
    expect(wrapper.text()).toContain("停止錄音");
  });

  it("emits recordingClick when recording button clicked", async () => {
    const wrapper = mountButton({ isConsulting: true, isRecording: true });
    await wrapper.find(".recording").trigger("click");
    expect(wrapper.emitted("recordingClick")).toHaveLength(1);
  });

  it("shows interrupt button when consulting with showInterrupt", () => {
    const wrapper = mountButton({ isConsulting: true, showInterrupt: true });
    expect(wrapper.text()).toContain("中斷");
  });

  it("emits interrupt when interrupt button clicked", async () => {
    const wrapper = mountButton({ isConsulting: true, showInterrupt: true });
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("interrupt")).toHaveLength(1);
  });

  it("emits recordingClick when consulting without showInterrupt", async () => {
    const wrapper = mountButton({ isConsulting: true, showInterrupt: false });
    expect(wrapper.text()).toContain("開始對話");
    expect(wrapper.find(".record-ready-ring").exists()).toBe(false);
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("recordingClick")).toHaveLength(1);
  });

  it("shows preparing state and blocks recording click while audio capture is starting", async () => {
    const wrapper = mountButton({
      isConsulting: true,
      showInterrupt: false,
      isPreparingRecording: true
    });

    expect(wrapper.text()).toContain("準備中...");
    expect(wrapper.find(".record-ready-ring").exists()).toBe(false);
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();

    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("recordingClick")).toBeUndefined();
  });

  it("supports wrapped English labels for long button states", () => {
    const wrapper = mount(ConsultButton, {
      props: { isRecording: true, isConsulting: true },
      global: {
        plugins: [
          createI18n({
            legacy: false,
            locale: "en",
            messages: {
              en: {
                button: {
                  "start-chat": "start",
                  loading: "Processing",
                  "preparing-recording": "Preparing",
                  "stop-recording": "Stop Recording",
                  interrupt: "Interrupt"
                }
              }
            }
          })
        ]
      }
    });

    expect(wrapper.text()).toContain("Stop Recording");
    expect(consultButtonSource).toContain("max-width: 132px;");
    expect(consultButtonSource).toContain("white-space: normal;");
    expect(consultButtonSource).toContain("text-align: center;");
  });
});

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";

import en from "../i18n/locales/en";
import zh from "../i18n/locales/zh";

import ConnectionWarning from "./ConnectionWarning.vue";

function createTestI18n(locale = "zh") {
  return createI18n({
    legacy: false,
    locale,
    messages: { zh, en }
  });
}

describe("ConnectionWarning", () => {
  it("renders warning when show is true", () => {
    const wrapper = mount(ConnectionWarning, {
      props: { show: true },
      global: { plugins: [createTestI18n()] }
    });

    expect(wrapper.find(".connection-warning").exists()).toBe(true);
    expect(wrapper.text()).toContain("目前無法連線");
  });

  it("does not render when show is false", () => {
    const wrapper = mount(ConnectionWarning, {
      props: { show: false },
      global: { plugins: [createTestI18n()] }
    });

    expect(wrapper.find(".connection-warning").exists()).toBe(false);
  });

  it("renders English text when locale is en", () => {
    const wrapper = mount(ConnectionWarning, {
      props: { show: true },
      global: { plugins: [createTestI18n("en")] }
    });

    expect(wrapper.text()).toContain("Connection lost");
  });

  it("has role=alert for accessibility", () => {
    const wrapper = mount(ConnectionWarning, {
      props: { show: true },
      global: { plugins: [createTestI18n()] }
    });

    expect(wrapper.find("[role='alert']").exists()).toBe(true);
  });
});

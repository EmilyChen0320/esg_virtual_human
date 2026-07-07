import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";

import LanguageSelector from "./LanguageSelector.vue";

function createTestI18n(locale = "zh") {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      zh: {},
      en: {}
    }
  });
}

describe("LanguageSelector", () => {
  it("shows the opposite locale and emits the next language", async () => {
    const wrapper = mount(LanguageSelector, {
      global: {
        plugins: [createTestI18n("zh")]
      }
    });

    expect(wrapper.get(".lang-toggle").text()).toBe("英文");

    await wrapper.get(".lang-toggle").trigger("click");

    expect(wrapper.emitted("languageChange")).toEqual([["en"]]);
  });

  it("does not emit from pointerdown before the click", async () => {
    const wrapper = mount(LanguageSelector, {
      global: {
        plugins: [createTestI18n("zh")]
      }
    });

    const button = wrapper.get(".lang-toggle");
    await button.trigger("pointerdown");

    expect(wrapper.emitted("languageChange")).toBeUndefined();
  });

  it("emits once on pointer release and ignores the follow-up click", async () => {
    const wrapper = mount(LanguageSelector, {
      global: {
        plugins: [createTestI18n("zh")]
      }
    });

    const button = wrapper.get(".lang-toggle");
    await button.trigger("pointerdown", { pointerId: 1 });
    await button.trigger("pointerup", { pointerId: 1 });
    await button.trigger("click");

    expect(wrapper.emitted("languageChange")).toEqual([["en"]]);
  });

  it("shows the fallback locale label and respects the disabled state", () => {
    const wrapper = mount(LanguageSelector, {
      props: {
        disabled: true
      },
      global: {
        plugins: [createTestI18n("en")]
      }
    });

    expect(wrapper.get(".lang-toggle").text()).toBe("中文");
    expect(wrapper.get(".lang-toggle").attributes("disabled")).toBeDefined();
  });
});

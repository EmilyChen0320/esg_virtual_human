import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, nextTick, shallowRef } from "vue";

import { usePageLanguage } from "./usePageLanguage";

const TestHarness = defineComponent({
  template: `<div class="locale-value">{{ locale }}</div>`,
  setup() {
    const locale = shallowRef("zh");
    const { applyLocale } = usePageLanguage(locale);

    return {
      locale,
      applyLocale
    };
  }
});

describe("usePageLanguage", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    document.documentElement.lang = "";
  });

  it("syncs locale from the lang query on mount", async () => {
    window.history.replaceState({}, "", "/?lang=en");

    const wrapper = mount(TestHarness);
    await nextTick();

    expect(wrapper.text()).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("updates both the i18n locale and document lang when applying a locale", async () => {
    const wrapper = mount(TestHarness);

    wrapper.vm.applyLocale("en");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });
});

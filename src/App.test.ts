import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import App from "./App.vue";

describe("App", () => {
  it("renders routed content without the removed browser warning overlay", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterView: {
            template: '<div class="route-shell">mock route content</div>'
          }
        }
      }
    });

    expect(wrapper.find(".route-shell").text()).toBe("mock route content");
    expect(wrapper.text()).not.toContain("Chromium");
    expect(wrapper.text()).not.toContain("Chrome");
    expect(wrapper.find("button").exists()).toBe(false);
  });
});

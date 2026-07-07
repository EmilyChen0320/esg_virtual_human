import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import EndDialog from "./EndDialog.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        ({
          "end-dialog.body": "請至櫃檯提供叫號碼",
          "end-dialog.suffix": "並完成報到",
          "button.end-dialog": "關閉"
        }) as Record<string, string>
      )[key] ?? key
  })
}));

describe("EndDialog", () => {
  it("does not render when show is false", () => {
    const wrapper = mount(EndDialog, {
      props: {
        show: false,
        code: "A001"
      }
    });

    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("renders message and code when show is true", () => {
    const wrapper = mount(EndDialog, {
      props: {
        show: true,
        code: "A001"
      }
    });

    expect(wrapper.text()).toContain("請至櫃檯提供叫號碼");
    expect(wrapper.text()).toContain("A001");
    expect(wrapper.text()).toContain("並完成報到");
  });

  it("emits close when close button is clicked", async () => {
    const wrapper = mount(EndDialog, {
      props: {
        show: true,
        code: "A001"
      }
    });

    await wrapper.find("button").trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("respects disabled state", () => {
    const wrapper = mount(EndDialog, {
      props: {
        show: true,
        code: "A001",
        disabled: true
      }
    });

    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });
});

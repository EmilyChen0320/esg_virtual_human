import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "vue-i18n";

const pushMock = vi.fn();
const useNightServiceRedirectMock = vi.hoisted(() => vi.fn());

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

vi.mock("../composables/useNightServiceRedirect", () => ({
  useNightServiceRedirect: useNightServiceRedirectMock
}));

import Home from "./Home.vue";

function createTestI18n(locale = "zh") {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      zh: {
        confirm: {
          "language-change-title": "確定要切換語言嗎？",
          "restart-lang": "切換語言將重新開始，是否確認？",
          "restart-yes": "是",
          "restart-no": "否"
        },
        login: {
          title: "請輸入密碼",
          instruction: "請輸入 6 位數密碼以繼續",
          placeholder: "------",
          error: "密碼錯誤，請重新輸入",
          submit: "確認"
        }
      },
      en: {
        login: {
          title: "Enter Password",
          instruction: "Please enter your 6-digit password to continue",
          placeholder: "------",
          error: "Incorrect password, please try again",
          submit: "Confirm"
        }
      }
    }
  });
}

describe("Home", () => {
  beforeEach(() => {
    pushMock.mockReset();
    useNightServiceRedirectMock.mockReset();
    vi.restoreAllMocks();
    localStorage.clear();
    window.history.replaceState({}, "", "/?lang=zh");
    document.documentElement.lang = "";
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders login form with title, input, and submit button", () => {
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    expect(wrapper.find(".login-title").text()).toBe("請輸入密碼");
    expect(wrapper.find(".login-input").exists()).toBe(true);
    expect(wrapper.find(".login-submit").exists()).toBe(true);
  });

  it("starts the night service redirect scheduler", () => {
    mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    expect(useNightServiceRedirectMock).toHaveBeenCalledOnce();
  });

  it("disables submit button when input is less than 6 digits", () => {
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    const button = wrapper.find(".login-submit");
    expect(button.attributes("disabled")).toBeDefined();
  });

  it("enables submit button when 6 digits are entered", async () => {
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    const input = wrapper.find(".login-input");
    await input.setValue("111111");

    const button = wrapper.find(".login-submit");
    expect(button.attributes("disabled")).toBeUndefined();
  });

  it("filters non-digit characters from input", async () => {
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    const input = wrapper.find(".login-input");
    await input.setValue("1a2b3c4");

    expect((input.element as HTMLInputElement).value).toBe("1234");
  });

  it("limits input to 6 digits", async () => {
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    const input = wrapper.find(".login-input");
    await input.setValue("12345678");

    expect((input.element as HTMLInputElement).value).toBe("123456");
  });

  it("navigates to Chat and saves session on correct password", async () => {
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    const input = wrapper.find(".login-input");
    await input.setValue("111111");
    await wrapper.find("form").trigger("submit");

    const session = JSON.parse(localStorage.getItem("auth_session")!);
    expect(session.expiresAt).toBeGreaterThan(Date.now());
    expect(pushMock).toHaveBeenCalledWith({ name: "Chat", query: { lang: "zh" } });
  });

  it("preserves the active lang query when submitting the correct password", async () => {
    window.history.replaceState({}, "", "/?lang=en");
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n("en")] }
    });

    const input = wrapper.find(".login-input");
    await input.setValue("111111");
    await wrapper.find("form").trigger("submit");

    expect(pushMock).toHaveBeenCalledWith({ name: "Chat", query: { lang: "en" } });
  });

  it("shows error message and does not navigate on wrong password", async () => {
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    const input = wrapper.find(".login-input");
    await input.setValue("000000");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.find(".login-error").exists()).toBe(true);
    expect(wrapper.find(".login-error").text()).toBe("密碼錯誤，請重新輸入");
    expect(localStorage.getItem("auth_session")).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("clears error when user types again after failed attempt", async () => {
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    const input = wrapper.find(".login-input");
    await input.setValue("000000");
    await wrapper.find("form").trigger("submit");
    expect(wrapper.find(".login-error").exists()).toBe(true);

    await input.setValue("1");
    expect(wrapper.find(".login-error").exists()).toBe(false);
  });

  it("updates locale and URL query after confirming the language change dialog", async () => {
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    await wrapper.find(".lang-toggle").trigger("click");
    expect(wrapper.find(".restart-overlay").exists()).toBe(true);

    await wrapper.find(".restart-btn--confirm").trigger("click");

    expect(document.documentElement.lang).toBe("en");
    expect(window.location.search).toContain("lang=en");
  });

  it("keeps the current locale when the language change dialog is canceled", async () => {
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    await wrapper.find(".lang-toggle").trigger("click");
    await wrapper.find(".restart-btn--cancel").trigger("click");

    expect(document.documentElement.lang).toBe("zh");
    expect(window.location.search).toContain("lang=zh");
  });

  it("adds error class to input on wrong password", async () => {
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    const input = wrapper.find(".login-input");
    await input.setValue("000000");
    await wrapper.find("form").trigger("submit");

    expect(input.classes()).toContain("login-input-error");
  });

  it("redirects to Chat when valid session already exists", async () => {
    const ttl = 24 * 60 * 60 * 1000;
    localStorage.setItem("auth_session", JSON.stringify({ expiresAt: Date.now() + ttl }));
    window.history.replaceState({}, "", "/?lang=zh");

    mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    expect(pushMock).toHaveBeenCalledWith({ name: "Chat", query: { lang: "zh" } });
  });

  it("preserves lang query when redirecting to Chat with a valid session", () => {
    const ttl = 24 * 60 * 60 * 1000;
    localStorage.setItem("auth_session", JSON.stringify({ expiresAt: Date.now() + ttl }));
    window.history.replaceState({}, "", "/?lang=en");

    mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    expect(pushMock).toHaveBeenCalledWith({ name: "Chat", query: { lang: "en" } });
  });

  it("preserves session query when redirecting to Chat with a valid session", () => {
    const ttl = 24 * 60 * 60 * 1000;
    localStorage.setItem("auth_session", JSON.stringify({ expiresAt: Date.now() + ttl }));
    window.history.replaceState({}, "", "/?session=123");

    mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    expect(pushMock).toHaveBeenCalledWith({ name: "Chat", query: { session: "123" } });
  });

  it("preserves both lang and session queries when redirecting to Chat with a valid session", () => {
    const ttl = 24 * 60 * 60 * 1000;
    localStorage.setItem("auth_session", JSON.stringify({ expiresAt: Date.now() + ttl }));
    window.history.replaceState({}, "", "/?lang=en&session=456");

    mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    expect(pushMock).toHaveBeenCalledWith({ name: "Chat", query: { lang: "en", session: "456" } });
  });

  it("forwards session and lang queries into Chat navigation on submit", async () => {
    window.history.replaceState({}, "", "/?lang=en&session=789");
    const wrapper = mount(Home, {
      global: { plugins: [createTestI18n()] }
    });

    const input = wrapper.find(".login-input");
    await input.setValue("111111");
    await wrapper.find("form").trigger("submit");

    expect(pushMock).toHaveBeenCalledWith({ name: "Chat", query: { lang: "en", session: "789" } });
  });
});

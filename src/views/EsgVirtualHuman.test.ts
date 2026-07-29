import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";

import EsgVirtualHuman from "./EsgVirtualHuman.vue";

const mocks = vi.hoisted(() => ({
  getTopics: vi.fn(),
  startChat: vi.fn(),
  sendMessage: vi.fn(),
  matesxInitialize: vi.fn(),
  matesxStop: vi.fn(),
  matesxDispose: vi.fn()
}));

vi.mock("../api/esgApi", () => ({
  esgApi: {
    getTopics: mocks.getTopics,
    startChat: mocks.startChat,
    sendMessage: mocks.sendMessage
  }
}));

vi.mock("../services/matesxPlayer", () => ({
  MatesxPlayer: {
    fromEnv: vi.fn(() => ({
      initialize: mocks.matesxInitialize,
      playWavStream: vi.fn(),
      stop: mocks.matesxStop,
      dispose: mocks.matesxDispose
    }))
  }
}));

async function mountEsgVirtualHuman() {
  const wrapper = mount(EsgVirtualHuman, {
    attachTo: document.body,
    global: {
      plugins: [i18n]
    }
  });

  await flushPromises();
  await flushPromises();
  return wrapper;
}

function pointerOptions(options: { clientX: number; clientY: number }) {
  return {
    button: 0,
    clientX: options.clientX,
    clientY: options.clientY,
    isPrimary: true,
    pointerId: 1
  };
}

describe("EsgVirtualHuman touch activation", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    i18n.global.locale.value = "zh";
    mocks.matesxInitialize.mockResolvedValue(undefined);
    mocks.getTopics.mockResolvedValue({ categories: [] });
    mocks.startChat.mockResolvedValue({
      ok: true,
      session_id: "session-1",
      message: "",
      opening_message: null
    });
  });

  it("activates buttons on pointerup and suppresses the following synthetic click", async () => {
    const wrapper = await mountEsgVirtualHuman();
    const quickButton = wrapper.find('button[aria-label="快速問題"]');

    await quickButton.trigger("pointerdown", pointerOptions({ clientX: 10, clientY: 10 }));
    await quickButton.trigger("pointerup", pointerOptions({ clientX: 10, clientY: 10 }));

    expect(wrapper.find(".question-panel").exists()).toBe(true);

    await quickButton.trigger("click");

    expect(wrapper.find(".question-panel").exists()).toBe(true);
  });

  it("does not activate a press that moves like a scroll gesture", async () => {
    const wrapper = await mountEsgVirtualHuman();
    const quickButton = wrapper.find('button[aria-label="快速問題"]');

    await quickButton.trigger("pointerdown", pointerOptions({ clientX: 10, clientY: 10 }));
    await quickButton.trigger("pointerup", pointerOptions({ clientX: 10, clientY: 40 }));

    expect(wrapper.find(".question-panel").exists()).toBe(false);
  });
});

import { mount } from "@vue/test-utils";
import { beforeEach, describe, it, expect, vi } from "vitest";

import { DIALOG_DISMISS_GUARD_MS, FAQ_BUTTON_FONT_SIZE } from "../../constants/ui";
import type { FaqCategory, FaqQuestionSelection, FaqTopic } from "../../types/chat";

import FaqPanel from "./FaqPanel.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        "faq.back": "返回",
        "faq.loading": "載入中...",
        "faq.questions-suffix": "常見問題"
      })[key] ?? key
  })
}));

function makeTopic(overrides: Partial<FaqTopic> = {}): FaqTopic {
  return {
    id: "ortho-rehab/prp",
    label: "PRP",
    order: 0,
    questions: ["PRP 有哪些生長因子？", "PRP 注射後照護注意事項?"],
    ...overrides
  };
}

function makeCategory(): FaqCategory {
  return {
    id: "ortho-rehab",
    label: "骨科＋復健科",
    topics: [
      makeTopic(),
      makeTopic({
        id: "ortho-rehab/gout",
        label: "痛風"
      })
    ]
  };
}

const defaultProps = {
  isOpen: true,
  currentLayer: "categories" as const,
  categories: [makeCategory()],
  selectedTopic: null,
  questions: [],
  isLoading: false,
  error: "",
  getTopicLabel: (t: FaqTopic) => t.label,
  getCategoryLabel: (c: FaqCategory) => c.label,
  buildQuestionSelection: (question: string): FaqQuestionSelection => ({
    question,
    displayText: `骨科＋復健科/PRP/${question}`,
    categoryLabel: "骨科＋復健科",
    topicLabel: "PRP"
  })
};

describe("FaqPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const wrapper = mount(FaqPanel, {
      props: { ...defaultProps, isOpen: false }
    });
    expect(wrapper.find(".faq-panel").exists()).toBe(false);
    expect(wrapper.find(".faq-interaction-mask").exists()).toBe(false);
  });

  it("renders categories layer with topics", () => {
    const wrapper = mount(FaqPanel, { props: defaultProps });
    expect(wrapper.find(".faq-panel").exists()).toBe(true);
    expect(wrapper.find(".faq-category-title").text()).toBe("骨科＋復健科");
    const topicBtns = wrapper.findAll(".faq-topic-btn");
    expect(topicBtns).toHaveLength(2);
    expect(topicBtns[0].text()).toBe("PRP");
    expect(topicBtns[1].text()).toBe("痛風");
  });

  it("renders a full-screen interaction mask while open", () => {
    const wrapper = mount(FaqPanel, { props: defaultProps });
    const mask = wrapper.find(".faq-interaction-mask");

    expect(mask.exists()).toBe(true);
    expect(mask.attributes("aria-hidden")).toBe("true");
  });

  it("emits close when the interaction mask is clicked", async () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000);
    const wrapper = mount(FaqPanel, { props: defaultProps });

    nowSpy.mockReturnValue(1000 + DIALOG_DISMISS_GUARD_MS + 1);
    await wrapper.find(".faq-interaction-mask").trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(wrapper.emitted("back")).toBeUndefined();
    expect(wrapper.emitted("selectTopic")).toBeUndefined();
    expect(wrapper.emitted("selectQuestion")).toBeUndefined();
  });

  it("ignores the opening gesture click on the interaction mask", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const wrapper = mount(FaqPanel, { props: defaultProps });

    await wrapper.find(".faq-interaction-mask").trigger("click");

    expect(wrapper.emitted("close")).toBeUndefined();
  });

  it("emits back when back button is clicked", async () => {
    const wrapper = mount(FaqPanel, { props: defaultProps });
    await wrapper.find(".faq-back-tab").trigger("click");
    expect(wrapper.emitted("back")).toHaveLength(1);
  });

  it("emits selectTopic when a topic button is clicked", async () => {
    const wrapper = mount(FaqPanel, { props: defaultProps });
    const topicBtns = wrapper.findAll(".faq-topic-btn");
    await topicBtns[0].trigger("click");
    expect(wrapper.emitted("selectTopic")).toHaveLength(1);
    expect(wrapper.emitted("selectTopic")![0][0]).toMatchObject({ id: "ortho-rehab/prp" });
  });

  it("renders questions layer", () => {
    const topic = makeTopic();
    const wrapper = mount(FaqPanel, {
      props: {
        ...defaultProps,
        currentLayer: "questions",
        selectedTopic: topic,
        questions: topic.questions
      }
    });
    expect(wrapper.find(".faq-category-title").text()).toContain("PRP");
    const questionBtns = wrapper.findAll(".faq-question-btn");
    expect(questionBtns).toHaveLength(2);
  });

  it("emits selectQuestion when a question is clicked", async () => {
    const topic = makeTopic();
    const wrapper = mount(FaqPanel, {
      props: {
        ...defaultProps,
        currentLayer: "questions",
        selectedTopic: topic,
        questions: topic.questions
      }
    });
    const questionBtns = wrapper.findAll(".faq-question-btn");
    await questionBtns[0].trigger("click");
    expect(wrapper.emitted("selectQuestion")).toHaveLength(1);
    expect(wrapper.emitted("selectQuestion")![0][0]).toEqual({
      question: "PRP 有哪些生長因子？",
      displayText: "骨科＋復健科/PRP/PRP 有哪些生長因子？",
      categoryLabel: "骨科＋復健科",
      topicLabel: "PRP"
    });
  });

  it("marks a clicked question pending and blocks duplicate question sends", async () => {
    const topic = makeTopic();
    const wrapper = mount(FaqPanel, {
      props: {
        ...defaultProps,
        currentLayer: "questions",
        selectedTopic: topic,
        questions: topic.questions
      }
    });
    const question = wrapper.findAll(".faq-question-btn")[0];

    await question.trigger("click");
    await question.trigger("click");

    expect(wrapper.emitted("selectQuestion")).toHaveLength(1);
    expect(wrapper.emitted("selectQuestion")![0][0]).toMatchObject({
      question: "PRP 有哪些生長因子？"
    });
    expect(question.classes()).toContain("faq-question-btn--pending");
    expect(question.attributes("aria-busy")).toBe("true");
  });

  it("selects a question once on pointer release and ignores the follow-up click", async () => {
    const topic = makeTopic();
    const wrapper = mount(FaqPanel, {
      props: {
        ...defaultProps,
        currentLayer: "questions",
        selectedTopic: topic,
        questions: topic.questions
      }
    });
    const question = wrapper.findAll(".faq-question-btn")[0];

    await question.trigger("pointerdown", { pointerId: 1 });
    await question.trigger("pointerup", { pointerId: 1 });
    await question.trigger("click");

    expect(wrapper.emitted("selectQuestion")).toHaveLength(1);
    expect(wrapper.emitted("selectQuestion")![0][0]).toMatchObject({
      question: "PRP 有哪些生長因子？"
    });
  });

  it("shows loading state", () => {
    const wrapper = mount(FaqPanel, {
      props: { ...defaultProps, isLoading: true }
    });
    expect(wrapper.find(".faq-loading").exists()).toBe(true);
  });

  it("shows error state", () => {
    const wrapper = mount(FaqPanel, {
      props: { ...defaultProps, error: "Failed to load" }
    });
    expect(wrapper.find(".faq-error").text()).toBe("Failed to load");
  });

  it("applies categories scroll class for categories layer", () => {
    const wrapper = mount(FaqPanel, { props: defaultProps });
    expect(wrapper.find(".faq-scroll--categories").exists()).toBe(true);
    expect(wrapper.find(".faq-scroll--questions").exists()).toBe(false);
  });

  it("applies questions card and scroll classes for questions layer", () => {
    const topic = makeTopic();
    const wrapper = mount(FaqPanel, {
      props: {
        ...defaultProps,
        currentLayer: "questions",
        selectedTopic: topic,
        questions: topic.questions
      }
    });
    expect(wrapper.find(".faq-card--questions").exists()).toBe(true);
    expect(wrapper.find(".faq-scroll--questions").exists()).toBe(true);
    expect(wrapper.find(".faq-scroll--categories").exists()).toBe(false);
  });

  it("renders scrollbar track and thumb", () => {
    const wrapper = mount(FaqPanel, { props: defaultProps });
    expect(wrapper.find(".faq-scrollbar-track").exists()).toBe(true);
    expect(wrapper.find(".faq-scrollbar-thumb").exists()).toBe(true);
  });

  it("FAQ_BUTTON_FONT_SIZE constant is at least 24px (regression guard)", () => {
    expect(FAQ_BUTTON_FONT_SIZE).toBeGreaterThanOrEqual(24);
  });

  it("fills full track when scroll content does not overflow", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }
    );

    const wrapper = mount(FaqPanel, { props: defaultProps });
    const scrollEl = wrapper.find(".faq-scroll").element as HTMLElement;
    const trackEl = wrapper.find(".faq-scrollbar-track").element as HTMLElement;

    Object.defineProperty(trackEl, "clientHeight", { configurable: true, value: 240 });
    Object.defineProperty(scrollEl, "scrollTop", { configurable: true, value: 0 });
    Object.defineProperty(scrollEl, "scrollHeight", { configurable: true, value: 240 });
    Object.defineProperty(scrollEl, "clientHeight", { configurable: true, value: 240 });

    await wrapper.find(".faq-scroll").trigger("scroll");

    const thumb = wrapper.find(".faq-scrollbar-thumb");
    expect(thumb.attributes("style")).toContain("top: 0px;");
    expect(thumb.attributes("style")).toContain("height: 240px;");
  });

  it("updates thumb with overflow ratio and height transition", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }
    );

    const wrapper = mount(FaqPanel, { props: defaultProps });
    const scrollEl = wrapper.find(".faq-scroll").element as HTMLElement;
    const trackEl = wrapper.find(".faq-scrollbar-track").element as HTMLElement;

    Object.defineProperty(trackEl, "clientHeight", { configurable: true, value: 240 });
    Object.defineProperty(scrollEl, "scrollTop", { configurable: true, value: 30 });
    Object.defineProperty(scrollEl, "scrollHeight", { configurable: true, value: 480 });
    Object.defineProperty(scrollEl, "clientHeight", { configurable: true, value: 120 });

    await wrapper.find(".faq-scroll").trigger("scroll");
    await wrapper.find(".faq-card").trigger("transitionend", { propertyName: "opacity" });
    await wrapper.find(".faq-card").trigger("transitionend", { propertyName: "height" });

    const thumb = wrapper.find(".faq-scrollbar-thumb");
    expect(thumb.attributes("style")).toContain("height: 60px;");
    expect(thumb.attributes("style")).toContain("top: 15px;");
  });
});

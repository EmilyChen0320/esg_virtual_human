import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h } from "vue";

import type { FaqCategory, FaqTopic, FaqTopicsResponse } from "../types/chat";

const i18nMock = vi.hoisted(() => ({
  locale: undefined as { value: string } | undefined
}));

vi.mock("vue-i18n", async () => {
  const vue = await vi.importActual<typeof import("vue")>("vue");
  i18nMock.locale = vue.shallowRef("zh");
  return {
    useI18n: () => ({
      locale: i18nMock.locale
    })
  };
});

vi.mock("../api/chatApi", () => ({
  chatApi: {
    getTopics: vi.fn()
  }
}));

import { chatApi } from "../api/chatApi";

import { useFaq } from "./useFaq";

function makeTopic(overrides: Partial<FaqTopic> = {}): FaqTopic {
  return {
    id: "ortho-rehab/prp",
    label: "PRP",
    order: 0,
    questions: ["PRP 有哪些生長因子？", "PRP 治療注射後照護注意事項?"],
    ...overrides
  };
}

function makeCategory(overrides: Partial<FaqCategory> = {}): FaqCategory {
  return {
    id: "ortho-rehab",
    label: "骨科＋復健科",
    topics: [makeTopic()],
    ...overrides
  };
}

const mockResponse: FaqTopicsResponse = {
  categories: [makeCategory()]
};

function mountComposable() {
  let result!: ReturnType<typeof useFaq>;
  const Wrapper = defineComponent({
    setup() {
      result = useFaq();
      return () => h("div");
    }
  });
  mount(Wrapper);
  return result;
}

describe("useFaq", () => {
  beforeEach(() => {
    i18nMock.locale!.value = "zh";
    vi.mocked(chatApi.getTopics).mockReset();
    vi.mocked(chatApi.getTopics).mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts closed", () => {
    const faq = mountComposable();
    expect(faq.isOpen.value).toBe(false);
    expect(faq.currentLayer.value).toBe("categories");
  });

  it("open() sets isOpen and resets state", () => {
    const faq = mountComposable();
    faq.open();
    expect(faq.isOpen.value).toBe(true);
    expect(faq.currentLayer.value).toBe("categories");
    expect(faq.selectedTopic.value).toBeNull();
  });

  it("close() sets isOpen to false", () => {
    const faq = mountComposable();
    faq.open();
    faq.close();
    expect(faq.isOpen.value).toBe(false);
  });

  it("goBack() from categories closes the panel", () => {
    const faq = mountComposable();
    faq.open();
    faq.goBack();
    expect(faq.isOpen.value).toBe(false);
  });

  it("goBack() from questions returns to categories", () => {
    const faq = mountComposable();
    faq.open();
    faq.currentLayer.value = "questions";
    faq.goBack();
    expect(faq.currentLayer.value).toBe("categories");
    expect(faq.selectedTopic.value).toBeNull();
  });

  it("loadTopics() fetches from API and caches", async () => {
    const faq = mountComposable();
    await faq.loadTopics();
    expect(chatApi.getTopics).toHaveBeenCalledOnce();
    expect(chatApi.getTopics).toHaveBeenCalledWith("zh");
    expect(faq.categories.value).toEqual(mockResponse.categories);

    // Second call should not re-fetch
    await faq.loadTopics();
    expect(chatApi.getTopics).toHaveBeenCalledOnce();
  });

  it("loadTopics() refetches when locale changes", async () => {
    const enResponse: FaqTopicsResponse = {
      categories: [
        makeCategory({
          id: "orthopedics-rehab",
          label: "Orthopedics & Rehab",
          topics: [makeTopic({ id: "orthopedics-rehab/prp", label: "PRP Therapy" })]
        })
      ]
    };
    vi.mocked(chatApi.getTopics)
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce(enResponse);
    const faq = mountComposable();

    await faq.loadTopics();
    i18nMock.locale!.value = "en";
    await faq.loadTopics();

    expect(chatApi.getTopics).toHaveBeenNthCalledWith(1, "zh");
    expect(chatApi.getTopics).toHaveBeenNthCalledWith(2, "en");
    expect(faq.categories.value).toEqual(enResponse.categories);
  });

  it("loadTopics() handles errors", async () => {
    vi.mocked(chatApi.getTopics).mockRejectedValue(new Error("Network error"));
    const faq = mountComposable();
    await faq.loadTopics();
    expect(faq.error.value).toBe("Network error");
    expect(faq.isLoading.value).toBe(false);
  });

  it("selectTopic() with existing questions shows them immediately", async () => {
    const topic = makeTopic();
    const faq = mountComposable();
    faq.open();
    await faq.selectTopic(topic);
    expect(faq.currentLayer.value).toBe("questions");
    expect(faq.selectedTopic.value).toEqual(topic);
    expect(chatApi.getTopics).not.toHaveBeenCalled();
  });

  it("selectTopic() with empty questions not in cached categories shows error", async () => {
    const topic = makeTopic({ questions: [] });
    const faq = mountComposable();
    faq.open();
    await faq.selectTopic(topic);
    expect(chatApi.getTopics).not.toHaveBeenCalled();
    expect(faq.error.value).toBe("無問題");
    expect(faq.currentLayer.value).toBe("categories");
  });

  it("getQuestions() returns questions for current locale", () => {
    const topic = makeTopic();
    const faq = mountComposable();
    faq.selectedTopic.value = topic;
    const questions = faq.getQuestions();
    expect(questions).toEqual(topic.questions);
  });

  it("getQuestions() returns empty array when no topic is selected", () => {
    const faq = mountComposable();
    expect(faq.getQuestions()).toEqual([]);
  });

  it("getTopicLabel() returns label for current locale", () => {
    const topic = makeTopic();
    const faq = mountComposable();
    expect(faq.getTopicLabel(topic)).toBe("PRP");
  });

  it("getCategoryLabel() returns label for current locale", () => {
    const category = makeCategory();
    const faq = mountComposable();
    expect(faq.getCategoryLabel(category)).toBe("骨科＋復健科");
  });

  it("buildQuestionSelection() returns the full FAQ path without normalizing category text", async () => {
    const category = makeCategory({
      topics: [
        makeTopic({
          id: "ortho-rehab/gout",
          label: "痛風常見問題",
          questions: ["什麼是痛風？"]
        })
      ]
    });
    vi.mocked(chatApi.getTopics).mockResolvedValue({
      categories: [category]
    });
    const faq = mountComposable();

    await faq.loadTopics();
    faq.open();
    await faq.selectTopic(category.topics[0]);

    expect(faq.buildQuestionSelection("什麼是痛風？")).toEqual({
      question: "什麼是痛風？",
      displayText: "骨科＋復健科/痛風常見問題/什麼是痛風？",
      categoryLabel: "骨科＋復健科",
      topicLabel: "痛風常見問題"
    });
  });
});

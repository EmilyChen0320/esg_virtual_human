import { computed, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { chatApi } from "../api/chatApi";
import type { FaqCategory, FaqQuestionSelection, FaqTopic, FaqTopicsLanguage } from "../types/chat";

export type FaqLayer = "categories" | "questions";

export function useFaq() {
  const { locale } = useI18n();

  const isOpen = shallowRef(false);
  const currentLayer = shallowRef<FaqLayer>("categories");
  const categories = shallowRef<FaqCategory[]>([]);
  const selectedTopic = shallowRef<FaqTopic | null>(null);
  const isLoading = shallowRef(false);
  const error = shallowRef("");
  const loadedLanguage = shallowRef<FaqTopicsLanguage | null>(null);

  const currentLocale = computed<FaqTopicsLanguage>(() => (locale.value === "en" ? "en" : "zh"));

  function open() {
    isOpen.value = true;
    currentLayer.value = "categories";
    selectedTopic.value = null;
    error.value = "";
  }

  function close() {
    isOpen.value = false;
  }

  function goBack() {
    if (currentLayer.value === "questions") {
      currentLayer.value = "categories";
      selectedTopic.value = null;
    } else {
      close();
    }
  }

  async function selectTopic(topic: FaqTopic) {
    if (topic.questions.length > 0) {
      selectedTopic.value = topic;
      currentLayer.value = "questions";
      return;
    }

    error.value = "無問題";
  }

  function getQuestions(): string[] {
    if (!selectedTopic.value) {
      return [];
    }
    return selectedTopic.value.questions;
  }

  function getTopicLabel(topic: FaqTopic): string {
    return topic.label;
  }

  function getCategoryLabel(category: FaqCategory): string {
    return category.label;
  }

  function findCategoryForTopic(topic: FaqTopic): FaqCategory | null {
    return (
      categories.value.find((category) =>
        category.topics.some((candidate) => candidate.id === topic.id)
      ) ?? null
    );
  }

  function buildQuestionSelection(question: string): FaqQuestionSelection {
    if (!selectedTopic.value) {
      throw new Error("Cannot build FAQ question selection without a selected topic");
    }

    const category = findCategoryForTopic(selectedTopic.value);
    if (!category) {
      throw new Error(`Cannot find FAQ category for topic: ${selectedTopic.value.id}`);
    }

    return {
      question,
      displayText: `${category.label}/${selectedTopic.value.label}/${question}`,
      categoryLabel: category.label,
      topicLabel: selectedTopic.value.label
    };
  }

  async function loadTopics() {
    const language = currentLocale.value;
    if (loadedLanguage.value === language && categories.value.length > 0) {
      return;
    }
    isLoading.value = true;
    error.value = "";
    categories.value = [];
    try {
      const response = await chatApi.getTopics(language);
      categories.value = response.categories;
      loadedLanguage.value = language;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading.value = false;
    }
  }

  watch(currentLocale, () => {
    currentLayer.value = "categories";
    selectedTopic.value = null;
    error.value = "";
    if (isOpen.value) {
      loadTopics().catch((e: unknown) => {
        error.value = e instanceof Error ? e.message : String(e);
      });
    }
  });

  return {
    isOpen,
    currentLayer,
    categories,
    selectedTopic,
    isLoading,
    error,
    open,
    close,
    goBack,
    selectTopic,
    getQuestions,
    getTopicLabel,
    getCategoryLabel,
    buildQuestionSelection,
    loadTopics
  };
}

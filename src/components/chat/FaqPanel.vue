<script setup lang="ts">
import { onMounted, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import type { FaqLayer } from "../../composables/useFaq";
import { usePressReleaseActions } from "../../composables/usePressReleaseAction";
import {
  DIALOG_DISMISS_GUARD_MS,
  DIALOG_FONT_SIZE,
  FAQ_BUTTON_FONT_SIZE
} from "../../constants/ui";
import type { FaqCategory, FaqQuestionSelection, FaqTopic } from "../../types/chat";

const props = defineProps<{
  isOpen: boolean;
  currentLayer: FaqLayer;
  categories: FaqCategory[];
  selectedTopic: FaqTopic | null;
  questions: string[];
  isLoading: boolean;
  error: string;
  getTopicLabel: (topic: FaqTopic) => string;
  getCategoryLabel: (category: FaqCategory) => string;
  buildQuestionSelection: (question: string) => FaqQuestionSelection;
}>();

const emit = defineEmits<{
  back: [];
  close: [];
  selectTopic: [topic: FaqTopic];
  selectQuestion: [selection: FaqQuestionSelection];
}>();

const { t } = useI18n();

const scrollRef = shallowRef<HTMLElement | null>(null);
const trackRef = shallowRef<HTMLElement | null>(null);
const scrollThumbTop = shallowRef(0);
const scrollThumbHeight = shallowRef(0);
const pendingQuestion = shallowRef<string | null>(null);
const pressActions = usePressReleaseActions();
let openedAt = props.isOpen ? Date.now() : 0;

function handleClose() {
  if (Date.now() - openedAt < DIALOG_DISMISS_GUARD_MS) {
    return;
  }
  emit("close");
}

function handleBack() {
  emit("back");
}

function handleSelectTopic(topic: FaqTopic) {
  emit("selectTopic", topic);
}

function handleSelectQuestion(question: string) {
  if (pendingQuestion.value !== null) {
    return;
  }
  pendingQuestion.value = question;
  emit("selectQuestion", props.buildQuestionSelection(question));
}

function updateScrollThumb() {
  const el = scrollRef.value;
  const trackEl = trackRef.value;
  if (!el || !trackEl) {
    return;
  }
  const trackHeight = trackEl.clientHeight;
  if (trackHeight <= 0) {
    return;
  }
  const { scrollTop, scrollHeight, clientHeight } = el;
  if (scrollHeight <= clientHeight) {
    scrollThumbTop.value = 0;
    scrollThumbHeight.value = trackHeight;
    return;
  }
  const ratio = clientHeight / scrollHeight;
  const thumbH = Math.max(ratio * trackHeight, 60);
  const scrollRange = scrollHeight - clientHeight;
  const trackRange = trackHeight - thumbH;
  const thumbTop = (scrollTop / scrollRange) * trackRange;
  scrollThumbHeight.value = thumbH;
  scrollThumbTop.value = thumbTop;
}

function onScroll() {
  updateScrollThumb();
}

function onCardTransitionEnd(event: TransitionEvent) {
  if (event.propertyName === "height") {
    updateScrollThumb();
  }
}

watch(
  () => [props.isOpen, props.currentLayer, props.categories, props.questions],
  () => {
    requestAnimationFrame(updateScrollThumb);
  }
);

watch(
  () => [props.isOpen, props.currentLayer],
  ([isOpen]) => {
    if (isOpen) {
      openedAt = Date.now();
    }
    pendingQuestion.value = null;
  }
);

onMounted(() => {
  requestAnimationFrame(updateScrollThumb);
});
</script>

<template>
  <div class="faq-layer">
    <div
      v-if="isOpen"
      class="faq-interaction-mask"
      aria-hidden="true"
      @pointerdown.stop.prevent="pressActions.onPointerdown"
      @pointerup.stop.prevent="pressActions.onPointerup($event, handleClose)"
      @pointercancel.stop="pressActions.onPointercancel"
      @pointerleave="pressActions.onPointerleave"
      @click.stop="pressActions.onClick($event, handleClose)"
    ></div>
    <Transition name="faq-slide">
      <div v-if="isOpen" class="faq-panel">
        <!-- Back button tab on left edge -->
        <button
          class="faq-back-tab"
          @pointerdown.stop.prevent="pressActions.onPointerdown"
          @pointerup.stop.prevent="pressActions.onPointerup($event, handleBack)"
          @pointercancel.stop="pressActions.onPointercancel"
          @pointerleave="pressActions.onPointerleave"
          @click.stop="pressActions.onClick($event, handleBack)"
        >
          <svg
            class="faq-back-arrow"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 6L9 12L15 18"
              stroke="white"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="faq-back-text">{{ t("faq.back") }}</span>
        </button>

        <!-- Content card -->
        <div
          class="faq-card"
          :class="{ 'faq-card--questions': currentLayer === 'questions' }"
          @transitionend="onCardTransitionEnd"
        >
          <!-- Loading state -->
          <div v-if="isLoading" class="faq-loading">
            <span>{{ t("faq.loading") }}</span>
          </div>

          <!-- Error state -->
          <div v-else-if="error" class="faq-error">
            <span>{{ error }}</span>
          </div>

          <!-- Layer 1: Categories with topics -->
          <div
            v-else-if="currentLayer === 'categories'"
            ref="scrollRef"
            class="faq-scroll faq-scroll--categories"
            @scroll="onScroll"
          >
            <div v-for="category in categories" :key="category.id" class="faq-category">
              <h3 class="faq-category-title">{{ getCategoryLabel(category) }}</h3>
              <div class="faq-topics-grid">
                <button
                  v-for="topic in category.topics"
                  :key="topic.id"
                  class="faq-topic-btn"
                  @pointerdown.stop.prevent="pressActions.onPointerdown"
                  @pointerup.stop.prevent="
                    pressActions.onPointerup($event, () => handleSelectTopic(topic))
                  "
                  @pointercancel.stop="pressActions.onPointercancel"
                  @pointerleave="pressActions.onPointerleave"
                  @click.stop="pressActions.onClick($event, () => handleSelectTopic(topic))"
                >
                  {{ getTopicLabel(topic) }}
                </button>
              </div>
            </div>
          </div>

          <!-- Layer 2: Questions for selected topic -->
          <div
            v-else-if="currentLayer === 'questions' && selectedTopic"
            ref="scrollRef"
            class="faq-scroll faq-scroll--questions"
            @scroll="onScroll"
          >
            <h3 class="faq-category-title">
              {{ getTopicLabel(selectedTopic) }}{{ t("faq.questions-suffix") }}
            </h3>
            <div class="faq-questions-grid">
              <button
                v-for="(question, index) in questions"
                :key="index"
                class="faq-question-btn"
                :class="{ 'faq-question-btn--pending': pendingQuestion === question }"
                :aria-busy="pendingQuestion === question"
                @pointerdown.stop.prevent="pressActions.onPointerdown"
                @pointerup.stop.prevent="
                  pressActions.onPointerup($event, () => handleSelectQuestion(question))
                "
                @pointercancel.stop="pressActions.onPointercancel"
                @pointerleave="pressActions.onPointerleave"
                @click.stop="pressActions.onClick($event, () => handleSelectQuestion(question))"
              >
                {{ question }}
              </button>
            </div>
          </div>

          <!-- Dynamic scrollbar indicator -->
          <div ref="trackRef" class="faq-scrollbar-track">
            <div
              class="faq-scrollbar-thumb"
              :style="{ top: scrollThumbTop + 'px', height: scrollThumbHeight + 'px' }"
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.faq-layer {
  position: absolute;
  inset: 0;
  z-index: 40;
  pointer-events: none;
}

.faq-interaction-mask {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgba(255, 255, 255, 0.35);
  pointer-events: auto;
}

.faq-panel {
  --faq-btn-text-size: v-bind("`${FAQ_BUTTON_FONT_SIZE}px`");
  position: absolute;
  top: 550px;
  left: 60px;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  width: 90%;
  pointer-events: none;
}

.faq-back-tab {
  position: absolute;
  left: -34px;
  top: 517px;
  z-index: 31;
  width: 145px;
  height: 456px;
  background: #5593b5;
  border: none;
  border-radius: 0 20px 20px 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  transition: background 0.2s ease;
  pointer-events: auto;
  touch-action: manipulation;
}

.faq-back-tab:active {
  background: #4a839f;
}

.faq-back-arrow {
  width: 51px;
  height: 34px;
}

.faq-back-text {
  color: white;
  font-size: v-bind("`${DIALOG_FONT_SIZE}px`");
  font-weight: 500;
  line-height: 1;
}

.faq-card {
  position: absolute;
  top: 80px;
  left: 0;
  width: 100%;
  /* 2560px canvas height - 80px card top offset - 1120px bottom section (leaving 1200px bottom area from original calculation): 2560 - 80 - 1120 = 1360px */
  height: 1360px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 36px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  transition: height 0.3s ease;
  pointer-events: auto;
}

.faq-card--questions {
  /* 1360px FAQ card height - 38px header row (category title + padding): 1360 - 38 = 1322px for questions layer */
  height: 1322px;
}

.faq-scroll {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
}

.faq-scroll::-webkit-scrollbar {
  display: none;
}

.faq-scroll--categories {
  padding: 64px 68px 50px 154px;
}

.faq-scroll--questions {
  padding: 44px 57px 50px 146px;
}

.faq-scrollbar-track {
  position: absolute;
  right: 32px;
  top: 64px;
  bottom: 64px;
  width: 16px;
  pointer-events: none;
}

.faq-scrollbar-thumb {
  position: absolute;
  left: 0;
  width: 100%;
  background: #5593b5;
  border-radius: 50px;
  transition:
    top 0.1s ease,
    height 0.1s ease;
}

.faq-loading,
.faq-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: v-bind("`${DIALOG_FONT_SIZE}px`");
  color: #5a6e78;
  font-weight: 500;
}

.faq-error {
  color: #c44;
}

.faq-category {
  margin-bottom: 63px;
}

.faq-category:last-child {
  margin-bottom: 0;
}

.faq-category-title {
  font-size: 48px;
  font-weight: 600;
  color: #5a6e78;
  margin-bottom: 24px;
  line-height: 1.2;
}

.faq-topics-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  margin-top: 16px;
  margin-bottom: 48px;
}

.faq-topic-btn {
  flex: 1 0 calc(50% - 16px);
  max-width: calc(50% - 16px);
  min-height: 88px;
  padding: 22px 28px;
  background: white;
  border: 2px solid #5593b5;
  border-radius: 16px;
  color: #5593b5;
  font-size: var(--faq-btn-text-size);
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
  line-height: 1;
}

.faq-topic-btn:only-child,
.faq-topic-btn:nth-last-child(1):nth-child(odd) {
  flex: 1 0 100%;
  max-width: 100%;
}

.faq-topic-btn:active {
  background: #5593b5;
  color: white;
}

.faq-questions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.faq-question-btn {
  flex: 1 0 calc(50% - 6px);
  max-width: calc(50% - 6px);
  min-height: 0;
  padding: 28px 35px;
  background: white;
  border: 2px solid #5593b5;
  border-radius: 12px;
  color: #5593b5;
  font-size: var(--faq-btn-text-size);
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
  line-height: 40px;
}

.faq-question-btn:active {
  background: #5593b5;
  color: white;
}

.faq-question-btn--pending {
  background: #5593b5;
  color: white;
}

/* Slide-in transition */
.faq-slide-enter-active,
.faq-slide-leave-active {
  transition:
    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.faq-slide-enter-from,
.faq-slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>

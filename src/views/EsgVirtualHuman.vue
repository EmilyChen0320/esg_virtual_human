<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef } from "vue";
import { useI18n } from "vue-i18n";

import { esgApi } from "../api/esgApi";
import { ttsApi } from "../api/ttsApi";
import { getFallbackTopics } from "../data/esgFallbackTopics";
import { MatesxPlayer } from "../services/matesxPlayer";
import type { EsgDialogEntry, EsgLanguage, EsgTopicCategory } from "../types/esg";

const { locale } = useI18n();

const currentLanguage = computed<EsgLanguage>(() => (locale.value === "en" ? "en" : "zh"));
const sessionId = shallowRef("");
const turnNumber = shallowRef<number | null>(null);
const categories = shallowRef<EsgTopicCategory[]>([]);
const dialogs = shallowRef<EsgDialogEntry[]>([]);
const isQuestionPanelOpen = shallowRef(false);
const isRestartDialogOpen = shallowRef(false);
const isLoadingTopics = shallowRef(false);
const isStarting = shallowRef(false);
const isAnswering = shallowRef(false);
const isTtsPlaying = shallowRef(false);
const errorMessage = shallowRef("");
const transcriptRef = shallowRef<HTMLElement | null>(null);
const matesxCanvasRef = shallowRef<HTMLCanvasElement | null>(null);

let activeController: AbortController | null = null;
let ttsController: AbortController | null = null;
let ttsAudio: HTMLAudioElement | null = null;
let ttsObjectUrl: string | null = null;
let matesxPlayer: MatesxPlayer | null = null;
let matesxReadyPromise: Promise<void> | null = null;
let requestSequence = 0;

const isBusy = computed(() => isAnswering.value || isTtsPlaying.value);
const hasConversation = computed(() => dialogs.value.some((dialog) => dialog.role !== "system"));
const localizedImageSuffix = computed(() => (currentLanguage.value === "en" ? "en" : "zh"));
const targetLanguageImageSuffix = computed(() => (currentLanguage.value === "en" ? "zh" : "en"));
const languageIcon = computed(() => `/images/icon_lang_${targetLanguageImageSuffix.value}.png`);
const quickQuestionIcon = computed(
  () => `/images/icon_questions_${localizedImageSuffix.value}.png`
);
const interruptIcon = computed(() => `/images/icon_interrupt_${localizedImageSuffix.value}.png`);
const restartIcon = computed(() => `/images/icon_restart_${localizedImageSuffix.value}.png`);

const copy = computed(() => {
  if (currentLanguage.value === "en") {
    return {
      langButton: "中",
      quickButton: "Quick",
      interruptButton: "Stop",
      restartButton: "Restart",
      fallbackOpening: "Hello! Click on a quick question to interact with me.",
      restartTitle: "Close the current screen and restart?",
      restartConfirm: "Restart",
      loading: "Loading questions..."
    };
  }

  return {
    langButton: "EN",
    quickButton: "快速問題",
    interruptButton: "中斷",
    restartButton: "重啟",
    fallbackOpening: "你好，點擊快速問題，即可和我互動喔",
    restartTitle: "確認要關閉當前畫面\n並重新啟動嗎？",
    restartConfirm: "確認重啟",
    loading: "問題載入中..."
  };
});

const visibleQuestions = computed(() => {
  return categories.value.flatMap((category) =>
    category.topics.flatMap((topic) =>
      topic.questions.map((question) => ({
        id: `${category.id}-${topic.id}-${question}`,
        label: question,
        categoryLabel: category.label,
        topicLabel: topic.label
      }))
    )
  );
});

function createDialog(role: EsgDialogEntry["role"], text: string): EsgDialogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text
  };
}

function setOpeningMessage(text?: string | null) {
  dialogs.value = [createDialog("system", text || copy.value.fallbackOpening)];
}

function scrollTranscriptToBottom() {
  nextTick(() => {
    const el = transcriptRef.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

function setFallbackTopics() {
  categories.value = getFallbackTopics(currentLanguage.value);
}

function cleanupTtsAudio() {
  ttsController?.abort();
  ttsController = null;
  matesxPlayer?.stop();

  if (ttsAudio) {
    ttsAudio.pause();
    ttsAudio.removeAttribute("src");
    ttsAudio.load();
    ttsAudio = null;
  }

  if (ttsObjectUrl) {
    URL.revokeObjectURL(ttsObjectUrl);
    ttsObjectUrl = null;
  }

  isTtsPlaying.value = false;
}

async function initializeMatesx() {
  if (matesxReadyPromise) {
    return matesxReadyPromise;
  }

  matesxReadyPromise = nextTick()
    .then(() => {
      const canvas = matesxCanvasRef.value;
      if (!canvas) {
        throw new Error("MatesX canvas is not mounted");
      }
      matesxPlayer = MatesxPlayer.fromEnv(canvas);
      return matesxPlayer.initialize();
    })
    .catch((error) => {
      matesxReadyPromise = null;
      matesxPlayer = null;
      throw error;
    });

  return matesxReadyPromise;
}

async function playFallbackAudio(response: Response, sequence: number) {
  if (sequence !== requestSequence) {
    return;
  }

  const audioBlob = await response.blob();
  if (sequence !== requestSequence) {
    return;
  }

  ttsObjectUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(ttsObjectUrl);
  ttsAudio = audio;

  await new Promise<void>((resolve, reject) => {
    audio.addEventListener("ended", () => resolve(), { once: true });
    audio.addEventListener("error", () => reject(new Error("Fallback TTS audio failed")), {
      once: true
    });
    audio.play().then(() => undefined, reject);
  });
}

async function playTts(text: string, sequence: number) {
  const normalizedText = text.trim();
  if (!normalizedText || sequence !== requestSequence) {
    return;
  }

  cleanupTtsAudio();
  ttsController = new AbortController();
  isTtsPlaying.value = true;

  try {
    const response = await ttsApi.fetchSpeechStream(normalizedText, ttsController.signal);
    if (sequence !== requestSequence) {
      cleanupTtsAudio();
      return;
    }

    try {
      await initializeMatesx();
      await matesxPlayer?.playWavStream(response, ttsController.signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      console.warn("[esg] matesx playback failed, falling back to audio", error);
      await playFallbackAudio(response, sequence);
    }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      console.warn("[esg] tts stream failed", error);
    }
    cleanupTtsAudio();
  } finally {
    if (sequence === requestSequence) {
      cleanupTtsAudio();
    }
  }
}

async function loadTopics() {
  const controller = new AbortController();
  isLoadingTopics.value = true;
  errorMessage.value = "";

  try {
    const response = await esgApi.getTopics(currentLanguage.value, controller.signal);
    categories.value =
      response.categories && response.categories.length > 0
        ? response.categories
        : getFallbackTopics(currentLanguage.value);
  } catch (error) {
    console.warn("[esg] topics fallback", error);
    setFallbackTopics();
  } finally {
    isLoadingTopics.value = false;
  }
}

async function startSession(options: { resetDialogs?: boolean } = {}) {
  const { resetDialogs = true } = options;
  activeController?.abort();
  activeController = new AbortController();
  isStarting.value = true;
  isAnswering.value = false;
  errorMessage.value = "";
  turnNumber.value = null;
  cleanupTtsAudio();

  try {
    const response = await esgApi.startChat(currentLanguage.value, activeController.signal);
    if (!response.ok) {
      throw new Error(response.message || "Failed to create ESG chat session");
    }
    sessionId.value = response.session_id;
    if (resetDialogs) {
      setOpeningMessage();
    }
  } catch (error) {
    console.warn("[esg] start session fallback", error);
    sessionId.value = "";
    if (resetDialogs) {
      setOpeningMessage();
    }
    errorMessage.value =
      currentLanguage.value === "en"
        ? "Backend is not connected yet. Showing local preview."
        : "尚未連上後端，先顯示本機預覽。";
  } finally {
    isStarting.value = false;
    activeController = null;
  }
}

async function handleQuestionSelect(question: string) {
  isQuestionPanelOpen.value = false;
  errorMessage.value = "";

  if (!sessionId.value) {
    await startSession({ resetDialogs: dialogs.value.length === 0 });
  }

  const conversationDialogs = dialogs.value.filter((dialog) => dialog.role !== "system");
  dialogs.value = [...conversationDialogs, createDialog("question", question)];
  scrollTranscriptToBottom();

  const sequence = requestSequence + 1;
  requestSequence = sequence;
  activeController?.abort();
  activeController = new AbortController();
  isAnswering.value = true;

  try {
    if (!sessionId.value) {
      throw new Error("No ESG session is available");
    }

    const response = await esgApi.sendMessage(
      {
        session_id: sessionId.value,
        message: question,
        turn_number: turnNumber.value
      },
      activeController.signal
    );

    if (sequence !== requestSequence) {
      return;
    }

    turnNumber.value = response.turn_number;
    const displayAnswer = response.message.trim();
    if (displayAnswer) {
      dialogs.value = [...dialogs.value, createDialog("answer", displayAnswer)];
    }

    isAnswering.value = false;
    activeController = null;
    scrollTranscriptToBottom();

    if (response.tts_text?.trim()) {
      await playTts(response.tts_text, sequence);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    console.warn("[esg] send message fallback", error);
    dialogs.value = [
      ...dialogs.value,
      createDialog(
        "answer",
        currentLanguage.value === "en"
          ? "This ESG topic is ready for the virtual human response once the backend is connected."
          : "這題已準備送給虛擬人，待後端連線後會顯示正式回覆。"
      )
    ];
  } finally {
    if (sequence === requestSequence) {
      isAnswering.value = false;
      activeController = null;
      scrollTranscriptToBottom();
    }
  }
}

function handleInterrupt() {
  requestSequence += 1;
  activeController?.abort();
  activeController = null;
  cleanupTtsAudio();
  isAnswering.value = false;
}

async function handleLanguageToggle() {
  locale.value = currentLanguage.value === "en" ? "zh" : "en";
  handleInterrupt();
  await loadTopics();
  await startSession();
}

function requestRestart() {
  isRestartDialogOpen.value = true;
}

async function confirmRestart() {
  isRestartDialogOpen.value = false;
  handleInterrupt();
  await loadTopics();
  await startSession();
}

function cancelRestart() {
  isRestartDialogOpen.value = false;
}

onMounted(async () => {
  initializeMatesx().catch((error) => {
    console.warn("[esg] matesx initialization failed", error);
  });
  await loadTopics();
  await startSession();
});

onBeforeUnmount(() => {
  activeController?.abort();
  cleanupTtsAudio();
  matesxPlayer?.dispose();
  matesxPlayer = null;
});
</script>

<template>
  <main class="esg-page" @contextmenu.prevent>
    <section class="esg-stage" aria-label="ESG AI virtual human">
      <div class="matesx-layer" aria-hidden="true">
        <canvas id="canvas_video" class="matesx-video-canvas"></canvas>
        <canvas
          id="canvas_gl"
          ref="matesxCanvasRef"
          class="matesx-engine-canvas"
          width="180"
          height="180"
        ></canvas>
        <div id="screen" class="matesx-screen"></div>
      </div>

      <img class="brand brand-set-logo" src="/images/setlogo.png" alt="三立集團" />
      <img class="brand brand-future" src="/images/setfuturelogo.png" alt="SET FUTURE" />

      <div class="side-actions" @click.stop>
        <button
          class="image-button image-button-small"
          type="button"
          :aria-label="copy.langButton"
          @click="handleLanguageToggle"
        >
          <img :src="languageIcon" alt="" />
        </button>
        <button
          class="image-button image-button-large"
          type="button"
          :aria-label="isBusy ? copy.interruptButton : copy.quickButton"
          :disabled="isStarting"
          @click="isBusy ? handleInterrupt() : (isQuestionPanelOpen = !isQuestionPanelOpen)"
        >
          <img :src="isBusy ? interruptIcon : quickQuestionIcon" alt="" />
        </button>
        <button
          class="image-button image-button-small"
          type="button"
          :aria-label="copy.restartButton"
          @click="requestRestart"
        >
          <img :src="restartIcon" alt="" />
        </button>
      </div>

      <div
        ref="transcriptRef"
        class="transcript"
        :class="{ 'transcript-history': hasConversation }"
      >
        <article
          v-for="dialog in dialogs"
          :key="dialog.id"
          class="dialog-card"
          :class="[
            dialog.role === 'question' ? 'dialog-card-question' : '',
            dialog.role === 'answer' ? 'dialog-card-answer' : '',
            dialog.role === 'system' ? 'dialog-card-system' : ''
          ]"
        >
          {{ dialog.text }}
        </article>
        <article v-if="isAnswering" class="dialog-card dialog-card-answer dialog-card-loading">
          <span></span><span></span><span></span>
        </article>
      </div>

      <Transition name="question-panel">
        <section v-if="isQuestionPanelOpen" class="question-panel" @click.stop>
          <div v-if="isLoadingTopics" class="question-loading">{{ copy.loading }}</div>
          <button
            v-for="question in visibleQuestions"
            v-else
            :key="question.id"
            class="question-option"
            type="button"
            :disabled="isAnswering"
            @click="handleQuestionSelect(question.label)"
          >
            {{ question.label }}
          </button>
        </section>
      </Transition>

      <p v-if="errorMessage" class="preview-warning">{{ errorMessage }}</p>

      <Transition name="modal-fade">
        <div v-if="isRestartDialogOpen" class="modal-backdrop" @click.self="cancelRestart">
          <section class="restart-dialog" role="dialog" aria-modal="true">
            <p>{{ copy.restartTitle }}</p>
            <button type="button" class="restart-confirm" @click="confirmRestart">
              {{ copy.restartConfirm }}
            </button>
          </section>
        </div>
      </Transition>
    </section>
  </main>
</template>

<style scoped>
.esg-page {
  display: grid;
  width: 100%;
  min-height: 100svh;
  place-items: center;
  overflow: hidden;
  background: #111;
}

.esg-stage {
  position: relative;
  width: min(100vw, calc(100svh * 9 / 16));
  aspect-ratio: 9 / 16;
  overflow: hidden;
  background: transparent;
  container-type: size;
  color: #1d1d1d;
  user-select: none;
}

.brand {
  position: absolute;
  z-index: 3;
  object-fit: contain;
  filter: drop-shadow(0 0 0.75cqw rgb(0 0 0 / 0.22));
  pointer-events: none;
}

.matesx-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.matesx-video-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.matesx-engine-canvas {
  position: absolute;
  top: 100px;
  left: 100px;
  z-index: 1;
  width: 180px;
  height: 180px;
  opacity: 0.001;
}

.matesx-screen {
  position: absolute;
  right: -1000px;
  bottom: -1000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.brand-set-logo {
  top: 1.55cqh;
  left: 3.2cqw;
  width: 27.3cqw;
}

.brand-future {
  top: 1.7cqh;
  right: 3.2cqw;
  width: 28.2cqw;
}

.side-actions {
  position: absolute;
  top: 12.8cqh;
  right: 3.7cqw;
  z-index: 8;
  display: flex;
  width: 21.3cqw;
  flex-direction: column;
  align-items: flex-end;
  gap: 1.2cqh;
}

.image-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
  background: transparent;
  filter: drop-shadow(0 0.18cqh 0.28cqh rgb(0 0 0 / 0.26));
}

.image-button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.image-button img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.image-button-small {
  width: 10.2cqw;
  height: 10.2cqw;
}

.image-button-large {
  width: 15.8cqw;
  height: 15.8cqw;
  margin-right: 5.5cqw;
}

.transcript {
  position: absolute;
  top: 45.4cqh;
  left: 3.7cqw;
  right: 3.7cqw;
  z-index: 5;
  display: flex;
  max-height: 24cqh;
  flex-direction: column;
  gap: 2cqh;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-block: 0.4cqh 1.4cqh;
  scrollbar-width: none;
}

.transcript::-webkit-scrollbar {
  display: none;
}

.transcript-history {
  top: 44.5cqh;
  bottom: 3.9cqh;
  max-height: none;
}

.dialog-card {
  width: fit-content;
  max-width: 100%;
  flex: 0 0 auto;
  overflow-wrap: anywhere;
  border-radius: 2.8cqw;
  font-size: clamp(1rem, 3.35cqw, 2.25rem);
  font-weight: 700;
  line-height: 1.5;
  letter-spacing: 0;
  backdrop-filter: blur(10px) saturate(1.15);
  -webkit-backdrop-filter: blur(10px) saturate(1.15);
}

.dialog-card-system,
.dialog-card-question {
  align-self: stretch;
  min-height: 6.15cqh;
  padding: 1.55cqh 3.3cqw;
  border: 0.24cqw solid rgb(101 188 160 / 0.82);
  color: #36a030;
  background:
    radial-gradient(circle at 12% 12%, rgb(255 255 255 / 0.86), rgb(255 255 255 / 0) 34%),
    linear-gradient(
      92deg,
      rgb(247 255 247 / 0.76) 0%,
      rgb(222 255 238 / 0.64) 32%,
      rgb(183 241 255 / 0.6) 69%,
      rgb(247 255 238 / 0.68) 100%
    );
  box-shadow:
    inset 0 0.12cqh 0.18cqh rgb(255 255 255 / 0.72),
    inset 0 -0.1cqh 0.22cqh rgb(70 151 178 / 0.18),
    0 0.16cqh 0.34cqh rgb(0 0 0 / 0.12);
}

.dialog-card-system {
  width: 100%;
}

.dialog-card-question {
  display: flex;
  align-self: flex-end;
  width: min(62%, 56cqw);
  min-height: 0;
  align-items: center;
  justify-content: flex-start;
  padding: 1.55cqh 3.3cqw;
  border: 0.32cqw solid #add37f;
  border-radius: 3.2cqw;
  background:
    linear-gradient(
      88deg,
      rgb(239 255 253 / 0.86) 3.31%,
      rgb(225 255 238 / 0.86) 32.98%,
      rgb(189 240 252 / 0.86) 70.98%,
      rgb(237 248 232 / 0.86) 99.72%
    ),
    linear-gradient(0deg, rgb(255 255 255 / 0.2) 0%, rgb(255 255 255 / 0.2) 100%),
    linear-gradient(180deg, rgb(102 102 102 / 0.2) 0%, rgb(102 102 102 / 0) 32.69%),
    linear-gradient(180deg, rgb(102 102 102 / 0) 50%, rgb(102 102 102 / 0.4) 100%),
    linear-gradient(0deg, rgb(29 29 29 / 0.2) 0%, rgb(29 29 29 / 0.2) 100%), #1d1d1d;
  background-blend-mode: normal, normal, plus-lighter, plus-lighter, color-burn, plus-lighter;
  box-shadow:
    16px 16px 9px -18px rgb(255 255 255 / 1) inset,
    -12px -12px 6px -14px rgb(179 179 179 / 1) inset,
    2px 2px 1px -2px rgb(179 179 179 / 1) inset,
    0 0 22px 0 rgb(242 242 242 / 0.5) inset;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: #36a030;
  font-family: var(--app-font-family);
  font-size: clamp(1.15rem, 3.75cqw, 2.25rem);
  font-style: normal;
  font-weight: 700;
  line-height: 1.5;
  text-align: left;
}

.dialog-card-answer {
  align-self: flex-start;
  width: 84%;
  padding: 2.1cqh 3.7cqw;
  border: 0.32cqw solid rgb(255 255 255 / 0.88);
  color: #3f3f3f;
  font-family: var(--app-font-family);
  font-size: clamp(1.15rem, 3.75cqw, 2.25rem);
  font-style: normal;
  font-weight: 700;
  line-height: 1.5;
  background:
    linear-gradient(145deg, rgb(255 255 255 / 0.72), rgb(255 255 255 / 0.52)),
    rgb(255 255 255 / 0.48);
  box-shadow:
    inset 0 0.12cqh 0.18cqh rgb(255 255 255 / 0.84),
    0 0.18cqh 0.42cqh rgb(0 0 0 / 0.12);
}

.dialog-card-loading {
  display: flex;
  width: 30%;
  justify-content: center;
  gap: 1.1cqw;
}

.dialog-card-loading span {
  width: 1.2cqw;
  height: 1.2cqw;
  border-radius: 50%;
  animation: pulse 1s infinite ease-in-out;
  background: #36a030;
}

.dialog-card-loading span:nth-child(2) {
  animation-delay: 0.15s;
}

.dialog-card-loading span:nth-child(3) {
  animation-delay: 0.3s;
}

.question-panel {
  position: absolute;
  right: 3.7cqw;
  bottom: 3.9cqh;
  left: 3.7cqw;
  z-index: 9;
  max-height: 52.3cqh;
  overflow-y: auto;
  border-radius: 3.8cqw 3.8cqw 0 0;
  padding: 3.2cqh 3.2cqw 4.8cqh;
  background:
    linear-gradient(90deg, rgb(247 230 218 / 0.82), rgb(230 224 217 / 0.78)),
    rgb(255 255 255 / 0.82);
  backdrop-filter: blur(10px) saturate(1.08);
  -webkit-backdrop-filter: blur(10px) saturate(1.08);
}

.question-option {
  display: flex;
  width: 100%;
  min-height: 6.25cqh;
  align-items: center;
  margin-bottom: 2cqh;
  padding: 1.4cqh 3.7cqw;
  border: 0.25cqw solid #76bf91;
  border-radius: 2.5cqw;
  color: #36a030;
  cursor: pointer;
  font-size: clamp(1rem, 3.55cqw, 2.35rem);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.25;
  text-align: left;
  background:
    radial-gradient(circle at 9% 12%, rgb(255 255 255 / 0.78), rgb(255 255 255 / 0) 34%),
    linear-gradient(90deg, rgb(245 255 250 / 0.8), rgb(189 240 252 / 0.68), rgb(242 252 232 / 0.78));
  box-shadow:
    inset 0 0.1cqh 0.2cqh rgb(255 255 255 / 0.68),
    0 0.12cqh 0.24cqh rgb(0 0 0 / 0.08);
  backdrop-filter: blur(8px) saturate(1.12);
  -webkit-backdrop-filter: blur(8px) saturate(1.12);
}

.question-option:disabled {
  cursor: wait;
  opacity: 0.55;
}

.question-loading,
.preview-warning {
  color: #36a030;
  font-size: clamp(1rem, 3cqw, 2rem);
  font-weight: 700;
  text-align: center;
}

.preview-warning {
  position: absolute;
  right: 4cqw;
  top: 33.8cqh;
  left: 4cqw;
  z-index: 6;
  color: rgb(255 255 255 / 0.94);
  text-shadow: 0 0 0.45cqw rgb(0 0 0 / 0.6);
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 0.02);
}

.restart-dialog {
  width: 64cqw;
  padding: 4.4cqh 7.5cqw 4.2cqh;
  border: 0.32cqw solid rgb(255 255 255 / 0.92);
  border-radius: 3.5cqw;
  background: rgb(255 255 255 / 0.84);
  box-shadow: 0 0.2cqh 0.7cqh rgb(0 0 0 / 0.18);
  text-align: center;
}

.restart-dialog p {
  margin: 0 0 3.3cqh;
  white-space: pre-line;
  color: #2e2e2e;
  font-size: clamp(1.1rem, 3.3cqw, 2.2rem);
  font-weight: 700;
  line-height: 1.45;
  letter-spacing: 0;
}

.restart-confirm {
  width: 100%;
  min-height: 5.6cqh;
  border: 0.25cqw solid #76bf91;
  border-radius: 999px;
  color: #36a030;
  cursor: pointer;
  font-size: clamp(1rem, 3.1cqw, 2rem);
  font-weight: 700;
  letter-spacing: 0;
  background: linear-gradient(
    90deg,
    rgb(239 255 253 / 0.92),
    rgb(189 240 252 / 0.9),
    rgb(237 248 232 / 0.92)
  );
}

.question-panel-enter-active,
.question-panel-leave-active,
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.question-panel-enter-from,
.question-panel-leave-to {
  opacity: 0;
  transform: translateY(3cqh);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@keyframes pulse {
  0%,
  80%,
  100% {
    transform: scale(0.72);
    opacity: 0.45;
  }

  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@container (max-width: 430px) {
  .dialog-card {
    font-size: clamp(0.92rem, 4.9cqw, 1.25rem);
  }

  .question-option {
    font-size: clamp(0.9rem, 4.9cqw, 1.25rem);
  }
}
</style>

<template>
  <div class="chat-page" @contextmenu.prevent>
    <ScaledDesignCanvas>
      <div class="relative h-full w-full">
        <ChatMediaLayer
          ref="videoStream"
          :session-id="sessionId"
          :stream-active="streamActive"
          :show-stream-video="showStreamVideo"
          :local-video="localVideo"
        />

        <!-- Standby mode: original controls -->
        <template v-if="chatMode === 'standby'">
          <ChatActionControls
            :is-recording="isRecording"
            :is-preparing-recording="isPreparingRecording"
            :is-consulting="isConsulting"
            :is-disconnected="isDisconnected"
            :disable-all-buttons="disableAllButtons"
            :disable-faq-restart="disableFaqRestart"
            :is-action-processing="isActionProcessing"
            :is-starting-consult="isStartingConsult"
            :should-show-interrupt-button="shouldShowInterruptButton"
            chat-mode="standby"
            :faq-open="faq.isOpen.value"
            :button-position="actionButtonPosition"
            @consult-click="handleConsultClick"
            @recording-click="handleRecordingClick"
            @interrupt="handleInterrupt"
            @language-change="handleLanguageChange"
            @restart="handleRestart"
            @reload="handleReload"
            @faq-click="handleFaqClick"
            @button-position-click="handleButtonPositionTrigger"
          />

          <ChatFooterOverlay
            :disable-all-buttons="disableAllButtons"
            :show-end-dialog-box="showEndDialogBox"
            @close-end-dialog="showEndDialogBox = false"
          />
        </template>

        <!-- Ready mode: waiting for conversation -->
        <ChatReadyOverlay
          v-else-if="chatMode === 'ready'"
          :opening-message="openingMessage"
          :is-disconnected="isDisconnected"
          :disable-all-buttons="disableAllButtons"
          :disable-faq-restart="disableFaqRestart"
          :is-action-processing="isActionProcessing"
          :is-starting-consult="isStartingConsult"
          :is-preparing-recording="isPreparingRecording"
          :faq-open="faq.isOpen.value"
          :button-position="actionButtonPosition"
          @start-chat="handleStartConversation"
          @restart="handleRestart"
          @faq="handleFaqClick"
          @language-change="handleLanguageChange"
          @reload="handleReload"
          @button-position-click="handleButtonPositionTrigger"
        />

        <!-- Conversation mode: active chat -->
        <template v-else>
          <ChatActionControls
            :is-recording="isRecording"
            :is-preparing-recording="isPreparingRecording"
            :is-consulting="isConsulting"
            :is-disconnected="isDisconnected"
            :disable-all-buttons="disableAllButtons"
            :disable-faq-restart="disableFaqRestart"
            :is-action-processing="isActionProcessing"
            :is-starting-consult="isStartingConsult"
            :should-show-interrupt-button="shouldShowInterruptButton"
            chat-mode="conversation"
            :faq-open="faq.isOpen.value"
            :button-position="actionButtonPosition"
            @consult-click="handleConsultClick"
            @recording-click="handleRecordingClick"
            @interrupt="handleInterrupt"
            @language-change="handleLanguageChange"
            @restart="handleRestart"
            @reload="handleReload"
            @faq-click="handleFaqClick"
            @button-position-click="handleButtonPositionTrigger"
          />

          <ChatDialogOverlay
            v-show="!faq.isOpen.value"
            :dialog-history="dialogHistory"
            :bottom-viewport="actionButtonPosition === 'bottom'"
          />

          <ChatFooterOverlay
            :disable-all-buttons="disableAllButtons"
            :show-end-dialog-box="showEndDialogBox"
            @close-end-dialog="showEndDialogBox = false"
          />
        </template>

        <!-- FAQ Panel (shared across all modes) -->
        <FaqPanel
          :is-open="faq.isOpen.value"
          :current-layer="faq.currentLayer.value"
          :categories="faq.categories.value"
          :selected-topic="faq.selectedTopic.value"
          :questions="faq.getQuestions()"
          :is-loading="faq.isLoading.value"
          :error="faq.error.value"
          :get-topic-label="faq.getTopicLabel"
          :get-category-label="faq.getCategoryLabel"
          :build-question-selection="faq.buildQuestionSelection"
          @back="faq.goBack()"
          @close="faq.close()"
          @select-topic="faq.selectTopic($event)"
          @select-question="handleFaqQuestionSelect($event)"
        />
      </div>
    </ScaledDesignCanvas>

    <RestartDialog
      :show="showRestartDialog"
      :title="restartDialogTitle"
      :body="restartDialogBody"
      @confirm="confirmRestart"
      @cancel="cancelRestart"
    />

    <ButtonPositionDialog
      :show="showButtonPositionDialog"
      :current-position="actionButtonPosition"
      @select="handleButtonPositionSelect"
      @cancel="cancelButtonPositionDialog"
    />
  </div>
</template>

<script setup lang="ts">
import ButtonPositionDialog from "../components/ButtonPositionDialog.vue";
import ChatActionControls from "../components/chat/ChatActionControls.vue";
import ChatDialogOverlay from "../components/chat/ChatDialogOverlay.vue";
import ChatFooterOverlay from "../components/chat/ChatFooterOverlay.vue";
import ChatMediaLayer from "../components/chat/ChatMediaLayer.vue";
import ChatReadyOverlay from "../components/chat/ChatReadyOverlay.vue";
import FaqPanel from "../components/chat/FaqPanel.vue";
import RestartDialog from "../components/RestartDialog.vue";
import ScaledDesignCanvas from "../components/ScaledDesignCanvas.vue";
import { useChatPage } from "../composables/useChatPage";

const {
  sessionId,
  isDisconnected,
  localVideo,
  streamActive,
  showStreamVideo,
  dialogHistory,
  isRecording,
  isPreparingRecording,
  isConsulting,
  showEndDialogBox,
  chatMode,
  openingMessage,
  showButtonPositionDialog,
  actionButtonPosition,
  disableAllButtons,
  disableFaqRestart,
  isActionProcessing,
  isStartingConsult,
  shouldShowInterruptButton,
  handleConsultClick,
  handleStartConversation,
  handleRecordingClick,
  handleInterrupt,
  handleFaqClick,
  handleFaqQuestionSelect,
  faq,
  handleButtonPositionTrigger,
  handleButtonPositionSelect,
  cancelButtonPositionDialog,
  handleLanguageChange,
  showRestartDialog,
  restartDialogTitle,
  restartDialogBody,
  handleRestart,
  confirmRestart,
  cancelRestart,
  handleReload
} = useChatPage();
</script>

<style scoped>
.chat-page {
  height: 100vh;
  touch-action: manipulation;
  overflow: hidden;
  background: #fff;
  user-select: none;
}
</style>

import { onBeforeUnmount, shallowRef } from "vue";

import { chatApi } from "../api/chatApi";
import { NOTIFY_EVENTS_POLL_INTERVAL } from "../constants/timing";
import type { NotifyEvent } from "../types/chat";

interface NotifyEventCallbacks {
  onStart: (event: NotifyEvent) => void;
  onEnd: () => void;
}

interface NotifyEventsDeps {
  isDisconnected: { value: boolean };
}

export function useNotifyEvents(sessionId: string, deps: NotifyEventsDeps) {
  const lastProcessedTimestamp = shallowRef("");
  const notifyEventsInterval = shallowRef<number | null>(null);
  const notifyCheckCancelled = shallowRef(false);
  let callbacks: NotifyEventCallbacks | null = null;
  let isChecking = false;
  let hasReceivedStart = false;

  async function checkNotifyEvents() {
    if (notifyCheckCancelled.value || isChecking || deps.isDisconnected.value) {
      return;
    }

    isChecking = true;
    try {
      const response = await chatApi.getNotifyEvents(sessionId);
      if (notifyCheckCancelled.value) {
        return;
      }

      if (response.code === 0 && response.data && response.data.length > 0) {
        const events = response.data.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        let lastStartEvent: NotifyEvent | null = null;
        let latestEndEvent: NotifyEvent | null = null;
        let latestTimestamp = lastProcessedTimestamp.value;

        for (const event of events) {
          if (event.timestamp > lastProcessedTimestamp.value) {
            if (event.event.status === "start") {
              lastStartEvent = event;
            } else if (event.event.status === "end") {
              latestEndEvent = event;
            }
            if (event.timestamp > latestTimestamp) {
              latestTimestamp = event.timestamp;
            }
          }
        }

        if (lastStartEvent) {
          hasReceivedStart = true;
          callbacks?.onStart(lastStartEvent);
        }
        if (
          latestEndEvent &&
          hasReceivedStart &&
          (!lastStartEvent || latestEndEvent.timestamp > lastStartEvent.timestamp)
        ) {
          callbacks?.onEnd();
        }

        lastProcessedTimestamp.value = latestTimestamp;
      }
    } catch (error) {
      console.error("[useNotifyEvents] Error checking notify events:", error);
    } finally {
      isChecking = false;
    }
  }

  function startNotifyCheck(eventCallbacks: NotifyEventCallbacks) {
    stopNotifyCheck();
    callbacks = eventCallbacks;
    hasReceivedStart = false;
    notifyCheckCancelled.value = false;
    console.log("[useNotifyEvents] polling started");
    checkNotifyEvents();
    notifyEventsInterval.value = window.setInterval(checkNotifyEvents, NOTIFY_EVENTS_POLL_INTERVAL);
  }

  // Note: startNotifyCheck starts the low-level /get_notify_events polling loop.
  // The caller (useChatNotify) is responsible for adding a PROCESSING_TIMEOUT safety
  // net above this layer — see useChatNotify.beginNotifyCheck. This two-layer pattern
  // keeps the polling concern (useNotifyEvents) separate from the business-timeout
  // concern (useChatNotify).

  function stopNotifyCheck() {
    notifyCheckCancelled.value = true;
    isChecking = false;
    if (notifyEventsInterval.value) {
      clearInterval(notifyEventsInterval.value);
      notifyEventsInterval.value = null;
    }
    console.log("[useNotifyEvents] polling stopped");
  }

  function resetTimestamp() {
    lastProcessedTimestamp.value = new Date().toISOString();
  }

  onBeforeUnmount(stopNotifyCheck);

  function getNotifyDebugState() {
    return {
      isChecking,
      hasInterval: notifyEventsInterval.value !== null,
      cancelled: notifyCheckCancelled.value
    };
  }

  return { startNotifyCheck, stopNotifyCheck, resetTimestamp, getNotifyDebugState };
}

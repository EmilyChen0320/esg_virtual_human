import { onBeforeUnmount, shallowRef } from "vue";

import { chatApi } from "../api/chatApi";
import {
  HEARTBEAT_FAIL_THRESHOLD,
  HEARTBEAT_FAST_INTERVAL,
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT
} from "../constants/timing";

export function useConnectionMonitor(sessionId: string) {
  const isDisconnected = shallowRef(false);

  let heartbeatTimer: number | null = null;
  let consecutiveFailures = 0;
  let isHeartbeatPending = false;

  function handleOffline() {
    isDisconnected.value = true;
    consecutiveFailures = 0;
    stopHeartbeat();
  }

  function handleOnline() {
    consecutiveFailures = 0;
    startHeartbeat(HEARTBEAT_FAST_INTERVAL);
  }

  async function heartbeat(): Promise<void> {
    if (isHeartbeatPending) {
      return;
    }
    isHeartbeatPending = true;
    console.log("[useConnectionMonitor] heartbeat start");
    try {
      await chatApi.checkSpeakingStatus(sessionId, HEARTBEAT_TIMEOUT);
      consecutiveFailures = 0;
      if (isDisconnected.value) {
        isDisconnected.value = false;
        restartHeartbeat(HEARTBEAT_INTERVAL);
      }
    } catch {
      consecutiveFailures++;
      if (consecutiveFailures >= HEARTBEAT_FAIL_THRESHOLD && !isDisconnected.value) {
        isDisconnected.value = true;
        restartHeartbeat(HEARTBEAT_FAST_INTERVAL);
      }
    } finally {
      isHeartbeatPending = false;
      console.log(
        `[useConnectionMonitor] heartbeat end disconnected=${isDisconnected.value} failures=${consecutiveFailures}`
      );
    }
  }

  function startHeartbeat(interval: number) {
    stopHeartbeat();
    console.log(`[useConnectionMonitor] heartbeat interval started interval=${interval}ms`);
    heartbeat();
    heartbeatTimer = window.setInterval(heartbeat, interval);
  }

  function restartHeartbeat(interval: number) {
    stopHeartbeat();
    console.log(`[useConnectionMonitor] heartbeat interval restarted interval=${interval}ms`);
    heartbeat();
    heartbeatTimer = window.setInterval(heartbeat, interval);
  }

  function stopHeartbeat() {
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
      console.log("[useConnectionMonitor] heartbeat interval stopped");
    }
  }

  function startMonitoring() {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) {
      isDisconnected.value = true;
    } else {
      startHeartbeat(HEARTBEAT_INTERVAL);
    }
  }

  function stopMonitoring() {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    stopHeartbeat();
    consecutiveFailures = 0;
    isHeartbeatPending = false;
  }

  onBeforeUnmount(stopMonitoring);

  function getConnectionDebugState() {
    return {
      isHeartbeatPending,
      hasTimer: heartbeatTimer !== null,
      consecutiveFailures
    };
  }

  return { isDisconnected, startMonitoring, stopMonitoring, getConnectionDebugState };
}

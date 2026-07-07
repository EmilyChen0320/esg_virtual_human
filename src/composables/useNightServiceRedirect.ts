import { onBeforeUnmount, onMounted } from "vue";

import { attemptNightServiceRedirect, getNextNightServiceDelayMs } from "../utils/nightService";

export function useNightServiceRedirect() {
  let timer: number | null = null;

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function checkAndSchedule() {
    clearTimer();

    if (attemptNightServiceRedirect()) {
      return;
    }

    const delay = getNextNightServiceDelayMs();
    if (delay <= 0) {
      return;
    }

    timer = window.setTimeout(checkAndSchedule, delay);
  }

  function handleVisibilityChange() {
    if (!document.hidden) {
      checkAndSchedule();
    }
  }

  onMounted(() => {
    checkAndSchedule();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkAndSchedule);
  });

  onBeforeUnmount(() => {
    clearTimer();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("focus", checkAndSchedule);
  });

  return {
    checkAndSchedule,
    clearTimer
  };
}

import { onBeforeUnmount, shallowRef } from "vue";

import { AUTO_RELOAD_TIMEOUT } from "../constants/timing";

export function useAutoReload() {
  const autoReloadTimer = shallowRef<number | null>(null);

  function setAutoReloadTimer() {
    clearAutoReloadTimer();

    autoReloadTimer.value = window.setTimeout(() => {
      window.location.reload();
    }, AUTO_RELOAD_TIMEOUT);
  }

  function clearAutoReloadTimer() {
    if (autoReloadTimer.value) {
      clearTimeout(autoReloadTimer.value);
      autoReloadTimer.value = null;
    }
  }

  onBeforeUnmount(clearAutoReloadTimer);

  return { setAutoReloadTimer, clearAutoReloadTimer };
}

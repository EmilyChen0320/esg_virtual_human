const MOBILE_DEBUG_QUERY_PARAM = "mobileDebug";
const MOBILE_DEBUG_STORAGE_KEY = "hciot_mobile_console_enabled";

let initPromise: Promise<void> | undefined;

function normalizeFlag(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function isDisabledFlag(value: string | null | undefined): boolean {
  return ["0", "false", "off", "no"].includes(normalizeFlag(value));
}

function isEnabledFlag(value: string | null | undefined): boolean {
  return ["1", "true", "on", "yes"].includes(normalizeFlag(value));
}

function setStoredPreference(enabled: boolean) {
  try {
    if (enabled) {
      localStorage.setItem(MOBILE_DEBUG_STORAGE_KEY, "1");
      return;
    }

    localStorage.removeItem(MOBILE_DEBUG_STORAGE_KEY);
  } catch (error) {
    console.warn("[mobileConsole] localStorage unavailable:", error);
  }
}

function isStoredPreferenceEnabled(): boolean {
  try {
    return localStorage.getItem(MOBILE_DEBUG_STORAGE_KEY) === "1";
  } catch (error) {
    console.warn("[mobileConsole] localStorage unavailable:", error);
    return false;
  }
}

export function shouldEnableMobileConsole(search = window.location.search): boolean {
  const params = new URLSearchParams(search);
  const queryFlag = params.get(MOBILE_DEBUG_QUERY_PARAM);

  if (queryFlag !== null) {
    const enabled = !isDisabledFlag(queryFlag);
    setStoredPreference(enabled);
    return enabled;
  }

  return (
    isEnabledFlag(import.meta.env.VITE_ENABLE_MOBILE_CONSOLE as string | undefined) ||
    isStoredPreferenceEnabled()
  );
}

export async function initMobileConsole(): Promise<void> {
  if (!shouldEnableMobileConsole()) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = import("eruda")
    .then(({ default: eruda }) => {
      eruda.init();
      console.info("[mobileConsole] Eruda initialized");
    })
    .catch((error: unknown) => {
      initPromise = undefined;
      console.error("[mobileConsole] Eruda init failed:", error);
    });

  return initPromise;
}

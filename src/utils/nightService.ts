import { LANG_QUERY_PARAM } from "../constants/api";
import {
  HC_PHONE_URL,
  NIGHT_SERVICE_CUTOFF_HOUR,
  NIGHT_SERVICE_CUTOFF_MINUTE,
  NIGHT_SERVICE_RETURN_HOUR,
  NIGHT_SERVICE_RETURN_MINUTE,
  NIGHT_SERVICE_SOURCE_QUERY,
  NIGHT_SERVICE_SOURCE_VALUE,
  NIGHT_SERVICE_STORAGE_KEY,
  NIGHT_SERVICE_STORAGE_VALUE,
  NIGHT_SERVICE_UTC_OFFSET_HOURS,
  NIGHT_SERVICE_TIMEZONE
} from "../constants/nightService";

interface TaipeiDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

interface NightServiceRedirectOptions {
  now?: Date;
  search?: string;
  replace?: (url: string) => void;
}

interface NightServiceStoragePayload {
  enabledDate?: string;
}

const taipeiFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: NIGHT_SERVICE_TIMEZONE,
  calendar: "gregory",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function getTaipeiDateTimeParts(date: Date): TaipeiDateTimeParts {
  const values = new Map<string, string>();
  for (const part of taipeiFormatter.formatToParts(date)) {
    if (part.type !== "literal") {
      values.set(part.type, part.value);
    }
  }

  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute"))
  };
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getTaipeiDateKey(date: Date): string {
  const taipei = getTaipeiDateTimeParts(date);
  return formatDateKey(taipei.year, taipei.month, taipei.day);
}

function getPreviousDateKey(taipei: TaipeiDateTimeParts): string {
  const previousDate = new Date(Date.UTC(taipei.year, taipei.month - 1, taipei.day - 1));
  return formatDateKey(
    previousDate.getUTCFullYear(),
    previousDate.getUTCMonth() + 1,
    previousDate.getUTCDate()
  );
}

function isBeforeNightServiceReturnTime(now = new Date()): boolean {
  const taipei = getTaipeiDateTimeParts(now);
  return (
    taipei.hour < NIGHT_SERVICE_RETURN_HOUR ||
    (taipei.hour === NIGHT_SERVICE_RETURN_HOUR && taipei.minute < NIGHT_SERVICE_RETURN_MINUTE)
  );
}

function isStoredNightServiceDateActive(
  enabledDate: string | undefined,
  now = new Date()
): boolean {
  if (!enabledDate || !isBeforeNightServiceReturnTime(now)) {
    return false;
  }

  const taipei = getTaipeiDateTimeParts(now);
  const today = formatDateKey(taipei.year, taipei.month, taipei.day);
  const previousDay = getPreviousDateKey(taipei);

  return enabledDate === today || enabledDate === previousDay;
}

function parseNightServiceStorage(value: string): NightServiceStoragePayload | null {
  try {
    const parsed = JSON.parse(value) as NightServiceStoragePayload;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

export function isTaipeiNightServiceTime(now = new Date()): boolean {
  const taipei = getTaipeiDateTimeParts(now);
  return (
    taipei.hour > NIGHT_SERVICE_CUTOFF_HOUR ||
    (taipei.hour === NIGHT_SERVICE_CUTOFF_HOUR && taipei.minute >= NIGHT_SERVICE_CUTOFF_MINUTE)
  );
}

export function getNextNightServiceDelayMs(now = new Date()): number {
  if (isTaipeiNightServiceTime(now)) {
    return 0;
  }

  const taipei = getTaipeiDateTimeParts(now);
  const targetUtcMs = Date.UTC(
    taipei.year,
    taipei.month - 1,
    taipei.day,
    NIGHT_SERVICE_CUTOFF_HOUR - NIGHT_SERVICE_UTC_OFFSET_HOURS,
    NIGHT_SERVICE_CUTOFF_MINUTE,
    0,
    0
  );

  return Math.max(targetUtcMs - now.getTime(), 0);
}

export function isNightServiceEnabled(now = new Date()): boolean {
  try {
    const storageValue = localStorage.getItem(NIGHT_SERVICE_STORAGE_KEY);
    if (!storageValue) {
      return false;
    }

    if (storageValue === NIGHT_SERVICE_STORAGE_VALUE) {
      const isLegacyFlagActive = isBeforeNightServiceReturnTime(now);
      if (!isLegacyFlagActive) {
        clearNightService();
      }
      return isLegacyFlagActive;
    }

    const payload = parseNightServiceStorage(storageValue);
    const isStoredDateActive = isStoredNightServiceDateActive(payload?.enabledDate, now);
    if (!isStoredDateActive) {
      clearNightService();
    }
    return isStoredDateActive;
  } catch {
    return false;
  }
}

export function enableNightService(now = new Date()): void {
  try {
    localStorage.setItem(
      NIGHT_SERVICE_STORAGE_KEY,
      JSON.stringify({ enabledDate: getTaipeiDateKey(now) })
    );
  } catch {
    // Storage can be unavailable on restricted kiosk/browser sessions.
  }
}

export function clearNightService(): void {
  try {
    localStorage.removeItem(NIGHT_SERVICE_STORAGE_KEY);
  } catch {
    // Keep the manual recovery helper safe even when storage is unavailable.
  }
}

export function buildNightServiceUrl(search = window.location.search): string | null {
  if (!HC_PHONE_URL) {
    return null;
  }

  const destination = new URL(HC_PHONE_URL, window.location.href);
  const currentParams = new URLSearchParams(search);
  const lang = currentParams.get(LANG_QUERY_PARAM);

  destination.searchParams.set(NIGHT_SERVICE_SOURCE_QUERY, NIGHT_SERVICE_SOURCE_VALUE);
  if (lang) {
    destination.searchParams.set(LANG_QUERY_PARAM, lang);
  }

  return destination.href;
}

export function shouldEnterNightService(now = new Date()): boolean {
  return isTaipeiNightServiceTime(now) || isNightServiceEnabled(now);
}

export function attemptNightServiceRedirect(options: NightServiceRedirectOptions = {}): boolean {
  const now = options.now ?? new Date();

  if (!shouldEnterNightService(now)) {
    return false;
  }

  const destinationUrl = buildNightServiceUrl(options.search ?? window.location.search);
  if (!destinationUrl) {
    console.error("[nightService] VITE_HC_PHONE_URL is not configured; skip redirect");
    return false;
  }

  enableNightService(now);
  const replace = options.replace ?? window.location.replace.bind(window.location);
  replace(destinationUrl);
  return true;
}

// Session
export const SESSION_QUERY_PARAM = "session";

export function getSessionIdFromSearch(search = window.location.search): string {
  const sessionId = new URLSearchParams(search).get(SESSION_QUERY_PARAM)?.trim();

  if (!sessionId || !/^\d+$/.test(sessionId)) {
    return "0";
  }

  return sessionId.replace(/^0+/, "") || "0";
}

// API Base URLs — injected via Vite env vars; fallbacks allow dev without .env
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://youngforehospital.5gao.ai:8020";
export const API_SESSION_URL =
  (import.meta.env.VITE_API_SESSION_URL as string | undefined) ??
  "https://youngforehospital.5gao.ai:9880";
export const API_TRANSCRIBE_URL =
  (import.meta.env.VITE_API_TRANSCRIBE_URL as string | undefined) ?? API_SESSION_URL;
export const API_NOTIFY_URL =
  (import.meta.env.VITE_API_NOTIFY_URL as string | undefined) ??
  "https://youngforehospital.5gao.ai:8020";

// API Endpoint paths
export const ENDPOINTS = {
  HCIOT_CHAT_START: "/hciot_chat_start",
  IS_SPEAKING: "/is_speaking",
  HUMAN: "/human",
  TRANSCRIBE: "/transcribe5",
  GET_CURRENT_CONFIG: "/get_current_config",
  GET_AVATARS: "/get_avatars",
  GET_VOICES: "/get_voices",
  AI_CHAT_HCIOT: "/ai_chat_hciot",
  GET_NOTIFY_EVENTS: "/get_notify_events",
  HCIOT_TOPICS: "/hciot_topics"
} as const;

// API payload constants
export const MESSAGE_TYPE_ECHO = "echo";
export const AUDIO_FILENAME = "audio.wav";
export const LOCALE_ENGLISH = "en";
export const LOCALE_SUFFIX_ENGLISH = "_en";
export const LANG_QUERY_PARAM = "lang";

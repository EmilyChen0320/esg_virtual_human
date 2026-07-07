export const STREAM_BASE_URL =
  (import.meta.env.VITE_WHEP_URL as string | undefined) ?? "https://youngforehospital.5gao.ai:1986";
export const DEFAULT_STREAM_NAME = "livestream";
export const WHEP_URL = `${STREAM_BASE_URL}/rtc/v1/whep/`;
export const SRS_SDK_PATH = "";

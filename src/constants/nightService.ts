export const NIGHT_SERVICE_TIMEZONE = "Asia/Taipei";
export const NIGHT_SERVICE_UTC_OFFSET_HOURS = 8;
export const NIGHT_SERVICE_CUTOFF_HOUR = 18;
export const NIGHT_SERVICE_CUTOFF_MINUTE = 0;
export const NIGHT_SERVICE_RETURN_HOUR = 9;
export const NIGHT_SERVICE_RETURN_MINUTE = 0;
export const NIGHT_SERVICE_STORAGE_KEY = "kiosk_hc_night_service_enabled";
export const NIGHT_SERVICE_SOURCE_QUERY = "source";
export const NIGHT_SERVICE_SOURCE_VALUE = "kiosk";
export const NIGHT_SERVICE_STORAGE_VALUE = "1";

export const HC_PHONE_URL = (import.meta.env.VITE_HC_PHONE_URL as string | undefined)?.trim() ?? "";

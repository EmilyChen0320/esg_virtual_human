import {
  API_BASE_URL,
  API_NOTIFY_URL,
  API_SESSION_URL,
  API_TRANSCRIBE_URL,
  AUDIO_FILENAME,
  ENDPOINTS,
  LANG_QUERY_PARAM,
  LOCALE_ENGLISH,
  LOCALE_SUFFIX_ENGLISH,
  MESSAGE_TYPE_ECHO
} from "../constants/api";
import { API_REQUEST_TIMEOUT } from "../constants/timing";
import type {
  AvatarsResponse,
  ChatMessageResponse,
  ConfigResponse,
  FaqTopicsResponse,
  FaqTopicsLanguage,
  HumanMessagePayload,
  TextMessagePayload,
  VoicesResponse,
  SpeakingResponse,
  TranscribeResponse,
  NotifyEventsResponse,
  JtiChatStartResponse
} from "../types/chat";

export type ApiErrorKind = "timeout" | "network" | "http" | "aborted";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly endpoint: string;
  readonly cause: unknown;

  constructor(kind: ApiErrorKind, endpoint: string, status: number | undefined, cause: unknown) {
    const prefix = kind === "http" ? `${status}` : kind;
    super(`[${prefix}] ${endpoint}`);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.endpoint = endpoint;
    this.cause = cause;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

function getLocaleSuffix(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const lang = urlParams.get(LANG_QUERY_PARAM);
  return lang === LOCALE_ENGLISH ? LOCALE_SUFFIX_ENGLISH : "";
}

function getApiErrorSummary(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "";
  }

  const body =
    typeof error.cause === "string" && error.cause.length > 0
      ? ` body=${error.cause.slice(0, 200)}`
      : "";
  const status = error.status ? ` status=${error.status}` : "";
  return `${status}${body}`;
}

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  // Pass an explicit TimeoutError as the abort reason so `wrapFetchError` can
  // distinguish timeout from user-initiated abort without relying on the
  // fragile `err.message === ""` heuristic (Chrome now sets message to
  // "signal is aborted without reason", which broke the old classification).
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException("request timeout", "TimeoutError")),
    timeoutMs
  );
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}

async function assertOk(response: Response, endpoint: string): Promise<void> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError("http", endpoint, response.status, errorText);
  }
}

async function wrapFetchError(endpoint: string, error: unknown): Promise<never> {
  if (isTimeoutError(error)) {
    throw new ApiError("timeout", endpoint, undefined, error);
  }
  if (isAbortError(error)) {
    throw new ApiError("aborted", endpoint, undefined, error);
  }
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    throw new ApiError("network", endpoint, undefined, error);
  }
  throw new ApiError("network", endpoint, undefined, error);
}

export const chatApi = {
  async startHciotChat(language: string): Promise<JtiChatStartResponse> {
    try {
      const response = await fetchWithTimeout(`${API_SESSION_URL}${ENDPOINTS.HCIOT_CHAT_START}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language })
      });
      await assertOk(response, ENDPOINTS.HCIOT_CHAT_START);
      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw await wrapFetchError(ENDPOINTS.HCIOT_CHAT_START, error);
    }
  },

  async checkSpeakingStatus(sessionId: string, timeoutMs?: number): Promise<SpeakingResponse> {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}${ENDPOINTS.IS_SPEAKING}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionid: parseInt(sessionId, 10) })
        },
        timeoutMs
      );
      await assertOk(response, ENDPOINTS.IS_SPEAKING);
      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw await wrapFetchError(ENDPOINTS.IS_SPEAKING, error);
    }
  },

  async sendHumanMessage(text: string, sessionId: string, userId?: string): Promise<void> {
    const startedAt = Date.now();
    console.log(
      `[chatApi] human request sessionId=${sessionId} textLength=${text.length} hasUserId=${Boolean(userId)}`
    );
    try {
      const payload: HumanMessagePayload = {
        text,
        type: MESSAGE_TYPE_ECHO,
        sessionid: parseInt(sessionId, 10)
      };
      if (userId) {
        payload.userId = userId;
      }
      const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.HUMAN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await assertOk(response, ENDPOINTS.HUMAN);
      console.log(`[chatApi] human response duration=${Date.now() - startedAt}ms`);
    } catch (error) {
      console.warn(`[chatApi] human failed duration=${Date.now() - startedAt}ms`, error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw await wrapFetchError(ENDPOINTS.HUMAN, error);
    }
  },

  async sendInterruptMessage(sessionId: string): Promise<void> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.HUMAN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "",
          type: "",
          sessionid: parseInt(sessionId, 10),
          interrupt: true
        })
      });
      await assertOk(response, ENDPOINTS.HUMAN);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw await wrapFetchError(ENDPOINTS.HUMAN, error);
    }
  },

  async transcribeAudio(
    audioBlob: Blob,
    sessionId: string,
    userId?: string
  ): Promise<TranscribeResponse> {
    const localeSuffix = getLocaleSuffix();
    const endpoint = `${ENDPOINTS.TRANSCRIBE}${localeSuffix}`;
    const startedAt = Date.now();
    const formData = new FormData();
    formData.append("audio", audioBlob, AUDIO_FILENAME);
    formData.append("sessionid", sessionId);
    if (userId) {
      formData.append("userId", userId);
    }

    console.log(
      `[chatApi] transcribe request endpoint=${endpoint} sessionId=${sessionId} size=${audioBlob.size}B type=${audioBlob.type || "unknown"} hasUserId=${Boolean(userId)}`
    );
    try {
      const response = await fetchWithTimeout(`${API_TRANSCRIBE_URL}${endpoint}`, {
        method: "POST",
        body: formData
      });
      await assertOk(response, endpoint);
      const result = (await response.json()) as TranscribeResponse;
      console.log(
        `[chatApi] transcribe response endpoint=${endpoint} duration=${Date.now() - startedAt}ms keys=${Object.keys(result).sort().join(",")}`
      );
      return result;
    } catch (error) {
      console.warn(
        `[chatApi] transcribe failed endpoint=${endpoint} duration=${Date.now() - startedAt}ms${getApiErrorSummary(error)}`,
        error
      );
      if (error instanceof ApiError) {
        throw error;
      }
      throw await wrapFetchError(endpoint, error);
    }
  },

  async getCurrentConfig(sessionId: string): Promise<ConfigResponse> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.GET_CURRENT_CONFIG}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionid: parseInt(sessionId, 10) })
      });
      await assertOk(response, ENDPOINTS.GET_CURRENT_CONFIG);
      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw await wrapFetchError(ENDPOINTS.GET_CURRENT_CONFIG, error);
    }
  },

  async getAvatars(): Promise<AvatarsResponse> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.GET_AVATARS}`, {});
      await assertOk(response, ENDPOINTS.GET_AVATARS);
      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw await wrapFetchError(ENDPOINTS.GET_AVATARS, error);
    }
  },

  async getVoices(): Promise<VoicesResponse> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}${ENDPOINTS.GET_VOICES}`, {});
      await assertOk(response, ENDPOINTS.GET_VOICES);
      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw await wrapFetchError(ENDPOINTS.GET_VOICES, error);
    }
  },

  async sendTextMessage(text: string, userId: string): Promise<ChatMessageResponse> {
    try {
      const payload: TextMessagePayload = {
        text,
        userId
      };

      const response = await fetchWithTimeout(`${API_SESSION_URL}${ENDPOINTS.AI_CHAT_HCIOT}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await assertOk(response, ENDPOINTS.AI_CHAT_HCIOT);
      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw await wrapFetchError(ENDPOINTS.AI_CHAT_HCIOT, error);
    }
  },

  async getTopics(language: FaqTopicsLanguage): Promise<FaqTopicsResponse> {
    const endpoint = `${ENDPOINTS.HCIOT_TOPICS}/${language}`;
    try {
      const response = await fetchWithTimeout(`${API_SESSION_URL}${endpoint}`, {
        method: "GET"
      });
      await assertOk(response, endpoint);
      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw await wrapFetchError(endpoint, error);
    }
  },

  async getNotifyEvents(sessionId: string): Promise<NotifyEventsResponse> {
    try {
      const response = await fetchWithTimeout(`${API_NOTIFY_URL}${ENDPOINTS.GET_NOTIFY_EVENTS}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionid: parseInt(sessionId, 10) })
      });
      await assertOk(response, ENDPOINTS.GET_NOTIFY_EVENTS);
      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw await wrapFetchError(ENDPOINTS.GET_NOTIFY_EVENTS, error);
    }
  }
};

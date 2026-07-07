import type {
  EsgLanguage,
  EsgMessageResponse,
  EsgStartChatResponse,
  EsgTopicsResponse
} from "../types/esg";

const DEFAULT_ESG_API_BASE_URL = "http://localhost:8913";

function getBaseUrl() {
  return (
    (import.meta.env.VITE_ESG_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
    DEFAULT_ESG_API_BASE_URL
  );
}

function getToken() {
  return (import.meta.env.VITE_ESG_API_TOKEN as string | undefined)?.trim() ?? "";
}

function getJsonHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function assertOk(response: Response, endpoint: string) {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`${endpoint} failed: ${response.status} ${message}`);
  }
}

export const esgApi = {
  async getTopics(language: EsgLanguage, signal?: AbortSignal): Promise<EsgTopicsResponse> {
    const endpoint = `/api/esg/topics/${language}`;
    const response = await fetch(`${getBaseUrl()}${endpoint}`, { signal });
    await assertOk(response, endpoint);
    return response.json();
  },

  async startChat(language: EsgLanguage, signal?: AbortSignal): Promise<EsgStartChatResponse> {
    const endpoint = "/api/esg/chat/start";
    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
      method: "POST",
      headers: getJsonHeaders(),
      body: JSON.stringify({ language }),
      signal
    });
    await assertOk(response, endpoint);
    return response.json();
  },

  async sendMessage(
    payload: {
      session_id: string;
      message: string;
      tts_character?: string | null;
      turn_number?: number | null;
    },
    signal?: AbortSignal
  ): Promise<EsgMessageResponse> {
    const endpoint = "/api/esg/chat/message";
    const body = {
      session_id: payload.session_id,
      message: payload.message,
      ...(payload.tts_character ? { tts_character: payload.tts_character } : {}),
      ...(payload.turn_number !== undefined && payload.turn_number !== null
        ? { turn_number: payload.turn_number }
        : {})
    };
    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
      method: "POST",
      headers: getJsonHeaders(),
      body: JSON.stringify(body),
      signal
    });
    await assertOk(response, endpoint);
    return response.json();
  }
};

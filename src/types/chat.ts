export interface Dialog {
  text: string;
  isUser: boolean;
  image?: string;
}

export interface FaqQuestionSelection {
  question: string;
  displayText: string;
  categoryLabel: string;
  topicLabel: string;
}

export interface HumanMessagePayload {
  text: string;
  type: string;
  sessionid: number;
  userId?: string;
}

export interface TextMessagePayload {
  text: string;
  userId: string;
}

export interface TranscribeResponse {
  input_text?: string;
  text?: string;
  message?: string;
  tts_text?: string;
  options?: string[] | null;
  language?: string;
  userId?: string;
  conversation_id?: string;
  image_url?: string | null;
  citations?: Citation[] | null;
}

export interface Avatar {
  id: string;
  display_name: string;
}

export interface Voice {
  id: number;
  name: string;
}

export interface SpeakingResponse {
  data: boolean;
}

export interface ConfigResponse {
  code: number;
  data: Record<string, unknown>;
}

export interface AvatarsResponse {
  code: number;
  data: Record<string, Avatar>;
}

export interface VoicesResponse {
  code: number;
  data: Record<string, Voice>;
}

export interface NotifyEvent {
  timestamp: string;
  event: {
    status: "start" | "end";
    text: string;
    msgevent: unknown;
  };
}

export interface NotifyEventsResponse {
  code: number;
  data: NotifyEvent[];
}

export interface JtiChatStartResponse {
  ok: boolean;
  session_id: string;
  message: string;
  language: string;
  opening_message?: string;
}

export interface Citation {
  uri: string;
  title: string;
  text: string;
}

// --- FAQ Topics API ---

export type FaqTopicsLanguage = "zh" | "en";

export interface FaqTopic {
  id: string;
  label: string;
  order: number;
  questions: string[];
}

export interface FaqCategory {
  id: string;
  label: string;
  topics: FaqTopic[];
}

export interface FaqTopicsResponse {
  categories: FaqCategory[];
}

export interface ChatMessageResponse {
  message?: string;
  options: string[] | null;
  text?: string;
  tts_text?: string;
  tts_message_id?: string;
  image_url?: string | null;
  citations?: Citation[] | null;
  tool_calls?: unknown[];
  quiz_result_id?: string | null;
  session?: {
    session_id: string;
    step: string;
    language: string;
    current_q_index: number;
  } | null;
  error?: string | null;
  turn_number?: number;
}

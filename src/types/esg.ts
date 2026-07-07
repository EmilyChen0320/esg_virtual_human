export type EsgLanguage = "zh" | "en";

export interface EsgTopic {
  id: string;
  label: string;
  questions: string[];
  order?: number;
}

export interface EsgTopicCategory {
  id: string;
  label: string;
  topics: EsgTopic[];
  order?: number;
}

export interface EsgTopicsResponse {
  categories: EsgTopicCategory[];
}

export interface EsgStartChatResponse {
  ok: boolean;
  session_id: string;
  message: string;
  opening_message: string | null;
}

export interface EsgMessageSessionSnapshot {
  session_id: string;
  step?: string;
  language?: EsgLanguage;
  current_q_index?: number;
  answers?: Record<string, unknown>;
  chat_history?: unknown[];
  metadata?: Record<string, unknown>;
}

export interface EsgMessageResponse {
  message: string;
  tts_text: string | null;
  tts_message_id: string | null;
  image_id: string | null;
  url: string | null;
  options: string[] | null;
  quiz_result_id: string | null;
  session: EsgMessageSessionSnapshot;
  tool_calls: unknown[];
  citations: unknown[] | null;
  turn_number: number;
  error: string | null;
}

export interface EsgDialogEntry {
  id: string;
  role: "question" | "answer" | "system";
  text: string;
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelOptions {
  modelId: string;
  temperature: number;
  maxTokens: number;
  repetitionPenalty: number;
}

export interface DownloadProgress {
  current: number;
  total: number;
}

export interface LLMResponse {
  content: string;
}

export interface ModelData {
  id: string;
  data: any;
  timestamp: number;
}

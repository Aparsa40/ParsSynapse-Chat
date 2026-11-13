export type ModelConnectionType = "api" | "local";
export type McpTransport = "stdio" | "streamable-http";

export interface ModelProviderPreset {
  id: string;
  name: string;
  connectionType: ModelConnectionType;
  endpoint: string;
  description: string;
  defaultModel: string;
}

export interface ModelConnectionProfile {
  id: string;
  name: string;
  providerId: string;
  connectionType: ModelConnectionType;
  endpoint: string;
  model: string;
}

export interface McpServerProfile {
  id: string;
  name: string;
  transport: McpTransport;
  commandOrUrl: string;
  enabled: boolean;
}

export const modelProviderPresets: ModelProviderPreset[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    connectionType: "api",
    endpoint: "https://openrouter.ai/api/v1",
    description: "دسترسی یکپارچه به مدل‌های متنوع از طریق API سازگار با OpenAI",
    defaultModel: "",
  },
  {
    id: "openai-compatible",
    name: "OpenAI-compatible API",
    connectionType: "api",
    endpoint: "",
    description: "اتصال به سرویس‌هایی که API سازگار با OpenAI ارائه می‌کنند",
    defaultModel: "",
  },
  {
    id: "google-gemini",
    name: "Google AI Studio (Gemini API)",
    connectionType: "api",
    endpoint: "https://generativelanguage.googleapis.com",
    description: "اتصال مستقیم به مدل‌های Gemini از طریق Google API",
    defaultModel: "",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    connectionType: "local",
    endpoint: "http://127.0.0.1:11434",
    description: "اجرای مدل‌های نصب‌شده روی سیستم شخصی از طریق Ollama",
    defaultModel: "qwen3:14b",
  },
];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ModelDescriptor {
  id: string;
  name: string;
  providerId: string;
  digest: string;
  size: number;
  modifiedAt: string;
  capabilities: string[];
  chatSupported: boolean;
}

export interface ProviderDescriptor {
  id: string;
  name: string;
  type: "local" | "cloud";
  status: "connected" | "unavailable";
  version?: string;
}

interface ApiErrorPayload {
  error?: { code?: string; message?: string };
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");

async function readError(response: Response): Promise<Error> {
  let payload: ApiErrorPayload = {};
  try {
    payload = await response.json() as ApiErrorPayload;
  } catch {
    // Keep a safe fallback when the server does not return JSON.
  }
  return new Error(payload.error?.message ?? `Backend request failed (${response.status}).`);
}

export async function getProviders(signal?: AbortSignal): Promise<ProviderDescriptor[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/providers`, { signal });
  if (!response.ok) throw await readError(response);
  const payload = await response.json() as { providers: ProviderDescriptor[] };
  return payload.providers ?? [];
}

export async function getModels(signal?: AbortSignal): Promise<ModelDescriptor[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/models`, { signal });
  if (!response.ok) throw await readError(response);
  const payload = await response.json() as { models: ModelDescriptor[] };
  return payload.models ?? [];
}

export async function streamChat(options: {
  model: string;
  messages: ChatMessage[];
  signal: AbortSignal;
  onDelta: (content: string) => void;
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({
      provider: "ollama",
      model: options.model,
      messages: options.messages,
      stream: true,
    }),
    signal: options.signal,
  });

  if (!response.ok) throw await readError(response);
  if (!response.body) throw new Error("پاسخ جریانی از Backend دریافت نشد.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamError: Error | null = null;

  const processEvent = (eventText: string) => {
    let eventName = "message";
    const dataLines: string[] = [];
    for (const line of eventText.split("\n")) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length === 0) return;
    const data = dataLines.join("\n");
    if (data === "[DONE]") return;
    try {
      const payload = JSON.parse(data) as { content?: string; code?: string; message?: string };
      if (eventName === "error") {
        streamError = new Error(payload.message ?? "تولید پاسخ با خطا متوقف شد.");
        return;
      }
      if (payload.content) options.onDelta(payload.content);
    } catch (error) {
      if (error instanceof SyntaxError) streamError = new Error("پاسخ دریافتی از Backend معتبر نیست.");
      else throw error;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const eventText of events) processEvent(eventText);
      if (streamError) throw streamError;
      if (done) break;
    }
    if (buffer.trim()) processEvent(buffer);
    if (streamError) throw streamError;
  } finally {
    reader.releaseLock();
  }
}

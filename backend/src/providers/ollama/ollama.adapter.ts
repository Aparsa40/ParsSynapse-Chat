import type {
  ChatMessage,
  ModelDescriptor,
  ProviderAdapter,
  ProviderHealth,
} from "../contracts.js";

export class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly code: "PROVIDER_UNAVAILABLE" | "PROVIDER_TIMEOUT" | "MODEL_UNLOAD_TIMEOUT",
  ) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

interface OllamaTagsResponse {
  models?: Array<{
    name?: string;
    model?: string;
    digest?: string;
    size?: number;
    modified_at?: string;
  }>;
}

interface OllamaShowResponse {
  capabilities?: string[];
}

function requestSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export class OllamaAdapter implements ProviderAdapter {
  readonly id = "ollama";
  readonly name = "Ollama";
  private chatQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = 30_000,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async request(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<Response> {
    try {
      return await this.fetcher(`${this.baseUrl}${path}`, {
        ...init,
        signal: requestSignal(signal, this.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new ProviderRequestError("Ollama request timed out.", "PROVIDER_TIMEOUT");
      }
      if (signal?.aborted) throw error;
      throw new ProviderRequestError("Ollama is not reachable.", "PROVIDER_UNAVAILABLE");
    }
  }

  async healthCheck(signal?: AbortSignal): Promise<ProviderHealth> {
    try {
      const response = await this.request("/api/version", {}, signal);
      if (!response.ok) return { providerId: this.id, status: "unavailable", errorCode: "PROVIDER_UNAVAILABLE" };
      const payload = await response.json() as { version?: string };
      return { providerId: this.id, status: "connected", ...(payload.version ? { version: payload.version } : {}) };
    } catch (error) {
      return {
        providerId: this.id,
        status: "unavailable",
        errorCode: error instanceof ProviderRequestError && error.code !== "MODEL_UNLOAD_TIMEOUT" ? error.code : "PROVIDER_UNAVAILABLE",
      };
    }
  }

  async listModels(signal?: AbortSignal): Promise<ModelDescriptor[]> {
    const response = await this.request("/api/tags", {}, signal);
    if (!response.ok) throw new ProviderRequestError("Ollama model discovery failed.", "PROVIDER_UNAVAILABLE");
    const payload = await response.json() as OllamaTagsResponse;

    const models = await Promise.all((payload.models ?? []).map(async (model): Promise<ModelDescriptor | null> => {
      const id = model.name ?? model.model;
      if (!id) return null;

      let capabilities: string[] = [];
      try {
        const showResponse = await this.request("/api/show", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model: id }),
        }, signal);
        if (showResponse.ok) {
          const show = await showResponse.json() as OllamaShowResponse;
          capabilities = show.capabilities ?? [];
        }
      } catch (error) {
        if (signal?.aborted) throw error;
      }

      return {
        id,
        name: id,
        providerId: this.id,
        digest: model.digest ?? "",
        size: model.size ?? 0,
        modifiedAt: model.modified_at ?? "",
        capabilities,
        chatSupported: capabilities.includes("completion"),
      };
    }));
    return models.filter((model): model is ModelDescriptor => model !== null);
  }

  async *chatStream(options: {
    model: string;
    messages: ChatMessage[];
    signal?: AbortSignal;
  }): AsyncGenerator<string> {
    const previous = this.chatQueue;
    let release!: () => void;
    this.chatQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous;

    try {
      if (options.signal?.aborted) throw options.signal.reason ?? new Error("Request aborted.");

      const response = await this.request("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/x-ndjson" },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          stream: true,
          // Keep the selected model resident; do not force an unload after each response.
          keep_alive: -1,
        }),
      }, options.signal);

      if (!response.ok) {
        await response.body?.cancel();
        throw new ProviderRequestError("Ollama chat request failed.", "PROVIDER_UNAVAILABLE");
      }
      if (!response.body) throw new ProviderRequestError("Ollama returned an empty stream.", "PROVIDER_UNAVAILABLE");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const chunk = JSON.parse(line) as { message?: { content?: string }; error?: string };
            if (chunk.error) throw new ProviderRequestError("Ollama reported a generation error.", "PROVIDER_UNAVAILABLE");
            if (chunk.message?.content) yield chunk.message.content;
          }
          if (done) break;
        }
        if (buffer.trim()) {
          const chunk = JSON.parse(buffer) as { message?: { content?: string }; error?: string };
          if (chunk.error) throw new ProviderRequestError("Ollama reported a generation error.", "PROVIDER_UNAVAILABLE");
          if (chunk.message?.content) yield chunk.message.content;
        }
      } finally {
        reader.releaseLock();
      }
    } finally {
      // The queue lock protects local generation concurrency, not model residency.
      // Ollama keeps the model loaded according to keep_alive above.
      release();
    }
  }
}

import type { ChatMessage, ProviderAdapter } from "../providers/contracts.js";

export class ModelRouter {
  constructor(private readonly providers: ProviderAdapter[]) {}

  getProvider(providerId = "ollama"): ProviderAdapter {
    const provider = this.providers.find((item) => item.id === providerId);
    if (!provider) throw new Error(`Unsupported provider: ${providerId}`);
    return provider;
  }

  streamChat(input: {
    providerId?: string;
    model: string;
    messages: ChatMessage[];
    signal?: AbortSignal;
  }): AsyncGenerator<string> {
    return this.getProvider(input.providerId).chatStream({
      model: input.model,
      messages: input.messages,
      ...(input.signal ? { signal: input.signal } : {}),
    });
  }
}

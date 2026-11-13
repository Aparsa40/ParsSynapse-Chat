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
}

export interface ProviderHealth {
  providerId: string;
  status: "connected" | "unavailable";
  version?: string;
  errorCode?: "PROVIDER_UNAVAILABLE" | "PROVIDER_TIMEOUT";
}

export interface ChatStreamOptions {
  model: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}

export interface ProviderAdapter {
  readonly id: string;
  readonly name: string;
  healthCheck(signal?: AbortSignal): Promise<ProviderHealth>;
  listModels(signal?: AbortSignal): Promise<ModelDescriptor[]>;
  chatStream(options: ChatStreamOptions): AsyncGenerator<string>;
}

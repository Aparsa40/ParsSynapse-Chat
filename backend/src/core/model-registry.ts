import type { ModelDescriptor, ProviderAdapter, ProviderHealth } from "../providers/contracts.js";

export class ModelRegistry {
  constructor(private readonly providers: ProviderAdapter[]) {}

  listProviders(): ProviderAdapter[] {
    return [...this.providers];
  }

  getProvider(providerId: string): ProviderAdapter | undefined {
    return this.providers.find((provider) => provider.id === providerId);
  }

  async discoverModels(providerId: string, signal?: AbortSignal): Promise<ModelDescriptor[]> {
    const provider = this.getProvider(providerId);
    if (!provider) throw new Error(`Unknown provider: ${providerId}`);
    return provider.listModels(signal);
  }

  async getProviderHealth(providerId: string, signal?: AbortSignal): Promise<ProviderHealth> {
    const provider = this.getProvider(providerId);
    if (!provider) throw new Error(`Unknown provider: ${providerId}`);
    return provider.healthCheck(signal);
  }
}

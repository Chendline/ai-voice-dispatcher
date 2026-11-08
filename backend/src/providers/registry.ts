import type { AppConfig, ProviderConfig } from '../config.js';
import { createAnthropicAdapter } from './anthropic.js';
import { createGoogleAdapter } from './google.js';
import { createOpenAiCompatibleAdapter } from './openai.js';
import type { ProviderAdapter } from './types.js';
import { ProviderError } from './types.js';

function createAdapter(config: AppConfig, provider: ProviderConfig): ProviderAdapter {
  if (!provider.apiKey) {
    throw new ProviderError('not_configured', `${provider.label} is not configured.`);
  }

  if (provider.id === 'anthropic') {
    return createAnthropicAdapter({
      id: provider.id,
      label: provider.label,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      timeoutMs: config.aiTimeoutMs,
    });
  }

  if (provider.id === 'google') {
    return createGoogleAdapter({
      id: provider.id,
      label: provider.label,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      timeoutMs: config.aiTimeoutMs,
    });
  }

  return createOpenAiCompatibleAdapter({
    id: provider.id,
    label: provider.label,
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    timeoutMs: config.aiTimeoutMs,
    extraHeaders:
      provider.id === 'openrouter'
        ? { 'HTTP-Referer': 'https://aivoicedispatcher.vercel.app', 'X-Title': 'AEGIS' }
        : undefined,
  });
}

export class ProviderRegistry {
  constructor(private readonly config: AppConfig) {}

  get(id: string): ProviderAdapter {
    const provider = this.config.providers.find(item => item.id === id);
    if (!provider) {
      throw new ProviderError('not_configured', `Unknown AI provider: ${id}`);
    }
    if (!provider.apiKey) {
      throw new ProviderError('not_configured', `${provider.label} is not configured on this deployment.`);
    }
    return createAdapter(this.config, provider);
  }

  isConfigured(id: string): boolean {
    return Boolean(this.config.providers.find(provider => provider.id === id)?.apiKey);
  }

  providerConfig(id: string): ProviderConfig | undefined {
    return this.config.providers.find(provider => provider.id === id);
  }
}

import type { ChatRequest, ChatResult, ProviderAdapter } from './types.js';
import { ProviderError, fetchJson } from './types.js';

interface AnthropicPayload {
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
  stop_reason?: string;
}

export function createAnthropicAdapter(options: {
  id: string;
  label: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}): ProviderAdapter {
  return {
    id: options.id,
    label: options.label,
    async chat(request: ChatRequest): Promise<ChatResult> {
      const messages = request.messages
        .filter(message => message.role !== 'system')
        .map(message => ({ role: message.role, content: message.content }));

      if (messages.length === 0) {
        throw new ProviderError('invalid_response', 'At least one user message is required.');
      }

      const payload = (await fetchJson(
        `${options.baseUrl}/v1/messages`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': options.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: request.model,
            max_tokens: request.maxTokens ?? 1024,
            temperature: request.temperature ?? 0.7,
            ...(request.system ? { system: request.system } : {}),
            messages,
          }),
        },
        options.timeoutMs,
        request.signal,
      )) as AnthropicPayload;

      const text = (payload.content ?? [])
        .filter(block => block.type === 'text' && typeof block.text === 'string')
        .map(block => block.text)
        .join('\n')
        .trim();

      if (!text) {
        throw new ProviderError('invalid_response', 'The AI provider returned an empty response.');
      }

      return {
        text,
        providerId: options.id,
        model: request.model,
        usage: {
          inputTokens: payload.usage?.input_tokens,
          outputTokens: payload.usage?.output_tokens,
        },
      };
    },
  };
}

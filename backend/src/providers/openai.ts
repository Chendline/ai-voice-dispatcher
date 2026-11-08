import type { ChatRequest, ChatResult, ProviderAdapter } from './types.js';
import { ProviderError, fetchJson } from './types.js';

interface OpenAiPayload {
  choices?: {
    message?: { content?: string | null };
    finish_reason?: string;
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function createOpenAiCompatibleAdapter(options: {
  id: string;
  label: string;
  apiKey: string | null;
  baseUrl: string;
  timeoutMs: number;
  extraHeaders?: Record<string, string>;
}): ProviderAdapter {
  return {
    id: options.id,
    label: options.label,
    async chat(request: ChatRequest): Promise<ChatResult> {
      const messages = [
        ...(request.system ? [{ role: 'system' as const, content: request.system }] : []),
        ...request.messages.map(message => ({ role: message.role, content: message.content })),
      ];

      if (!messages.some(message => message.role === 'user')) {
        throw new ProviderError('invalid_response', 'At least one user message is required.');
      }

      const payload = (await fetchJson(
        `${options.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
            ...options.extraHeaders,
          },
          body: JSON.stringify({
            model: request.model,
            messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens ?? 1024,
          }),
        },
        options.timeoutMs,
        request.signal,
      )) as OpenAiPayload;

      const text = (payload.choices?.[0]?.message?.content ?? '').trim();
      if (!text) {
        throw new ProviderError('invalid_response', 'The AI provider returned an empty response.');
      }

      return {
        text,
        providerId: options.id,
        model: request.model,
        usage: {
          inputTokens: payload.usage?.prompt_tokens,
          outputTokens: payload.usage?.completion_tokens,
        },
      };
    },
  };
}

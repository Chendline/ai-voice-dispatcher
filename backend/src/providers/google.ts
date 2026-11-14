import type { ChatRequest, ChatResult, ProviderAdapter } from './types.js';
import { ProviderError, fetchJson, streamSse } from './types.js';

interface GeminiPayload {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

export function createGoogleAdapter(options: {
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
      const contents = request.messages
        .filter(message => message.role !== 'system')
        .map(message => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        }));

      if (contents.length === 0) {
        throw new ProviderError('invalid_response', 'At least one user message is required.');
      }

      const model = encodeURIComponent(request.model);
      const payload = (await fetchJson(
        `${options.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(options.apiKey)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...(request.system ? { systemInstruction: { parts: [{ text: request.system }] } } : {}),
            contents,
            generationConfig: {
              temperature: request.temperature ?? 0.7,
              maxOutputTokens: request.maxTokens ?? 1024,
            },
          }),
        },
        options.timeoutMs,
        request.signal,
      )) as GeminiPayload;

      const text = (payload.candidates?.[0]?.content?.parts ?? [])
        .map(part => part.text ?? '')
        .join('')
        .trim();

      if (!text) {
        throw new ProviderError('invalid_response', 'The AI provider returned an empty response.');
      }

      return {
        text,
        providerId: options.id,
        model: request.model,
        usage: {
          inputTokens: payload.usageMetadata?.promptTokenCount,
          outputTokens: payload.usageMetadata?.candidatesTokenCount,
        },
      };
    },
    async streamChat(request: ChatRequest, onChunk: (text: string) => void): Promise<ChatResult> {
      const contents = request.messages
        .filter(message => message.role !== 'system')
        .map(message => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        }));

      if (contents.length === 0) {
        throw new ProviderError('invalid_response', 'At least one user message is required.');
      }

      const model = encodeURIComponent(request.model);
      let accumulated = '';

      await streamSse(
        `${options.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(options.apiKey)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...(request.system ? { systemInstruction: { parts: [{ text: request.system }] } } : {}),
            contents,
            generationConfig: {
              temperature: request.temperature ?? 0.7,
              maxOutputTokens: request.maxTokens ?? 1024,
            },
          }),
        },
        options.timeoutMs,
        request.signal,
        (line: string) => {
          if (!line.startsWith('data:')) return;
          const payloadStr = line.slice(5).trim();
          try {
            const data = JSON.parse(payloadStr) as GeminiPayload;
            const delta = (data.candidates?.[0]?.content?.parts ?? [])
              .map(part => part.text ?? '')
              .join('');
            if (delta) {
              accumulated += delta;
              onChunk(delta);
            }
          } catch {
            // Ignore partial/malformed stream line
          }
        },
      );

      const text = accumulated.trim();
      if (!text) {
        throw new ProviderError('invalid_response', 'The AI provider returned an empty response.');
      }

      return {
        text,
        providerId: options.id,
        model: request.model,
      };
    },
  };
}

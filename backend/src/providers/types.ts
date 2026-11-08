export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ChatUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface ChatResult {
  text: string;
  providerId: string;
  model: string;
  usage?: ChatUsage;
}

export interface ProviderAdapter {
  id: string;
  label: string;
  chat(request: ChatRequest): Promise<ChatResult>;
}

export type ProviderErrorCode =
  | 'not_configured'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'timeout'
  | 'network'
  | 'invalid_response'
  | 'upstream_error';

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly status?: number;

  constructor(code: ProviderErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.status = status;
  }
}

export function classifyStatus(status: number): ProviderErrorCode {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'upstream_error';
  return 'upstream_error';
}

export async function readErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return '';
    try {
      const parsed = JSON.parse(text) as {
        error?: { message?: string } | string;
        message?: string;
      };
      const detail =
        typeof parsed.error === 'string'
          ? parsed.error
          : parsed.error?.message ?? parsed.message;
      return (detail ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
    } catch {
      return text.replace(/\s+/g, ' ').trim().slice(0, 240);
    }
  } catch {
    return '';
  }
}

export async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  const forwardAbort = () => controller.abort(signal?.reason);

  if (signal) {
    if (signal.aborted) forwardAbort();
    else signal.addEventListener('abort', forwardAbort, { once: true });
  }

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      const code = classifyStatus(response.status);
      throw new ProviderError(
        code,
        detail || `The AI provider responded with HTTP ${response.status}.`,
        response.status,
      );
    }
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (controller.signal.aborted) {
      throw new ProviderError('timeout', 'The AI provider did not respond before the timeout.');
    }
    throw new ProviderError('network', 'The AI provider could not be reached.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

import type { FastnConfig } from './config.js';

export type FastnErrorCode =
  | 'not_configured'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'not_published'
  | 'rate_limited'
  | 'timeout'
  | 'network'
  | 'invalid_response'
  | 'upstream_error';

export class FastnError extends Error {
  public readonly code: FastnErrorCode;
  public readonly status?: number;
  public readonly detail?: string;

  constructor(code: FastnErrorCode, message: string, options: { status?: number; detail?: string } = {}) {
    super(message);
    this.name = 'FastnError';
    this.code = code;
    this.status = options.status;
    this.detail = options.detail;
  }
}

export type WorkflowExecution =
  | { outcome: 'succeeded'; httpStatus: number; data: unknown }
  | { outcome: 'queued'; httpStatus: number; executionId?: string };

export interface ExecuteOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const MAX_RESPONSE_CHARS = 200_000;

function sanitize(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, 200) : undefined;
}

function redact(text: string | undefined, secret: string | null): string | undefined {
  if (!text) return undefined;
  return secret ? text.split(secret).join('[redacted]') : text;
}

function readExecutionId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  for (const key of ['executionId', 'execution_id', 'id']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function errorDetail(payload: unknown, status: number, secret: string | null): string | undefined {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const raw = sanitize(record.error) ?? sanitize(record.message) ?? sanitize(record.detail);
    const required = sanitize(record.required);
    const detail = required ? `${raw ?? 'Permission denied'} (requires: ${required})` : raw;
    return redact(detail, secret) ?? `FastN responded with HTTP ${status}`;
  }
  return `FastN responded with HTTP ${status}`;
}

function mapHttpError(status: number, payload: unknown, secret: string | null): FastnError {
  const detail = errorDetail(payload, status, secret);
  const codeText = payload && typeof payload === 'object'
    ? String((payload as Record<string, unknown>).code ?? '')
    : '';

  if (codeText === 'WORKFLOW_NOT_PUBLISHED' || (detail ?? '').includes('WORKFLOW_NOT_PUBLISHED')) {
    return new FastnError('not_published', 'The FastN workflow has no published version.', { status, detail });
  }
  if (status === 401) return new FastnError('unauthorized', 'FastN rejected the API key.', { status, detail });
  if (status === 403) return new FastnError('forbidden', 'The FastN API key lacks the required permission.', { status, detail });
  if (status === 404) return new FastnError('not_found', 'FastN workflow or resource was not found.', { status, detail });
  if (status === 429) return new FastnError('rate_limited', 'FastN rate limit reached.', { status, detail });
  return new FastnError('upstream_error', 'FastN returned an error response.', { status, detail });
}

/**
 * Executes a published FastN workflow.
 * Docs: POST {FASTN_API_BASE_URL}/api/v1/workflows/{workflowId}/execute
 */
export async function executeWorkflow(
  config: FastnConfig,
  workflowId: string | undefined,
  input: Record<string, unknown>,
  options: ExecuteOptions = {},
): Promise<WorkflowExecution> {
  if (!config.apiKey) {
    throw new FastnError('not_configured', 'FastN is not configured: FASTN_API_KEY is missing.');
  }
  if (!workflowId) {
    throw new FastnError('not_configured', 'No FastN workflow id is configured for this connector.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };
  if (config.apiKey.startsWith('fsk_test_')) headers['X-fastn-Test-Mode'] = 'true';
  if (config.environment) headers['x-fastn-env'] = config.environment;

  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}/api/v1/workflows/${encodeURIComponent(workflowId)}/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });
  } catch (error) {
    const name = (error as Error)?.name;
    if (name === 'AbortError') {
      throw new FastnError('timeout', `FastN did not respond within ${config.timeoutMs}ms.`);
    }
    throw new FastnError('network', 'Could not reach FastN.');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }

  const text = await response.text().catch(() => '');
  if (text.length > MAX_RESPONSE_CHARS) {
    throw new FastnError('invalid_response', 'FastN response was too large to process.');
  }

  let payload: unknown = null;
  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new FastnError('invalid_response', 'FastN returned a non-JSON response.', {
        status: response.status,
        detail: redact(sanitize(text), config.apiKey),
      });
    }
  }

  if (!response.ok && response.status === 404 && headers['x-end-org-ref']) {
    const errorMsg = (typeof payload === 'object' && payload && 'error' in payload)
      ? String((payload as Record<string, unknown>).error ?? '')
      : text;
    if (errorMsg.includes('No customer found for external_ref')) {
      const fallbackHeaders = { ...headers };
      delete fallbackHeaders['x-end-org-ref'];
      try {
        const fallbackRes = await fetch(`${config.apiBaseUrl}/api/v1/workflows/${encodeURIComponent(workflowId)}/execute`, {
          method: 'POST',
          headers: fallbackHeaders,
          body: JSON.stringify({ input }),
          signal: controller.signal,
        });
        if (fallbackRes.ok) {
          response = fallbackRes;
          const fallbackText = await response.text().catch(() => '');
          try {
            payload = JSON.parse(fallbackText);
          } catch {
            payload = null;
          }
        }
      } catch {
        // preserve original response handling if network/abort happens
      }
    }
  }

  if (!response.ok) throw mapHttpError(response.status, payload, config.apiKey);

  if (response.status === 202) {
    return { outcome: 'queued', httpStatus: 202, executionId: readExecutionId(payload) };
  }

  return { outcome: 'succeeded', httpStatus: response.status, data: payload };
}

import type {
  ConnectionMode,
  DispatchInput,
  DispatchLog,
  IntegrationId,
  Tenant,
  TenantSummary,
} from '../types';
import { demoApi } from './demoStore';

const configuredBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const API_BASE =
  (configuredBase ? configuredBase.replace(/\/+$/, '') : '') ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

// Static deployments (for example the default Vercel build) go straight to the
// browser sandbox instead of firing doomed requests at a non-existent /api.
const API_ENABLED = Boolean(configuredBase) || import.meta.env.DEV;

const DEFAULT_TIMEOUT = 2500;
const TRIGGER_TIMEOUT = 8000;

let connectionMode: ConnectionMode | null = API_ENABLED ? null : 'demo';

export function getConnectionMode(): ConnectionMode {
  return connectionMode ?? 'demo';
}

/**
 * A structured response from the Express API. These must never fall back to the
 * browser sandbox: doing so would fabricate a successful dispatch after a real
 * upstream failure.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  timeout = DEFAULT_TIMEOUT,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let message = `${path} responded with ${response.status}`;
      if (isJson) {
        const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
        if (body && typeof body.error === 'string' && body.error.trim()) {
          message = body.error;
        }
      }
      throw new ApiError(message, response.status);
    }

    if (!isJson) {
      throw new Error(`${path} is not serving the API`);
    }

    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

async function withFallback<T>(
  live: () => Promise<T>,
  sandbox: () => T,
): Promise<T> {
  if (connectionMode === 'demo') return sandbox();

  try {
    const result = await live();
    connectionMode = 'live';
    return result;
  } catch (error) {
    // The API answered, so the result is authoritative even when it is an error.
    if (error instanceof ApiError) throw error;
    connectionMode = 'demo';
    return sandbox();
  }
}

export async function loadTenants(): Promise<TenantSummary[]> {
  return withFallback(
    async () => {
      const data = await request<{ tenants: TenantSummary[] }>('/api/tenants');
      if (!Array.isArray(data.tenants) || data.tenants.length === 0) {
        throw new Error('No tenants returned');
      }
      return data.tenants;
    },
    () => demoApi.getTenants(),
  );
}

export async function loadTenant(tenantId: string): Promise<Tenant | null> {
  return withFallback(
    () => request<Tenant>(`/api/tenants/${tenantId}`),
    () => demoApi.getTenant(tenantId),
  );
}

export async function loadDispatchLogs(tenantId: string): Promise<DispatchLog[]> {
  return withFallback(
    async () => {
      const data = await request<{ logs: DispatchLog[] }>(`/api/tenants/${tenantId}/logs`);
      return Array.isArray(data.logs) ? data.logs : [];
    },
    () => demoApi.getLogs(tenantId),
  );
}

export async function triggerDispatch(input: DispatchInput): Promise<DispatchLog> {
  return withFallback(
    async () => {
      const data = await request<{ success: boolean; outcome?: string; message?: string; log?: DispatchLog }>(
        '/api/dispatch/trigger',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        TRIGGER_TIMEOUT,
      );
      // A failed dispatch is still a real, logged outcome. Return it so the UI can
      // show the per-connector failure instead of inventing a sandbox success.
      if (!data.log) throw new Error('Dispatch response contained no log.');
      return data.log;
    },
    () => demoApi.trigger(input),
  );
}

export async function setIntegration(
  tenantId: string,
  integrationId: IntegrationId,
  connected: boolean,
  accountEmail?: string,
): Promise<Tenant | null> {
  return withFallback(
    () =>
      request<Tenant>(`/api/tenants/${tenantId}/integrations/${integrationId}`, {
        method: 'POST',
        body: JSON.stringify({ connected, accountEmail }),
      }),
    () => demoApi.updateIntegration(tenantId, integrationId, connected, accountEmail),
  );
}

export function resetSandbox() {
  demoApi.reset();
}

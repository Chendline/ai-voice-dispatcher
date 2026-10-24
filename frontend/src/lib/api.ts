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

    if (!response.ok) {
      throw new Error(`${path} responded with ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
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
  } catch {
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
      const data = await request<{ success: boolean; log: DispatchLog }>(
        '/api/dispatch/trigger',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
        TRIGGER_TIMEOUT,
      );
      if (!data.success || !data.log) throw new Error('Dispatch rejected');
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

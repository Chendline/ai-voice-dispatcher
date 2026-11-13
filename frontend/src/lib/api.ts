import type {
  Agent,
  AgentInput,
  AuthStatus,
  Conversation,
  ConversationSummary,
  DispatchLog,
  DispatchPlan,
  HealthResponse,
  ProviderConfigResponse,
  PublicDispatchTarget,
  PublicUser,
  TargetInput,
  WorkspaceBootstrap,
} from '../types';

const configuredBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const API_BASE =
  (configuredBase ? configuredBase.replace(/\/+$/, '') : '') ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

const DEFAULT_TIMEOUT = 8000;
const AI_TIMEOUT = 65_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit, timeout = DEFAULT_TIMEOUT): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const body = isJson
      ? ((await response.json().catch(() => null)) as { error?: unknown; code?: unknown } | null)
      : null;

    if (!response.ok) {
      const message =
        body && typeof body.error === 'string' && body.error.trim()
          ? body.error
          : `The AEGIS API responded with HTTP ${response.status}.`;
      const code = body && typeof body.code === 'string' ? body.code : undefined;
      throw new ApiError(message, response.status, code);
    }

    if (!isJson) {
      throw new ApiError('The AEGIS API is not reachable at this address.', response.status);
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError('The request took too long. Please try again.', 0, 'timeout');
    }
    throw new ApiError('The AEGIS API is offline. Start the backend and reload.', 0, 'network');
  } finally {
    window.clearTimeout(timer);
  }
}

function jsonBody(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) };
}

function putBody(body: unknown): RequestInit {
  return { method: 'PUT', body: JSON.stringify(body) };
}

export const api = {
  baseUrl: API_BASE || window.location.origin,

  health: () => request<HealthResponse>('/api/health'),

  workspace: () => request<WorkspaceBootstrap>('/api/workspace'),

  providers: () => request<ProviderConfigResponse>('/api/providers'),

  listAgents: async () => (await request<{ agents: Agent[] }>('/api/agents')).agents,

  createAgent: async (input: AgentInput) =>
    (await request<{ agent: Agent }>('/api/agents', jsonBody(input))).agent,

  updateAgent: async (agentId: string, input: AgentInput) =>
    (await request<{ agent: Agent }>(`/api/agents/${agentId}`, putBody(input))).agent,

  deleteAgent: (agentId: string) =>
    request<{ deleted: boolean }>(`/api/agents/${agentId}`, { method: 'DELETE' }),

  listConversations: async () =>
    (await request<{ conversations: ConversationSummary[] }>('/api/conversations')).conversations,

  getConversation: async (conversationId: string) =>
    (await request<{ conversation: Conversation }>(`/api/conversations/${conversationId}`)).conversation,

  createConversation: async (agentId: string) =>
    (await request<{ conversation: Conversation }>('/api/conversations', jsonBody({ agentId })))
      .conversation,

  deleteConversation: (conversationId: string) =>
    request<{ deleted: boolean }>(`/api/conversations/${conversationId}`, { method: 'DELETE' }),

  chat: (input: { agentId: string; conversationId?: string; message: string }) =>
    request<{ conversation: Conversation; reply: Conversation['messages'][number] }>(
      '/api/chat',
      jsonBody(input),
      AI_TIMEOUT,
    ),

  planDispatch: (input: { instruction: string; agentId?: string }) =>
    request<{ plan: DispatchPlan; targets: PublicDispatchTarget[] }>(
      '/api/dispatch/plan',
      jsonBody(input),
      AI_TIMEOUT,
    ),

  executeDispatch: (input: { plan: DispatchPlan; agentId?: string; targetIds?: string[] }) =>
    request<{ success: boolean; status: string; message: string; log: DispatchLog }>(
      '/api/dispatch/execute',
      jsonBody(input),
      AI_TIMEOUT,
    ),

  listDispatchLogs: async () =>
    (await request<{ logs: DispatchLog[] }>('/api/dispatch/logs')).logs,

  listTargets: async () =>
    (await request<{ targets: PublicDispatchTarget[] }>('/api/targets')).targets,

  createTarget: async (input: TargetInput) =>
    (await request<{ target: PublicDispatchTarget }>('/api/targets', jsonBody(input))).target,

  updateTarget: async (targetId: string, input: TargetInput) =>
    (await request<{ target: PublicDispatchTarget }>(`/api/targets/${targetId}`, putBody(input)))
      .target,

  deleteTarget: (targetId: string) =>
    request<{ deleted: boolean }>(`/api/targets/${targetId}`, { method: 'DELETE' }),

  testTarget: (targetId: string) =>
    request<{ result: DispatchLog['results'][number]; target: PublicDispatchTarget }>(
      `/api/targets/${targetId}/test`,
      { method: 'POST' },
      30_000,
    ),

  // Auth & User Management (On-Server SQLite)
  getAuthStatus: () => request<AuthStatus>('/api/auth/status'),

  setupAuth: (input: { email: string; password: string; name: string }) =>
    request<{ user: PublicUser; token: string }>('/api/auth/setup', jsonBody(input)),

  login: (input: { email: string; password: string }) =>
    request<{ user: PublicUser; token: string }>('/api/auth/login', jsonBody(input)),

  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  getMe: () => request<{ user: PublicUser }>('/api/auth/me'),

  listUsers: () => request<{ users: PublicUser[] }>('/api/auth/users'),
};

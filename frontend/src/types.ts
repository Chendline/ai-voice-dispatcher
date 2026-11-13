export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TargetType = 'webhook' | 'slack';
export type DispatchStatus = 'dispatched' | 'partial' | 'failed' | 'skipped';

export type UserRole = 'admin' | 'operator' | 'auditor';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthStatus {
  initialized: boolean;
  user: PublicUser | null;
}

export interface ProviderInfo {
  id: string;
  label: string;
  configured: boolean;
  defaultModel: string;
  models: string[];
  compatible: boolean;
}

export interface ProviderConfigResponse {
  defaultProvider: string | null;
  defaultModel: string | null;
  aiTimeoutMs: number;
  dispatchTimeoutMs: number;
  providers: ProviderInfo[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  providerId: string;
  modelId: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  voiceRate: number;
  voicePitch: number;
  targetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentInput {
  name: string;
  description: string;
  providerId: string;
  modelId: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  voiceRate: number;
  voicePitch: number;
  targetIds: string[];
}

export interface ChatUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  providerId?: string;
  modelId?: string;
  usage?: ChatUsage;
}

export interface Conversation {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  providerId: string;
  modelId: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  agentId: string;
  agentName: string;
  providerId: string;
  modelId: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicDispatchTarget {
  id: string;
  name: string;
  type: TargetType;
  host: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
  lastStatus?: 'success' | 'failed';
}

export interface TargetInput {
  name: string;
  type: TargetType;
  url: string;
  enabled: boolean;
}

export interface DispatchPlan {
  id?: string;
  title: string;
  summary: string;
  priority: Priority;
  instruction: string;
  targetIds: string[];
  source: 'ai' | 'rules';
  providerId?: string;
  modelId?: string;
  createdAt?: string;
  notice?: string;
}

export interface DispatchResult {
  targetId: string;
  targetName: string;
  type: TargetType;
  host: string;
  status: 'success' | 'failed';
  httpStatus?: number;
  durationMs: number;
  detail?: string;
}

export interface DispatchLog {
  id: string;
  timestamp: string;
  agentId?: string;
  plan: DispatchPlan;
  results: DispatchResult[];
  status: DispatchStatus;
  message: string;
}

export interface WorkspaceBootstrap {
  config: ProviderConfigResponse;
  storage: 'blob' | 'memory';
  agents: Agent[];
  conversations: ConversationSummary[];
  targets: PublicDispatchTarget[];
  logs: DispatchLog[];
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  storage: 'blob' | 'memory';
  ai: {
    defaultProvider: string | null;
    defaultModel: string | null;
    providers: { id: string; label: string; configured: boolean }[];
  };
  dispatch: {
    targets: number;
    insecureWebhooks: boolean;
  };
}

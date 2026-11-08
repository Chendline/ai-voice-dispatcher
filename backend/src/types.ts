export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TARGET_TYPES = ['webhook', 'slack'] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

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

export interface DispatchTarget {
  id: string;
  name: string;
  type: TargetType;
  url: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
  lastStatus?: 'success' | 'failed';
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

export type DispatchStatus = 'dispatched' | 'partial' | 'failed' | 'skipped';

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

export interface DispatchPlan {
  id: string;
  title: string;
  summary: string;
  priority: Priority;
  instruction: string;
  targetIds: string[];
  source: 'ai' | 'rules';
  providerId?: string;
  modelId?: string;
  createdAt: string;
  notice?: string;
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

export interface WorkspaceState {
  version: number;
  agents: Agent[];
  conversations: Conversation[];
  targets: DispatchTarget[];
  dispatchLogs: DispatchLog[];
  updatedAt: string;
}

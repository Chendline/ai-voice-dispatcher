import { PRIORITIES, TARGET_TYPES, type Priority, type TargetType } from './types.js';

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_QUERY_LENGTH = 6000;
const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 400;
const MAX_PROMPT_LENGTH = 8000;
const MAX_MODEL_LENGTH = 120;
const MAX_URL_LENGTH = 2000;
const MAX_TARGETS_PER_AGENT = 24;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  value: unknown,
  field: string,
  maxLength: number,
  options: { required?: boolean } = {},
): ValidationResult<string> {
  if (value === undefined || value === null) {
    return options.required
      ? { ok: false, error: `${field} is required.` }
      : { ok: true, value: '' };
  }
  if (typeof value !== 'string') return { ok: false, error: `${field} must be a string.` };
  const trimmed = value.trim();
  if (options.required && !trimmed) return { ok: false, error: `${field} must not be empty.` };
  if (trimmed.length > maxLength) {
    return { ok: false, error: `${field} must be ${maxLength} characters or fewer.` };
  }
  return { ok: true, value: trimmed };
}

function readNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
  fallback: number,
): ValidationResult<number> {
  if (value === undefined || value === null) return { ok: true, value: fallback };
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return { ok: false, error: `${field} must be a number.` };
  if (numeric < min || numeric > max) {
    return { ok: false, error: `${field} must be between ${min} and ${max}.` };
  }
  return { ok: true, value: numeric };
}

function readBoolean(value: unknown, field: string, fallback: boolean): ValidationResult<boolean> {
  if (value === undefined || value === null) return { ok: true, value: fallback };
  if (typeof value !== 'boolean') return { ok: false, error: `${field} must be a boolean.` };
  return { ok: true, value };
}

function readStringArray(value: unknown, field: string, maxItems: number): ValidationResult<string[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return { ok: false, error: `${field} must be an array.` };
  if (value.length > maxItems) {
    return { ok: false, error: `${field} must contain at most ${maxItems} items.` };
  }
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim() || item.length > 120) {
      return { ok: false, error: `${field} must contain valid identifiers.` };
    }
    if (!items.includes(item)) items.push(item);
  }
  return { ok: true, value: items };
}

function readPriority(value: unknown, fallback: Priority = 'medium'): ValidationResult<Priority> {
  if (value === undefined || value === null) return { ok: true, value: fallback };
  if (typeof value !== 'string' || !PRIORITIES.includes(value as Priority)) {
    return { ok: false, error: `priority must be one of ${PRIORITIES.join(', ')}.` };
  }
  return { ok: true, value: value as Priority };
}

export interface ChatInput {
  agentId: string;
  conversationId?: string;
  message: string;
}

export function parseChatRequest(body: unknown): ValidationResult<ChatInput> {
  if (!isRecord(body)) return { ok: false, error: 'Request body must be a JSON object.' };
  const agentId = readString(body.agentId, 'agentId', 120, { required: true });
  if (!agentId.ok) return agentId;
  const conversationId = readString(body.conversationId, 'conversationId', 120);
  if (!conversationId.ok) return conversationId;
  const message = readString(body.message, 'message', MAX_QUERY_LENGTH, { required: true });
  if (!message.ok) return message;

  return {
    ok: true,
    value: {
      agentId: agentId.value,
      conversationId: conversationId.value || undefined,
      message: message.value,
    },
  };
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

export function parseAgentRequest(body: unknown): ValidationResult<AgentInput> {
  if (!isRecord(body)) return { ok: false, error: 'Request body must be a JSON object.' };

  const name = readString(body.name, 'name', MAX_NAME_LENGTH, { required: true });
  if (!name.ok) return name;
  const description = readString(body.description, 'description', MAX_DESCRIPTION_LENGTH);
  if (!description.ok) return description;
  const providerId = readString(body.providerId, 'providerId', 40, { required: true });
  if (!providerId.ok) return providerId;
  const modelId = readString(body.modelId, 'modelId', MAX_MODEL_LENGTH, { required: true });
  if (!modelId.ok) return modelId;
  const systemPrompt = readString(body.systemPrompt, 'systemPrompt', MAX_PROMPT_LENGTH, { required: true });
  if (!systemPrompt.ok) return systemPrompt;
  const temperature = readNumber(body.temperature, 'temperature', 0, 2, 0.6);
  if (!temperature.ok) return temperature;
  const maxTokens = readNumber(body.maxTokens, 'maxTokens', 64, 4096, 900);
  if (!maxTokens.ok) return maxTokens;
  const voiceRate = readNumber(body.voiceRate, 'voiceRate', 0.5, 2, 1);
  if (!voiceRate.ok) return voiceRate;
  const voicePitch = readNumber(body.voicePitch, 'voicePitch', 0, 2, 1);
  if (!voicePitch.ok) return voicePitch;
  const targetIds = readStringArray(body.targetIds, 'targetIds', MAX_TARGETS_PER_AGENT);
  if (!targetIds.ok) return targetIds;

  return {
    ok: true,
    value: {
      name: name.value,
      description: description.value,
      providerId: providerId.value,
      modelId: modelId.value,
      systemPrompt: systemPrompt.value,
      temperature: temperature.value,
      maxTokens: Math.round(maxTokens.value),
      voiceRate: voiceRate.value,
      voicePitch: voicePitch.value,
      targetIds: targetIds.value,
    },
  };
}

export interface TargetInput {
  name: string;
  type: TargetType;
  url: string;
  enabled: boolean;
}

export function parseTargetRequest(
  body: unknown,
  options: { requireUrl?: boolean } = {},
): ValidationResult<TargetInput> {
  if (!isRecord(body)) return { ok: false, error: 'Request body must be a JSON object.' };

  const name = readString(body.name, 'name', MAX_NAME_LENGTH, { required: true });
  if (!name.ok) return name;

  const type = body.type;
  if (typeof type !== 'string' || !TARGET_TYPES.includes(type as TargetType)) {
    return { ok: false, error: `type must be one of ${TARGET_TYPES.join(', ')}.` };
  }

  const url = readString(body.url, 'url', MAX_URL_LENGTH, { required: options.requireUrl !== false });
  if (!url.ok) return url;
  if (url.value) {
    try {
      const parsed = new URL(url.value);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { ok: false, error: 'url must use https.' };
      }
      if (parsed.username || parsed.password) {
        return { ok: false, error: 'url must not contain a username or password.' };
      }
    } catch {
      return { ok: false, error: 'url must be a valid URL.' };
    }
  }

  const enabled = readBoolean(body.enabled, 'enabled', true);
  if (!enabled.ok) return enabled;

  return {
    ok: true,
    value: { name: name.value, type: type as TargetType, url: url.value, enabled: enabled.value },
  };
}

export interface PlanInput {
  instruction: string;
  agentId?: string;
}

export function parsePlanRequest(body: unknown): ValidationResult<PlanInput> {
  if (!isRecord(body)) return { ok: false, error: 'Request body must be a JSON object.' };
  const instruction = readString(body.instruction, 'instruction', MAX_QUERY_LENGTH, { required: true });
  if (!instruction.ok) return instruction;
  const agentId = readString(body.agentId, 'agentId', 120);
  if (!agentId.ok) return agentId;
  return { ok: true, value: { instruction: instruction.value, agentId: agentId.value || undefined } };
}

export interface ClientPlan {
  title: string;
  summary: string;
  priority: Priority;
  instruction: string;
  targetIds: string[];
  source: 'ai' | 'rules';
  providerId?: string;
  modelId?: string;
  notice?: string;
}

export interface ExecuteInput {
  plan: ClientPlan;
  agentId?: string;
  targetIds?: string[];
}

export function parseExecuteRequest(body: unknown): ValidationResult<ExecuteInput> {
  if (!isRecord(body)) return { ok: false, error: 'Request body must be a JSON object.' };
  const rawPlan = body.plan;
  if (!isRecord(rawPlan)) return { ok: false, error: 'plan must be a JSON object.' };

  const title = readString(rawPlan.title, 'plan.title', MAX_NAME_LENGTH, { required: true });
  if (!title.ok) return title;
  const summary = readString(rawPlan.summary, 'plan.summary', 600, { required: true });
  if (!summary.ok) return summary;
  const priority = readPriority(rawPlan.priority);
  if (!priority.ok) return priority;
  const instruction = readString(rawPlan.instruction, 'plan.instruction', MAX_QUERY_LENGTH, { required: true });
  if (!instruction.ok) return instruction;
  const planTargetIds = readStringArray(rawPlan.targetIds, 'plan.targetIds', MAX_TARGETS_PER_AGENT);
  if (!planTargetIds.ok) return planTargetIds;
  const targetIds = readStringArray(body.targetIds, 'targetIds', MAX_TARGETS_PER_AGENT);
  if (!targetIds.ok) return targetIds;
  const agentId = readString(body.agentId, 'agentId', 120);
  if (!agentId.ok) return agentId;
  const source = rawPlan.source === 'ai' ? 'ai' : 'rules';
  const providerId = readString(rawPlan.providerId, 'plan.providerId', 40);
  if (!providerId.ok) return providerId;
  const modelId = readString(rawPlan.modelId, 'plan.modelId', 120);
  if (!modelId.ok) return modelId;
  const notice = readString(rawPlan.notice, 'plan.notice', 400);
  if (!notice.ok) return notice;

  return {
    ok: true,
    value: {
      plan: {
        title: title.value,
        summary: summary.value,
        priority: priority.value,
        instruction: instruction.value,
        targetIds: planTargetIds.value,
        source,
        providerId: providerId.value || undefined,
        modelId: modelId.value || undefined,
        notice: notice.value || undefined,
      },
      targetIds: targetIds.value.length > 0 ? targetIds.value : undefined,
      agentId: agentId.value || undefined,
    },
  };
}

export function parseConversationRequest(body: unknown): ValidationResult<{ agentId: string }> {
  if (!isRecord(body)) return { ok: false, error: 'Request body must be a JSON object.' };
  const agentId = readString(body.agentId, 'agentId', 120, { required: true });
  if (!agentId.ok) return agentId;
  return { ok: true, value: { agentId: agentId.value } };
}

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'openrouter'
  | 'groq'
  | 'compatible';

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  apiKey: string | null;
  baseUrl: string;
  defaultModel: string;
  models: string[];
  compatible: boolean;
}

export interface AppConfig {
  port: number;
  frontendOrigins: string[];
  aiTimeoutMs: number;
  defaultProvider: ProviderId | null;
  defaultModel: string | null;
  providers: ProviderConfig[];
  dispatchTimeoutMs: number;
  allowInsecureWebhooks: boolean;
  stateId: string;
  warnings: string[];
}

const PLACEHOLDER = /your[_-]|_here$|^changeme$/i;

function readKey(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value || PLACEHOLDER.test(value)) return null;
  return value;
}

function readTimeout(raw: string | undefined, fallback: number, field: string, warnings: string[]): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1000 || parsed > 60_000) {
    warnings.push(`${field} must be between 1000 and 60000; using ${fallback}.`);
    return fallback;
  }
  return Math.round(parsed);
}

function readHttpsBase(raw: string, fallback: string, field: string, warnings: string[]): string {
  const value = (raw?.trim() || fallback).replace(/\/+$/, '');
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') throw new Error('not https');
    return value;
  } catch {
    warnings.push(`${field} must be an https URL; using ${fallback}.`);
    return fallback;
  }
}

function readModels(raw: string | undefined, fallback: string[]): string[] {
  const parsed = (raw ?? '')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean);
  return parsed.length > 0 ? [...new Set([...parsed, ...fallback])] : fallback;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const warnings: string[] = [];

  const anthropicModel = env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-5';
  const openaiModel = env.OPENAI_MODEL?.trim() || 'gpt-4.1';
  const googleModel = env.GOOGLE_MODEL?.trim() || 'gemini-2.5-pro';
  const openrouterModel = env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4.1';
  const groqModel = env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';

  const providers: ProviderConfig[] = [
    {
      id: 'anthropic',
      label: 'Anthropic',
      apiKey: readKey(env.ANTHROPIC_API_KEY),
      baseUrl: readHttpsBase(env.ANTHROPIC_BASE_URL ?? '', 'https://api.anthropic.com', 'ANTHROPIC_BASE_URL', warnings),
      defaultModel: anthropicModel,
      models: readModels(env.ANTHROPIC_MODELS, [
        anthropicModel,
        'claude-sonnet-4-5',
        'claude-haiku-4-5',
        'claude-opus-4-1',
      ]),
      compatible: false,
    },
    {
      id: 'openai',
      label: 'OpenAI',
      apiKey: readKey(env.OPENAI_API_KEY),
      baseUrl: readHttpsBase(env.OPENAI_BASE_URL ?? '', 'https://api.openai.com/v1', 'OPENAI_BASE_URL', warnings),
      defaultModel: openaiModel,
      models: readModels(env.OPENAI_MODELS, [openaiModel, 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4o-mini']),
      compatible: false,
    },
    {
      id: 'google',
      label: 'Google Gemini',
      apiKey: readKey(env.GOOGLE_API_KEY) ?? readKey(env.GEMINI_API_KEY),
      baseUrl: readHttpsBase(env.GOOGLE_BASE_URL ?? '', 'https://generativelanguage.googleapis.com/v1beta', 'GOOGLE_BASE_URL', warnings),
      defaultModel: googleModel,
      models: readModels(env.GOOGLE_MODELS, [googleModel, 'gemini-2.5-pro', 'gemini-2.5-flash']),
      compatible: false,
    },
    {
      id: 'openrouter',
      label: 'OpenRouter',
      apiKey: readKey(env.OPENROUTER_API_KEY),
      baseUrl: readHttpsBase(env.OPENROUTER_BASE_URL ?? '', 'https://openrouter.ai/api/v1', 'OPENROUTER_BASE_URL', warnings),
      defaultModel: openrouterModel,
      models: readModels(env.OPENROUTER_MODELS, [openrouterModel, 'anthropic/claude-sonnet-4.5', 'openai/gpt-4.1']),
      compatible: false,
    },
    {
      id: 'groq',
      label: 'Groq',
      apiKey: readKey(env.GROQ_API_KEY),
      baseUrl: readHttpsBase(env.GROQ_BASE_URL ?? '', 'https://api.groq.com/openai/v1', 'GROQ_BASE_URL', warnings),
      defaultModel: groqModel,
      models: readModels(env.GROQ_MODELS, [groqModel, 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant']),
      compatible: false,
    },
  ];

  const compatibleBase = env.AI_COMPATIBLE_BASE_URL?.trim();
  const compatibleKey = readKey(env.AI_COMPATIBLE_API_KEY);
  if (compatibleBase) {
    let safeBase = compatibleBase.replace(/\/+$/, '');
    try {
      const url = new URL(safeBase);
      const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
      if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
        throw new Error('insecure');
      }
    } catch {
      warnings.push('AI_COMPATIBLE_BASE_URL must be https (http is allowed only for localhost); ignoring it.');
      safeBase = '';
    }

    if (safeBase) {
      const compatibleModel = env.AI_COMPATIBLE_MODEL?.trim() || 'default';
      providers.push({
        id: 'compatible',
        label: env.AI_COMPATIBLE_NAME?.trim() || 'OpenAI-compatible',
        apiKey: compatibleKey,
        baseUrl: safeBase,
        defaultModel: compatibleModel,
        models: readModels(env.AI_COMPATIBLE_MODELS, [compatibleModel]),
        compatible: true,
      });
    }
  }

  for (const provider of providers) {
    if (!provider.apiKey) {
      warnings.push(`${provider.label} is not configured (no API key).`);
    }
  }

  const configured = providers.filter(provider => provider.apiKey);
  const requestedDefault = env.AI_DEFAULT_PROVIDER?.trim().toLowerCase();
  let defaultProvider: ProviderId | null = configured[0]?.id ?? null;

  if (requestedDefault) {
    const match = providers.find(provider => provider.id === requestedDefault);
    if (!match) {
      warnings.push(`AI_DEFAULT_PROVIDER "${requestedDefault}" is unknown; using ${defaultProvider ?? 'none'}.`);
    } else if (!match.apiKey) {
      warnings.push(`AI_DEFAULT_PROVIDER "${requestedDefault}" has no API key; using ${defaultProvider ?? 'none'}.`);
    } else {
      defaultProvider = match.id;
    }
  }

  const defaultProviderConfig = providers.find(provider => provider.id === defaultProvider);
  const requestedModel = env.AI_DEFAULT_MODEL?.trim();
  const defaultModel = requestedModel || defaultProviderConfig?.defaultModel || null;

  const origins = (env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return {
    port: Number(env.PORT) || 3001,
    frontendOrigins: origins,
    aiTimeoutMs: readTimeout(env.AI_TIMEOUT_MS, 45_000, 'AI_TIMEOUT_MS', warnings),
    defaultProvider,
    defaultModel,
    providers,
    dispatchTimeoutMs: readTimeout(env.DISPATCH_TIMEOUT_MS, 8000, 'DISPATCH_TIMEOUT_MS', warnings),
    allowInsecureWebhooks: /^(1|true|yes)$/i.test(env.DISPATCH_ALLOW_INSECURE ?? ''),
    stateId: env.AEGIS_STATE_ID?.trim() || 'default',
    warnings,
  };
}

export function providerById(config: AppConfig, id: string): ProviderConfig | undefined {
  return config.providers.find(provider => provider.id === id);
}

export function configuredProviders(config: AppConfig): ProviderConfig[] {
  return config.providers.filter(provider => provider.apiKey);
}

export function publicConfig(config: AppConfig) {
  return {
    defaultProvider: config.defaultProvider,
    defaultModel: config.defaultModel,
    aiTimeoutMs: config.aiTimeoutMs,
    dispatchTimeoutMs: config.dispatchTimeoutMs,
    providers: config.providers.map(provider => ({
      id: provider.id,
      label: provider.label,
      configured: Boolean(provider.apiKey),
      defaultModel: provider.defaultModel,
      models: provider.models,
      compatible: provider.compatible,
    })),
  };
}

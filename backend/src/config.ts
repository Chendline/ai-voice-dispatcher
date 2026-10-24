import type { IntegrationType } from './tenantStore.js';

export type ConnectorMode = 'live' | 'simulated';
export type ConnectorModeSetting = 'auto' | 'live' | 'simulated';

export interface FastnConfig {
  apiKey: string | null;
  workspaceId: string | null;
  apiBaseUrl: string;
  environment: string | null;
  timeoutMs: number;
  modeSetting: ConnectorModeSetting;
  workflows: Partial<Record<IntegrationType, string>>;
  warnings: string[];
}

const WORKFLOW_ENV: Record<IntegrationType, string> = {
  hubspot: 'FASTN_WORKFLOW_HUBSPOT',
  slack: 'FASTN_WORKFLOW_SLACK',
  gmail: 'FASTN_WORKFLOW_GMAIL',
  sheets: 'FASTN_WORKFLOW_SHEETS',
  twilio: 'FASTN_WORKFLOW_TWILIO',
};

export function workflowEnvName(connector: IntegrationType): string {
  return WORKFLOW_ENV[connector];
}

export const CONNECTORS: IntegrationType[] = ['hubspot', 'slack', 'gmail', 'sheets', 'twilio'];

export const OUTBOUND_CONNECTORS: IntegrationType[] = ['hubspot', 'slack', 'gmail', 'sheets'];

const WORKFLOW_ID_PATTERN = /^wf_[A-Za-z0-9]{6,64}$/;

function readTimeout(raw: string | undefined, warnings: string[]): number {
  if (!raw) return 7000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1000 || parsed > 25000) {
    warnings.push('FASTN_TIMEOUT_MS must be between 1000 and 25000; using 7000.');
    return 7000;
  }
  return Math.round(parsed);
}

export function readFastnConfig(env: NodeJS.ProcessEnv = process.env): FastnConfig {
  const warnings: string[] = [];
  const apiKey = env.FASTN_API_KEY?.trim() || null;
  const workspaceId = env.FASTN_WORKSPACE_ID?.trim() || null;
  const workflows: Partial<Record<IntegrationType, string>> = {};

  for (const connector of CONNECTORS) {
    const raw = env[WORKFLOW_ENV[connector]]?.trim();
    if (!raw) continue;
    if (!WORKFLOW_ID_PATTERN.test(raw)) {
      warnings.push(`${WORKFLOW_ENV[connector]} is not a workflow id (expected wf_...); ignoring it.`);
      continue;
    }
    workflows[connector] = raw;
  }

  let modeSetting: ConnectorModeSetting = 'auto';
  const rawMode = env.FASTN_MODE?.trim().toLowerCase();
  if (rawMode === 'live' || rawMode === 'simulated' || rawMode === 'auto') {
    modeSetting = rawMode;
  } else if (rawMode) {
    warnings.push('FASTN_MODE must be auto, live or simulated; using auto.');
  }

  const apiBaseUrl = (env.FASTN_API_BASE_URL?.trim() || 'https://api.fastn.dev').replace(/\/+$/, '');
  if (!/^https:\/\//i.test(apiBaseUrl)) {
    warnings.push('FASTN_API_BASE_URL must use https; using https://api.fastn.dev.');
  }

  if (!apiKey) warnings.push('FASTN_API_KEY is not set; connectors run in simulated mode.');
  if (apiKey && !workspaceId) warnings.push('FASTN_WORKSPACE_ID is not set.');

  return {
    apiKey,
    workspaceId,
    apiBaseUrl: /^https:\/\//i.test(apiBaseUrl) ? apiBaseUrl : 'https://api.fastn.dev',
    environment: env.FASTN_ENV?.trim() || null,
    timeoutMs: readTimeout(env.FASTN_TIMEOUT_MS?.trim(), warnings),
    modeSetting,
    workflows,
    warnings,
  };
}

export function connectorMode(config: FastnConfig): ConnectorMode {
  if (config.modeSetting === 'simulated') return 'simulated';
  if (config.modeSetting === 'live') return 'live';
  return Object.keys(config.workflows).length > 0 ? 'live' : 'simulated';
}

export function workflowIdFor(config: FastnConfig, connector: IntegrationType): string | undefined {
  return config.workflows[connector];
}

export function describeFastn(config: FastnConfig) {
  return {
    configured: Boolean(config.apiKey),
    workspaceConfigured: Boolean(config.workspaceId),
    mode: connectorMode(config),
    workflows: Object.keys(config.workflows),
    warnings: config.warnings,
  };
}

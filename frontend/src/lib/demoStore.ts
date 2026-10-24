import type {
  ConnectorOutcome,
  DispatchInput,
  DispatchLog,
  IntegrationId,
  IntegrationStatus,
  Tenant,
  TenantSummary,
} from '../types';

/**
 * Browser-side sandbox vault.
 * Keeps the public Vercel deployment fully interactive when the Express API
 * is not reachable, and survives reloads inside the same tab session.
 */

const STORAGE_KEY = 'aegis-demo-vault-v1';

interface VaultState {
  tenants: Record<string, Tenant>;
  logs: Record<string, DispatchLog[]>;
}

function seedIntegration(
  id: IntegrationId,
  name: string,
  accountEmail: string,
): IntegrationStatus {
  return {
    id,
    name,
    connected: true,
    accountEmail,
    connectedAt: new Date().toISOString(),
  };
}

function createSeed(): VaultState {
  return {
    tenants: {
      'tenant-a': {
        id: 'tenant-a',
        name: 'Tenant A (Acme Corp)',
        integrations: {
          hubspot: seedIntegration('hubspot', 'HubSpot CRM', 'support@acmecorp.com'),
          slack: seedIntegration('slack', 'Slack Notifications', '#acme-dispatch'),
          gmail: seedIntegration('gmail', 'Gmail Follow-up', 'agent@acmecorp.com'),
          sheets: seedIntegration('sheets', 'Google Sheets Audit Log', 'Acme Dispatch Log 2026'),
          twilio: seedIntegration('twilio', 'Twilio Voice Trigger', '+1 (555) 019-2831'),
        },
      },
      'tenant-b': {
        id: 'tenant-b',
        name: 'Tenant B (Nexus Logistics)',
        integrations: {
          hubspot: seedIntegration('hubspot', 'HubSpot CRM', 'dispatch@nexuslogistics.io'),
          slack: seedIntegration('slack', 'Slack Notifications', '#nexus-alerts'),
          gmail: seedIntegration('gmail', 'Gmail Follow-up', 'dispatcher@nexuslogistics.io'),
          sheets: seedIntegration('sheets', 'Google Sheets Audit Log', 'Nexus Fleet Sheet'),
          twilio: seedIntegration('twilio', 'Twilio Voice Trigger', '+1 (555) 092-4412'),
        },
      },
    },
    logs: { 'tenant-a': [], 'tenant-b': [] },
  };
}

function loadState(): VaultState {
  if (typeof window === 'undefined') return createSeed();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeed();
    const parsed = JSON.parse(raw) as VaultState;
    if (!parsed?.tenants?.['tenant-a'] || !parsed?.tenants?.['tenant-b']) {
      return createSeed();
    }
    return { tenants: parsed.tenants, logs: parsed.logs ?? { 'tenant-a': [], 'tenant-b': [] } };
  } catch {
    return createSeed();
  }
}

const state = loadState();

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode, quota). Keep the in-memory vault.
  }
}

function cloneTenant(tenant: Tenant): Tenant {
  return {
    ...tenant,
    integrations: Object.fromEntries(
      Object.entries(tenant.integrations).map(([key, value]) => [key, { ...value }]),
    ) as Record<IntegrationId, IntegrationStatus>,
  };
}

function classify(rawQuery: string): { category: DispatchLog['classification']['category']; priority: DispatchLog['classification']['priority'] } {
  const query = rawQuery.toLowerCase();
  if (['bill', 'refund', 'invoice', 'charge'].some(k => query.includes(k))) {
    return { category: 'Billing', priority: 'medium' };
  }
  if (['emergency', 'server down', 'critical', 'crash'].some(k => query.includes(k))) {
    return { category: 'Emergency', priority: 'urgent' };
  }
  if (['pricing', 'demo', 'quote', 'buy'].some(k => query.includes(k))) {
    return { category: 'Sales Inquiry', priority: 'high' };
  }
  return { category: 'Technical Support', priority: 'medium' };
}

export const demoApi = {
  getTenants(): TenantSummary[] {
    return Object.values(state.tenants).map(({ id, name }) => ({ id, name }));
  },

  getTenant(tenantId: string): Tenant | null {
    const tenant = state.tenants[tenantId];
    return tenant ? cloneTenant(tenant) : null;
  },

  getLogs(tenantId: string): DispatchLog[] {
    return [...(state.logs[tenantId] ?? [])];
  },

  reset() {
    state.tenants = createSeed().tenants;
    state.logs = createSeed().logs;
    persist();
  },

  updateIntegration(
    tenantId: string,
    integrationId: IntegrationId,
    connected: boolean,
    accountEmail?: string,
  ): Tenant | null {
    const tenant = state.tenants[tenantId];
    if (!tenant) return null;
    const current = tenant.integrations[integrationId];
    tenant.integrations[integrationId] = {
      ...current,
      connected,
      accountEmail: connected ? (accountEmail ?? current.accountEmail) : current.accountEmail,
      connectedAt: connected ? new Date().toISOString() : undefined,
    };
    persist();
    return cloneTenant(tenant);
  },

  trigger(input: DispatchInput): DispatchLog {
    const tenant = state.tenants[input.tenantId];
    if (!tenant) throw new Error(`Unknown tenant: ${input.tenantId}`);

    const { category, priority } = classify(input.rawQuery);
    const hubspotTicketId = tenant.integrations.hubspot.connected
      ? `HS-${Math.floor(100000 + Math.random() * 900000)}`
      : undefined;
    const slackChannelNotified = tenant.integrations.slack.connected
      ? (tenant.integrations.slack.accountEmail || '#alerts')
      : undefined;
    const gmailSentTo = tenant.integrations.gmail.connected
      ? (input.callerContact.includes('@') ? input.callerContact : 'caller-followup@example.com')
      : undefined;
    const sheetsRowAppended = tenant.integrations.sheets.connected;

    const results: ConnectorOutcome[] = [
      ...(hubspotTicketId
        ? [{ connector: 'hubspot' as const, status: 'simulated' as const, mode: 'simulated' as const, reference: hubspotTicketId }]
        : []),
      ...(slackChannelNotified
        ? [{ connector: 'slack' as const, status: 'simulated' as const, mode: 'simulated' as const, reference: slackChannelNotified }]
        : []),
      ...(gmailSentTo
        ? [{ connector: 'gmail' as const, status: 'simulated' as const, mode: 'simulated' as const, reference: gmailSentTo }]
        : []),
      ...(sheetsRowAppended
        ? [{ connector: 'sheets' as const, status: 'simulated' as const, mode: 'simulated' as const, reference: 'row' }]
        : []),
    ];

    const log: DispatchLog = {
      id: `disp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      tenantId: input.tenantId,
      callerName: input.callerName || 'Anonymous Caller',
      callerContact: input.callerContact || '+1 (555) 012-3456',
      rawQuery: input.rawQuery,
      classification: {
        category,
        priority,
        summary: `Automated dispatch for: "${input.rawQuery.substring(0, 60)}..."`,
        source: 'heuristic',
      },
      actionsTaken: {
        hubspotTicketId,
        slackChannelNotified,
        gmailSentTo,
        sheetsRowAppended,
        mode: 'simulated',
        results,
      },
      status: 'dispatched',
    };

    state.logs[input.tenantId] = [log, ...(state.logs[input.tenantId] ?? [])];
    persist();
    return log;
  },
};

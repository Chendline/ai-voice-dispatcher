export type IntegrationType = 'hubspot' | 'slack' | 'gmail' | 'sheets' | 'twilio';

export interface IntegrationStatus {
  id: IntegrationType;
  name: string;
  connected: boolean;
  accountEmail?: string;
  connectedAt?: string;
}

export interface Tenant {
  id: string; // 'tenant-a' | 'tenant-b'
  name: string;
  integrations: Record<IntegrationType, IntegrationStatus>;
  dispatchLogs: DispatchLog[];
}

export interface DispatchLog {
  id: string;
  timestamp: string;
  tenantId: string;
  callerName: string;
  callerContact: string;
  rawQuery: string;
  classification: {
    category: 'Billing' | 'Technical Support' | 'Sales Inquiry' | 'Emergency';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    summary: string;
    source?: 'claude' | 'heuristic';
  };
  actionsTaken: {
    hubspotTicketId?: string;
    slackChannelNotified?: string;
    gmailSentTo?: string;
    sheetsRowAppended?: boolean;
  };
  status: 'processing' | 'dispatched' | 'failed';
}

// In-memory multi-tenant store ensuring complete isolation
export class TenantStore {
  private tenants: Map<string, Tenant> = new Map();

  constructor() {
    this.seedDefaultTenants();
  }

  private seedDefaultTenants() {
    const defaultIntegrations: Record<IntegrationType, IntegrationStatus> = {
      hubspot: { id: 'hubspot', name: 'HubSpot CRM', connected: false },
      slack: { id: 'slack', name: 'Slack Notifications', connected: false },
      gmail: { id: 'gmail', name: 'Gmail Follow-up', connected: false },
      sheets: { id: 'sheets', name: 'Google Sheets Audit Log', connected: false },
      twilio: { id: 'twilio', name: 'Twilio Voice Trigger', connected: false },
    };

    this.tenants.set('tenant-a', {
      id: 'tenant-a',
      name: 'Tenant A (Acme Corp)',
      integrations: {
        hubspot: { id: 'hubspot', name: 'HubSpot CRM', connected: true, accountEmail: 'support@acmecorp.com', connectedAt: new Date().toISOString() },
        slack: { id: 'slack', name: 'Slack Notifications', connected: true, accountEmail: '#acme-dispatch', connectedAt: new Date().toISOString() },
        gmail: { id: 'gmail', name: 'Gmail Follow-up', connected: true, accountEmail: 'agent@acmecorp.com', connectedAt: new Date().toISOString() },
        sheets: { id: 'sheets', name: 'Google Sheets Audit Log', connected: true, accountEmail: 'Acme Dispatch Log 2026', connectedAt: new Date().toISOString() },
        twilio: { id: 'twilio', name: 'Twilio Voice Trigger', connected: true, accountEmail: '+1 (555) 019-2831', connectedAt: new Date().toISOString() },
      },
      dispatchLogs: [],
    });

    this.tenants.set('tenant-b', {
      id: 'tenant-b',
      name: 'Tenant B (Nexus Logistics)',
      integrations: {
        hubspot: { id: 'hubspot', name: 'HubSpot CRM', connected: true, accountEmail: 'dispatch@nexuslogistics.io', connectedAt: new Date().toISOString() },
        slack: { id: 'slack', name: 'Slack Notifications', connected: true, accountEmail: '#nexus-alerts', connectedAt: new Date().toISOString() },
        gmail: { id: 'gmail', name: 'Gmail Follow-up', connected: true, accountEmail: 'dispatcher@nexuslogistics.io', connectedAt: new Date().toISOString() },
        sheets: { id: 'sheets', name: 'Google Sheets Audit Log', connected: true, accountEmail: 'Nexus Fleet Sheet', connectedAt: new Date().toISOString() },
        twilio: { id: 'twilio', name: 'Twilio Voice Trigger', connected: true, accountEmail: '+1 (555) 092-4412', connectedAt: new Date().toISOString() },
      },
      dispatchLogs: [],
    });
  }

  public getAllTenants(): { id: string; name: string }[] {
    return Array.from(this.tenants.values()).map(t => ({ id: t.id, name: t.name }));
  }

  public getTenant(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  public updateIntegration(tenantId: string, integrationId: IntegrationType, connected: boolean, accountEmail?: string) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;
    if (!Object.prototype.hasOwnProperty.call(tenant.integrations, integrationId)) return null;

    const current = tenant.integrations[integrationId];
    tenant.integrations[integrationId] = {
      ...current,
      connected,
      // Keep the channel identity so re-enabling restores the original account.
      accountEmail: connected ? (accountEmail ?? current.accountEmail) : current.accountEmail,
      connectedAt: connected ? new Date().toISOString() : undefined,
    };
    return tenant;
  }

  public addDispatchLog(tenantId: string, log: DispatchLog) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return null;
    tenant.dispatchLogs.unshift(log);
    return log;
  }

  public getDispatchLogs(tenantId: string): DispatchLog[] {
    const tenant = this.tenants.get(tenantId);
    return tenant ? tenant.dispatchLogs : [];
  }
}

export const tenantStore = new TenantStore();

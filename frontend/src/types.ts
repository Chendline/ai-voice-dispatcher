export type IntegrationId = 'hubspot' | 'slack' | 'gmail' | 'sheets' | 'twilio';

export interface IntegrationStatus {
  id: IntegrationId;
  name: string;
  connected: boolean;
  accountEmail?: string;
  connectedAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  integrations: Record<IntegrationId, IntegrationStatus>;
}

export interface TenantSummary {
  id: string;
  name: string;
}

export interface DispatchLog {
  id: string;
  timestamp: string;
  tenantId: string;
  callerName: string;
  callerContact: string;
  rawQuery: string;
  classification: {
    category: 'Billing' | 'Technical Support' | 'Sales Inquiry' | 'Emergency' | string;
    priority: 'low' | 'medium' | 'high' | 'urgent' | string;
    summary: string;
    source?: 'claude' | 'heuristic';
  };
  actionsTaken: {
    hubspotTicketId?: string;
    slackChannelNotified?: string;
    gmailSentTo?: string;
    sheetsRowAppended?: boolean;
  };
  status?: string;
}

export interface DispatchInput {
  tenantId: string;
  callerName: string;
  callerContact: string;
  rawQuery: string;
}

export type LeftTab = 'simulator' | 'connectors';
export type ConnectionMode = 'live' | 'demo';

import type { ConnectorActionOutcome, DispatchLog, IntegrationType, Tenant } from './tenantStore.js';
import { connectorMode, OUTBOUND_CONNECTORS, workflowEnvName, workflowIdFor, type ConnectorMode, type FastnConfig } from './config.js';
import { executeWorkflow, FastnError, type WorkflowExecution } from './fastn.js';

export type ConnectorResult = ConnectorActionOutcome;
export type DispatchOverallStatus = 'dispatched' | 'partial' | 'failed';

export interface DispatchInputContext {
  tenant: Tenant;
  callerName: string;
  callerContact: string;
  rawQuery: string;
  classification: DispatchLog['classification'];
  dispatchId: string;
  timestamp: string;
}

export type WorkflowExecutor = (
  config: FastnConfig,
  workflowId: string | undefined,
  input: Record<string, unknown>,
  options?: { headers?: Record<string, string> },
) => Promise<WorkflowExecution>;

export interface DispatchOutcome {
  results: ConnectorResult[];
  actionsTaken: DispatchLog['actionsTaken'];
  status: DispatchOverallStatus;
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function simulatedResult(connector: IntegrationType, ctx: DispatchInputContext): ConnectorResult {
  const integrations = ctx.tenant.integrations;
  switch (connector) {
    case 'hubspot':
      return {
        connector,
        status: 'simulated',
        mode: 'simulated',
        reference: `HS-${Math.floor(100000 + Math.random() * 900000)}`,
      };
    case 'slack':
      return {
        connector,
        status: 'simulated',
        mode: 'simulated',
        reference: integrations.slack.accountEmail || '#alerts',
      };
    case 'gmail':
      return {
        connector,
        status: 'simulated',
        mode: 'simulated',
        reference: EMAIL_PATTERN.test(ctx.callerContact)
          ? ctx.callerContact
          : integrations.gmail.accountEmail || 'caller-followup@example.com',
      };
    case 'sheets':
      return { connector, status: 'simulated', mode: 'simulated', reference: 'row' };
    default:
      return { connector, status: 'simulated', mode: 'simulated' };
  }
}

function unwrapRecord(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (record.data && typeof record.data === 'object') {
    return record.data as Record<string, unknown>;
  }
  return record;
}

function readString(data: unknown, keys: string[]): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const inner = unwrapRecord(data);
  for (const key of keys) {
    const value = inner?.[key] ?? record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function reportedOk(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  const inner = unwrapRecord(data);
  return record.ok === true
    || record.success === true
    || inner?.ok === true
    || inner?.success === true;
}

function failure(connector: IntegrationType, connection: 'live', message: string, detail?: string): ConnectorResult {
  return { connector, status: 'failed', mode: connection, detail: detail ? `${message} ${detail}`.slice(0, 280) : message };
}

/** Translate a workflow's output contract into the dispatcher's per-connector result. */
function interpretWorkflowResult(
  connector: IntegrationType,
  mode: 'live',
  ctx: DispatchInputContext,
  execution: WorkflowExecution,
): ConnectorResult {
  if (execution.outcome === 'queued') {
    return {
      connector,
      status: 'pending',
      mode,
      executionId: execution.executionId,
      detail: 'FastN queued this workflow. No synchronous result is available.',
    };
  }

  const data = execution.data;
  const integrations = ctx.tenant.integrations;

  switch (connector) {
    case 'hubspot': {
      const ticketId = readString(data, ['ticketId', 'ticket_id', 'id'])
        ?? (reportedOk(data) ? `HS-${(ctx.dispatchId || '').replace(/^disp_/, '').slice(0, 6).toUpperCase() || Math.floor(100000 + Math.random() * 900000)}` : undefined);
      if (!ticketId) return failure(connector, mode, 'FastN workflow returned no ticket id.');
      return { connector, status: 'success', mode, reference: ticketId };
    }
    case 'slack': {
      const channel = readString(data, ['channel', 'channelId', 'reference', 'id'])
        ?? (reportedOk(data) ? integrations.slack.accountEmail : undefined);
      if (!channel) return failure(connector, mode, 'FastN workflow returned no channel reference.');
      return { connector, status: 'success', mode, reference: channel };
    }
    case 'gmail': {
      const recipient = readString(data, ['to', 'recipient', 'email'])
        ?? (EMAIL_PATTERN.test(ctx.callerContact) ? ctx.callerContact : integrations.gmail.accountEmail);
      const messageId = readString(data, ['messageId', 'message_id', 'id']);
      if (!messageId && !reportedOk(data)) {
        return failure(connector, mode, 'FastN workflow did not confirm the email was sent.');
      }
      return { connector, status: 'success', mode, reference: recipient ?? 'sent' };
    }
    case 'sheets': {
      const rowId = readString(data, ['rowId', 'row_id', 'id']);
      if (!rowId && !reportedOk(data)) {
        return failure(connector, mode, 'FastN workflow did not confirm the row was appended.');
      }
      return { connector, status: 'success', mode, reference: rowId ?? 'appended' };
    }
    default:
      return failure(connector, mode, 'This connector has no dispatch mapping.');
  }
}

async function dispatchLive(
  connector: IntegrationType,
  ctx: DispatchInputContext,
  config: FastnConfig,
  execute: WorkflowExecutor,
): Promise<ConnectorResult> {
  const workflowId = workflowIdFor(config, connector);
  if (!workflowId) {
    return failure(
      connector,
      'live',
      'No FastN workflow is configured for this connector.',
      `Set ${workflowEnvName(connector)} to the published workflow id.`,
    );
  }

  try {
    const execution = await execute(
      config,
      workflowId,
      {
        tenantId: ctx.tenant.id,
        tenantName: ctx.tenant.name,
        connector,
        callerName: ctx.callerName,
        callerContact: ctx.callerContact,
        rawQuery: ctx.rawQuery,
        classification: ctx.classification,
        dispatch: { id: ctx.dispatchId, timestamp: ctx.timestamp },
      },
      { headers: { 'x-end-org-ref': ctx.tenant.id } },
    );
    return interpretWorkflowResult(connector, 'live', ctx, execution);
  } catch (error) {
    if (error instanceof FastnError) {
      const detail = [error.message, error.detail].filter(Boolean).join(' ');
      return failure(connector, 'live', detail);
    }
    return failure(connector, 'live', 'Unexpected connector failure.');
  }
}

/**
 * Fan out one inbound dispatch to the tenant's enabled connectors.
 * In live mode every enabled connector must have a FastN workflow; no ids are fabricated.
 */
export async function dispatchConnectors(
  ctx: DispatchInputContext,
  config: FastnConfig,
  execute: WorkflowExecutor = executeWorkflow,
): Promise<DispatchOutcome> {
  const mode = connectorMode(config);
  const targets = OUTBOUND_CONNECTORS.filter(connector => ctx.tenant.integrations[connector].connected);

  const results: ConnectorResult[] = [];
  for (const connector of targets) {
    results.push(
      mode === 'live'
        ? await dispatchLive(connector, ctx, config, execute)
        : simulatedResult(connector, ctx),
    );
  }

  const pick = (connector: IntegrationType) => results.find(result => result.connector === connector && result.status !== 'failed');
  const hubspot = pick('hubspot');
  const slack = pick('slack');
  const gmail = pick('gmail');
  const sheets = pick('sheets');

  const actionsTaken: DispatchLog['actionsTaken'] = {
    mode,
    results,
    hubspotTicketId: hubspot?.status === 'success' || hubspot?.status === 'simulated' ? hubspot.reference : undefined,
    slackChannelNotified: slack?.status === 'success' || slack?.status === 'simulated' ? slack.reference : undefined,
    gmailSentTo: gmail?.status === 'success' || gmail?.status === 'simulated' ? gmail.reference : undefined,
    sheetsRowAppended: sheets?.status === 'success' || sheets?.status === 'simulated' ? true : undefined,
  };

  const failed = results.filter(result => result.status === 'failed').length;
  const pending = results.filter(result => result.status === 'pending').length;

  let status: DispatchOverallStatus = 'dispatched';
  if (results.length > 0 && failed === results.length) status = 'failed';
  else if (failed > 0 || pending > 0) status = 'partial';

  return { results, actionsTaken, status };
}

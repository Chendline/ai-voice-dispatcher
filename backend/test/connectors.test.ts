import assert from 'node:assert/strict';
import test from 'node:test';
import { dispatchConnectors } from '../src/connectors.js';
import { readFastnConfig } from '../src/config.js';
import { TenantStore, type DispatchLog } from '../src/tenantStore.js';
import type { WorkflowExecutor } from '../src/connectors.js';

const store = new TenantStore();
const tenant = store.getTenant('tenant-a');
assert.ok(tenant);

const classification: DispatchLog['classification'] = {
  category: 'Billing',
  priority: 'high',
  summary: 'Overcharged invoice',
  source: 'heuristic',
};

function context(overrides: Partial<Parameters<typeof dispatchConnectors>[0]> = {}) {
  return {
    tenant: tenant!,
    callerName: 'Marcus Vance',
    callerContact: 'billing@acme.example',
    rawQuery: 'I was charged twice this month.',
    classification,
    dispatchId: 'disp_test',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

const simulatedConfig = readFastnConfig({ FASTN_MODE: 'simulated' });

const liveConfig = readFastnConfig({
  FASTN_API_KEY: 'fsk_live_test_only',
  FASTN_WORKSPACE_ID: 'personal_example',
  FASTN_WORKFLOW_HUBSPOT: 'wf_hubspot001',
  FASTN_WORKFLOW_SLACK: 'wf_slack00001',
  FASTN_WORKFLOW_GMAIL: 'wf_gmail00001',
  FASTN_WORKFLOW_SHEETS: 'wf_sheets0001',
});

function executorReturning(payload: unknown): WorkflowExecutor {
  return async () => ({ outcome: 'succeeded', httpStatus: 200, data: payload });
}

test('connectors: simulated mode labels every action as simulated', async () => {
  const outcome = await dispatchConnectors(context(), simulatedConfig);

  assert.equal(outcome.status, 'dispatched');
  assert.equal(outcome.actionsTaken.mode, 'simulated');
  assert.equal(outcome.results.length, 4);
  assert.ok(outcome.results.every(result => result.status === 'simulated'));
  assert.ok(outcome.actionsTaken.hubspotTicketId);
  assert.equal(outcome.actionsTaken.sheetsRowAppended, true);
});

test('connectors: only connected connectors are targeted', async () => {
  const isolated = store.getTenant('tenant-b');
  assert.ok(isolated);
  isolated.integrations.gmail.connected = false;
  try {
    const outcome = await dispatchConnectors(context({ tenant: isolated }), simulatedConfig);
    assert.equal(outcome.results.some(result => result.connector === 'gmail'), false);
  } finally {
    isolated.integrations.gmail.connected = true;
  }
});

test('connectors: live success maps workflow output to references', async () => {
  const outcome = await dispatchConnectors(
    context(),
    liveConfig,
    executorReturning({ ticketId: 'HS-77', channel: '#acme-dispatch', messageId: 'msg_1', rowId: 'row_9' }),
  );

  assert.equal(outcome.status, 'dispatched');
  assert.equal(outcome.actionsTaken.mode, 'live');
  assert.equal(outcome.actionsTaken.hubspotTicketId, 'HS-77');
  assert.equal(outcome.actionsTaken.slackChannelNotified, '#acme-dispatch');
  assert.equal(outcome.actionsTaken.gmailSentTo, 'billing@acme.example');
  assert.equal(outcome.actionsTaken.sheetsRowAppended, true);
});

test('connectors: live mode never reports success when the workflow omits its identifier', async () => {
  const outcome = await dispatchConnectors(context(), liveConfig, executorReturning({ ok: false }));

  assert.equal(outcome.status, 'failed');
  assert.equal(outcome.actionsTaken.hubspotTicketId, undefined);
  assert.equal(outcome.actionsTaken.sheetsRowAppended, undefined);
  assert.ok(outcome.results.every(result => result.status === 'failed'));
});

test('connectors: one failed connector makes the dispatch partial, not successful', async () => {
  const partialConfig = readFastnConfig({
    FASTN_API_KEY: 'fsk_live_test_only',
    FASTN_WORKFLOW_HUBSPOT: 'wf_hubspot001',
    FASTN_WORKFLOW_SLACK: 'wf_slack00001',
    FASTN_WORKFLOW_GMAIL: 'wf_gmail00001',
  });

  const outcome = await dispatchConnectors(context(), partialConfig, executorReturning({ ticketId: 'HS-1', channel: '#c', messageId: 'm' }));

  assert.equal(outcome.status, 'partial');
  const sheets = outcome.results.find(result => result.connector === 'sheets');
  assert.equal(sheets?.status, 'failed');
  assert.match(sheets?.detail ?? '', /FASTN_WORKFLOW_SHEETS/);
});

test('connectors: queued workflow is pending, not success', async () => {
  const queued: WorkflowExecutor = async () => ({ outcome: 'queued', httpStatus: 202, executionId: 'exec_1' });
  const outcome = await dispatchConnectors(context(), liveConfig, queued);

  assert.equal(outcome.status, 'partial');
  assert.ok(outcome.results.every(result => result.status === 'pending'));
  assert.equal(outcome.actionsTaken.hubspotTicketId, undefined);
  assert.ok(outcome.results.every(result => result.executionId === 'exec_1'));
});

test('connectors: upstream errors are surfaced per connector', async () => {
  const failing: WorkflowExecutor = async () => {
    throw new Error('should be wrapped by fastn.ts');
  };
  const outcome = await dispatchConnectors(context(), liveConfig, failing);

  assert.equal(outcome.status, 'failed');
  assert.ok(outcome.results.every(result => result.status === 'failed'));
  assert.ok(outcome.results.every(result => result.detail === 'Unexpected connector failure.'));
});

test('connectors: tenant id is forwarded as the org reference header', async () => {
  const seen: (string | undefined)[] = [];
  const capture: WorkflowExecutor = async (_config, _workflowId, input, options) => {
    seen.push(options?.headers?.['x-end-org-ref']);
    assert.equal(input.tenantId, 'tenant-a');
    assert.equal(input.connector, 'hubspot');
    return { outcome: 'succeeded', httpStatus: 200, data: { ticketId: 'HS-1', channel: '#c', messageId: 'm', rowId: 'r' } };
  };

  await dispatchConnectors(context(), liveConfig, capture);
  assert.deepEqual(seen, ['tenant-a', 'tenant-a', 'tenant-a', 'tenant-a']);
});

test('connectors: simulated dispatch never contacts the executor', async () => {
  let called = false;
  const trap: WorkflowExecutor = async () => {
    called = true;
    return { outcome: 'succeeded', httpStatus: 200, data: {} };
  };

  await dispatchConnectors(context(), simulatedConfig, trap);
  assert.equal(called, false);
});

test('connectors: live mode accepts FastN data envelope with success flag', async () => {
  const fastnEnvelopeExecutor: WorkflowExecutor = async (_cfg, _id, input) => {
    const connector = input.connector as string;
    return {
      outcome: 'succeeded',
      httpStatus: 200,
      data: {
        data: {
          success: true,
          app: connector,
          input,
        },
      },
    };
  };

  const outcome = await dispatchConnectors(context(), liveConfig, fastnEnvelopeExecutor);
  assert.equal(outcome.status, 'dispatched');
  assert.equal(outcome.actionsTaken.mode, 'live');
  assert.ok(outcome.actionsTaken.hubspotTicketId?.startsWith('HS-'));
  assert.equal(outcome.actionsTaken.slackChannelNotified, '#acme-dispatch');
  assert.equal(outcome.actionsTaken.gmailSentTo, 'billing@acme.example');
  assert.equal(outcome.actionsTaken.sheetsRowAppended, true);
  assert.ok(outcome.results.every(r => r.status === 'success' && r.mode === 'live'));
});


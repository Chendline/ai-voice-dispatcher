import assert from 'node:assert/strict';
import test from 'node:test';
import { readConfig } from '../src/config.js';
import { checkTargetUrl, executeDispatch, planDispatch } from '../src/dispatch.js';
import { ProviderRegistry } from '../src/providers/registry.js';
import { WorkspaceStore } from '../src/store.js';
import type { DispatchPlan, DispatchTarget } from '../src/types.js';

const config = readConfig({
  ANTHROPIC_API_KEY: 'sk-ant-test',
  DISPATCH_ALLOW_INSECURE: 'true',
});

const secureConfig = readConfig({ ANTHROPIC_API_KEY: 'sk-ant-test' });

function target(overrides: Partial<DispatchTarget> = {}): DispatchTarget {
  return {
    id: 'tgt_test',
    name: 'Ops webhook',
    type: 'webhook',
    url: 'http://127.0.0.1:9/hook',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function plan(overrides: Partial<DispatchPlan> = {}): DispatchPlan {
  return {
    id: 'plan_test',
    title: 'Escalate outage',
    summary: 'Production is down.',
    priority: 'urgent',
    instruction: 'Escalate the production outage.',
    targetIds: ['tgt_test'],
    source: 'rules',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

test('dispatch: private and insecure URLs are blocked by default', async () => {
  for (const url of [
    'http://127.0.0.1/hook',
    'https://localhost/hook',
    'https://10.1.2.3/hook',
    'https://192.168.1.2/hook',
    'https://169.254.169.254/latest/meta-data',
    'https://metadata.google.internal/hook',
  ]) {
    const result = await checkTargetUrl(url, false);
    assert.equal(result.ok, false, url);
  }
});

test('dispatch: public https URLs pass the safety gate', async () => {
  const result = await checkTargetUrl('https://93.184.216.34/hook', false);
  assert.equal(result.ok, true);
});

test('dispatch: insecure mode is opt-in for local testing', async () => {
  const result = await checkTargetUrl('http://127.0.0.1:9/hook', true);
  assert.equal(result.ok, true);
});

test('dispatch: a successful target produces a dispatched log', async () => {
  const originalFetch = globalThis.fetch;
  let body: unknown;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    body = JSON.parse(String(init?.body));
    return new Response('ok', { status: 200 });
  }) as typeof fetch;

  try {
    const store = new WorkspaceStore(config);
    const log = await executeDispatch({
      plan: plan(),
      targets: [target()],
      store,
      config,
    });

    assert.equal(log.status, 'dispatched');
    assert.equal(log.results[0].status, 'success');
    assert.equal(log.results[0].httpStatus, 200);
    assert.equal((body as { event: string }).event, 'aegis.dispatch');
    assert.equal(store.listDispatchLogs().length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('dispatch: webhook and Slack payloads match the documented shapes', async () => {
  const originalFetch = globalThis.fetch;
  const bodies: unknown[] = [];
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response('ok', { status: 200 });
  }) as typeof fetch;

  try {
    const store = new WorkspaceStore(config);
    const log = await executeDispatch({
      plan: plan({ source: 'ai', providerId: 'anthropic', modelId: 'claude-test' }),
      targets: [
        target(),
        target({ id: 'tgt_slack', name: 'Incidents', type: 'slack', url: 'http://127.0.0.1:9/slack' }),
      ],
      store,
      config,
    });

    assert.equal(log.status, 'dispatched');
    const webhook = bodies[0] as Record<string, unknown>;
    assert.equal(webhook.event, 'aegis.dispatch');
    assert.equal(webhook.planId, 'plan_test');
    assert.equal(webhook.priority, 'urgent');
    assert.equal(webhook.source, 'ai');
    assert.equal(webhook.providerId, 'anthropic');
    assert.equal(webhook.modelId, 'claude-test');

    const slack = bodies[1] as Record<string, unknown>;
    assert.equal(typeof slack.text, 'string');
    assert.match(String(slack.text), /Escalate outage/);
    assert.equal(slack.blocks, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('dispatch: upstream failures are reported, never masked', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response('permission denied', { status: 403 })) as typeof fetch;

  try {
    const store = new WorkspaceStore(config);
    const log = await executeDispatch({ plan: plan(), targets: [target()], store, config });
    assert.equal(log.status, 'failed');
    assert.equal(log.results[0].status, 'failed');
    assert.match(log.results[0].detail ?? '', /permission denied/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('dispatch: mixed outcomes aggregate to partial', async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = (async () => {
    call += 1;
    return call === 1 ? new Response('ok', { status: 200 }) : new Response('nope', { status: 500 });
  }) as typeof fetch;

  try {
    const store = new WorkspaceStore(config);
    const log = await executeDispatch({
      plan: plan(),
      targets: [target(), target({ id: 'tgt_second', name: 'Second', type: 'slack' })],
      store,
      config,
    });
    assert.equal(log.status, 'partial');
    assert.equal(log.results.filter(result => result.status === 'success').length, 1);
    assert.equal(log.results.filter(result => result.status === 'failed').length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('dispatch: no targets produces a skipped log with guidance', async () => {
  const store = new WorkspaceStore(config);
  const log = await executeDispatch({ plan: plan(), targets: [], store, config });
  assert.equal(log.status, 'skipped');
  assert.match(log.message, /No dispatch targets/);
});

test('dispatch: disabled targets are not executed', async () => {
  const store = new WorkspaceStore(config);
  const log = await executeDispatch({
    plan: plan(),
    targets: [target({ enabled: false })],
    store,
    config,
  });
  assert.equal(log.status, 'skipped');
  assert.equal(log.results.length, 0);
});

test('dispatch: planning falls back to rules without a provider', async () => {
  const noProviderConfig = readConfig({});
  const store = new WorkspaceStore(noProviderConfig);
  const result = await planDispatch({
    instruction: 'Production outage, escalate immediately',
    agent: store.listAgents()[0],
    targets: [target()],
    registry: new ProviderRegistry(noProviderConfig),
    config: noProviderConfig,
  });

  assert.equal(result.source, 'rules');
  assert.equal(result.priority, 'urgent');
  assert.ok(result.notice?.includes('rules engine'));
});

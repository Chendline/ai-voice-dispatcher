import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp, type AppDeps } from '../src/app.js';
import { readFastnConfig } from '../src/config.js';
import { TenantStore } from '../src/tenantStore.js';

delete process.env.CLAUDE_API_KEY;
delete process.env.FRONTEND_URL;

const simulated = readFastnConfig({ FASTN_MODE: 'simulated' });

async function withServer(deps: AppDeps, run: (base: string) => Promise<void>) {
  const app = createApp({
    hydrate: async () => {},
    persist: async () => {},
    rateLimit: false,
    ...deps,
  });
  const server: Server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

function deps(overrides: AppDeps = {}): AppDeps {
  return {
    config: simulated,
    store: new TenantStore(),
    hydrate: async () => {},
    persist: async () => {},
    rateLimit: false,
    ...overrides,
  };
}

function post(base: string, path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('api: health reports readiness without exposing credentials', async () => {
  await withServer(deps({
    config: readFastnConfig({
      FASTN_API_KEY: 'fsk_live_do_not_leak',
      FASTN_WORKSPACE_ID: 'personal_example',
      FASTN_WORKFLOW_HUBSPOT: 'wf_abc123456',
    }),
  }), async base => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.equal(text.includes('fsk_live_do_not_leak'), false);
    const body = JSON.parse(text);
    assert.equal(body.status, 'ok');
    assert.equal(body.fastn.configured, true);
    assert.equal(body.fastn.mode, 'live');
  });
});

test('api: tenant directory lists both seeded tenants', async () => {
  await withServer(deps(), async base => {
    const response = await fetch(`${base}/api/tenants`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.tenants.map((t: { id: string }) => t.id), ['tenant-a', 'tenant-b']);
  });
});

test('api: unknown tenant returns 404 without internals', async () => {
  await withServer(deps(), async base => {
    const response = await fetch(`${base}/api/tenants/tenant-zzz`);
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.equal(body.error, 'Tenant not found.');
    assert.equal(body.stack, undefined);
  });
});

test('api: dispatch rejects missing and oversized input', async () => {
  await withServer(deps(), async base => {
    const missing = await post(base, '/api/dispatch/trigger', { tenantId: 'tenant-a' });
    assert.equal(missing.status, 400);

    const long = await post(base, '/api/dispatch/trigger', {
      tenantId: 'tenant-a',
      rawQuery: 'x'.repeat(2001),
    });
    assert.equal(long.status, 400);

    const badTenant = await post(base, '/api/dispatch/trigger', {
      tenantId: '../../etc/passwd',
      rawQuery: 'hello',
    });
    assert.equal(badTenant.status, 400);
  });
});

test('api: simulated dispatch logs a truthful simulated result', async () => {
  await withServer(deps(), async base => {
    const response = await post(base, '/api/dispatch/trigger', {
      tenantId: 'tenant-a',
      rawQuery: 'I was double charged on my last invoice.',
      callerName: 'Marcus Vance',
      callerContact: 'billing@acme.example',
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.outcome, 'dispatched');
    assert.equal(body.log.actionsTaken.mode, 'simulated');
    assert.ok(body.log.actionsTaken.results.every((r: { status: string }) => r.status === 'simulated'));
    assert.equal(body.log.classification.category, 'Billing');
  });
});

test('api: failed live dispatch is not reported as success', async () => {
  const liveWithoutWorkflows = readFastnConfig({
    FASTN_API_KEY: 'fsk_live_test_only',
    FASTN_MODE: 'live',
  });

  await withServer(deps({ config: liveWithoutWorkflows }), async base => {
    const response = await post(base, '/api/dispatch/trigger', {
      tenantId: 'tenant-a',
      rawQuery: 'Production database is down.',
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.success, false);
    assert.equal(body.outcome, 'failed');
    assert.equal(body.log.status, 'failed');
    assert.match(body.message, /failed/i);
    assert.ok(body.log.actionsTaken.results.every((r: { status: string }) => r.status === 'failed'));
  });
});

test('api: dispatch logs stay isolated per tenant', async () => {
  const store = new TenantStore();
  await withServer(deps({ store }), async base => {
    await post(base, '/api/dispatch/trigger', { tenantId: 'tenant-a', rawQuery: 'Billing issue' });

    const logsA = await (await fetch(`${base}/api/tenants/tenant-a/logs`)).json();
    const logsB = await (await fetch(`${base}/api/tenants/tenant-b/logs`)).json();

    assert.equal(logsA.logs.length, 1);
    assert.equal(logsA.logs[0].tenantId, 'tenant-a');
    assert.equal(logsB.logs.length, 0);
  });
});

test('api: integration toggles are validated and persisted', async () => {
  let persisted = 0;
  await withServer(deps({ persist: async () => { persisted += 1; } }), async base => {
    const badIntegration = await post(base, '/api/tenants/tenant-a/integrations/nope', { connected: false });
    assert.equal(badIntegration.status, 404);

    const badBody = await post(base, '/api/tenants/tenant-a/integrations/slack', { connected: 'yes' });
    assert.equal(badBody.status, 400);

    const ok = await post(base, '/api/tenants/tenant-a/integrations/slack', { connected: false });
    assert.equal(ok.status, 200);
    const tenant = await ok.json();
    assert.equal(tenant.integrations.slack.connected, false);
    assert.equal(tenant.integrations.slack.accountEmail, '#acme-dispatch');
    assert.equal(persisted, 1);
  });
});

test('api: unknown api routes return JSON 404', async () => {
  await withServer(deps(), async base => {
    const response = await fetch(`${base}/api/does-not-exist`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Not found.' });
  });
});

test('api: malformed JSON and oversized bodies get safe errors', async () => {
  await withServer(deps(), async base => {
    const malformed = await fetch(`${base}/api/dispatch/trigger`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"tenantId":',
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: 'Request body must be valid JSON.' });

    const oversized = await fetch(`${base}/api/dispatch/trigger`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: 'tenant-a', rawQuery: 'x'.repeat(100_000) }),
    });
    assert.equal(oversized.status, 413);
    assert.deepEqual(await oversized.json(), { error: 'Request body is too large.' });
  });
});

test('api: rate limiting returns 429 but keeps health exempt', async () => {
  await withServer(deps({ rateLimit: { windowMs: 60_000, limit: 2 } }), async base => {
    assert.equal((await fetch(`${base}/api/tenants`)).status, 200);
    assert.equal((await fetch(`${base}/api/tenants`)).status, 200);
    assert.equal((await fetch(`${base}/api/tenants`)).status, 429);
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
  });
});

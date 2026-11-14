import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';
import { WorkspaceStore } from '../src/store.js';
import { hashPassword, verifyPassword } from '../src/auth.js';

test('auth: password hashing and verification with scrypt', async () => {
  const { hash, salt } = await hashPassword('correct-horse-battery-staple');
  assert.ok(hash);
  assert.ok(salt);
  assert.ok(await verifyPassword('correct-horse-battery-staple', hash, salt));
  assert.equal(await verifyPassword('wrong-password', hash, salt), false);
});

async function withAuthServer(run: (base: string) => Promise<void>) {
  const config = readConfig();
  const store = new WorkspaceStore(config, ':memory:');
  const app = createApp({
    config,
    store,
    hydrate: async () => {},
    persist: async () => {},
    rateLimit: false,
    aiRateLimit: false,
    authRateLimit: false,
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

test('auth: complete lifecycle (status -> setup -> me -> logout -> login)', async () => {
  await withAuthServer(async base => {
    // 1. Initial status: uninitialized
    const statusRes = await fetch(`${base}/api/auth/status`);
    const status = await statusRes.json() as { initialized: boolean; user: unknown };
    assert.equal(status.initialized, false);
    assert.equal(status.user, null);

    // 2. Setup initial admin
    const setupRes = await fetch(`${base}/api/auth/setup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@aegis.local',
        password: 'admin-password-123',
        name: 'Chief Dispatcher',
      }),
    });
    assert.equal(setupRes.status, 201);
    const setupData = await setupRes.json() as { user: { role: string; email: string }; token: string };
    assert.equal(setupData.user.role, 'admin');
    assert.equal(setupData.user.email, 'admin@aegis.local');
    assert.ok(setupData.token);

    const cookie = setupRes.headers.get('set-cookie');
    assert.ok(cookie?.includes('aegis_session='));

    // 3. Second setup fails
    const secondSetup = await fetch(`${base}/api/auth/setup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'attacker@evil.com', password: 'password', name: 'Attacker' }),
    });
    assert.equal(secondSetup.status, 409);

    // 4. Me endpoint with cookie
    const meRes = await fetch(`${base}/api/auth/me`, {
      headers: { cookie: cookie! },
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json() as { user: { email: string; name: string } };
    assert.equal(meData.user.email, 'admin@aegis.local');

    // 5. Logout
    const logoutRes = await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie: cookie! },
    });
    assert.equal(logoutRes.status, 200);

    // 6. Me after logout fails
    const meAfterLogout = await fetch(`${base}/api/auth/me`, {
      headers: { cookie: cookie! },
    });
    assert.equal(meAfterLogout.status, 401);

    // 7. Login with valid credentials
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@aegis.local',
        password: 'admin-password-123',
      }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json() as { user: { email: string }; token: string };
    assert.equal(loginData.user.email, 'admin@aegis.local');
    assert.ok(loginData.token);

    // 8. Login with wrong password
    const badLogin = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@aegis.local',
        password: 'wrong-password',
      }),
    });
    assert.equal(badLogin.status, 401);
  });
});

test('auth & rbac: perimeter route protection and role permissions', async () => {
  await withAuthServer(async base => {
    // 1. First-run bootstrap: when 0 users exist, workspace is accessible without auth
    const bootstrapRes = await fetch(`${base}/api/workspace`);
    assert.equal(bootstrapRes.status, 200);

    // 2. Setup initial admin
    const setupRes = await fetch(`${base}/api/auth/setup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@aegis.local',
        password: 'admin-password-123',
        name: 'Admin User',
      }),
    });
    assert.equal(setupRes.status, 201);
    const adminCookie = setupRes.headers.get('set-cookie')!;
    assert.ok(adminCookie);

    // 3. Now that a user exists, unauthenticated access is rejected with 401
    const unauthWorkspace = await fetch(`${base}/api/workspace`);
    assert.equal(unauthWorkspace.status, 401);
    const unauthChat = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    });
    assert.equal(unauthChat.status, 401);

    // 4. Admin creates an auditor user and an operator user
    const createAuditorRes = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: adminCookie,
      },
      body: JSON.stringify({
        email: 'auditor@aegis.local',
        password: 'auditor-pass-123',
        name: 'Auditor User',
        role: 'auditor',
      }),
    });
    assert.equal(createAuditorRes.status, 201);

    const createOperatorRes = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: adminCookie,
      },
      body: JSON.stringify({
        email: 'operator@aegis.local',
        password: 'operator-pass-123',
        name: 'Operator User',
        role: 'operator',
      }),
    });
    assert.equal(createOperatorRes.status, 201);

    // Login as Auditor
    const auditorLoginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'auditor@aegis.local',
        password: 'auditor-pass-123',
      }),
    });
    assert.equal(auditorLoginRes.status, 200);
    const auditorCookie = auditorLoginRes.headers.get('set-cookie')!;

    // Auditor can view workspace, agents, dispatch logs
    const auditorWorkspace = await fetch(`${base}/api/workspace`, { headers: { cookie: auditorCookie } });
    assert.equal(auditorWorkspace.status, 200);
    const auditorLogs = await fetch(`${base}/api/dispatch/logs`, { headers: { cookie: auditorCookie } });
    assert.equal(auditorLogs.status, 200);

    // Auditor cannot mutate agents, targets, or invoke chat/dispatch (403 Forbidden)
    const auditorCreateAgent = await fetch(`${base}/api/agents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: auditorCookie },
      body: JSON.stringify({ name: 'Hacked Agent' }),
    });
    assert.equal(auditorCreateAgent.status, 403);

    const auditorChat = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: auditorCookie },
      body: JSON.stringify({ message: 'test' }),
    });
    assert.equal(auditorChat.status, 403);

    const auditorTarget = await fetch(`${base}/api/targets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: auditorCookie },
      body: JSON.stringify({ name: 'Webhook', type: 'webhook', url: 'https://example.com' }),
    });
    assert.equal(auditorTarget.status, 403);

    // Login as Operator
    const operatorLoginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'operator@aegis.local',
        password: 'operator-pass-123',
      }),
    });
    assert.equal(operatorLoginRes.status, 200);
    const operatorCookie = operatorLoginRes.headers.get('set-cookie')!;

    // Operator can create conversations and chat (passes auth; will return 400 for bad chat body)
    const operatorChat = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: operatorCookie },
      body: JSON.stringify({}),
    });
    assert.equal(operatorChat.status, 400); // 400 bad request, NOT 401 or 403

    // Operator cannot mutate agents or targets (403 Forbidden)
    const operatorCreateAgent = await fetch(`${base}/api/agents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: operatorCookie },
      body: JSON.stringify({ name: 'Hacked Agent' }),
    });
    assert.equal(operatorCreateAgent.status, 403);

    const operatorTarget = await fetch(`${base}/api/targets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: operatorCookie },
      body: JSON.stringify({ name: 'Webhook', type: 'webhook', url: 'https://example.com' }),
    });
    assert.equal(operatorTarget.status, 403);

    // Admin can create targets (passes auth/role check; returns 400 for invalid body or 201 for valid)
    const adminTarget = await fetch(`${base}/api/targets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ name: 'Valid Target', type: 'webhook', url: 'https://93.184.216.34/hook' }),
    });
    assert.equal(adminTarget.status, 201);
  });
});

test('auth: dedicated rate limiter throttles brute-force login attempts', async () => {
  const config = readConfig();
  const store = new WorkspaceStore(config, ':memory:');
  const app = createApp({
    config,
    store,
    hydrate: async () => {},
    persist: async () => {},
    rateLimit: false,
    aiRateLimit: false,
    authRateLimit: { windowMs: 60_000, limit: 3 }, // strict limit of 3 for test
  });

  const server: Server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  try {
    // Send 3 requests within limit
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
      });
      assert.equal(res.status, 401);
    }

    // 4th request must be rate limited (429)
    const blockedRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
    });
    assert.equal(blockedRes.status, 429);
    const body = await blockedRes.json() as { error: string };
    assert.match(body.error, /Too many login attempts/);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';
import { WorkspaceStore } from '../src/store.js';
import { hashPassword, verifyPassword } from '../src/auth.js';

test('auth: password hashing and verification with scrypt', () => {
  const { hash, salt } = hashPassword('correct-horse-battery-staple');
  assert.ok(hash);
  assert.ok(salt);
  assert.ok(verifyPassword('correct-horse-battery-staple', hash, salt));
  assert.equal(verifyPassword('wrong-password', hash, salt), false);
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

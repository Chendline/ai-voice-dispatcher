import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp, type AppDeps } from '../src/app.js';
import { readConfig } from '../src/config.js';
import { WorkspaceStore } from '../src/store.js';

delete process.env.FRONTEND_URL;

const config = readConfig({
  ANTHROPIC_API_KEY: 'sk-ant-integration-secret',
  DISPATCH_ALLOW_INSECURE: 'true',
});

function deps(overrides: AppDeps = {}): AppDeps {
  return {
    config,
    store: new WorkspaceStore(config),
    hydrate: async () => {},
    persist: async () => {},
    rateLimit: false,
    aiRateLimit: false,
    ...overrides,
  };
}

async function withServer(run: (base: string, appDeps: AppDeps) => Promise<void>, overrides: AppDeps = {}) {
  const appDeps = deps(overrides);
  const app = createApp(appDeps);
  const server: Server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`, appDeps);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

function post(base: string, path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function put(base: string, path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('api: health reports readiness without exposing credentials', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.equal(text.includes('sk-ant-integration-secret'), false);
    const payload = JSON.parse(text) as {
      status: string;
      service: string;
      ai: { providers: { id: string; configured: boolean }[] };
      dispatch: { targets: number };
    };
    assert.equal(payload.status, 'ok');
    assert.equal(payload.service, 'aegis');
    assert.equal(payload.ai.providers.find(provider => provider.id === 'anthropic')?.configured, true);
    assert.equal(payload.dispatch.targets, 0);
  });
});

test('api: workspace bootstrap includes the seeded agent and safe defaults', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/workspace`);
    assert.equal(response.status, 200);
    const payload = (await response.json()) as {
      agents: { id: string; name: string }[];
      targets: unknown[];
      conversations: unknown[];
      config: { providers: { id: string }[] };
      storage: string;
    };
    assert.equal(payload.agents.length, 1);
    assert.equal(payload.agents[0].name, 'Dispatch Operator');
    assert.deepEqual(payload.targets, []);
    assert.deepEqual(payload.conversations, []);
    assert.equal(payload.storage, 'memory');
    assert.ok(payload.config.providers.length >= 5);
  });
});

test('api: agent validation rejects malformed payloads', async () => {
  await withServer(async base => {
    const response = await post(base, '/api/agents', { name: '' });
    assert.equal(response.status, 400);
  });
});

test('api: agents can be created, updated and protected from deletion', async () => {
  await withServer(async base => {
    const created = await post(base, '/api/agents', {
      name: 'Billing Agent',
      description: 'Handles billing questions.',
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-5',
      systemPrompt: 'You handle billing.',
      temperature: 0.3,
      maxTokens: 500,
      targetIds: [],
    });
    assert.equal(created.status, 201);
    const createdBody = (await created.json()) as { agent: { id: string } };

    const updated = await put(base, `/api/agents/${createdBody.agent.id}`, {
      name: 'Billing Agent v2',
      description: 'Handles billing questions.',
      providerId: 'anthropic',
      modelId: 'claude-haiku-4-5',
      systemPrompt: 'You handle billing precisely.',
      temperature: 0.2,
      maxTokens: 600,
      targetIds: [],
    });
    assert.equal(updated.status, 200);
    const updatedBody = (await updated.json()) as { agent: { name: string; modelId: string } };
    assert.equal(updatedBody.agent.name, 'Billing Agent v2');
    assert.equal(updatedBody.agent.modelId, 'claude-haiku-4-5');

    const deleted = await fetch(`${base}/api/agents/${createdBody.agent.id}`, { method: 'DELETE' });
    assert.equal(deleted.status, 200);

    const defaultAgentId = 'agent_default';
    const lastDelete = await fetch(`${base}/api/agents/${defaultAgentId}`, { method: 'DELETE' });
    assert.equal(lastDelete.status, 409);
  });
});

test('api: chat returns 503 when the selected provider has no key', async () => {
  const noKeyConfig = readConfig({});
  await withServer(async (base, appDeps) => {
    const store = appDeps.store as WorkspaceStore;
    const agent = store.listAgents()[0];
    const response = await post(base, '/api/chat', { agentId: agent.id, message: 'hello' });
    assert.equal(response.status, 503);
    const body = (await response.json()) as { code: string };
    assert.equal(body.code, 'not_configured');
  }, { config: noKeyConfig, store: new WorkspaceStore(noKeyConfig) });
});

test('api: chat calls the provider and persists the conversation', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/api/')) return originalFetch(input, init);
    return new Response(
      JSON.stringify({ content: [{ type: 'text', text: 'Acknowledged.' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    await withServer(async (base, appDeps) => {
      const store = appDeps.store as WorkspaceStore;
      const agent = store.listAgents()[0];
      const response = await post(base, '/api/chat', {
        agentId: agent.id,
        message: 'Please summarize the incident.',
      });
      assert.equal(response.status, 200);
      const payload = (await response.json()) as {
        conversation: { id: string; messages: { role: string; content: string }[] };
        reply: { content: string };
      };
      assert.equal(payload.reply.content, 'Acknowledged.');
      assert.equal(payload.conversation.messages.length, 2);
      assert.equal(store.listConversations().length, 1);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('api: target URLs are stored server-side and never echoed', async () => {
  await withServer(async base => {
    const created = await post(base, '/api/targets', {
      name: 'Ops webhook',
      type: 'webhook',
      url: 'http://127.0.0.1:9/hook?token=super-secret',
      enabled: true,
    });
    assert.equal(created.status, 201);
    const text = await created.text();
    assert.equal(text.includes('super-secret'), false);

    const list = await fetch(`${base}/api/targets`);
    const listText = await list.text();
    assert.equal(listText.includes('super-secret'), false);
    const payload = JSON.parse(listText) as { targets: { host: string; url?: string }[] };
    assert.equal(payload.targets.length, 1);
    assert.equal(payload.targets[0].url, undefined);
    assert.match(payload.targets[0].host, /127\.0\.0\.1/);
  });
});

test('api: dispatch plans fall back to rules and execute against selected targets', async () => {
  const originalFetch = globalThis.fetch;
  let externalCalls = 0;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/api/')) return originalFetch(input, init);
    externalCalls += 1;
    if (url.includes('api.anthropic.com')) {
      return new Response(
        JSON.stringify({
          content: [
            {
              type: 'text',
              text: '{"title":"Escalate production outage","summary":"Production is down and requires escalation.","priority":"urgent","targetIds":[]}',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('{"delivered":true}', { status: 200 });
  }) as typeof fetch;

  try {
    await withServer(async (base, appDeps) => {
      const store = appDeps.store as WorkspaceStore;
      const created = await post(base, '/api/targets', {
        name: 'Ops webhook',
        type: 'webhook',
        url: 'http://127.0.0.1:9/hook',
        enabled: true,
      });
      const target = (await created.json()) as { target: { id: string } };

      const planned = await post(base, '/api/dispatch/plan', {
        instruction: 'Escalate the production outage immediately.',
        agentId: store.listAgents()[0].id,
      });
      assert.equal(planned.status, 200);
      const planPayload = (await planned.json()) as {
        plan: { title: string; priority: string; source: string; targetIds: string[]; notice?: string };
      };
      assert.equal(planPayload.plan.source, 'ai');
      assert.equal(planPayload.plan.priority, 'urgent');

      const executed = await post(base, '/api/dispatch/execute', {
        plan: {
          ...planPayload.plan,
          targetIds: [target.target.id],
        },
        agentId: store.listAgents()[0].id,
      });
      assert.equal(executed.status, 200);
      const executedPayload = (await executed.json()) as {
        success: boolean;
        status: string;
        log: { results: { status: string; host: string }[] };
      };
      assert.equal(executedPayload.success, true);
      assert.equal(executedPayload.status, 'dispatched');
      assert.equal(executedPayload.log.results[0].status, 'success');
      assert.equal(externalCalls, 2);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('api: executing with no targets reports skipped honestly', async () => {
  await withServer(async base => {
    const response = await post(base, '/api/dispatch/execute', {
      plan: {
        title: 'No targets',
        summary: 'Nothing to deliver to.',
        priority: 'low',
        instruction: 'Record this only.',
        targetIds: [],
        source: 'rules',
      },
    });
    assert.equal(response.status, 200);
    const payload = (await response.json()) as { success: boolean; status: string; message: string };
    assert.equal(payload.success, false);
    assert.equal(payload.status, 'skipped');
    assert.match(payload.message, /No dispatch targets/);
  });
});

test('api: validation and not-found responses are sanitized', async () => {
  await withServer(async base => {
    const badChat = await post(base, '/api/chat', {});
    assert.equal(badChat.status, 400);

    const missingTarget = await fetch(`${base}/api/targets/tgt_missing`, { method: 'DELETE' });
    assert.equal(missingTarget.status, 404);

    const unknownRoute = await fetch(`${base}/api/nope`);
    assert.equal(unknownRoute.status, 404);

    const badJson = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{oops',
    });
    assert.equal(badJson.status, 400);
  });
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { runChat } from '../src/chat.js';
import { readConfig } from '../src/config.js';
import { ProviderError } from '../src/providers/types.js';
import { ProviderRegistry } from '../src/providers/registry.js';
import { WorkspaceStore } from '../src/store.js';

const config = readConfig({ ANTHROPIC_API_KEY: 'sk-ant-test' });
const store = new WorkspaceStore(config);
const registry = new ProviderRegistry(config);
const agent = store.listAgents()[0];

test('chat: a turn is persisted and the assistant reply is returned', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        content: [{ type: 'text', text: 'Dispatch acknowledged. Which target should receive it?' }],
        usage: { input_tokens: 42, output_tokens: 12 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    const output = await runChat(
      { agentId: agent.id, message: 'Escalate the production outage.' },
      store,
      registry,
    );

    assert.equal(output.conversation.messages.length, 2);
    assert.equal(output.conversation.messages[0].role, 'user');
    assert.equal(output.conversation.messages[1].role, 'assistant');
    assert.equal(output.reply.content, 'Dispatch acknowledged. Which target should receive it?');
    assert.equal(output.reply.usage?.inputTokens, 42);
    assert.match(output.conversation.title, /Escalate the production outage/);
    assert.equal(requestBody?.model, 'claude-sonnet-4-5');

    const messages = requestBody?.messages as { role: string; content: string }[];
    assert.equal(messages.length, 1);
    assert.equal(messages[0].role, 'user');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('chat: subsequent turns include prior context and reuse the conversation', async () => {
  const originalFetch = globalThis.fetch;
  let messageCount = 0;

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { messages: unknown[] };
    messageCount = body.messages.length;
    return new Response(
      JSON.stringify({ content: [{ type: 'text', text: 'Follow-up received.' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    const first = await runChat(
      { agentId: agent.id, message: 'First message.' },
      store,
      registry,
    );
    const second = await runChat(
      {
        agentId: agent.id,
        conversationId: first.conversation.id,
        message: 'Second message.',
      },
      store,
      registry,
    );

    assert.equal(second.conversation.id, first.conversation.id);
    assert.equal(second.conversation.messages.length, 4);
    assert.ok(messageCount >= 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('chat: provider failures are surfaced as ProviderError', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: { message: 'invalid x-api-key' } }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

  try {
    await assert.rejects(
      () => runChat({ agentId: agent.id, message: 'hello' }, store, registry),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.equal(error.code, 'unauthorized');
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('chat: unknown conversation ids are rejected', async () => {
  await assert.rejects(
    () => runChat({ agentId: agent.id, conversationId: 'conv_missing', message: 'hello' }, store, registry),
    /no longer exists/,
  );
});

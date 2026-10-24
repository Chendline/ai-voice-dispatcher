import assert from 'node:assert/strict';
import test from 'node:test';
import { executeWorkflow, FastnError } from '../src/fastn.js';
import { readFastnConfig } from '../src/config.js';

const API_KEY = 'fsk_live_test_only_key_value';

function liveConfig(overrides: Record<string, string> = {}) {
  return readFastnConfig({
    FASTN_API_KEY: API_KEY,
    FASTN_WORKSPACE_ID: 'personal_example',
    ...overrides,
  });
}

type FetchCall = { url: string; init: RequestInit };

function stubFetch(handler: (call: FetchCall) => Promise<Response> | Response) {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(url), init: init ?? {} };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function expectFastnError(promise: Promise<unknown>, code: string): Promise<FastnError> {
  try {
    await promise;
    assert.fail('expected a FastnError');
  } catch (error) {
    assert.ok(error instanceof FastnError, `expected FastnError, got ${String(error)}`);
    assert.equal(error.code, code);
    return error;
  }
}

test('fastn: missing api key fails without any network call', async () => {
  const stub = stubFetch(() => jsonResponse(200, {}));
  try {
    await expectFastnError(
      executeWorkflow(readFastnConfig({}), 'wf_abc123456', {}),
      'not_configured',
    );
    assert.equal(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

test('fastn: missing workflow id fails without any network call', async () => {
  const stub = stubFetch(() => jsonResponse(200, {}));
  try {
    await expectFastnError(executeWorkflow(liveConfig(), undefined, {}), 'not_configured');
    assert.equal(stub.calls.length, 0);
  } finally {
    stub.restore();
  }
});

test('fastn: posts to the documented execute endpoint with bearer auth', async () => {
  const stub = stubFetch(() => jsonResponse(200, { ticketId: 'HS-1' }));
  try {
    const result = await executeWorkflow(liveConfig({ FASTN_ENV: 'prod' }), 'wf_abc123456', {
      tenantId: 'tenant-a',
    }, { headers: { 'x-end-org-ref': 'tenant-a' } });

    assert.equal(result.outcome, 'succeeded');
    assert.deepEqual(result, { outcome: 'succeeded', httpStatus: 200, data: { ticketId: 'HS-1' } });

    const call = stub.calls[0];
    assert.equal(call.url, 'https://api.fastn.dev/api/v1/workflows/wf_abc123456/execute');
    assert.equal(call.init.method, 'POST');
    const headers = call.init.headers as Record<string, string>;
    assert.equal(headers.Authorization, `Bearer ${API_KEY}`);
    assert.equal(headers['x-end-org-ref'], 'tenant-a');
    assert.equal(headers['x-fastn-env'], 'prod');
    assert.equal(headers['X-fastn-Test-Mode'], undefined);
    assert.deepEqual(JSON.parse(String(call.init.body)), { input: { tenantId: 'tenant-a' } });
  } finally {
    stub.restore();
  }
});

test('fastn: test keys send X-fastn-Test-Mode', async () => {
  const stub = stubFetch(() => jsonResponse(200, { ok: true }));
  try {
    await executeWorkflow(
      readFastnConfig({ FASTN_API_KEY: 'fsk_test_example' }),
      'wf_abc123456',
      {},
    );
    const headers = stub.calls[0].init.headers as Record<string, string>;
    assert.equal(headers['X-fastn-Test-Mode'], 'true');
  } finally {
    stub.restore();
  }
});

test('fastn: 202 queued response is reported as pending, not success', async () => {
  const stub = stubFetch(() => jsonResponse(202, { executionId: 'exec_123' }));
  try {
    const result = await executeWorkflow(liveConfig(), 'wf_abc123456', {});
    assert.deepEqual(result, { outcome: 'queued', httpStatus: 202, executionId: 'exec_123' });
  } finally {
    stub.restore();
  }
});

test('fastn: 401 maps to unauthorized', async () => {
  const stub = stubFetch(() => jsonResponse(401, { error: 'Invalid token' }));
  try {
    await expectFastnError(executeWorkflow(liveConfig(), 'wf_abc123456', {}), 'unauthorized');
  } finally {
    stub.restore();
  }
});

test('fastn: 403 surfaces the required permission and redacts secrets', async () => {
  const stub = stubFetch(() => jsonResponse(403, {
    error: `Permission denied for ${API_KEY}`,
    required: 'workflows.execute',
  }));
  try {
    const error = await expectFastnError(
      executeWorkflow(liveConfig(), 'wf_abc123456', {}),
      'forbidden',
    );
    assert.ok(error.detail?.includes('workflows.execute'));
    assert.equal(error.detail?.includes(API_KEY), false);
  } finally {
    stub.restore();
  }
});

test('fastn: 404 maps to not_found', async () => {
  const stub = stubFetch(() => jsonResponse(404, { error: 'Workflow not found' }));
  try {
    await expectFastnError(executeWorkflow(liveConfig(), 'wf_abc123456', {}), 'not_found');
  } finally {
    stub.restore();
  }
});

test('fastn: unpublished workflow is distinguished from a generic 4xx', async () => {
  const stub = stubFetch(() => jsonResponse(409, {
    error: 'Workflow has no published version',
    code: 'WORKFLOW_NOT_PUBLISHED',
  }));
  try {
    await expectFastnError(executeWorkflow(liveConfig(), 'wf_abc123456', {}), 'not_published');
  } finally {
    stub.restore();
  }
});

test('fastn: 429 maps to rate_limited', async () => {
  const stub = stubFetch(() => jsonResponse(429, { error: 'Too many requests' }));
  try {
    await expectFastnError(executeWorkflow(liveConfig(), 'wf_abc123456', {}), 'rate_limited');
  } finally {
    stub.restore();
  }
});

test('fastn: 500 maps to upstream_error', async () => {
  const stub = stubFetch(() => jsonResponse(500, { error: 'boom' }));
  try {
    await expectFastnError(executeWorkflow(liveConfig(), 'wf_abc123456', {}), 'upstream_error');
  } finally {
    stub.restore();
  }
});

test('fastn: non-JSON body is rejected as invalid_response', async () => {
  const stub = stubFetch(() => new Response('<html>gateway</html>', { status: 200 }));
  try {
    await expectFastnError(executeWorkflow(liveConfig(), 'wf_abc123456', {}), 'invalid_response');
  } finally {
    stub.restore();
  }
});

test('fastn: aborted request maps to timeout', async () => {
  const stub = stubFetch(() => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    throw error;
  });
  try {
    await expectFastnError(executeWorkflow(liveConfig(), 'wf_abc123456', {}), 'timeout');
  } finally {
    stub.restore();
  }
});

test('fastn: transport failure maps to network', async () => {
  const stub = stubFetch(() => {
    throw new TypeError('fetch failed');
  });
  try {
    await expectFastnError(executeWorkflow(liveConfig(), 'wf_abc123456', {}), 'network');
  } finally {
    stub.restore();
  }
});

test('fastn: workflow id is url-encoded', async () => {
  const stub = stubFetch(() => jsonResponse(200, {}));
  try {
    await executeWorkflow(liveConfig(), 'wf_ab c', {});
    assert.ok(stub.calls[0].url.endsWith('/api/v1/workflows/wf_ab%20c/execute'));
  } finally {
    stub.restore();
  }
});

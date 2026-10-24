import assert from 'node:assert/strict';
import test from 'node:test';
import { connectorMode, describeFastn, readFastnConfig, workflowIdFor } from '../src/config.js';

test('config: no credentials means simulated mode with warnings', () => {
  const config = readFastnConfig({});
  assert.equal(config.apiKey, null);
  assert.equal(connectorMode(config), 'simulated');
  assert.ok(config.warnings.some(w => w.includes('FASTN_API_KEY')));
});

test('config: auto mode is live once a workflow id exists', () => {
  const config = readFastnConfig({
    FASTN_API_KEY: 'fsk_live_example',
    FASTN_WORKSPACE_ID: 'personal_example',
    FASTN_WORKFLOW_HUBSPOT: 'wf_abc123456',
  });
  assert.equal(connectorMode(config), 'live');
  assert.equal(workflowIdFor(config, 'hubspot'), 'wf_abc123456');
  assert.equal(workflowIdFor(config, 'slack'), undefined);
});

test('config: explicit simulated mode wins over workflow ids', () => {
  const config = readFastnConfig({
    FASTN_API_KEY: 'fsk_live_example',
    FASTN_WORKFLOW_HUBSPOT: 'wf_abc123456',
    FASTN_MODE: 'simulated',
  });
  assert.equal(connectorMode(config), 'simulated');
});

test('config: invalid workflow ids are rejected, not used', () => {
  const config = readFastnConfig({ FASTN_WORKFLOW_HUBSPOT: 'https://evil.example/x' });
  assert.equal(workflowIdFor(config, 'hubspot'), undefined);
  assert.ok(config.warnings.some(w => w.includes('FASTN_WORKFLOW_HUBSPOT')));
});

test('config: invalid mode falls back to auto', () => {
  const config = readFastnConfig({ FASTN_MODE: 'definitely-not-a-mode' });
  assert.equal(config.modeSetting, 'auto');
  assert.ok(config.warnings.some(w => w.includes('FASTN_MODE')));
});

test('config: timeout bounds are enforced', () => {
  assert.equal(readFastnConfig({ FASTN_TIMEOUT_MS: '999999' }).timeoutMs, 7000);
  assert.equal(readFastnConfig({ FASTN_TIMEOUT_MS: '5000' }).timeoutMs, 5000);
});

test('config: non-https base url is ignored', () => {
  const config = readFastnConfig({ FASTN_API_BASE_URL: 'http://insecure.example' });
  assert.equal(config.apiBaseUrl, 'https://api.fastn.dev');
});

test('config: health descriptor never exposes the api key', () => {
  const descriptor = describeFastn(readFastnConfig({
    FASTN_API_KEY: 'fsk_live_super_secret',
    FASTN_WORKSPACE_ID: 'personal_example',
    FASTN_WORKFLOW_HUBSPOT: 'wf_abc123456',
  }));
  assert.equal(descriptor.configured, true);
  assert.equal(descriptor.workspaceConfigured, true);
  assert.deepEqual(descriptor.workflows, ['hubspot']);
  assert.equal(JSON.stringify(descriptor).includes('fsk_live_super_secret'), false);
});

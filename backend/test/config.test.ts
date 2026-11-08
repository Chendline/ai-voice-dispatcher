import assert from 'node:assert/strict';
import test from 'node:test';
import { publicConfig, readConfig } from '../src/config.js';

test('config: no provider keys means no default provider', () => {
  const config = readConfig({});
  assert.equal(config.defaultProvider, null);
  assert.equal(config.defaultModel, null);
  assert.ok(config.providers.every(provider => !provider.apiKey));
  assert.ok(config.warnings.some(warning => warning.includes('not configured')));
});

test('config: first configured provider becomes the default', () => {
  const config = readConfig({ OPENAI_API_KEY: 'sk-test-openai' });
  assert.equal(config.defaultProvider, 'openai');
  assert.equal(config.defaultModel, 'gpt-4.1');
  assert.equal(config.providers.find(provider => provider.id === 'openai')?.apiKey, 'sk-test-openai');
});

test('config: explicit default provider must be configured', () => {
  const config = readConfig({
    ANTHROPIC_API_KEY: 'sk-ant-test',
    AI_DEFAULT_PROVIDER: 'openai',
  });
  assert.equal(config.defaultProvider, 'anthropic');
  assert.ok(config.warnings.some(warning => warning.includes('AI_DEFAULT_PROVIDER')));
});

test('config: custom default model wins over the provider default', () => {
  const config = readConfig({
    ANTHROPIC_API_KEY: 'sk-ant-test',
    AI_DEFAULT_MODEL: 'claude-custom-model',
  });
  assert.equal(config.defaultModel, 'claude-custom-model');
});

test('config: placeholder keys are rejected', () => {
  const config = readConfig({ ANTHROPIC_API_KEY: 'your_anthropic_api_key_here' });
  assert.equal(config.providers.find(provider => provider.id === 'anthropic')?.apiKey, null);
  assert.equal(config.defaultProvider, null);
});

test('config: malformed timeouts fall back with a warning', () => {
  const config = readConfig({ AI_TIMEOUT_MS: '10', DISPATCH_TIMEOUT_MS: '999999' });
  assert.equal(config.aiTimeoutMs, 45_000);
  assert.equal(config.dispatchTimeoutMs, 8_000);
  assert.ok(config.warnings.some(warning => warning.includes('AI_TIMEOUT_MS')));
  assert.ok(config.warnings.some(warning => warning.includes('DISPATCH_TIMEOUT_MS')));
});

test('config: non-https compatible base URLs are ignored', () => {
  const config = readConfig({
    AI_COMPATIBLE_BASE_URL: 'http://example.com/v1',
    AI_COMPATIBLE_API_KEY: 'test',
  });
  assert.equal(config.providers.some(provider => provider.id === 'compatible'), false);
  assert.ok(config.warnings.some(warning => warning.includes('AI_COMPATIBLE_BASE_URL')));
});

test('config: local OpenAI-compatible endpoints are allowed', () => {
  const config = readConfig({
    AI_COMPATIBLE_BASE_URL: 'http://localhost:11434/v1',
    AI_COMPATIBLE_API_KEY: 'local',
    AI_COMPATIBLE_MODEL: 'qwen3',
  });
  const compatible = config.providers.find(provider => provider.id === 'compatible');
  assert.ok(compatible);
  assert.equal(compatible?.defaultModel, 'qwen3');
  assert.equal(config.defaultProvider, 'compatible');
  assert.equal(config.providers.find(provider => provider.id === 'anthropic')?.apiKey, null);
});

test('config: public config never exposes credentials', () => {
  const config = readConfig({ ANTHROPIC_API_KEY: 'sk-ant-secret-value' });
  const safe = publicConfig(config);
  assert.equal(JSON.stringify(safe).includes('sk-ant-secret-value'), false);
  assert.equal(safe.providers.find(provider => provider.id === 'anthropic')?.configured, true);
});

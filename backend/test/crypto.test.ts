import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { existsSync, unlinkSync, rmdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { readConfig } from '../src/config.js';
import {
  decryptTargetUrl,
  encryptTargetUrl,
  isEncryptedUrl,
  resolveEncryptionKey,
} from '../src/crypto.js';
import { WorkspaceStore, publicTarget } from '../src/store.js';

test('crypto: AES-256-GCM encrypts target URLs and decrypts accurately', () => {
  const key = randomBytes(32);
  const secretUrl = 'https://hooks.slack.com/services/T000/B000/SECRET_TOKEN_12345?auth=sensitive';

  const encrypted = encryptTargetUrl(secretUrl, key);
  assert.ok(isEncryptedUrl(encrypted));
  assert.ok(!encrypted.includes('SECRET_TOKEN_12345'));
  assert.ok(!encrypted.includes('hooks.slack.com'));
  assert.match(encrypted, /^enc:v1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);

  const decrypted = decryptTargetUrl(encrypted, key);
  assert.equal(decrypted, secretUrl);
});

test('crypto: distinct IVs are generated for identical plaintexts', () => {
  const key = randomBytes(32);
  const url = 'https://example.com/webhook?token=abc';

  const enc1 = encryptTargetUrl(url, key);
  const enc2 = encryptTargetUrl(url, key);

  assert.notEqual(enc1, enc2);
  assert.equal(decryptTargetUrl(enc1, key), url);
  assert.equal(decryptTargetUrl(enc2, key), url);
});

test('crypto: tampering with ciphertext or authentication tag fails decryption', () => {
  const key = randomBytes(32);
  const url = 'https://example.com/webhook?secret=confidential';
  const encrypted = encryptTargetUrl(url, key);

  const parts = encrypted.slice('enc:v1:'.length).split(':');
  // Tamper with ciphertext by flipping a character
  const tamperedCipher = parts[2].slice(0, -2) + (parts[2].slice(-2) === 'aa' ? 'bb' : 'aa');
  const tamperedPayload = `enc:v1:${parts[0]}:${parts[1]}:${tamperedCipher}`;

  assert.throws(
    () => decryptTargetUrl(tamperedPayload, key),
    /Unsupported state or unable to authenticate data|bad decrypt/i
  );

  // Tamper with auth tag
  const tamperedTag = parts[1].slice(0, -2) + (parts[1].slice(-2) === '11' ? '22' : '11');
  const tamperedTagPayload = `enc:v1:${parts[0]}:${tamperedTag}:${parts[2]}`;

  assert.throws(
    () => decryptTargetUrl(tamperedTagPayload, key),
    /Unsupported state or unable to authenticate data|bad decrypt/i
  );
});

test('crypto: legacy unencrypted strings pass through unchanged', () => {
  const key = randomBytes(32);
  const legacyUrl = 'https://legacy-endpoint.org/webhook';

  assert.equal(isEncryptedUrl(legacyUrl), false);
  assert.equal(decryptTargetUrl(legacyUrl, key), legacyUrl);
});

test('crypto: key resolution handles explicit hex, base64, and passphrases', () => {
  const hex32 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const hexConfig = readConfig({ AEGIS_ENCRYPTION_KEY: hex32 });
  const keyFromHex = resolveEncryptionKey(hexConfig, ':memory:');
  assert.equal(keyFromHex.length, 32);
  assert.equal(keyFromHex.toString('hex'), hex32);

  const base64Key = Buffer.alloc(32, 7).toString('base64');
  const b64Config = readConfig({ AEGIS_ENCRYPTION_KEY: base64Key });
  const keyFromB64 = resolveEncryptionKey(b64Config, ':memory:');
  assert.equal(keyFromB64.length, 32);
  assert.equal(keyFromB64.toString('base64'), base64Key);

  const passphraseConfig = readConfig({ AEGIS_ENCRYPTION_KEY: 'my-custom-passphrase' });
  const keyFromPassphrase = resolveEncryptionKey(passphraseConfig, ':memory:');
  assert.equal(keyFromPassphrase.length, 32);
});

test('crypto & store: targets are stored encrypted at rest in SQLite and decrypted in memory', () => {
  const config = readConfig();
  const store = new WorkspaceStore(config, ':memory:');

  const secretUrl = 'https://hooks.slack.com/services/T123/B456/TOP_SECRET_WEBHOOK_TOKEN';
  const target = store.createTarget({
    name: 'Encrypted Target',
    type: 'slack',
    url: secretUrl,
    enabled: true,
  });

  // In memory: returned target has decrypted plaintext URL for dispatcher execution
  assert.equal(target.url, secretUrl);
  assert.equal(store.getTarget(target.id)?.url, secretUrl);

  // Directly inspect raw SQLite database row: must NOT contain the secret token or plaintext URL!
  const rawRow = store.rawDatabase
    .prepare('SELECT url FROM dispatch_targets WHERE id = ?')
    .get(target.id) as { url: string };

  assert.ok(rawRow);
  assert.ok(rawRow.url.startsWith('enc:v1:'));
  assert.ok(!rawRow.url.includes('TOP_SECRET_WEBHOOK_TOKEN'));
  assert.ok(!rawRow.url.includes('hooks.slack.com'));

  // Public target view: strips URL completely, exposes only host
  const pub = publicTarget(target);
  assert.equal((pub as unknown as { url?: string }).url, undefined);
  assert.equal(pub.host, 'hooks.slack.com');

  // Updating the target re-encrypts with a fresh IV
  const updated = store.updateTarget(target.id, {
    url: 'https://api.example.com/webhook?key=SECOND_SECRET_TOKEN',
  });
  assert.equal(updated?.url, 'https://api.example.com/webhook?key=SECOND_SECRET_TOKEN');

  const updatedRawRow = store.rawDatabase
    .prepare('SELECT url FROM dispatch_targets WHERE id = ?')
    .get(target.id) as { url: string };

  assert.ok(updatedRawRow.url.startsWith('enc:v1:'));
  assert.notEqual(updatedRawRow.url, rawRow.url);
  assert.ok(!updatedRawRow.url.includes('SECOND_SECRET_TOKEN'));

  // Snapshot hygiene: snapshots must NEVER leak decrypted plaintext URLs into external backups
  store.createUser({
    email: 'admin@aegis.local',
    name: 'Admin User',
    passwordHash: 'hash123',
    salt: 'salt123',
    role: 'admin',
  });

  const snap = store.snapshot();
  assert.ok(snap.targets[0].url.startsWith('enc:v1:'));
  assert.ok(!snap.targets[0].url.includes('SECOND_SECRET_TOKEN'));
  assert.equal(snap.users?.length, 1);
  assert.equal(snap.users?.[0].email, 'admin@aegis.local');

  // Cold start rehydration: re-hydrating restores users and encrypted targets accurately
  const freshStore = new WorkspaceStore(config);
  assert.equal(freshStore.countUsers(), 0);
  freshStore.mergePersisted(snap);
  assert.equal(freshStore.countUsers(), 1);
  assert.equal(freshStore.getUserByEmail('admin@aegis.local')?.name, 'Admin User');
  assert.equal(freshStore.getTarget(target.id)?.url, 'https://api.example.com/webhook?key=SECOND_SECRET_TOKEN');
});

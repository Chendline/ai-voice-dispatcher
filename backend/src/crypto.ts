import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { AppConfig } from './config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits auth tag
const PREFIX = 'enc:v1:';

/**
 * Resolves or derives a 256-bit (32-byte) key for AES-256-GCM encryption of target secrets.
 *
 * Precedence:
 * 1. Explicit `config.encryptionKey` from env (AEGIS_ENCRYPTION_KEY / ENCRYPTION_KEY).
 * 2. In-memory ephemeral key if running with `:memory:` database (tests).
 * 3. On-disk secret key file (e.g. `data/.key`) created with 0o600 permissions.
 */
export function resolveEncryptionKey(config: AppConfig, dbPath: string): Buffer {
  if (config.encryptionKey) {
    const raw = config.encryptionKey.trim();
    // If it's a 64-character hex string (32 bytes), parse it directly
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      return Buffer.from(raw, 'hex');
    }
    // If it's a 44-character base64 string (32 bytes), parse it
    if (/^[A-Za-z0-9+/]{43}=$/.test(raw)) {
      return Buffer.from(raw, 'base64');
    }
    // Otherwise derive a 32-byte key via SHA-256 hash of the passphrase
    return createHash('sha256').update(raw, 'utf8').digest();
  }

  if (dbPath === ':memory:') {
    // Generate a process-stable ephemeral key for in-memory testing
    return getEphemeralMemoryKey();
  }

  // Persistent disk storage: persist or load a dedicated .key file next to the database
  const keyDir = dirname(resolve(dbPath));
  const keyPath = resolve(keyDir, '.aegis_key');

  try {
    if (existsSync(keyPath)) {
      const data = readFileSync(keyPath);
      if (data.length === 32) {
        return data;
      }
      if (data.length === 64) {
        const hexParsed = Buffer.from(data.toString('utf8').trim(), 'hex');
        if (hexParsed.length === 32) {
          return hexParsed;
        }
      }
    }

    mkdirSync(keyDir, { recursive: true });
    const newKey = randomBytes(32);
    writeFileSync(keyPath, newKey, { mode: 0o600 });
    return newKey;
  } catch {
    // Fallback if filesystem write is restricted (e.g. read-only container)
    return getEphemeralMemoryKey();
  }
}

let ephemeralKey: Buffer | null = null;
function getEphemeralMemoryKey(): Buffer {
  if (!ephemeralKey) {
    ephemeralKey = randomBytes(32);
  }
  return ephemeralKey;
}

/**
 * Checks whether a stored URL string is already encrypted.
 */
export function isEncryptedUrl(value: string): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Encrypts a target URL string at rest using AES-256-GCM.
 * Output format: `enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>`
 */
export function encryptTargetUrl(plaintext: string, key: Buffer): string {
  if (!plaintext || isEncryptedUrl(plaintext)) {
    return plaintext;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an encrypted target URL string from rest using AES-256-GCM.
 * Seamlessly returns unencrypted legacy strings if they lack the encryption prefix.
 */
export function decryptTargetUrl(stored: string, key: Buffer): string {
  if (!stored || !isEncryptedUrl(stored)) {
    // Legacy unencrypted row compatibility
    return stored;
  }

  const parts = stored.slice(PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted target secret payload.');
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(cipherHex, 'hex');

  if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid IV or authentication tag length in encrypted target secret.');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COOKIE_CONSENT_KEY,
  hasCookieConsent,
  recordCookieConsent,
  type CookieConsentRecord,
} from '../src/utils/cookieConsent.ts';

test('cookieConsent: hasCookieConsent returns false when storage is empty', () => {
  const mockStorage: Record<string, string> = {};
  const fakeStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
  };

  assert.equal(hasCookieConsent(fakeStorage), false);
});

test('cookieConsent: recordCookieConsent writes valid JSON payload to storage', () => {
  const mockStorage: Record<string, string> = {};
  const fakeStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
  };

  const recorded = recordCookieConsent(fakeStorage);
  assert.equal(recorded, true);
  assert.equal(hasCookieConsent(fakeStorage), true);

  const raw = mockStorage[COOKIE_CONSENT_KEY];
  assert.ok(raw);
  const parsed = JSON.parse(raw) as CookieConsentRecord;
  assert.equal(parsed.version, 1);
  assert.ok(parsed.acknowledgedAt);
  assert.ok(!Number.isNaN(Date.parse(parsed.acknowledgedAt)));
});

test('cookieConsent: handles throwing or restricted storage gracefully', () => {
  const throwingStorage = {
    getItem: () => {
      throw new Error('SecurityError: Access is denied');
    },
    setItem: () => {
      throw new Error('SecurityError: Access is denied');
    },
  };

  assert.equal(hasCookieConsent(throwingStorage), false);
  assert.equal(recordCookieConsent(throwingStorage), false);
});

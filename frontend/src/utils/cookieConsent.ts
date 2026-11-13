export const COOKIE_CONSENT_KEY = 'aegis.cookie_consent.v1';

export interface CookieConsentRecord {
  acknowledgedAt: string;
  version: number;
}

/**
 * Checks whether the operator or visitor has acknowledged the Cookie & Storage Policy.
 * Safely handles missing window or restricted localStorage environments.
 */
export function hasCookieConsent(storage?: Pick<Storage, 'getItem'>): boolean {
  try {
    const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!target) return false;
    const raw = target.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Records the operator's acknowledgment of essential cookies and local storage.
 */
export function recordCookieConsent(storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!target) return false;
    const record: CookieConsentRecord = {
      acknowledgedAt: new Date().toISOString(),
      version: 1,
    };
    target.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

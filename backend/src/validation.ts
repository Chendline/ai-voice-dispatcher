export interface DispatchRequest {
  tenantId: string;
  callerName: string;
  callerContact: string;
  rawQuery: string;
}

export interface IntegrationRequest {
  connected: boolean;
  accountEmail?: string;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const TENANT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/i;
const MAX_QUERY_LENGTH = 2000;
const MAX_NAME_LENGTH = 120;
const MAX_CONTACT_LENGTH = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptionalString(
  value: unknown,
  field: string,
  maxLength: number,
): ValidationResult<string | undefined> {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (typeof value !== 'string') return { ok: false, error: `${field} must be a string.` };
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return { ok: false, error: `${field} must be ${maxLength} characters or fewer.` };
  return { ok: true, value: trimmed };
}

export function parseDispatchRequest(body: unknown): ValidationResult<DispatchRequest> {
  if (!isRecord(body)) return { ok: false, error: 'Request body must be a JSON object.' };

  const tenantId = body.tenantId;
  if (typeof tenantId !== 'string' || !TENANT_ID_PATTERN.test(tenantId.trim())) {
    return { ok: false, error: 'tenantId is required and must be a valid tenant identifier.' };
  }

  const rawQuery = body.rawQuery;
  if (typeof rawQuery !== 'string') return { ok: false, error: 'rawQuery must be a string.' };
  const query = rawQuery.trim();
  if (!query) return { ok: false, error: 'rawQuery must not be empty.' };
  if (query.length > MAX_QUERY_LENGTH) {
    return { ok: false, error: `rawQuery must be ${MAX_QUERY_LENGTH} characters or fewer.` };
  }

  const name = readOptionalString(body.callerName, 'callerName', MAX_NAME_LENGTH);
  if (!name.ok) return name;

  const contact = readOptionalString(body.callerContact, 'callerContact', MAX_CONTACT_LENGTH);
  if (!contact.ok) return contact;

  return {
    ok: true,
    value: {
      tenantId: tenantId.trim(),
      callerName: name.value || 'Anonymous Caller',
      callerContact: contact.value || '+1 (555) 012-3456',
      rawQuery: query,
    },
  };
}

export function parseIntegrationRequest(body: unknown): ValidationResult<IntegrationRequest> {
  if (!isRecord(body)) return { ok: false, error: 'Request body must be a JSON object.' };
  if (typeof body.connected !== 'boolean') return { ok: false, error: 'connected must be a boolean.' };

  const email = readOptionalString(body.accountEmail, 'accountEmail', MAX_CONTACT_LENGTH);
  if (!email.ok) return email;

  return { ok: true, value: { connected: body.connected, accountEmail: email.value } };
}

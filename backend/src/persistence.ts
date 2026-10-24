import { get, put } from '@vercel/blob';
import { tenantStore, type PersistedTenantState } from './tenantStore.js';

const token = process.env.BLOB_READ_WRITE_TOKEN;
export const persistenceEnabled = Boolean(token);

const pathnameFor = (tenantId: string) => `tenants/${tenantId}.json`;

async function readState(tenantId: string): Promise<PersistedTenantState | null> {
  if (!token) return null;
  try {
    const result = await get(pathnameFor(tenantId), { access: 'private', useCache: false, token });
    if (!result || result.statusCode !== 200) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as PersistedTenantState;
  } catch (error) {
    console.warn(`[persistence] read ${tenantId} failed:`, (error as Error).message);
    return null;
  }
}

/** Merge durable state for a tenant into the in-memory store. */
export async function hydrateTenant(tenantId: string): Promise<void> {
  const state = await readState(tenantId);
  if (state) tenantStore.mergePersisted(tenantId, state);
}

/** Write the current in-memory snapshot for a tenant. Failures degrade to memory-only. */
export async function persistTenant(tenantId: string): Promise<void> {
  if (!token) return;
  const snapshot = tenantStore.snapshot(tenantId);
  if (!snapshot) return;
  try {
    await put(pathnameFor(tenantId), JSON.stringify(snapshot), {
      access: 'private',
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 0,
    });
  } catch (error) {
    console.warn(`[persistence] write ${tenantId} failed:`, (error as Error).message);
  }
}

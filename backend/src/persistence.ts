import { get, put } from '@vercel/blob';
import type { WorkspaceState } from './types.js';
import type { WorkspaceStore } from './store.js';

const token = process.env.BLOB_READ_WRITE_TOKEN;
export const persistenceEnabled = Boolean(token);

const stateId = (process.env.AEGIS_STATE_ID?.trim() || 'default').replace(/[^a-z0-9_-]/gi, '-');
const pathname = `workspaces/${stateId}.json`;

async function readState(): Promise<WorkspaceState | null> {
  if (!token) return null;
  try {
    const result = await get(pathname, { access: 'private', useCache: false, token });
    if (!result || result.statusCode !== 200) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as WorkspaceState;
  } catch (error) {
    console.warn('[persistence] workspace read failed:', (error as Error).message);
    return null;
  }
}

export async function hydrateWorkspace(store: WorkspaceStore): Promise<void> {
  const state = await readState();
  if (state) store.mergePersisted(state);
}

/** Persist the whole workspace. Failures degrade to memory-only. */
export async function persistWorkspace(store: WorkspaceStore): Promise<void> {
  if (!token) return;
  try {
    await put(pathname, JSON.stringify(store.snapshot()), {
      access: 'private',
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 0,
    });
  } catch (error) {
    console.warn('[persistence] workspace write failed:', (error as Error).message);
  }
}

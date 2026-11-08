import dotenv from 'dotenv';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { hydrateWorkspace, persistenceEnabled } from './persistence.js';
import { WorkspaceStore } from './store.js';

dotenv.config({ path: '../.env' });

async function main() {
  const config = readConfig();
  const store = new WorkspaceStore(config);

  for (const warning of config.warnings) {
    console.warn(`[config] ${warning}`);
  }

  await hydrateWorkspace(store);

  const app = createApp({ config, store });

  app.listen(config.port, () => {
    console.log(
      `[AEGIS] API running on http://localhost:${config.port} ` +
      `(storage: ${persistenceEnabled ? 'blob' : 'memory'}, ` +
      `AI: ${config.defaultProvider ?? 'not configured'}, ` +
      `dispatch targets: ${store.listTargets().length})`,
    );
  });
}

main().catch(error => {
  console.error('[AEGIS] Failed to start:', (error as Error).message);
  process.exitCode = 1;
});

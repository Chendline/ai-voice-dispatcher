import dotenv from 'dotenv';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { hydrateWorkspace, persistenceEnabled } from './persistence.js';
import { WorkspaceStore } from './store.js';

dotenv.config({ path: '../.env' });
dotenv.config({ path: '.env' });

async function main() {
  const config = readConfig();
  const store = new WorkspaceStore(config);

  for (const warning of config.warnings) {
    console.warn(`[config] ${warning}`);
  }

  await hydrateWorkspace(store);

  const app = createApp({ config, store });

  const server = app.listen(config.port, () => {
    console.log(
      `[AEGIS] API running on http://localhost:${config.port} ` +
      `(storage: sqlite${persistenceEnabled ? '+blob' : ''}, ` +
      `AI: ${config.defaultProvider ?? 'not configured'}, ` +
      `dispatch targets: ${store.listTargets().length})`,
    );
  });

  const shutdown = (signal: string) => {
    console.log(`[AEGIS] Received ${signal}. Draining connections and shutting down gracefully...`);
    server.close(() => {
      console.log('[AEGIS] HTTP server closed.');
      store.close();
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[AEGIS] Forcefully shutting down.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(error => {
  console.error('[AEGIS] Failed to start:', (error as Error).message);
  process.exitCode = 1;
});

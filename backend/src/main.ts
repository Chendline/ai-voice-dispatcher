import dotenv from 'dotenv';
import { createApp } from './app.js';
import { readFastnConfig, connectorMode } from './config.js';
import { persistenceEnabled } from './persistence.js';

dotenv.config({ path: '../.env' });

const config = readFastnConfig();
const port = process.env.PORT || 3001;
const app = createApp({ config });

for (const warning of config.warnings) {
  console.warn(`[config] ${warning}`);
}

app.listen(port, () => {
  console.log(
    `[Dispatcher Backend] Running on http://localhost:${port} ` +
    `(storage: ${persistenceEnabled ? 'blob' : 'memory'}, connectors: ${connectorMode(config)})`,
  );
});

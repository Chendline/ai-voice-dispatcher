// Static hosts must serve the SPA shell for /app and /app/<section>.
// Vite only emits a single index.html, so publish copies alongside it.
import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');

await mkdir(join(dist, 'app'), { recursive: true });
await copyFile(join(dist, 'index.html'), join(dist, 'app', 'index.html'));
await copyFile(join(dist, 'index.html'), join(dist, '404.html'));

console.log('postbuild: created app/index.html and 404.html SPA fallbacks');

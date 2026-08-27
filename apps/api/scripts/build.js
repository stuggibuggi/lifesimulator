// Plesk/npm often runs `npm run build` for Node apps.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.dirname(fileURLToPath(import.meta.url));
const result = spawnSync(process.execPath, [path.join(apiRoot, 'bundle-sim.mjs')], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

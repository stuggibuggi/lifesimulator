import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(apiRoot, '../..');
const entry = path.join(repoRoot, 'packages/simulation-engine/src/index.ts');
const outfile = path.join(apiRoot, 'src/sim/engine.bundle.mjs');

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  packages: 'bundle',
  logLevel: 'info',
});

console.log(`api: bundled simulation engine → ${outfile}`);

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const rootDir = path.resolve(import.meta.dirname, '..');

function loadTsExport(relativePath, exportName) {
  const filePath = path.join(rootDir, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;

  const sandbox = {
    exports: {},
    require: (specifier) => {
      if (specifier === '@goal/shared-types') return {};
      throw new Error(`Unsupported seed export import: ${specifier}`);
    },
  };
  vm.runInNewContext(transpiled, sandbox, { filename: filePath });
  return sandbox.exports[exportName];
}

const events = loadTsExport('src/events.ts', 'ALL_LIFE_EVENTS');
const scenarios = loadTsExport('src/scenarios.ts', 'EDUCATIONAL_SCENARIOS');

const seed = {
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  sourcePackage: '@goal/game-content',
  events,
  scenarios,
};

const outDir = path.join(rootDir, 'dist');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'seed.json'), `${JSON.stringify(seed, null, 2)}\n`, 'utf8');

console.log(`Exported ${events.length} events and ${scenarios.length} scenarios to dist/seed.json`);

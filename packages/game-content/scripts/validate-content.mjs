import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, '..', 'src');

const EVENT_ICON_ALLOWLIST = new Set([
  'AlertTriangle',
  'Award',
  'Baby',
  'Briefcase',
  'Cake',
  'CalendarCheck',
  'Droplet',
  'Heart',
  'HeartHandshake',
  'Home',
  'Landmark',
  'Map',
  'PiggyBank',
  'Plane',
  'Receipt',
  'ShoppingBag',
  'Smartphone',
  'Smile',
  'Sparkles',
  'Stethoscope',
  'TrendingUp',
  'Wrench',
]);

function loadContentModule(fileName) {
  const filePath = resolve(srcDir, fileName);
  const source = readFileSync(filePath, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: filePath,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      skipLibCheck: true,
    },
  });

  const diagnostics = (result.diagnostics || []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  if (diagnostics.length > 0) {
    const messages = diagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    );
    throw new Error(`Could not transpile ${fileName}:\n${messages.join('\n')}`);
  }

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require(importId) {
      throw new Error(`Unexpected runtime import "${importId}" while validating ${fileName}`);
    },
  };

  vm.runInNewContext(result.outputText, sandbox, { filename: filePath });
  return module.exports;
}

function validateUniqueIds(items, label, errors) {
  const seen = new Set();
  for (const item of items) {
    if (!item?.id) {
      errors.push(`${label} contains an item without an id.`);
      continue;
    }
    if (seen.has(item.id)) {
      errors.push(`${label} id "${item.id}" is duplicated.`);
    }
    seen.add(item.id);
  }
}

const { ALL_LIFE_EVENTS } = loadContentModule('events.ts');
const { EDUCATIONAL_SCENARIOS } = loadContentModule('scenarios.ts');
const { ALL_LIFE_GOALS } = loadContentModule('goals.ts');

const errors = [];
validateUniqueIds(ALL_LIFE_EVENTS, 'Life event', errors);
validateUniqueIds(EDUCATIONAL_SCENARIOS, 'Scenario', errors);

for (const event of ALL_LIFE_EVENTS) {
  if (!EVENT_ICON_ALLOWLIST.has(event.icon)) {
    errors.push(`Life event "${event.id}" uses unsupported icon "${event.icon}".`);
  }
}

const goalIds = new Set(ALL_LIFE_GOALS.map((goal) => goal.id));
for (const scenario of EDUCATIONAL_SCENARIOS) {
  for (const goalId of scenario.recommendedGoals || []) {
    if (!goalIds.has(goalId)) {
      errors.push(`Scenario "${scenario.id}" recommends unknown goal "${goalId}".`);
    }
  }
}

if (errors.length > 0) {
  console.error('Content validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Content validation passed: ${ALL_LIFE_EVENTS.length} events, ${EDUCATIONAL_SCENARIOS.length} scenarios, ${ALL_LIFE_GOALS.length} goals.`
);

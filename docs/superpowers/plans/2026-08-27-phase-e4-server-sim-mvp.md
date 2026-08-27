# Phase E4 Server-Sim MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /api/runs/:id/actions` with shared simulation engine, audit/idempotency, classroom client cutover behind `VITE_SERVER_SIM`, and first parity tests.

**Architecture:** Persist `rngState` on `GameState`. Bundle `@goal/simulation-engine` for Node via esbuild into `apps/api`. Actions route applies `STEP_MONTH` / `EVENT_CHOICE`, writes `run_action_audit`, returns next state. Player-web uses the endpoint when flag + student session are active and skips Cloud-Save PUT after those steps.

**Tech Stack:** Express, MariaDB, Vitest, esbuild, Zustand/React, existing `@goal/simulation-engine`.

## Global Constraints

- German UI copy
- Only `STEP_MONTH` and `EVENT_CHOICE` on the server (A1)
- No free Cloud-Save overwrite after server month/event steps
- Solo/offline or flag off keeps local engine
- No student PII in logs beyond existing patterns
- Commit identity via env: `stuggibuggi` / `stuggibuggi@users.noreply.github.com`
- Branch: `feature/phase-e4-server-sim-mvp`
- Spec: `docs/superpowers/specs/2026-08-27-phase-e4-server-sim-mvp-design.md`

## File map

- Modify: `packages/simulation-engine/src/math/random.ts`
- Modify: `packages/shared-types/src/index.ts` (`GameState.rngState?: number`)
- Modify: `apps/player-web/src/store/gameStore.ts` (persist/restore rng)
- Create: `packages/simulation-engine/test/rng_state.test.ts`
- Create: `apps/api/scripts/bundle-sim.mjs`
- Create: `apps/api/src/sim/applyRunAction.js` (+ optional generated `engine.bundle.mjs`)
- Modify: `apps/api/package.json`, `apps/api/scripts/build.js`
- Modify: `apps/api/src/db/migrate.js`, `apps/api/schema.sql`
- Create: `apps/api/src/routes/runs.actions.js`, `apps/api/src/routes/runs.actions.test.js`
- Modify: `apps/api/src/routes/runs.js` or `app.js` to mount actions
- Modify: `apps/player-web/src/api/client.ts`, `gameStore.ts`
- Create: client helper tests for server-sim path
- Create: parity test file
- Modify: contract/architecture/plesk/env docs

---

### Task 1: Persistable RNG state

**Files:**
- Modify: `packages/simulation-engine/src/math/random.ts`
- Modify: `packages/shared-types/src/index.ts`
- Create: `packages/simulation-engine/test/rng_state.test.ts`
- Modify: `apps/player-web/src/store/gameStore.ts` (restore/save `rngState` whenever PRNG is used)

**Interfaces:**
- Produces:
  - `SeededRandom.getState(): number`
  - `SeededRandom.fromState(state: number): SeededRandom`
  - `GameState.rngState?: number`

- [ ] **Step 1: Write failing RNG tests**

```ts
import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../src/math/random';

describe('SeededRandom state', () => {
  it('round-trips getState/fromState after draws', () => {
    const a = new SeededRandom(42);
    a.next();
    a.next();
    const b = SeededRandom.fromState(a.getState());
    expect(b.next()).toBe(a.next());
    expect(b.next()).toBe(a.next());
  });

  it('fromState(0) does not collapse to a broken generator', () => {
    const rng = SeededRandom.fromState(0);
    expect(Number.isFinite(rng.next())).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

`npx vitest run packages/simulation-engine/test/rng_state.test.ts`

- [ ] **Step 3: Implement getState/fromState**

```ts
getState(): number {
  return this.state >>> 0;
}

static fromState(state: number): SeededRandom {
  const rng = new SeededRandom(1);
  rng.state = state >>> 0;
  if (rng.state === 0) rng.state = 1;
  return rng;
}
```

Make `state` accessible (keep private field; `fromState` assigns via cast or package-internal). Prefer:

```ts
static fromState(state: number): SeededRandom {
  const rng = Object.create(SeededRandom.prototype) as SeededRandom;
  (rng as { state: number }).state = (state >>> 0) || 1;
  return rng;
}
```

Or change `private state` to allow static factory in-class (cleanest: implement `fromState` inside the class body so it can set `this.state`).

Add to `GameState`:

```ts
/** Mulberry32 internal state for cross-client/server continuity */
rngState?: number;
```

- [ ] **Step 4: Wire player-web to persist/restore**

Helpers in `gameStore.ts`:

```ts
function rngFromGameState(state: GameState): SeededRandom {
  if (typeof state.rngState === 'number') return SeededRandom.fromState(state.rngState);
  return new SeededRandom(state.seed);
}

function withRngState(state: GameState, rng: SeededRandom): GameState {
  return { ...state, rngState: rng.getState() };
}
```

After every local `stepSimulationMonth` / choice path that advances rng, save `rngState` onto `nextState`. On load/import/start, restore with `rngFromGameState`.

- [ ] **Step 5: Run tests PASS + commit**

```
npx vitest run packages/simulation-engine/test/rng_state.test.ts
git commit -m "feat: persist simulation rng state for server parity"
```

---

### Task 2: Node-loadable engine bundle + applyRunAction helper

**Files:**
- Create: `apps/api/scripts/bundle-sim.mjs`
- Create: `apps/api/src/sim/applyRunAction.js`
- Create: `apps/api/src/sim/applyRunAction.test.js` (or `.ts` under packages — prefer testing helper via vitest importing TS mirror)

**Preferred test strategy:** put pure apply logic in `packages/simulation-engine/src/engine/runAction.ts` so vitest can import TS; API JS thin-wraps the bundled exports.

**Interfaces:**
- Produces:
  - `applyRunAction({ state, action, events, engineVersion }): { nextState, triggeredEvent, deltas }`
  - Bundle at `apps/api/src/sim/engine.bundle.mjs` (gitignored or built in `npm run build`)
  - `ENGINE_VERSION` string constant from package version `0.1.0`

- [ ] **Step 1: Add `applyRunAction` in simulation-engine with tests**

```ts
// packages/simulation-engine/src/engine/runAction.ts
export type RunAction =
  | { type: 'STEP_MONTH' }
  | { type: 'EVENT_CHOICE'; eventId: string; choiceId: string };

export function applyRunAction(input: {
  state: GameState;
  action: RunAction;
  events: LifeEvent[];
}): { nextState: GameState; triggeredEvent: LifeEvent | null; deltas: { giroDelta: number } } {
  const rng = typeof input.state.rngState === 'number'
    ? SeededRandom.fromState(input.state.rngState)
    : new SeededRandom(input.state.seed);
  const giroBefore = input.state.bankAccount.giroBalance;

  if (input.action.type === 'STEP_MONTH') {
    if (input.state.activeEvent) {
      throw Object.assign(new Error('ACTIVE_EVENT'), { code: 'CONFLICT' });
    }
    const result = stepSimulationMonth(input.state, input.events, rng);
    const nextState = { ...result.nextState, rngState: rng.getState() };
    return {
      nextState,
      triggeredEvent: result.triggeredEvent,
      deltas: { giroDelta: nextState.bankAccount.giroBalance - giroBefore },
    };
  }

  // EVENT_CHOICE
  const active = input.state.activeEvent;
  if (!active || active.id !== input.action.eventId) {
    throw Object.assign(new Error('EVENT_MISMATCH'), { code: 'CONFLICT' });
  }
  const choice = active.choices.find((c) => c.id === input.action.choiceId);
  if (!choice) {
    throw Object.assign(new Error('UNKNOWN_CHOICE'), { code: 'UNPROCESSABLE' });
  }
  const next = applyEventChoice(input.state, active, choice);
  const nextState = { ...next, rngState: rng.getState(), activeEvent: null };
  // Note: verify applyEventChoice already clears activeEvent; do not double-clear incorrectly.
  return {
    nextState: { ...nextState, rngState: rng.getState() },
    triggeredEvent: null,
    deltas: { giroDelta: nextState.bankAccount.giroBalance - giroBefore },
  };
}
```

Adjust to match real `applyEventChoice` semantics (read `eventEngine.ts` first). Export from `packages/simulation-engine/src/index.ts`.

Test file: step once, choose first choice if event triggers, assert age/month/rngState change.

- [ ] **Step 2: Bundle for Node**

Add `esbuild` as root or `apps/api` dependency.

`apps/api/scripts/bundle-sim.mjs`:

```js
import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
await esbuild.build({
  entryPoints: [path.join(root, '../packages/simulation-engine/src/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(root, 'src/sim/engine.bundle.mjs'),
  // packages are TS; allow bundling workspace sources
});
```

Wire `apps/api` `build` script: `node scripts/bundle-sim.mjs`.

`apps/api/src/sim/applyRunAction.js` re-exports from `./engine.bundle.mjs`.

Add `src/sim/engine.bundle.mjs` to `.gitignore` if large; ensure Plesk `npm run build` in `apps/api` generates it before start. Prefer documenting in checklist.

- [ ] **Step 3: Commit**

`feat: add applyRunAction helper and node engine bundle`

---

### Task 3: Audit table migration

**Files:**
- Modify: `apps/api/src/db/migrate.js`
- Modify: `apps/api/schema.sql`

- [ ] **Step 1: Add CREATE for `run_action_audit`** (exact SQL from spec)

- [ ] **Step 2: Commit**

`feat: add run_action_audit table for server-sim idempotency`

---

### Task 4: `POST /api/runs/:id/actions`

**Files:**
- Create: `apps/api/src/routes/runs.actions.js`
- Create: `apps/api/src/routes/runs.actions.test.js`
- Modify: `apps/api/app.js` (mount) and optionally keep `runs.js` for `/me`

**Interfaces:**
- Consumes: `requireStudent`, `query`, `applyRunAction`, published content loader
- Produces: contract-compliant HTTP responses

- [ ] **Step 1: Failing route tests** (mock `query` like classrooms tests)

Cover:

1. 401 without student token
2. 403 when membership does not own run id
3. STEP_MONTH success updates age/month and inserts audit
4. Replay same idempotency key returns stored body and does not second UPDATE
5. expectedAge mismatch → 409
6. unknown choice → 422

- [ ] **Step 2: Implement route**

Pseudo-flow:

1. Resolve membership by token; load run by `:id`; verify `run.membership_id === membership.id`
2. Parse body; validate action shape
3. SELECT audit by `(game_run_id, idempotency_key)` → if hit, return `JSON.parse(response_json)`
4. Parse `game_state`; check `currentAge`/`currentMonth` vs expected; engine version vs `0.1.0` (or env)
5. Load published events (query content_events status=published) or seed.json fallback
6. `applyRunAction(...)`
7. UPDATE game_runs; INSERT audit; return 200 body

Optional: when `SERVER_SIM_STRICT=1`, in `PUT /me` reject age/month changes if run exists — can be Task 4b or same task.

- [ ] **Step 3: Tests PASS + commit**

`feat: implement POST /api/runs/:id/actions server simulation`

---

### Task 5: Client cutover behind `VITE_SERVER_SIM`

**Files:**
- Modify: `apps/player-web/src/api/client.ts` — `postRunAction(...)`
- Modify: `apps/player-web/src/store/gameStore.ts`
- Create: `apps/player-web/src/store/gameStore.serverSim.test.ts`

**Interfaces:**
- Produces:
  - `isServerSimEnabled(env, hasStudentSession): boolean`
  - `stepMonth` / `handleEventChoice` branch
  - no `maybeCloudSave` after successful server month/event

- [ ] **Step 1: Helper tests**

```ts
expect(isServerSimEnabled({ VITE_SERVER_SIM: '1' }, true)).toBe(true);
expect(isServerSimEnabled({ VITE_SERVER_SIM: '1' }, false)).toBe(false);
expect(isServerSimEnabled({}, true)).toBe(false);
```

- [ ] **Step 2: Implement client API + store branch**

`postRunAction(runId, body)` → `POST /api/runs/${runId}/actions` with `X-Student-Token`.

On success set `gameState` from `nextState`, update `prng` from `rngState`, persistLocal, **do not** call `maybeCloudSave` for that transition.

On 409: fetch `/api/runs/me`, replace state, set German message (store field or reuse cloudSaveMessage): `Spielstand wurde aktualisiert.`

`stepYear`: loop up to 12 server STEP_MONTH calls; break on triggeredEvent.

- [ ] **Step 3: Commit**

`feat: route classroom month steps through server-sim API`

---

### Task 6: Parity tests + docs

**Files:**
- Create: `packages/simulation-engine/test/server_parity.test.ts` (local applyRunAction vs repeated stepSimulationMonth with shared rng)
- Modify: `docs/api-runs-actions-contract.md` (status: implemented in E4)
- Modify: `docs/architecture-simulation-boundary.md`
- Modify: `docs/plesk-go-live-checklist.md`
- Modify: `apps/api/.env.example` (`SERVER_SIM_STRICT`, note bundle build)
- Create: `.superpowers/sdd/briefs/phase-e4-report.md`

- [ ] **Step 1: Parity test** — same seed, 6 months + resolve events greedily with choice[0], assert equal giro/age/month/rngState

- [ ] **Step 2: Docs updates**

- [ ] **Step 3: Full verify**

```
npx vitest run packages/simulation-engine/test/rng_state.test.ts packages/simulation-engine/test/server_parity.test.ts apps/api/src/routes/runs.actions.test.js apps/player-web/src/store/gameStore.serverSim.test.ts
npm test
npm run build --workspace=apps/api
npm run build --workspace=apps/player-web
```

- [ ] **Step 4: Commit**

`docs: mark E4 server-sim contract implemented and add parity tests`

---

## Verification gate

All of the above green before merge to `main`. Plesk: `migrate`, `npm run build` in `apps/api` (bundle), restart API, rebuild player-web with `VITE_SERVER_SIM=1` only when ready.

## Spec coverage

| Spec item | Task |
|-----------|------|
| rngState persistence | 1 |
| Node engine load | 2 |
| run_action_audit | 3 |
| POST actions + idempotency | 4 |
| Client flag cutover | 5 |
| Parity + docs | 6 |
| A1 only STEP_MONTH/EVENT_CHOICE | 2, 4, 5 |
| No Cloud-Save overwrite after server steps | 5 |

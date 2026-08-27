# Phase E4 — Server Simulation MVP Design Spec

> **Status:** Approved in brainstorming (2026-08-27)  
> **Scope:** E4 only (not E5 full offline/parity suite)  
> **Approach:** Shared `@goal/simulation-engine` inside the API process  
> **Predecessor:** D4 contract in `docs/api-runs-actions-contract.md`

## 1. Goal

Make classroom/cloud runs advance months and event choices on the server through `POST /api/runs/:id/actions`, with idempotency, an audit log, a feature-flagged client cutover, and first local-vs-server parity tests — without moving every gameplay action to the server yet.

### Success criteria

1. API implements `POST /api/runs/:id/actions` for `STEP_MONTH` and `EVENT_CHOICE` using the shared simulation engine.
2. Idempotent retries with the same key do not double-apply an action; results are auditable in MariaDB.
3. With `VITE_SERVER_SIM=1` and an active student session, the client uses the actions endpoint for month/event progress and does not overwrite run state via Cloud-Save PUT after those steps.
4. Solo/offline (no student session) or flag off keeps the existing local engine path.
5. At least one automated parity suite compares local engine results to server results for seeded scenarios.
6. Other player actions (insurance, savings, housing, career, …) are out of cloud sync in server-sim mode (A1).

### Non-goals

- Streaming / always-online requirement for solo play
- Full action catalog on the server (E5+)
- Multi-IdP / student SSO
- Softening classroom tip / CMS behavior
- 24h TTL purge job for audit rows (may store durably in MVP)

---

## 2. Product / runtime boundary

| Mode | Month / event choice | Other actions | Cloud-Save PUT |
|------|----------------------|---------------|----------------|
| Solo / offline / `VITE_SERVER_SIM` off | Local engine | Local | Optional as today |
| Classroom + `VITE_SERVER_SIM=1` | Server actions API | Local only, **no** cloud overwrite | Allowed for **initial run create** / resume metadata only — **not** after local month steps |

Server-sim mode therefore has a temporarily narrower cloud-synced gameplay surface: month stepping and event resolution. That is intentional for MVP cleanliness (no dual writers).

---

## 3. Architecture

```
player-web (classroom + VITE_SERVER_SIM)
  → POST /api/runs/:id/actions
      → auth (student owns run)
      → load game_runs.game_state
      → concurrency checks (age/month, engine version)
      → idempotency lookup
      → stepSimulationMonth / applyEventChoice (@goal/simulation-engine)
      → persist game_state + audit row
      → return nextState / triggeredEvent / deltas / versions
```

Content on the server:

1. Prefer published CMS events/scenarios from MariaDB (same source as `GET /api/content/published`).
2. Fallback to bundled `packages/game-content/dist/seed.json` (or equivalent export) if CMS empty.

Node packaging:

- `apps/api` is plain ESM JavaScript today; `@goal/simulation-engine` is TypeScript source.
- E4 must make the engine **loadable from Node** (recommended: compile packages to `dist/` and point Node `exports`/`main` at JS, or a thin API-side loader agreed in the implementation plan).
- Do not re-implement month logic in Express.

### RNG / determinism

Client currently keeps a live `SeededRandom` instance in Zustand while only `gameState.seed` is persisted. Recreating `new SeededRandom(seed)` on the server after N months would desync event rolls.

E4 therefore **persists RNG state** with the run:

- Add `SeededRandom.getState()` / `SeededRandom.fromState(state)` (or equivalent).
- Persist `rngState` inside `GameState` (preferred) or on `game_runs`.
- Every server (and local) month/event path must read/write that state so parity tests can match.

---

## 4. API contract (runtime of D4)

Endpoint: `POST /api/runs/:id/actions`  
Auth: `X-Student-Token` (or existing student session header used by runs routes); teacher JWT rejected.

### Actions

- `{ "type": "STEP_MONTH" }`
- `{ "type": "EVENT_CHOICE", "eventId": "…", "choiceId": "…" }`

Required body fields: `expectedAge`, `expectedMonth`, `clientEngineVersion`, `idempotencyKey`.

### Responses / errors

Unchanged from `docs/api-runs-actions-contract.md`:

- `200` with `nextState`, optional `triggeredEvent`, optional `deltas`, `serverEngineVersion`, `contentVersion`
- `401` / `403` / `404` / `409` / `422`

Remove `501` once implemented.

### Idempotency + audit

New table (created in migrate + `schema.sql`):

```sql
CREATE TABLE IF NOT EXISTS run_action_audit (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  game_run_id INT UNSIGNED NOT NULL,
  idempotency_key VARCHAR(64) NOT NULL,
  action_type VARCHAR(32) NOT NULL,
  request_json LONGTEXT NOT NULL,
  response_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_run_idem (game_run_id, idempotency_key),
  CONSTRAINT fk_run_action_audit_run FOREIGN KEY (game_run_id) REFERENCES game_runs(id)
);
```

Semantics:

- First request applies the action, stores response JSON, returns it.
- Replay with same `(game_run_id, idempotency_key)` returns the stored response without re-applying.
- MVP may keep rows indefinitely (E5 can add TTL cleanup).

### Cloud-Save interaction

- `PUT /api/runs/me` remains for:
  - creating the first empty/initial run when joining
  - non-progress metadata if still needed
- In server-sim classroom play, the client **must not** PUT a full post-step `gameState` after `STEP_MONTH` / `EVENT_CHOICE`.
- Optional server guard (recommended): reject PUTs that change `currentAge`/`currentMonth` away from the stored run when an env flag like `SERVER_SIM_STRICT=1` is set — prevents accidental dual writers during rollout.

---

## 5. Client design

Flag: `VITE_SERVER_SIM=1` | `true`.

Activation condition: flag on **and** active student session with a known `runId`.

Behavior:

1. `stepMonth` → one `STEP_MONTH` action; apply `nextState`; keep localStorage cache; no Cloud-Save PUT for that step.
2. Event confirm → `EVENT_CHOICE`; then existing tip enhancement flow can still run client-side on the resulting feedback.
3. `stepYear` → up to 12 sequential `STEP_MONTH` calls; stop early if `triggeredEvent` appears (same UX as today).
4. On `409`: reload run from `GET /api/runs/me`, show German toast that the cloud state was refreshed.
5. On network/5xx: do not apply a speculative local step in server-sim mode; show error + allow retry.
6. Other modals/actions: remain local; optional subtle copy that changes are not cloud-synced while server-sim is active.

Engine version string: send the simulation-engine package version (or shared app/engine version constant). Server compares and returns `409` on mismatch.

---

## 6. Testing strategy

### API

- Student ownership required
- `STEP_MONTH` advances age/month and persists state
- `EVENT_CHOICE` validates against `activeEvent`
- Idempotent replay returns identical body and does not double-charge giro / double-advance month
- Age/month mismatch → `409`
- Bad choice → `422`

### Parity

- Seeded scenarios: run N local steps vs N server steps (or in-process engine helper mirroring the route) and assert key fields (`currentAge`, `currentMonth`, giro, `activeEvent?.id`, `rngState`).

### Client helpers

- Server path selected only when flag + session
- After successful server action, Cloud-Save PUT is not invoked for that transition

### Manual smoke

- Classroom + flag: month, event, resume on second device
- Flag off / solo: legacy local behavior
- API down in server-sim mode: clear error, no silent local drift

---

## 7. Risks

| Risk | Mitigation |
|------|------------|
| TS engine not importable from Node API | Explicit Node build/`dist` exports in the plan |
| RNG desync | Persist `rngState` with the run |
| Dual writers via Cloud-Save | Client omits PUT after actions; optional strict PUT guard |
| Incomplete action surface | A1 documented; E5 expands |
| Content drift | published CMS version + seed fallback + `contentVersion` in response |

---

## 8. Delivery shape

Branch: `feature/phase-e4-server-sim-mvp`

Likely touch areas:

- `apps/api/src/db/migrate.js`, `apps/api/schema.sql`
- `apps/api/src/routes/runs.js` (or new `runs-actions.js`)
- `apps/api` package deps + Node-loadable engine entry
- `packages/simulation-engine` RNG state API
- `apps/player-web/src/store/gameStore.ts`, `apps/player-web/src/api/client.ts`
- parity tests under `apps/api` and/or `packages/simulation-engine`
- update `docs/api-runs-actions-contract.md` + `docs/architecture-simulation-boundary.md` + Plesk checklist / `.env.example`

## 9. Next step

After this spec is reviewed, write the executable implementation plan and implement task-by-task (TDD, branch, verify, merge).

# API Contract: `POST /api/runs/:id/actions` (Phase E4)

> **Status:** Implemented in Phase E4 (runtime).  
> Client uses this endpoint for classroom/cloud sessions when `VITE_SERVER_SIM=1`.  
> Solo/offline continues to call local `stepSimulationMonth` / `applyEventChoice`.

Related: [`architecture-simulation-boundary.md`](./architecture-simulation-boundary.md), `docs/superpowers/specs/2026-08-27-phase-e4-server-sim-mvp-design.md`.

## Purpose

Define a versioned, idempotent server endpoint that advances a cloud-backed game run by applying a single player action on the server using the shared simulation engine.

## Auth

- Header: `X-Student-Token: <session_token>`
- Membership must own the run (`game_runs.membership_id`)
- Teacher tokens are not accepted for this endpoint

## Request

`POST /api/runs/:id/actions`  
`Content-Type: application/json`

```json
{
  "action": { "type": "STEP_MONTH" },
  "expectedAge": 22,
  "expectedMonth": 3,
  "clientEngineVersion": "0.6.0",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Event choice variant

```json
{
  "action": {
    "type": "EVENT_CHOICE",
    "eventId": "EVT_CAREER_OVERTIME_PROJECT",
    "choiceId": "c_overtime_accept"
  },
  "expectedAge": 24,
  "expectedMonth": 6,
  "clientEngineVersion": "0.6.0",
  "idempotencyKey": "…"
}
```

### Fields

| Field | Required | Notes |
|-------|----------|--------|
| `action.type` | yes | `STEP_MONTH` \| `EVENT_CHOICE` |
| `action.eventId` / `choiceId` | for `EVENT_CHOICE` | Must match `activeEvent` on stored state |
| `expectedAge` / `expectedMonth` | yes | Optimistic concurrency vs stored state |
| `clientEngineVersion` | yes | Semver string of client engine package |
| `idempotencyKey` | yes | UUID; retries with same key return same response |

## Response `200`

```json
{
  "nextState": {},
  "triggeredEvent": null,
  "deltas": {
    "giroDelta": 0,
    "stressDelta": 0
  },
  "serverEngineVersion": "0.6.0",
  "contentVersion": 12
}
```

- `nextState`: full `GameState` after the action
- `triggeredEvent`: optional newly activated event (month step only)
- `deltas`: optional summary for UI feedback
- `contentVersion`: published CMS version used on server

## Errors

| Code | When |
|------|------|
| `401` | Missing/invalid student token |
| `403` | Token does not own run |
| `404` | Run not found |
| `409` | Age/month mismatch, engine/content version mismatch, or conflicting active event |
| `422` | Malformed action / unknown choice |
| `501` | _(removed in E4 — endpoint is implemented)_ |

## Idempotency

- Store `(membership_id, idempotency_key) → response body` for a limited TTL (e.g. 24h)
- Replay with same key must not apply the action twice

## Audit (reserved for E4/E5 — not in D4 schema)

Future table sketch:

```sql
-- NOT created in Phase D4
-- CREATE TABLE run_action_audit (
--   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--   game_run_id INT UNSIGNED NOT NULL,
--   idempotency_key VARCHAR(64) NOT NULL,
--   action_type VARCHAR(32) NOT NULL,
--   request_json LONGTEXT NOT NULL,
--   response_json LONGTEXT NULL,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   UNIQUE KEY uq_run_idem (game_run_id, idempotency_key)
-- );
```

## Client migration (E4)

1. Feature flag `VITE_SERVER_SIM=1`
2. Classroom cloud sessions use this endpoint; solo/offline keep local engine
3. Parity tests compare local vs server for seeded scenarios
4. API build must run `npm run build` / `bundle:sim` so `engine.bundle.mjs` exists before `node app.js`
5. Optional `SERVER_SIM_STRICT=1` blocks Cloud-Save PUTs that change age/month

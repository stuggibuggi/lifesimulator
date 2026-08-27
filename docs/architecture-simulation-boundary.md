# Simulation Boundary

Phase D keeps month simulation in the client-side simulation engine. The API remains responsible for authentication, classroom membership, cloud-save state sync, published content, optional tip enhancement, and teacher OIDC — **not** month transitions.

## Current Boundary (E4)

- Classroom/cloud sessions with `VITE_SERVER_SIM=1` advance months and event choices through `POST /api/runs/:id/actions` using `@goal/simulation-engine` on the API.
- Solo/offline (or flag off) still uses client `stepSimulationMonth` / `applyEventChoice`.
- Other actions (insurance, savings, housing, career, …) remain client-side and are **not** cloud-overwritten after server month/event steps.
- `GameState.rngState` keeps Mulberry32 continuity across client and server.

See [`api-runs-actions-contract.md`](./api-runs-actions-contract.md) and the E4 design spec for details.

## Why Not Full Server Simulation Yet

Server-side month simulation for **all** player actions would still require:

- every mutable action as a versioned API operation
- richer offline fallback and parity coverage (E5)
- broader API tests around careers, taxes, certificates

E4 therefore implements the D4 contract for `STEP_MONTH` + `EVENT_CHOICE` only (A1).

## Contract Preview (D4)

Proposed (unimplemented) endpoint:

`POST /api/runs/:id/actions`

- Actions: `STEP_MONTH`, `EVENT_CHOICE`
- Requires student session ownership, `expectedAge`/`expectedMonth`, `clientEngineVersion`, `idempotencyKey`
- Version / concurrency conflicts → `409`
- Full request/response shapes and error table: [`api-runs-actions-contract.md`](./api-runs-actions-contract.md)

Optional stub behavior if a route is added early: respond `501 Not Implemented` with a pointer to this doc — do **not** silently run the engine on the server until E4.

## Future Server Responsibilities (E4+)

A later server-simulation phase could move these responsibilities behind API endpoints:

- accept an explicit player action, current run version, and expected month
- validate the action against the stored game state
- call the shared simulation engine on the server
- persist the new state and append an audit/event log entry
- return the updated state, scoring deltas, and generated feedback

At that point the client would render server results instead of calling `stepSimulationMonth` directly (classroom/cloud path first).

## Cloud-Save Contract

Cloud-save remains state synchronization in Phase D:

- client sends complete `gameState`
- API stores the serialized state for resume/classroom evaluation
- API does not advance months, roll events, or recalculate finances
- conflicting writes should be handled in a future versioned-save design, not by hidden server simulation

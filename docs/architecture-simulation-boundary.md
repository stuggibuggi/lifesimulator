# Simulation Boundary

Phase D keeps month simulation in the client-side simulation engine. The API remains responsible for authentication, classroom membership, cloud-save state sync, published content, optional tip enhancement, and teacher OIDC — **not** month transitions.

## Current Boundary

- `stepSimulationMonth` and related gameplay rules stay in `packages/simulation-engine`.
- `player-web` advances months locally and persists the resulting `gameState` through the existing run save endpoint.
- `apps/api` stores and returns serialized game state, but does not compute month transitions.

This preserves the current offline-friendly classroom flow: gameplay stays responsive even when cloud-save is unavailable, and the API does not need to mirror every engine dependency or content package at runtime.

## Why Not Server-Side Simulation Yet

Server-side month simulation would require a stronger contract than Phase D implements at runtime:

- versioned engine/content packages on the API host
- migration rules for old saved states
- idempotency and replay protection for month advancement
- server validation of every user action that can affect simulation state
- broader API tests around score, events, taxes, careers, and certificates

Adding those pieces partially would create two sources of truth. Phase **D4** therefore ships the **API contract only** (see [`api-runs-actions-contract.md`](./api-runs-actions-contract.md)). Runtime cutover is Phase **E4**.

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

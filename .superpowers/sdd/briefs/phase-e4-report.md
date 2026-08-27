# Phase E4 — Server-Sim MVP (report)

**Branch:** `feature/phase-e4-server-sim-mvp`  
**Spec:** `docs/superpowers/specs/2026-08-27-phase-e4-server-sim-mvp-design.md`

## Delivered

- Persistable `GameState.rngState` + `SeededRandom.getState/fromState`
- `applyRunAction` helper + esbuild Node bundle for API
- `run_action_audit` table + `POST /api/runs/:id/actions` (STEP_MONTH / EVENT_CHOICE, idempotency, 409/422)
- Optional `SERVER_SIM_STRICT` Cloud-Save guard
- Client cutover behind `VITE_SERVER_SIM` + student session (no Cloud-Save PUT after server steps)
- Parity test for seeded local vs applyRunAction stepping
- Docs/checklist updates

## Ops

1. `npm run migrate` in `apps/api`
2. `npm run build` in `apps/api` (engine bundle)
3. Restart API
4. Rebuild player-web with `VITE_SERVER_SIM=1` when enabling classroom server-sim

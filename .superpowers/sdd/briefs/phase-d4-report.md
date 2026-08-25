# Phase D4 — Simulation API Contract (report)

**Branch:** `feature/phase-d4-sim-contract`  
**Scope:** Documentation only — no server `stepSimulationMonth` runtime.

## Delivered

| Artifact | Purpose |
|----------|---------|
| `docs/api-runs-actions-contract.md` | Request/response shapes for `POST /api/runs/:id/actions`, 409 rules, audit table sketch, E4 migration notes |
| `docs/architecture-simulation-boundary.md` | Updated boundary: D4 = contract, E4 = runtime cutover |
| `docs/plesk-go-live-checklist.md` | Phase D ops: `seed:content`, optional LLM/OIDC env |

## Explicit non-goals

- No Express route implementation for `/api/runs/:id/actions`
- No server-side simulation engine invocation
- No client cutover away from local `stepSimulationMonth`

## Verification

Automated tests and builds run on the cumulative tip (D1–D4 docs). Manual Plesk / IdP / live LLM smoke remains operator-side.

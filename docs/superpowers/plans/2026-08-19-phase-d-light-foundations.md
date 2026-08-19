# Phase D — Light Foundations (scoped)

> Base: `feature/phase-c-content-depth` → `feature/phase-d-light-foundations`
> Roadmap Phase D was “bewusst nicht jetzt”; this plan delivers **light foundations only**, not production CMS/SSO/server-sim.

**Goal:** Leave clear extension points and ops docs so future CMS/LLM/SSO/server-sim can plug in without rewriting the game core.

## Scope (IN)

### D1 Light content tooling (not a CMS)
- Script `packages/game-content/scripts/validate-content.mjs` (or `.ts` via vitest) that validates:
  - all event ids unique
  - all scenario ids unique
  - every event icon string is in an allowlist used by EventModal
  - every `recommendedGoals` id exists in goals
- npm script `content:validate` at root or game-content
- Short doc section in `docs/events-authoring.md` pointing to the validator

### D2 LLM tip hook (off by default)
- `apps/api/src/routes/tips.js` optional `POST /api/tips/enhance` that:
  - if `LLM_TIPS_ENABLED !== 'true'` → returns `{ enabled: false, tip: input.learningTip }`
  - if enabled but no `LLM_API_URL` → same passthrough
  - never blocks gameplay; player-web does **not** call it in v1 (hook only) OR call only when env `VITE_LLM_TIPS=1`
- Prefer **API stub + docs** without wiring UI unless trivial

### D3 Schul-SSO placeholders
- Doc `docs/sso-future.md`: intended OIDC flow, env vars (`OIDC_ISSUER`, `OIDC_CLIENT_ID`, …), out of scope for now
- API `.env.example` comments for those vars (no working OAuth)

### D4 Server-side month sim (explicit non-goal + boundary doc)
- Doc `docs/architecture-simulation-boundary.md`: why month sim stays client-side; what would move later; cloud-save remains state sync only
- No server monthStep implementation

## Out of scope

Full editorial CMS, real IdP integration, moving `stepSimulationMonth` to API.

## Commits

1. `docs: add Phase D light foundations plan`
2. `feat: add game-content validation script`
3. `feat: add optional LLM tips API stub`
4. `docs: add SSO and simulation-boundary notes`

## Verify + push

- Run content validator
- API tests if tip route added with a minimal test
- `git push -u origin feature/phase-d-light-foundations`

# Phase D Full Program — Design Spec

> **Status:** Approved in brainstorming (2026-08-25)  
> **Delivery model:** Sequential tracks (Approach 1)  
> **Order:** D1 Content CMS → D2 LLM tips → D3 School SSO → D4 Server-sim contract only  
> **Predecessor:** Light foundations already on `main` (validator, tips stub, SSO/sim docs)

## 1. Program goal

Make GOAL operable for schools and content operations: a maintainable global content catalog, optional LLM-enhanced learning tips, and teacher school SSO — without moving month simulation to the server in this program.

### Success criteria

1. **D1:** Admin maintains events/scenarios in MariaDB; the app loads published content; teachers bind scenarios to classrooms and may set tip overrides — no free-form teacher event editor.
2. **D2:** After an event choice, tips can optionally be LLM-enhanced behind a feature flag; failures fall back to the static tip and never block gameplay.
3. **D3:** Teachers can sign in via school OIDC; classroom APIs continue to use the existing internal teacher JWT.
4. **D4:** A versioned server-simulation API contract and architecture notes exist; runtime still uses client `stepSimulationMonth`.

### Non-goals (this program)

- Teacher-authored free event CMS
- Always-on mandatory LLM
- Student SSO
- Runtime server-side `stepSimulationMonth` (MVP or full)

These are retained in **§6 Later backlog (Phase E+)** for future implementation.

---

## 2. Track D1 — Hybrid content CMS

### Roles

| Role | Capabilities |
|------|----------------|
| **Admin** | Global catalog: events, scenarios, goal references; draft → publish; content version / hash |
| **Teacher** | Bind existing scenarios to a classroom; optional **tip text overrides** per classroom/event; **no** free event editor |
| **Student** | Consumes published content (+ classroom tip overrides when present) |

### Architecture

```
Admin UI → Admin API (authz) → MariaDB content tables
Player-web → GET /api/content/published?version=… → merge with classroom tip overrides
Fallback: bundled @goal/game-content if API empty/offline
```

### Data (conceptual)

- `content_events` — JSON body aligned with `LifeEvent` (+ status draft/published, updated_at)
- `content_scenarios` — aligned with `EducationalScenario`
- `content_versions` — monotonic publish version + content hash
- `classroom_tip_overrides` — (`classroom_id`, `event_id`, `tip_text`, teacher_id, updated_at)

### Seed & migration

- One-time (and repeatable) seed from current TypeScript modules in `@goal/game-content`
- Content validator (`content:validate`) remains the CI gate for seed integrity and icon/goal references

### Client behavior

- On game start / classroom join: fetch published bundle; cache in memory (and optionally localStorage with version key)
- Tip display order: classroom override → (optional LLM, D2) → event choice `learningTip`

---

## 3. Track D2 — LLM-adaptive tips

### Behavior

- Env flag `LLM_TIPS_ENABLED` (default off)
- After event choice feedback, client may call `POST /api/tips/enhance` with:
  - static `learningTip`
  - anonymous context: `eventId`, `choiceId`, `age`, `scenarioId` (no name/alias/email)
- Short timeout; on error/timeout/disabled → return original tip
- Classroom tip override (D1) takes precedence: skip LLM when override is set
- Production logging: success/fail + latency only; no full prompt dumps

### Builds on

Existing stub `apps/api/src/routes/tips.js` — extend to accept structured context and wire player-web behind `VITE_LLM_TIPS=1` (or equivalent).

---

## 4. Track D3 — School SSO (teachers)

### Behavior

- OIDC Authorization Code + PKCE for **teachers only**
- UI: “Mit Schul-SSO anmelden” beside email/password
- API callback validates tokens via issuer JWKS; maps identity to `teachers` via stable `oidc_sub` (+ verified email)
- Issues the **same internal teacher JWT** used by `requireTeacher` today
- Allowlists: `OIDC_ALLOWED_EMAIL_DOMAINS`, role claim/values
- Password login remains as fallback while IdP rollout is incomplete

### Schema

- `teachers.oidc_sub` (nullable unique)
- Link-or-create policy: match by verified email when safe; otherwise create verified teacher row

### Non-goals here

Student SSO; multi-IdP federation beyond configured single issuer (later backlog).

---

## 5. Track D4 — Server simulation contract only

Document and sketch (no runtime cutover):

### Proposed endpoint shape

`POST /api/runs/:id/actions`

Request (illustrative):

```json
{
  "action": { "type": "STEP_MONTH" },
  "expectedAge": 22,
  "expectedMonth": 3,
  "clientEngineVersion": "0.6.0",
  "idempotencyKey": "uuid"
}
```

Or `{ "action": { "type": "EVENT_CHOICE", "eventId": "…", "choiceId": "…" } }`.

Response (illustrative):

```json
{
  "nextState": {},
  "triggeredEvent": null,
  "deltas": {},
  "serverEngineVersion": "0.6.0",
  "contentVersion": 12
}
```

### Rules to document

- Idempotency by key
- Engine/content version mismatch → `409`
- Auth: student session / membership ownership
- Audit log table reserved for Phase E MVP (not implemented in D4)

Client continues local simulation until a later program implements §6 item 4.

---

## 6. Later backlog (Phase E+) — deferred but committed

These are **explicitly out of this program’s implementation**, but are product commitments to plan later:

| # | Item | Notes |
|---|------|--------|
| E1 | Teacher event editor / classroom-local content | Beyond tip overrides |
| E2 | Always-on LLM / richer tip UI | Flag default on; optional streaming |
| E3 | Student SSO | Separate from teacher OIDC |
| E4 | Server-sim MVP | Month + event-choice via API; cloud classroom required |
| E5 | Server-sim full | Offline fallback, action audit log, client/server parity tests |
| E6 | Federated account migration / multi-IdP | Password→OIDC linking UX; multiple issuers |

Each E-item gets its own spec → plan cycle when started (same sequential SDD style).

---

## 7. Delivery model

1. Write this program spec (done when committed)
2. For each track D1→D2→D3→D4: detailed design (if needed) → implementation plan → branch → merge to `main` → Plesk deploy
3. Do not start the next track until the previous track is merge-ready (Critical/Important findings fixed)

### Suggested branch names

- `feature/phase-d1-content-cms`
- `feature/phase-d2-llm-tips`
- `feature/phase-d3-school-sso`
- `feature/phase-d4-sim-contract`

### Global constraints

- German UI copy
- MariaDB on Plesk; no new mandatory infra beyond existing Node API
- DSGVO: no student PII to LLM; teacher SSO uses school IdP under school responsibility
- Client-side month simulation remains source of truth until E4+
- Commit identity via env when agents commit: `stuggibuggi` / `stuggibuggi@users.noreply.github.com`

---

## 8. Risks

| Risk | Mitigation |
|------|------------|
| CMS/client content drift | Seed + validator + published version hash; offline fallback to bundle |
| LLM cost/latency/leakage | Flag off by default; timeout; anonymous context only |
| IdP variance across schools | Single issuer v1; domain/role allowlist; password fallback |
| Premature server-sim | D4 contract-only; E4 gated on engine packaging |

---

## 9. Next step after this spec

User reviews this file. On approval, write the **program implementation roadmap plan** (`docs/superpowers/plans/YYYY-MM-DD-phase-d-full-program.md`) that sequences D1–D4 tasks at plan level; then start **D1 detailed implementation plan** as the first executable track.

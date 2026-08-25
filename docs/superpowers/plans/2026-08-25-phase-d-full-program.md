# Phase D Full Program — Implementation Roadmap

> **For agentic workers:** Execute tracks **sequentially**. After each track: tests green, push branch, merge to `main` when ready. REQUIRED: subagent-driven-development or executing-plans per track.
>
> **Spec:** `docs/superpowers/specs/2026-08-25-phase-d-full-program-design.md`

**Goal:** Deliver D1 Content CMS → D2 LLM tips wiring → D3 Teacher OIDC → D4 sim contract docs.

**Architecture:** MariaDB + Express API + player-web. Simulation stays client-side until Phase E.

**Tech Stack:** Node/Express, MariaDB, React/Zustand, Vitest, existing JWT teacher auth.

## Global Constraints

- German UI copy
- MariaDB on Plesk; no new mandatory infra beyond Node API
- DSGVO: no student PII to LLM; teacher SSO via school IdP
- Client-side month simulation remains source of truth until E4+
- Commit identity via env: `stuggibuggi` / `stuggibuggi@users.noreply.github.com`
- Later backlog E1–E6 is documented in the spec — do **not** implement in this program
- Track order fixed: D1 → D2 → D3 → D4; do not start next track until current is merge-ready

---

## Track index

| Track | Branch | Detailed plan |
|-------|--------|----------------|
| D1 | `feature/phase-d1-content-cms` | This file §Track D1 (executable) |
| D2 | `feature/phase-d2-llm-tips` | Expand after D1 merges |
| D3 | `feature/phase-d3-school-sso` | Expand after D2 merges |
| D4 | `feature/phase-d4-sim-contract` | Docs only after D3 |

---

## Track D1 — Content CMS (executable now)

### Task D1.1: Schema + migrate

**Files:**
- Modify: `apps/api/src/db/migrate.js`
- Modify: `apps/api/schema.sql`

Tables:
- `content_events (id PK, event_id UNIQUE, body_json LONGTEXT, status ENUM('draft','published'), updated_at)`
- `content_scenarios (id PK, scenario_id UNIQUE, body_json LONGTEXT, status ENUM('draft','published'), updated_at)`
- `content_versions (id PK AUTO, version INT UNIQUE, content_hash VARCHAR(64), published_at, published_by_teacher_id NULL)`
- `classroom_tip_overrides (id PK, classroom_id FK, event_id VARCHAR(64), tip_text TEXT, teacher_id FK, updated_at, UNIQUE(classroom_id, event_id))`
- Optional: `teachers.is_admin TINYINT(1) DEFAULT 0`

- [ ] Add CREATE + ALTER idempotent
- [ ] Commit: `feat: add content CMS MariaDB tables`

### Task D1.2: Seed from game-content

**Files:**
- Create: `apps/api/scripts/seed-content.js`
- Modify: `apps/api/package.json` script `seed:content`

- [ ] Read built/JSON export OR duplicate seed by requiring a generated `content-seed.json` committed from validator
- [ ] Prefer: script that imports from a generated file `packages/game-content/dist/seed.json` produced by `node packages/game-content/scripts/export-seed.mjs`
- [ ] Upsert all events/scenarios as published; bump content_versions
- [ ] Commit: `feat: seed published content from game-content`

### Task D1.3: Public + admin content API

**Files:**
- Create: `apps/api/src/routes/content.js`
- Create: `apps/api/src/routes/content.test.js`
- Modify: `apps/api/app.js`
- Modify: `apps/api/src/middleware/auth.js` — `requireAdmin` (teacher JWT + is_admin)

Endpoints:
- `GET /api/content/published` → `{ version, hash, events[], scenarios[] }`
- `GET /api/content/admin/events` requireAdmin
- `PUT /api/content/admin/events/:eventId` requireAdmin body
- `POST /api/content/admin/publish` requireAdmin
- `GET/PUT/DELETE /api/classrooms/:id/tip-overrides` requireTeacher owner
- `GET /api/classrooms/:id/tip-overrides` also usable by student session for that classroom

- [ ] TDD API tests
- [ ] Commit: `feat: add published content and tip-override APIs`

### Task D1.4: Admin UI (minimal)

**Files:**
- Create: `apps/player-web/src/components/ContentAdminModal.tsx`
- Modify: teacher logged-in UI to open admin if `is_admin`
- Modify: `client.ts`

- [ ] List events (id, status), edit learningTip JSON field simply OR raw JSON textarea for body
- [ ] Publish button
- [ ] Commit: `feat: minimal content admin modal`

### Task D1.5: Teacher tip overrides UI

**Files:**
- Modify: `ClassroomModal.tsx` — section Tipps überschreiben
- Modify: `client.ts`

- [ ] Select event id from published list, edit tip, save
- [ ] Commit: `feat: teacher classroom tip overrides UI`

### Task D1.6: Client load published content + fallback

**Files:**
- Modify: `gameStore.ts` / content loader module
- Modify: event engine consumers that import `ALL_LIFE_EVENTS` — provide runtime override list on store
- Modify: join / start flows to `fetchPublishedContent`

- [ ] Fallback to `@goal/game-content` on failure
- [ ] Apply tip overrides when showing event feedback
- [ ] Build + tests
- [ ] Commit: `feat: load published content with offline fallback`
- [ ] Push branch `feature/phase-d1-content-cms`

---

## Track D2 — LLM tips (after D1)

### Task D2.1: Extend tips API context + tests
### Task D2.2: Wire EventModal/feedback to enhance when flag on; skip if override
### Task D2.3: Push `feature/phase-d2-llm-tips`

---

## Track D3 — School SSO (after D2)

### Task D3.1: `oidc_sub` column + migrate
### Task D3.2: OIDC routes (start, callback, PKCE) + tests with mocked JWKS
### Task D3.3: Teacher UI SSO button
### Task D3.4: Push `feature/phase-d3-school-sso`

---

## Track D4 — Sim contract docs (after D3)

### Task D4.1: Expand `docs/architecture-simulation-boundary.md` with request/response + 409 rules
### Task D4.2: Add `docs/api-runs-actions-contract.md` OpenAPI-ish sketch (no runtime route, or stub 501)
### Task D4.3: Push `feature/phase-d4-sim-contract`

---

## Program done when

All four tracks on `main`, Plesk migrate/seed/build documented in checklist update.

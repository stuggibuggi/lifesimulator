# Phase B — Klassenraum & Unterricht Implementation Plan

> **For agentic workers:** Use subagent-driven-development or execute inline. Checkbox steps.
>
> **Parent roadmap:** `docs/superpowers/plans/2026-08-18-next-gameplay-roadmap.md` Phase B (B1–B5)
> **Base branch:** `feature/career-interaction` → work branch `feature/phase-b-classroom-ops`

**Goal:** Teachers can prepare, monitor, and follow up a class without phpMyAdmin; students see cloud-save status and set their character name on scenario start.

**Architecture:** Keep sim client-side. API/MariaDB for classrooms, auth, runs. Thin UI on existing ClassroomModal / ClassroomAuthModal / gameStore.

**Tech Stack:** Express API (MariaDB), React + Zustand, Vitest/Node test.

## Global Constraints

- German UI copy
- No CMS/LLM/SSO (those are Phase D)
- Commit env identity: `stuggibuggi` / `stuggibuggi@users.noreply.github.com` (no git config)
- After each task: relevant tests; API `npm test --workspace=apps/api` if API touched; `npm run build --workspace=apps/player-web` for UI
- Push branch to GitHub when Phase B complete

## File map

| Item | Files |
|---|---|
| B1 Cloud-save status | `gameStore.ts`, small HUD/banner component or MapShell/HUD, `client.ts` |
| B2 CSV export | `apps/api/src/routes/classrooms.js` (+ test), `ClassroomModal.tsx`, `client.ts` |
| B3 expires_at | create-classroom UI in `ClassroomAuthModal` / `ClassroomModal`, list badge |
| B4 Character name | `startScenarioGame`, `ClassroomAuthModal` join flow, optional name prompt |
| B5 Teacher delete | `apps/api/src/routes/auth.js` (+ test), teacher settings UI |

---

### Task 1: B1 Cloud-Save-Status UI

**Files:**
- Modify: `apps/player-web/src/store/gameStore.ts`
- Create or modify: small status in existing play HUD (find header/status bar — e.g. `TopBar` / `GameHUD` / map chrome)
- Modify: `apps/player-web/src/api/client.ts` if needed

**Behavior:**
- Store field `cloudSaveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'offline'` + `cloudSaveMessage?: string` + `cloudSaveAt?: number`
- `maybeCloudSave`: set saving → on success saved + timestamp; on catch error (keep last message)
- Only when student session exists; otherwise idle / hide
- UI: compact German label near play chrome (“Cloud: gespeichert 12:40” / “Cloud: Fehler – lokal OK”)

- [ ] Implement + build player-web
- [ ] Commit: `feat: show cloud save status for classroom students`

---

### Task 2: B4 Character name before scenario quick-start

**Files:**
- Modify: `apps/player-web/src/store/gameStore.ts` (`startScenarioGame(scenario, characterName?: string)`)
- Modify: `apps/player-web/src/components/ClassroomAuthModal.tsx`
- Modify: `apps/player-web/src/components/ScenarioSelectionModal.tsx` if used without name

**Behavior:**
- On join with START_SCENARIO: prompt for name (input in join form already has alias — also ask “Vorname fürs Spiel” or reuse alias as character name with editable field `characterName`, default = alias)
- Pass into `startScenarioGame` instead of hardcoded `Alex`
- ScenarioSelectionModal: optional name field or keep Alex only for solo welcome flow — for classroom path always use provided name

- [ ] Implement + build
- [ ] Commit: `feat: let classroom players set character name on start`

---

### Task 3: B2 CSV classroom export

**Files:**
- Modify: `apps/api/src/routes/classrooms.js` — `GET /:id/export.csv` teacher-owned
- Modify: `apps/api/src/routes/classrooms.test.js`
- Modify: `apps/player-web/src/api/client.ts` — `downloadClassroomCsv(id)`
- Modify: `apps/player-web/src/components/ClassroomModal.tsx` — button “CSV exportieren”

**CSV columns (UTF-8 BOM for Excel):** alias, age, isGameOver, overallScore, lastSeenAt, updatedAt

- [ ] TDD API test for auth + CSV header row
- [ ] UI button triggers download
- [ ] Commit: `feat: export classroom summary as CSV`

---

### Task 4: B3 expires_at set + hint

**Files:**
- Modify classroom create UI (where teacher creates room — `ClassroomAuthModal` LOGGED_IN / create form)
- Modify: `ClassroomModal.tsx` — show expires date; warn if expired or within 7 days
- API already accepts `expiresAt` on POST `/` and rejects join if expired

**Behavior:**
- On create: optional date input (default +90 days from today ISO date)
- Send `expiresAt` as ISO datetime end-of-day
- Dashboard: badge “läuft ab am …” / “abgelaufen”

- [ ] Implement + build
- [ ] Commit: `feat: set and display classroom expiry`

---

### Task 5: B5 Teacher account self-delete

**Files:**
- Modify: `apps/api/src/routes/auth.js` — `DELETE /teacher/me` body `{ password }`
- Add test in `auth` test file or new `auth.test.js`
- Modify teacher UI (ClassroomAuthModal LOGGED_IN or ClassroomModal) — “Konto löschen” + confirm + password

**Behavior:**
- Verify password, `DELETE FROM teachers WHERE id=?` (CASCADE classrooms/memberships/runs)
- Clear teacher JWT client-side, close modals

- [ ] TDD + UI
- [ ] Commit: `feat: allow teacher self-service account deletion`

---

### Task 6: Phase B verify + push

- [ ] `npm test --workspace=apps/api` (or available api tests)
- [ ] `npm test --workspace=@goal/simulation-engine`
- [ ] `npm run build --workspace=apps/player-web`
- [ ] `git push -u origin feature/phase-b-classroom-ops`

## Out of scope

Phase C/D, CMS, LLM, SSO, server-side month sim.

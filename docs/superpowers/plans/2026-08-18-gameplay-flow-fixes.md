# Gameplay Flow Fixes (Phase A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax.
>
> **Product choice:** Track **A** from `docs/superpowers/plans/2026-08-18-next-gameplay-roadmap.md` (Spielablauf-Fixes). Career interactivity (A6) is **out of this plan** — follow-up later.

**Goal:** Make a full life run feel complete through the end: correct end-age UI, printable solo certificate, events past age 45, post-choice learning feedback, and reachable travel goal.

**Architecture:** Keep simulation/scoring in packages; UI in `apps/player-web`. Extract a shared certificate presentation component so Classroom and Evaluation reuse one markup. Event feedback is a short second step in `EventModal` after `applyEventChoice` (do not block month engine).

**Tech Stack:** React + Zustand, `@goal/game-content`, `@goal/simulation-engine`, `@goal/scoring-engine`, Vitest.

## Global Constraints

- German UI copy
- Do not move month simulation server-side
- Do not add CMS/LLM
- Prefer TDD for engine/goal changes; UI smoke via build + manual checklist
- Commit identity via env only (no `git config`): `stuggibuggi` / `stuggibuggi@users.noreply.github.com`
- After each task: `npm test`; for UI tasks also `npm run build --workspace=apps/player-web`
- Work on branch `feature/gameplay-flow-fixes` (create from latest `main` or post-merge hardening)

---

## File map

| Responsibility | Files |
|---|---|
| End evaluation UI | `apps/player-web/src/components/EvaluationView.tsx` |
| Shared certificate | Create `apps/player-web/src/components/CertificatePanel.tsx`; use from `EvaluationView` + `ClassroomModal` |
| Scoring certificate age text | `packages/scoring-engine/src/evaluator.ts` (if hardcodes 67/30) |
| Events 46–67 + travel | `packages/game-content/src/events.ts` |
| Eligibility / apply | `packages/simulation-engine/src/engine/eventEngine.ts` |
| Travel goal | `packages/simulation-engine/src/engine/goalEngine.ts` + tests |
| Event UI feedback | `apps/player-web/src/components/EventModal.tsx`, `apps/player-web/src/store/gameStore.ts` |
| Docs | `docs/events-authoring.md` (note midlife/senior events) |

---

### Task 1: Fix evaluation end-age copy and export filename

**Files:**
- Modify: `apps/player-web/src/components/EvaluationView.tsx`
- Modify if needed: `packages/scoring-engine/src/evaluator.ts` (certificate `completionDate` / any “67”/“30” copy)
- Test: add `apps/player-web/src/components/EvaluationView.helpers.ts` + `.test.ts` for filename/title helpers (keep JSX thin)

**Interfaces:**
- Consumes: `gameState.scenarioEndAge ?? 67`, `gameState.currentAge`, `gameState.character.name`
- Produces:
  - `formatEvaluationTitle(endAge: number) => \`Abschlussbilanz mit ${endAge} Jahren\``
  - `formatSaveFilename(name: string, age: number) => \`GOAL_Lebenslauf_${name}_Alter${age}.json\``

- [ ] **Step 1: Write failing helper tests**

```ts
import { describe, expect, it } from 'vitest';
import { formatEvaluationTitle, formatSaveFilename } from './EvaluationView.helpers';

describe('EvaluationView.helpers', () => {
  it('uses scenario end age in title', () => {
    expect(formatEvaluationTitle(22)).toBe('Abschlussbilanz mit 22 Jahren');
    expect(formatEvaluationTitle(67)).toBe('Abschlussbilanz mit 67 Jahren');
  });

  it('embeds age in download filename', () => {
    expect(formatSaveFilename('Alex', 45)).toBe('GOAL_Lebenslauf_Alex_Alter45.json');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run apps/player-web/src/components/EvaluationView.helpers.test.ts`

- [ ] **Step 3: Implement helpers + wire EvaluationView**

Replace hard-coded „mit 30 Jahren“ and `Alter30` with helpers using `gameState.scenarioEndAge ?? gameState.currentAge ?? 67`.

- [ ] **Step 4: Run tests + build**

- [ ] **Step 5: Commit**

```bash
git commit -m "fix: use scenario end age in evaluation title and export"
```

---

### Task 2: Solo Finanzführerschein via shared CertificatePanel

**Files:**
- Create: `apps/player-web/src/components/CertificatePanel.tsx`
- Modify: `apps/player-web/src/components/EvaluationView.tsx` — show certificate + print when `gameState.isGameOver`
- Modify: `apps/player-web/src/components/ClassroomModal.tsx` — replace inline certificate markup with `CertificatePanel`
- Consumes: `CertificateData` from `evaluateLifeRun(gameState).certificate`

**Interfaces:**
- `CertificatePanelProps = { certificate: CertificateData; footerHint?: string }`
- Print: existing `window.print()` button next to panel (class `print:` already used in ClassroomModal — preserve)

- [ ] **Step 1: Extract CertificatePanel** from ClassroomModal certificate block (same German copy, no behavior change).

- [ ] **Step 2: ClassroomModal imports CertificatePanel** — visual parity.

- [ ] **Step 3: EvaluationView** — after score summary, render CertificatePanel + „Zertifikat drucken“ when game over.

- [ ] **Step 4: Build player-web; manual:** finish short scenario → evaluation shows certificate.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: shared certificate panel for solo evaluation and classroom"
```

---

### Task 3: Make GOAL_REISEN achievable (2 travel experiences)

**Files:**
- Modify: `packages/game-content/src/events.ts`
- Modify: `packages/simulation-engine/src/engine/goalEngine.ts` (only if matcher too strict)
- Test: `packages/simulation-engine/test/` — extend goal or events test

**Design (chosen):** Add a second lifestyle travel event with choice IDs containing `travel` or `trip`, age window overlapping early adulthood, plus optionally count intentional „trip“ choices on existing non-TRAVEL events only if needed. Prefer **new event** `EVT_TRAVEL_CITY_BREAK` (minAge 18, maxAge 50, probability ~0.12) with choices `c_travel_budget_trip` / `c_travel_luxury_trip`.

Keep `EVT_TRAVEL_HEALTH_EMERGENCY` as insurance teaching; its choice IDs already include `travel` and count toward the goal (1 of 2).

- [ ] **Step 1: Failing test** — after two pastEvents matching travel matcher, `GOAL_REISEN` is achieved.

```ts
// sketch: build minimal GameState with goals including GOAL_REISEN and pastEvents
// [{ eventId: 'EVT_TRAVEL_HEALTH_EMERGENCY', choiceId: 'c_travel_pay_self', ...},
//  { eventId: 'EVT_TRAVEL_CITY_BREAK', choiceId: 'c_travel_budget_trip', ...}]
// expect updateGoals(state).find(g => g.id === 'GOAL_REISEN')?.isAchieved === true
```

- [ ] **Step 2: Implement event + ensure goalEngine matcher counts both**

- [ ] **Step 3: npm test**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add second travel event so GOAL_REISEN can complete"
```

---

### Task 4: Midlife and senior life events (ages 46–67)

**Files:**
- Modify: `packages/game-content/src/events.ts` — add **≥6** events with `minAge`/`maxAge` covering 46–67 (and optionally raise some existing `maxAge` from 45 → 55 where thematically OK)
- Modify: `docs/events-authoring.md` — note senior band
- Test: eligibility still respects age; at least one event eligible at age 55 and one at 60+

**Suggested event IDs (implement all six):**

| ID | Theme | Age | Notes |
|---|---|---|---|
| `EVT_MIDLIFE_JOB_CHANGE` | Jobwechsel / Umschulung | 45–55 | career |
| `EVT_PARENT_CARE` | Elternpflege / Vereinbarkeit | 48–60 | stress/money |
| `EVT_INHERITANCE_MODEST` | Kleine Erbschaft | 50–65 | wealth + choice invest vs consume |
| `EVT_HEALTH_CHECK_50` | Gesundheitsvorsorge 50+ | 49–55 | knowledge literacy |
| `EVT_PRE_RETIREMENT_BAV` | bAV aufstocken oder nicht | 55–64 | pension |
| `EVT_RETIREMENT_TRANSITION` | Übergang in Rente | 65–67 | forced-ish high probability near end |

Use existing choice shape (`costImmediate`, deltas, `learningTip`). Add `requires`/`excludes` only where natural (e.g. inheritance none).

- [ ] **Step 1: Test** — `getEligibleEvents` at age 55 includes at least one new id; at age 66 includes retirement transition when not past.

- [ ] **Step 2: Add events to `ALL_LIFE_EVENTS`**

- [ ] **Step 3: Update authoring doc**

- [ ] **Step 4: npm test**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add midlife and pre-retirement life events"
```

---

### Task 5: Post-choice event feedback step

**Files:**
- Modify: `apps/player-web/src/components/EventModal.tsx`
- Modify: `apps/player-web/src/store/gameStore.ts` — split apply vs dismiss OR keep apply on confirm but delay clearing `activeEvent` until feedback dismissed

**Design (chosen):** Local UI state machine in `EventModal`:

1. `phase: 'CHOOSE'` — current UI  
2. On confirm → call new store method `resolveEventChoice(choice)` that applies effects but **keeps** a `pendingEventFeedback` on the store (or keep `activeEvent` + `lastResolvedChoice`)  
3. `phase: 'FEEDBACK'` — show: choice label, euro delta summary, `learningTip`, optional happiness/stress hint  
4. Button „Weiter“ → `clearEventFeedback()` removes active event / resumes pause behavior as today

**Interfaces:**
- Prefer store fields:
  - `eventFeedback: { eventTitle: string; choice: EventChoice; moneyDelta: number } | null`
- `handleEventChoice` sets feedback after `applyEventChoice`
- `dismissEventFeedback()` clears `activeEvent` residual + feedback and restores `isPaused` false if that was previous behavior

Read current `applyEventChoice` for how `activeEvent` is cleared — match existing pause/resume semantics in `gameStore` (today choice clears event immediately; preserve month pause rules from recent fixes).

- [ ] **Step 1: Implement feedback phase UI** (German): „Deine Entscheidung“, tip box, Kontowirkung if `costImmediate` known.

- [ ] **Step 2: Wire store so learning tip is visible after confirm** (regression: choosing still applies money once).

- [ ] **Step 3: Manual** — trigger event → choose → see tip → Weiter → map usable.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: show learning feedback after event choices"
```

---

## Manual acceptance (whole Phase A)

1. Short scenario (endAge 22): finish → title „mit 22 Jahren“, JSON `Alter22`, certificate printable.  
2. Pick `GOAL_REISEN` → encounter both travel-related events over a long run or force via test/dev → goal completes.  
3. Long run / age cheat if any: at 50+ events still fire.  
4. Any event: after choice, feedback with `learningTip` before closing.

---

## Out of scope

- CareerModal interactivity (A6)  
- Cloud-save status, CSV export, CMS, LLM  
- New event image assets (map new IDs to existing SVGs or `home.svg`)

---

## Self-review

1. A1–A5 from next-gameplay roadmap covered by Tasks 1–5.  
2. No TBD placeholders.  
3. Certificate shared component avoids drift between classroom and solo.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-08-18-gameplay-flow-fixes.md`.

**1. Subagent-Driven (recommended)** — one implementer + review per task  
**2. Inline Execution** — same session with checkpoints  

Which approach?

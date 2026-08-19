# Phase C — Content-Tiefe Implementation Plan

> Base: `feature/phase-b-classroom-ops` → branch `feature/phase-c-content-depth`
> Roadmap: Phase C (C1–C5) in `2026-08-18-next-gameplay-roadmap.md`

**Goal:** Deeper pedagogical content: more scenarios, learning cards that raise literacy, clearer event visuals, richer eligibility, phone tips tied to events.

**Architecture:** Content in `@goal/game-content`; eligibility in simulation-engine; UI in player-web. No CMS/DB content.

## Global Constraints

- German copy
- Client-side sim only
- Commit env: stuggibuggi / stuggibuggi@users.noreply.github.com
- Build player-web + engine tests after content/engine changes
- Push `feature/phase-c-content-depth` when done

---

### Task 1: C1 New educational scenarios

Add **4** scenarios to `packages/game-content/src/scenarios.ts`:

1. `SCENARIO_VERSICHERUNG` — ages ~18–30, focus Haftpflicht/Hausrat, goals insurance-related if exist else NOTGROSCHEN + SCHULDENFREI
2. `SCENARIO_RENTE_BAV` — ages ~30–45, focus bAV/Rente
3. `SCENARIO_STEUERN` — ages ~20–35, focus Steuerklasse/Lohnsteuer
4. `SCENARIO_MOBILITAET` — ages ~18–28, focus ÖPNV vs Auto

Use existing goals from `goals.ts`. Ensure ScenarioSelectionModal / classroom create pickers list them automatically via `EDUCATIONAL_SCENARIOS`.

Commit: `feat: add insurance pension tax mobility classroom scenarios`

---

### Task 2: C2 Learning cards → knowledgePoints

- Find `learningCards.ts` and PhoneModal usage
- Add store/engine helper `applyLearningCard(state, cardId)` that awards knowledgePoints once per card id (track `unlockedAchievements` or new `completedLearningCardIds` on GameState — prefer existing achievements array if suitable, else extend GameState with `completedLearningCardIds: string[]` + sanitize default `[]`)
- Wire PhoneModal “Gelernt” / open card to call helper (+5–15 points, cap 100)
- Test in simulation-engine or player helper test

Commit: `feat: award knowledge points from learning cards`

---

### Task 3: C3 Event icon mapping cleanup

- Find EventModal / icon renderer that falls back to placeholder
- Map every `icon` string used in `events.ts` to a lucide icon (or emoji fallback table)
- Ensure no event shows generic “?” if icon name is in events.ts
- Document mapping in short comment or `docs/events-authoring.md` note

Commit: `fix: map all life-event icons in EventModal`

---

### Task 4: C4 More requires/excludes on midlife events

Annotate ≥4 midlife/senior events in `events.ts` with `requires`/`excludes` (homeowner, partner, emergency months, haftpflicht where pedagogically correct). Add/extend engine eligibility tests.

Commit: `feat: add eligibility rules to more midlife events`

---

### Task 5: C5 Phone tips after related events

- After event choice feedback, if choice/event maps to a learning card topic, surface “Tipp im Handy” / auto-queue card id on store (`pendingPhoneTipCardId`)
- PhoneModal opens to that card or shows badge
- Minimal: map 3–5 event ids → learning card ids in game-content

Commit: `feat: link learning cards to related life events`

---

### Task 6: Verify + push

- engine tests + player-web build
- `git push -u origin feature/phase-c-content-depth`

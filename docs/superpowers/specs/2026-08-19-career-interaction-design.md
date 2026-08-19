# A6 Career Interaction — Design Spec

> **Status:** Approved in brainstorming (2026-08-19)  
> **Roadmap:** Track A6 from `docs/superpowers/plans/2026-08-18-next-gameplay-roadmap.md`  
> **Approach:** Contracts + CareerModal + event wiring (no CMS, no API)

## Goal

Make career feel player-controlled: employed players can raise salary, change jobs, adjust hours, and invest in further training; trainees/students can abort into Quereinstieg. Career event choices that set `careerDelta` must actually change career level and pay.

## Non-goals

- Content CMS / DB-authored careers or events
- Server-side month simulation
- Free-text job titles or open job market
- Schul-SSO, LLM tips
- Changing the automatic ~2.5% year-end raise for employees (it stays)

## Player-facing behavior

### When `career.type === 'ANGESTELLTER'`

| Action | Behavior |
|--------|----------|
| **Gehaltserhöhung** | Hybrid: **soft** always +~2% gross; optional **hard** negotiate: chance of +~8% gross else stress↑. Shared **12-month cooldown** after any raise attempt. Hard uses seeded RNG. |
| **Jobwechsel** | Pick from a fixed content list (2–3 targets). Updates title/branch; salary × factor (~0.85–1.15); stress/happiness deltas; optional one-time transition cost from giro. |
| **Teilzeit** | Toggle **30** ↔ **40** hours/week. Gross salary = full-time-equivalent × (hours/40). Stress and happiness move inversely with hours. |
| **Weiterbildung** | One-time giro cost (800–1500 € content constant). `careerAdvancementLevel` +1 (cap 5). Small stress↑. Improves hard-raise success chance. Cooldown or once-per-level rule so it cannot be spammed every month. |

### When `career.type === 'AUSBILDUNG' | 'STUDIUM'`

| Action | Behavior |
|--------|----------|
| **Ausbildung/Studium abbrechen** | Confirm dialog. Convert to `ANGESTELLTER` Quereinstieg-style path: lower starting gross than completing the path, stress↑, happiness↓ or mixed. Other employed actions remain disabled. |

### Info-only otherwise

If somehow not in the above types, modal stays display-only (current UI).

## Architecture

```
CareerModal → gameStore handlers → simulation-engine contracts
EventModal  → applyEventChoice   → honor careerDelta (level + ~5% gross, level cap 5)
```

- Simulation, scoring, and career mutations stay **client-side**.
- No MariaDB / API schema changes.
- Follow existing patterns: `contracts.ts` pure functions + `gameStore` thin wrappers (same as housing, insurance, tax).

### Data model

Extend `CareerState` (`packages/shared-types`):

- `monthsSinceLastRaiseAttempt: number` — incremented each month in `monthStep`; reset to `0` on raise attempt; raise allowed when `>= 12`. Missing on old saves → treat as `12` (action available).
- `fullTimeGrossSalary: number` — 40h baseline pay. Soft/hard raises and year-end raises update this; Teilzeit sets `monthlySalaryGross = round(fullTimeGrossSalary * hours/40)`.
- `monthsSinceLastTraining: number` — incremented each month; reset to `0` on successful training. Training allowed when `careerAdvancementLevel < 5`, giro covers cost, and `monthsSinceLastTraining >= 24` (missing on old saves → `24`).

Init (`init.ts`) and save sanitization must default these fields for old saves as above.

### Content

- Job-switch targets in `packages/game-content/src/careers.ts` (new list, e.g. `JOB_SWITCH_OPTIONS`).
- Training cost and raise percentages as named constants in engine or content (single source).
- **New event:** one CAREER event ages ~22–35 (project / overtime trade-off).
- **Keep:** `EVT_CAREER_LEADERSHIP_STEP`, `EVT_MIDLIFE_JOB_CHANGE`.
- Wire `careerDelta` in `applyEventChoice` (currently ignored).

### Contracts (simulation-engine)

1. `requestSalaryRaise(state, mode: 'soft' | 'hard', rng): { state, result }`
2. `changeEmployedJob(state, optionId): GameState` (no-op / throw path: invalid id or not employed)
3. `setEmploymentHours(state, hoursWeekly: 30 | 40): GameState`
4. `startFurtherTraining(state): GameState` (cost, level, metrics)
5. `abortEducationPath(state): GameState` (only Ausbildung/Studium)

Budget / tax / net salary must be refreshed consistently with existing payroll helpers (same as other contracts that change gross).

### UI (`CareerModal`)

- Status block (existing).
- Action block with enabled/disabled reasons (cooldown, not employed, insufficient funds, already at level 5).
- Short inline result toast/banner after action (success/fail text).
- Confirm for abort education.

### Store

Add `handleRequestSalaryRaise`, `handleChangeEmployedJob`, `handleSetEmploymentHours`, `handleStartFurtherTraining`, `handleAbortEducationPath` mirroring other handlers; hard raise consumes `prng`.

## Edge cases

- Soft and hard share one raise cooldown.
- Year-end auto raise still applies independently.
- Teilzeit uses `fullTimeGrossSalary`; switching back to 40 restores that baseline (then year-end raises update FTE).
- Job switch only from content IDs.
- Abort is irreversible in v1 (no “re-enroll”).
- Training fails cleanly if giro < cost (no negative forced without message).
- `careerAdvancementLevel` capped at 5 everywhere (actions + `careerDelta`).

## Testing

- Unit tests in `packages/simulation-engine` for each contract (raise soft/hard/cooldown, job switch, hours, training, abort).
- Test `applyEventChoice` applies `careerDelta` to level and gross.
- Manual: open WORK modal as employee; run each action; as trainee only abort + confirm.

## Success criteria

1. Employed player can change pay, hours, job, and train via CareerModal.
2. Trainee/student can abort into Quereinstieg with visible pay drop.
3. Career events with `careerDelta` visibly raise advancement/pay.
4. Engine tests green; player-web builds.

## Out of scope reminder

CMS means a future editorial UI / DB for events and careers. Not part of A6; content stays in TypeScript modules.

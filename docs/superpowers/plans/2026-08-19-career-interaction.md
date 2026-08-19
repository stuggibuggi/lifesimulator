# A6 Career Interaction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Spec:** `docs/superpowers/specs/2026-08-19-career-interaction-design.md`

**Goal:** Employed players can raise salary, switch jobs, toggle part-time, and train; trainees/students can abort education; `careerDelta` on events actually changes career pay/level.

**Architecture:** Pure contracts in `@goal/simulation-engine` mutate `GameState` (payroll via existing `calculateGermanPayroll`). `CareerModal` + Zustand handlers call those contracts. Content lists/constants live in `@goal/game-content`. No API/CMS.

**Tech Stack:** TypeScript, Vitest, React, Zustand, existing `SeededRandom`.

## Global Constraints

- German UI copy
- Client-side simulation only; no MariaDB/API schema changes
- No CMS/LLM
- TDD for engine contracts and `careerDelta`
- Commit identity via env only (no `git config`): `stuggibuggi` / `stuggibuggi@users.noreply.github.com`
- After each task: `npm test --workspace=@goal/simulation-engine`; for UI tasks also `npm run build --workspace=apps/player-web`
- Work on branch `feature/career-interaction` created from current `feature/gameplay-flow-fixes` (or `main` if A1–A5 already merged)

---

## File map

| Responsibility | Files |
|---|---|
| Types | `packages/shared-types/src/index.ts` (`CareerState`) |
| Init defaults | `packages/simulation-engine/src/engine/init.ts` |
| Month counters + year-end FTE | `packages/simulation-engine/src/engine/monthStep.ts` |
| Career contracts | `packages/simulation-engine/src/engine/contracts.ts` (or new `careerContracts.ts` exported from `contracts.ts` / `index.ts`) |
| Event `careerDelta` | `packages/simulation-engine/src/engine/eventEngine.ts` |
| Content | `packages/game-content/src/careers.ts`, `packages/game-content/src/events.ts` |
| Save compat | `apps/player-web/src/store/gameStore.ts` (`sanitizeGameState`, handlers, career object literals) |
| UI | `apps/player-web/src/components/CareerModal.tsx` |
| Tests | `packages/simulation-engine/test/career_actions.test.ts`, extend `events.test.ts` |

---

### Task 1: CareerState fields + init + monthStep + save sanitize

**Files:**
- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/simulation-engine/src/engine/init.ts`
- Modify: `packages/simulation-engine/src/engine/monthStep.ts`
- Modify: `apps/player-web/src/store/gameStore.ts` (`sanitizeGameState` + every place that builds a bare `CareerState` object)
- Test: `packages/simulation-engine/test/career_actions.test.ts` (create; first tests only)

**Interfaces:**
- Extends `CareerState` with:
  - `fullTimeGrossSalary: number`
  - `monthsSinceLastRaiseAttempt: number`
  - `monthsSinceLastTraining: number`
- Produces: monthStep increments both month counters by 1 each month; year-end employee raise updates `fullTimeGrossSalary` then sets `monthlySalaryGross = round(fullTimeGrossSalary * hours/40)`
- Old saves: missing raise months → `12`; missing training months → `24`; missing FTE → current `monthlySalaryGross` scaled to 40h if hours are 30 (`gross * 40/30`) else current gross

- [ ] **Step 1: Write failing tests for counters / FTE year-end**

```ts
import { describe, expect, it } from 'vitest';
import {
  createInitialGameState,
  SeededRandom,
  stepSimulationMonth,
} from '../src';
import { ALL_LIFE_EVENTS, ALL_LIFE_GOALS } from '@goal/game-content';

function employedState() {
  const base = createInitialGameState(
    { name: 'Alex', avatar: 'student_boy', startCondition: 'FAMILY_SUPPORT', bio: 'T' },
    [ALL_LIFE_GOALS[0]],
    42
  );
  return {
    ...base,
    currentMonth: 12,
    career: {
      ...base.career,
      type: 'ANGESTELLTER' as const,
      title: 'Fachkraft',
      branch: 'IT',
      isCompleted: true,
      monthlySalaryGross: 3000,
      monthlySalaryNet: 2100,
      fullTimeGrossSalary: 3000,
      timeCommitmentHoursWeekly: 40,
      careerAdvancementLevel: 1,
      monthsSinceLastRaiseAttempt: 5,
      monthsSinceLastTraining: 10,
    },
  };
}

describe('career month counters', () => {
  it('increments raise and training month counters each month', () => {
    const before = employedState();
    before.currentMonth = 3;
    const { nextState } = stepSimulationMonth(before, ALL_LIFE_EVENTS, new SeededRandom(1));
    expect(nextState.career.monthsSinceLastRaiseAttempt).toBe(6);
    expect(nextState.career.monthsSinceLastTraining).toBe(11);
  });

  it('applies year-end raise to fullTimeGrossSalary', () => {
    const before = employedState();
    const { nextState } = stepSimulationMonth(before, ALL_LIFE_EVENTS, new SeededRandom(1));
    expect(nextState.career.fullTimeGrossSalary).toBe(Math.round(3000 * 1.025));
    expect(nextState.career.monthlySalaryGross).toBe(Math.round(3000 * 1.025));
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test --workspace=@goal/simulation-engine -- career_actions`

Expected: FAIL (missing fields / counters not incremented)

- [ ] **Step 3: Implement types, init, monthStep, sanitize**

`CareerState` additions as above.

In `init.ts` career block set:

```ts
fullTimeGrossSalary: 0,
monthsSinceLastRaiseAttempt: 12,
monthsSinceLastTraining: 24,
```

In `monthStep.ts` career section:

1. Always: `monthsSinceLastRaiseAttempt += 1`, `monthsSinceLastTraining += 1`
2. On month 12 employee raise: update `fullTimeGrossSalary *= 1.025` (round), then  
   `monthlySalaryGross = Math.round(fullTimeGrossSalary * timeCommitmentHoursWeekly / 40)`  
   then refresh net via existing tax path already in monthStep
3. On Ausbildung/Studium completion paths that set new gross: also set `fullTimeGrossSalary` to that new gross and hours 40

In `sanitizeGameState`, nest:

```ts
career: {
  ...state.career,
  fullTimeGrossSalary:
    state.career?.fullTimeGrossSalary ??
    (state.career?.timeCommitmentHoursWeekly === 30
      ? Math.round((state.career?.monthlySalaryGross || 0) * 40 / 30)
      : state.career?.monthlySalaryGross || 0),
  monthsSinceLastRaiseAttempt: state.career?.monthsSinceLastRaiseAttempt ?? 12,
  monthsSinceLastTraining: state.career?.monthsSinceLastTraining ?? 24,
},
```

Update `changeCareerPath` callers / object literals in `gameStore` (`selectStartingCareer`, scenario starts) to include the three fields (`fullTimeGrossSalary: option.monthlySalaryGross` or starting gross; raise/training months `12`/`24`).

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test --workspace=@goal/simulation-engine -- career_actions`

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/index.ts packages/simulation-engine/src/engine/init.ts packages/simulation-engine/src/engine/monthStep.ts packages/simulation-engine/test/career_actions.test.ts apps/player-web/src/store/gameStore.ts
git commit -m "feat: add career cooldown and FTE salary fields"
```

---

### Task 2: Career content constants + job switch options

**Files:**
- Modify: `packages/game-content/src/careers.ts`
- Test: none required beyond TypeScript build (constants consumed in Task 3)

**Interfaces:**
- Produces:

```ts
export const CAREER_ACTION_CONSTANTS = {
  softRaiseFactor: 1.02,
  hardRaiseFactor: 1.08,
  hardRaiseBaseChance: 0.35,
  hardRaiseChancePerLevel: 0.08,
  hardRaiseMaxChance: 0.75,
  hardRaiseFailStress: 12,
  raiseCooldownMonths: 12,
  trainingCostEuro: 1200,
  trainingStressDelta: 5,
  trainingCooldownMonths: 24,
  careerDeltaGrossFactor: 1.05,
  maxAdvancementLevel: 5,
} as const;

export interface JobSwitchOption {
  id: string;
  title: string;
  branch: string;
  salaryFactor: number; // applied to fullTimeGrossSalary
  transitionCostEuro: number;
  stressDelta: number;
  happinessDelta: number;
}

export const JOB_SWITCH_OPTIONS: JobSwitchOption[] = [
  {
    id: 'JOB_SWITCH_IT_SERVICE',
    title: 'IT-Systembetreuung',
    branch: 'IT & Digitalisierung',
    salaryFactor: 1.08,
    transitionCostEuro: 400,
    stressDelta: 5,
    happinessDelta: 10,
  },
  {
    id: 'JOB_SWITCH_PUBLIC',
    title: 'Öffentlicher Dienst (Sachbearbeitung)',
    branch: 'Verwaltung',
    salaryFactor: 0.95,
    transitionCostEuro: 200,
    stressDelta: -8,
    happinessDelta: 5,
  },
  {
    id: 'JOB_SWITCH_SALES',
    title: 'Außendienst / Kundenberatung',
    branch: 'Vertrieb',
    salaryFactor: 1.12,
    transitionCostEuro: 600,
    stressDelta: 12,
    happinessDelta: 5,
  },
];
```

Ensure `packages/game-content/src/index.ts` already re-exports `./careers` (it does).

- [ ] **Step 1: Add constants + `JOB_SWITCH_OPTIONS` to `careers.ts`**

- [ ] **Step 2: Typecheck / build game-content if workspace has build**

Run: `npm run build --workspace=@goal/game-content` (or skip if no build script; rely on dependent tests)

- [ ] **Step 3: Commit**

```bash
git add packages/game-content/src/careers.ts
git commit -m "feat: add career action constants and job switch options"
```

---

### Task 3: Career action contracts (raise, hours, job, training, abort)

**Files:**
- Modify: `packages/simulation-engine/src/engine/contracts.ts` (append) **or** Create `packages/simulation-engine/src/engine/careerContracts.ts` and `export *` from `index.ts` / re-export from `contracts.ts`
- Prefer **new file** `careerContracts.ts` to keep `contracts.ts` smaller; export from `packages/simulation-engine/src/index.ts`
- Modify: `packages/simulation-engine/test/career_actions.test.ts`
- Note: simulation-engine may import `@goal/game-content` — if package.json lacks it, add `"@goal/game-content": "*"` dependency **or** keep numeric constants duplicated in `careerContracts.ts` importing only from a thin shared place. **Preferred:** add workspace dependency `@goal/game-content` to `packages/simulation-engine/package.json` (same pattern as tests already importing game-content).

**Interfaces:**
- Consumes: `CAREER_ACTION_CONSTANTS`, `JOB_SWITCH_OPTIONS`, `CAREER_OPTIONS` (`PATH_QUEREINSTIEG`), `SeededRandom`, `calculateGermanPayroll`, `calculateCashflow`
- Produces:

```ts
export type RaiseMode = 'soft' | 'hard';
export type RaiseResult =
  | { ok: true; mode: RaiseMode; kind: 'soft' | 'hard_success' | 'hard_fail'; message: string }
  | { ok: false; reason: 'not_employed' | 'cooldown'; message: string };

export function requestSalaryRaise(
  state: GameState,
  mode: RaiseMode,
  rng: SeededRandom
): { state: GameState; result: RaiseResult };

export function setEmploymentHours(
  state: GameState,
  hoursWeekly: 30 | 40
): GameState;

export function changeEmployedJob(
  state: GameState,
  optionId: string
): GameState; // returns unchanged state if invalid / not employed / insufficient giro for cost

export function startFurtherTraining(
  state: GameState
): GameState; // unchanged if not allowed

export function abortEducationPath(
  state: GameState
): GameState; // only AUSBILDUNG | STUDIUM
```

Shared helper (private in same file):

```ts
function applyGrossAndPayroll(state: GameState, careerPatch: Partial<CareerState> & Pick<CareerState, never>): GameState
```

Actually implement as:

```ts
function withUpdatedCareerGross(state: GameState, career: CareerState): GameState {
  const hours = career.timeCommitmentHoursWeekly || 40;
  const fte = career.fullTimeGrossSalary;
  const gross = Math.round(fte * hours / 40);
  const updatedCareer = { ...career, monthlySalaryGross: gross };
  const tax = calculateGermanPayroll(
    gross,
    state.tax.taxClass,
    state.tax.hasChurchTax,
    state.family.childrenCount,
    state.currentAge
  );
  const budget = {
    ...state.budget,
    grossSalary: gross,
    netSalary: tax.netMonthly,
    totalIncome:
      tax.netMonthly +
      state.budget.partnerContribution +
      state.budget.familySupport +
      state.budget.bafoegOrSecondaryIncome +
      state.budget.childBenefitTotal +
      state.budget.investmentDividends,
  };
  budget.monthlyCashflow = calculateCashflow(budget);
  return {
    ...state,
    career: { ...updatedCareer, monthlySalaryNet: tax.netMonthly },
    tax,
    budget,
  };
}
```

**Raise rules:**
- Require `type === 'ANGESTELLTER'` and `monthsSinceLastRaiseAttempt >= 12`
- Soft: `fullTimeGrossSalary = round(fte * 1.02)`; reset raise months to 0; result soft
- Hard: `chance = min(0.75, 0.35 + level * 0.08)`; if `rng.next() < chance` apply `* 1.08` success else stress `+12`; always reset raise months to 0

**Hours:** require employed; set `timeCommitmentHoursWeekly`; recompute gross from FTE; stress ±6, happiness ∓4 when going 40→30 vs 30→40

**Job switch:** require employed; find option; if giro < cost return state unchanged; deduct cost + tx; set title/branch; `fullTimeGrossSalary = round(fte * salaryFactor)`; apply stress/happiness; keep hours

**Training:** require employed, level < 5, training months >= 24, giro >= 1200; deduct; level+1; stress+5; training months = 0; optional knowledgePoints +10

**Abort:** require AUSBILDUNG|STUDIUM; set career from `PATH_QUEREINSTIEG` (type ANGESTELLTER, completed true, FTE = startingGrossAfterGraduation, months raise/training 12/24); stress+15; happiness-10

- [ ] **Step 1: Write failing contract tests** (append to `career_actions.test.ts`)

Include at least:
- soft raise +2% and cooldown blocks second raise
- hard fail increases stress (use `SeededRandom` seed that fails — try seeds until documented, or inject by testing chance 0 via temporary constant mock; simpler: spy by using many seeds OR export chance formula and force fail by setting level and verifying with a SeededRandom sequence — **document one seed** that fails with default chance; if flaky, add optional `rng` and unit-test soft path + cooldown only, and hard path with a tiny local mock `{ next: () => 0.99 }` interface)

Prefer typing rng as `{ next(): number }` so tests can pass `{ next: () => 0.99 }` for fail and `{ next: () => 0 }` for success.

```ts
it('soft raise increases FTE by 2% and starts cooldown', () => { /* ... */ });
it('blocks raise during cooldown', () => { /* ... */ });
it('hard raise success uses low rng roll', () => { /* rng next 0 */ });
it('hard raise fail bumps stress', () => { /* rng next 0.99 */ });
it('part-time 30h scales gross to 75%', () => { /* ... */ });
it('job switch applies factor and cost', () => { /* ... */ });
it('training costs money and raises level', () => { /* ... */ });
it('abort education switches to Quereinstieg pay', () => { /* ... */ });
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test --workspace=@goal/simulation-engine -- career_actions`

- [ ] **Step 3: Implement `careerContracts.ts` + export + dependency**

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test --workspace=@goal/simulation-engine`

- [ ] **Step 5: Commit**

```bash
git add packages/simulation-engine/src/engine/careerContracts.ts packages/simulation-engine/src/index.ts packages/simulation-engine/package.json packages/simulation-engine/test/career_actions.test.ts package-lock.json
git commit -m "feat: add career action contracts for raise job hours training abort"
```

---

### Task 4: Apply `careerDelta` in `applyEventChoice`

**Files:**
- Modify: `packages/simulation-engine/src/engine/eventEngine.ts`
- Modify: `packages/simulation-engine/test/events.test.ts`

**Interfaces:**
- Consumes: `choice.careerDelta?: number`, `CAREER_ACTION_CONSTANTS.careerDeltaGrossFactor` (or hardcode `1.05` / import constants)
- Produces: when `careerDelta` present and > 0:
  - `careerAdvancementLevel = min(5, level + careerDelta)`
  - `fullTimeGrossSalary = round(fte * 1.05 ^ careerDelta)` (or multiply once per delta step)
  - recompute `monthlySalaryGross` from hours
  - refresh tax/net/budget like contracts (inline small helper or import `withUpdatedCareerGross` — if helper is private, duplicate minimal payroll refresh or export helper from `careerContracts.ts` as `refreshCareerPayroll`)

- [ ] **Step 1: Write failing test**

```ts
it('applies careerDelta to advancement level and gross', () => {
  const state = freshState();
  state.career = {
    ...state.career,
    type: 'ANGESTELLTER',
    isCompleted: true,
    monthlySalaryGross: 3000,
    fullTimeGrossSalary: 3000,
    timeCommitmentHoursWeekly: 40,
    careerAdvancementLevel: 1,
    monthsSinceLastRaiseAttempt: 12,
    monthsSinceLastTraining: 24,
  };
  const event = ALL_LIFE_EVENTS.find((e) => e.id === 'EVT_CAREER_LEADERSHIP_STEP')!;
  const choice = event.choices.find((c) => c.id === 'c_leader_accept')!;
  const next = applyEventChoice(state, event, choice);
  expect(next.career.careerAdvancementLevel).toBe(2);
  expect(next.career.fullTimeGrossSalary).toBe(Math.round(3000 * 1.05));
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test --workspace=@goal/simulation-engine -- events.test`

- [ ] **Step 3: Implement careerDelta branch in `applyEventChoice`**

Keep existing cost/metrics/pastEvents behavior; apply career patch before return.

- [ ] **Step 4: Run full engine tests — PASS**

Run: `npm test --workspace=@goal/simulation-engine`

- [ ] **Step 5: Commit**

```bash
git add packages/simulation-engine/src/engine/eventEngine.ts packages/simulation-engine/test/events.test.ts
git commit -m "fix: apply careerDelta to level and salary on event choice"
```

---

### Task 5: New young-career overtime/project event

**Files:**
- Modify: `packages/game-content/src/events.ts`
- Modify: `packages/simulation-engine/test/events.test.ts` (eligibility age window smoke)

**Interfaces:**
- Produces event:

```ts
{
  id: 'EVT_CAREER_OVERTIME_PROJECT',
  title: 'Karriere: Großes Projekt mit Überstunden?',
  description:
    'Dein Team braucht dich für ein zeitkritisches Kundenprojekt. Überstunden bringen Prämie, belasten aber Freizeit und Gesundheit.',
  category: 'CAREER',
  minAge: 22,
  maxAge: 35,
  probability: 0.1,
  icon: 'Briefcase',
  requires: undefined, // optional: could leave open; employed filter not in eligibility — keep age-only like leadership
  choices: [
    {
      id: 'c_overtime_accept',
      label: 'Überstunden annehmen (+900 € Prämie, +Stress)',
      description: 'Du nimmst die Prämie mit und schiebst Freizeit.',
      costImmediate: 900,
      happinessDelta: -5,
      stressDelta: 15,
      healthDelta: -5,
      knowledgeDelta: 15,
      careerDelta: 1,
      learningTip:
        'Überstundenprämien sind kurzfristig attraktiv. Langfristig zählen nachhaltige Arbeitszeit und Erholung — sonst drohen Ausfallkosten.',
    },
    {
      id: 'c_overtime_decline',
      label: 'Ablehnen und Grenzen setzen',
      description: 'Du schützt Freizeit und Gesundheit.',
      costImmediate: 0,
      happinessDelta: 10,
      stressDelta: -5,
      knowledgeDelta: 10,
      learningTip:
        'Nein sagen ist eine Finanzentscheidung: weniger Geld jetzt, oft mehr Stabilität und weniger Krankheitsrisiko später.',
    },
  ],
}
```

Place near other CAREER events. `costImmediate: 900` is a credit to giro (positive) — matches existing sign convention where negative is expense.

- [ ] **Step 1: Add event + test that it is eligible at age 28**

```ts
it('includes overtime project event for age 28', () => {
  const state = { ...freshState(), currentAge: 28 };
  // ensure career fields present via sanitize defaults from createInitial
  const eligible = getEligibleEvents(ALL_LIFE_EVENTS, state);
  expect(eligible.some((e) => e.id === 'EVT_CAREER_OVERTIME_PROJECT')).toBe(true);
});
```

- [ ] **Step 2: Run — FAIL then implement event — PASS**

- [ ] **Step 3: Commit**

```bash
git add packages/game-content/src/events.ts packages/simulation-engine/test/events.test.ts
git commit -m "feat: add young-career overtime project event"
```

---

### Task 6: Store handlers + CareerModal UI

**Files:**
- Modify: `apps/player-web/src/store/gameStore.ts`
- Modify: `apps/player-web/src/components/CareerModal.tsx`

**Interfaces:**
- Store methods:

```ts
handleRequestSalaryRaise: (mode: 'soft' | 'hard') => void;
handleChangeEmployedJob: (optionId: string) => void;
handleSetEmploymentHours: (hoursWeekly: 30 | 40) => void;
handleStartFurtherTraining: () => void;
handleAbortEducationPath: () => void;
```

Each reads `gameState` (+ `prng` for raise), calls contract, `set({ gameState, prng })`, plays `sound.playCoin()` / `playPop()` / `playWarning()` on fail.

Optional UI-local feedback string: CareerModal can compute disabled reasons without storing last result; for raise result message, either:
- return via handler setting `careerActionFeedback: string | null` on store, or
- local `useState` in modal by calling contracts directly — **prefer store feedback field** `careerActionFeedback: string | null` cleared when modal closes.

**UI layout (German):**
1. Keep existing status card
2. If `ANGESTELLTER`: buttons Soft-Raise, Hard-Raise, Teilzeit toggle, Weiterbildung, list Jobwechsel options
3. If `AUSBILDUNG|STUDIUM`: button „Ausbildung/Studium abbrechen“ with `window.confirm(...)`
4. Disabled helper text for cooldown / funds / level cap
5. Banner for `careerActionFeedback`

- [ ] **Step 1: Add store handlers + feedback field**

- [ ] **Step 2: Rebuild CareerModal actions UI**

- [ ] **Step 3: Build player-web**

Run: `npm run build --workspace=apps/player-web`  
Expected: success

- [ ] **Step 4: Manual checklist**
  - Start Quereinstieg / Eigenheim scenario → WORK modal → soft raise → cooldown text
  - Toggle 30h → gross drops
  - Job switch deducts cost
  - Training at level < 5
  - Ausbildung path → abort confirm → Quereinstieg title/pay
  - Trigger/force leadership choice → level up (dev or event)

- [ ] **Step 5: Commit**

```bash
git add apps/player-web/src/store/gameStore.ts apps/player-web/src/components/CareerModal.tsx
git commit -m "feat: interactive career modal with raise job hours training abort"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run engine tests**

Run: `npm test --workspace=@goal/simulation-engine`  
Expected: all pass

- [ ] **Step 2: Build player-web**

Run: `npm run build --workspace=apps/player-web`  
Expected: success

- [ ] **Step 3: Spec coverage check**
  - Soft/hard raise + cooldown ✓
  - Job switch ✓
  - Teilzeit ✓
  - Weiterbildung ✓
  - Abort education ✓
  - careerDelta ✓
  - New CAREER event ✓
  - No CMS/API ✓

- [ ] **Step 4: Optional commit if only docs/progress touched**

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| Hybrid raise + 12mo cooldown | Task 3 |
| Job switch content list | Task 2+3 |
| Teilzeit 30/40 + FTE | Task 1+3 |
| Weiterbildung cost/level/24mo | Task 3 |
| Abort Ausbildung/Studium | Task 3+6 |
| careerDelta wiring | Task 4 |
| New young CAREER event | Task 5 |
| CareerModal + store | Task 6 |
| Save compat fields | Task 1 |
| Year-end raise keeps FTE | Task 1 |

No TBD placeholders. RNG typed as `{ next(): number }` for deterministic hard-raise tests.

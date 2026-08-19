# Task 3 Report: Career action contracts

## Status: DONE

## What Was Implemented

### 1. Contract tests (`packages/simulation-engine/test/career_actions.test.ts`)
Added coverage for:
- Soft raise +2% FTE, payroll refresh, cooldown reset
- Cooldown rejection
- Hard raise success with `{ next: () => 0 }`
- Hard raise failure with `{ next: () => 0.99 }` and stress increase
- 30h part-time gross scaling
- Job switch salary factor, cost, metrics, transaction
- Further training cost, level increase, cooldown reset, knowledge/stress
- Education abort into `PATH_QUEREINSTIEG`

### 2. `careerContracts.ts`
Added exported contracts:
- `requestSalaryRaise`
- `setEmploymentHours`
- `changeEmployedJob`
- `startFurtherTraining`
- `abortEducationPath`
- `withUpdatedCareerGross`
- `refreshCareerPayroll`

The RNG contract is typed as `{ next(): number }` so deterministic test doubles can be injected.

### 3. Payroll refresh helper
`withUpdatedCareerGross` recomputes proportional gross from FTE and hours, recalculates German payroll, updates budget income, and refreshes monthly cashflow.

### 4. Package wiring
- Re-exported the new contracts from `packages/simulation-engine/src/index.ts`
- Added `@goal/game-content` workspace dependency to `packages/simulation-engine/package.json`

## TDD Evidence

### RED
```
npm test --workspace=@goal/simulation-engine -- career_actions
```
Result: **8 failed / 2 passed**
- Failures were expected missing contract exports/functions.

### GREEN
```
npm test --workspace=@goal/simulation-engine -- career_actions
```
Result: **10 passed**

Full suite:
```
npm test --workspace=@goal/simulation-engine
```
Result: **45 passed** (7 files)

Diagnostics:
```
ReadLints
```
Result: **no linter errors** in edited files.

## Files Changed

| File | Change |
|------|--------|
| `packages/simulation-engine/src/engine/careerContracts.ts` | Added career action contracts and payroll refresh helper |
| `packages/simulation-engine/src/index.ts` | Re-exported career contracts |
| `packages/simulation-engine/package.json` | Added `@goal/game-content` dependency |
| `packages/simulation-engine/test/career_actions.test.ts` | Added 8 TDD contract tests |
| `.superpowers/sdd/briefs/task-3-report.md` | Added this report |

## Self-Review

**Correctness**
- Raise cooldown and hard raise probability use `CAREER_ACTION_CONSTANTS`.
- Salary updates flow through the payroll helper so career, tax, budget gross/net, and cashflow stay aligned.
- Job switches preserve current hours and apply factors to FTE gross.
- Training and abort guards return the original state unchanged when not allowed.

**Scope**
- No UI wiring added; this task only adds engine contracts.
- No package lock changed because this worktree has no `package-lock.json`.

## Concerns

1. Employment guards currently require `career.type === 'ANGESTELLTER'`, matching the brief wording. If `FUEHRUNGSKRAFT` should later use these actions, the guard should be widened deliberately.
2. `Date.now()` transaction IDs follow existing engine contract style but are not deterministic beyond test-inspected fields.

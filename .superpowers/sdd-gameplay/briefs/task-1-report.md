# Task 1 Report: Fix evaluation end-age copy and export filename

## Summary
- Replaced hard-coded evaluation title age (`30`) with `gameState.scenarioEndAge ?? gameState.currentAge ?? 67`.
- Replaced hard-coded export filename age (`Alter30`) with the same resolved evaluation end age.
- Added `EvaluationView.helpers.ts` with `formatEvaluationTitle` and `formatSaveFilename`.
- Added focused Vitest coverage for the title and filename formatting behavior.

## TDD Evidence
- RED 1: `npm test -- apps/player-web/src/components/EvaluationView.helpers.test.ts`
  - Failed because `./EvaluationView.helpers` did not exist.
- RED 2: `npm test -- apps/player-web/src/components/EvaluationView.helpers.test.ts`
  - Failed as expected:
    - Expected `Abschlussbilanz mit 32 Jahren`, received `Abschlussbilanz mit 30 Jahren`.
    - Expected `GOAL_Lebenslauf_Mina_Alter32.json`, received `GOAL_Lebenslauf_Mina_Alter30.json`.
- GREEN: `npm test -- apps/player-web/src/components/EvaluationView.helpers.test.ts`
  - Passed: 1 file, 2 tests.

## Verification
- `npm test`
  - Passed: 11 files, 52 tests.
- `npm run build --workspace=apps/player-web`
  - Passed.
  - Vite emitted the existing warning that one chunk is larger than 500 kB after minification.

## Files Changed
- `apps/player-web/src/components/EvaluationView.tsx`
- `apps/player-web/src/components/EvaluationView.helpers.ts`
- `apps/player-web/src/components/EvaluationView.helpers.test.ts`

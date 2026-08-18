# Task / Phase 3 Report: Bind scenario to classroom

## Status

Completed.

## Implemented

- Teacher room creation now offers a scenario dropdown sourced from `@goal/game-content` and posts the selected `scenarioId`.
- Student join now imports an existing cloud save first; if none exists and the classroom has a known `scenarioId`, it starts that fixed scenario and skips `SCENARIO_SELECTION_MODAL`.
- Classroom dashboard now shows the scenario name near the active room code for teacher and student contexts.
- API summary responses include `scenarioId`; join payload tests assert that `scenarioId` remains present for new joins and PIN resumes.

## Verification

- `npm test` passed: 10 files, 40 tests.
- `npm run build --workspace=apps/player-web` passed.

## Concerns

- Vite still reports a chunk-size warning for the player bundle after build; no new build failure.

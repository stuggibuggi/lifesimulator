Status: Implemented post-choice event feedback.

Summary:
- Added transient event choice feedback to the player store after `applyEventChoice` runs.
- Kept event effects single-application by relying on the existing active-event guard and clearing `activeEvent` during dismissal.
- Updated `EventModal` to render a FEEDBACK phase with choice label, net money impact, learning tip, and `Weiter`.
- Kept the simulation paused after event resolution.

Verification:
- `npm test` passed: 13 files, 57 tests.
- `npm run build --workspace=apps/player-web` passed.

Concerns:
- Player web build still emits the existing Vite chunk-size warning for the main bundle.

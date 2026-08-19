## Task 7 Fix Pass - Final A6 Review

### Fixed
- Critical 1: Added `monthsSinceLastJobSwitch` to `CareerState`, init/sanitize defaults, monthly increment, 12-month job-switch cooldown, reset on successful switch, and same title+branch no-op. `CareerModal` now disables job switches for cooldown/current job/insufficient funds with specific German reasons.
- Important 2: Updated `EVT_CAREER_LEADERSHIP_STEP` copy to describe a career step and approximate 5% salary jump instead of promising "+500 EUR/month net".
- Important 3: Gated `careerDelta` application to employed careers only.
- Important 4: Added 30h year-end FTE salary regression coverage.

### Tests
- `npm test --workspace=packages/simulation-engine -- --run test/career_actions.test.ts test/events.test.ts`
  - First red run before implementation: 2 files failed, 5 tests failed, 21 passed. Failures covered job-switch counter increment/reset, repeated switch cooldown, same-job no-op, and non-employed careerDelta.
  - Final run: 2 files passed, 26 tests passed, exit 0.
- `npm run build`
  - Exit 0. Workspaces built successfully; Vite emitted the existing chunk-size warning for `index-DLaybi5o.js`.
- `npm test`
  - Exit 0. 14 test files passed, 73 tests passed.

### Commits
- `cec5fca` - `fix: harden career job switch and careerDelta edge cases`

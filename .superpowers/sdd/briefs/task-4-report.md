# Task 4 Report: Richer Event Eligibility Rules

## Summary

Implemented richer event eligibility for `LifeEvent` via optional `requires` and `excludes` rule blocks. The event engine now filters events by active Haftpflicht insurance, partner status, home ownership, and minimum emergency-fund months while preserving the existing age and past-event checks.

## TDD Evidence

- Red: `npm test -- packages/simulation-engine/test/events.test.ts` failed with 2 expected eligibility failures before production changes.
- Green: `npm test -- packages/simulation-engine/test/events.test.ts` passed with 5 tests.
- Full verification: `npm test` passed with 43 tests across 10 files.

## Files Changed

- `packages/shared-types/src/index.ts`
- `packages/simulation-engine/src/engine/eventEngine.ts`
- `packages/simulation-engine/test/events.test.ts`
- `packages/game-content/src/events.ts`
- `docs/events-authoring.md`

## Content Annotated

- Partner-gated: marriage, first child
- Home-owner gated: roof repair
- Home-owner excluded: Eigenbedarf eviction
- Haftpflicht-gated: water damage, bike accident

## Concerns

The npm output still contains the existing warning `Unknown env config "devdir"`. It did not fail tests.

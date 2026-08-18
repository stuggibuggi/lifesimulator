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
- Haftpflicht teaching (uninsured-visible): water damage, bike accident — choice-level `requiresInsurance` only

## Review Fix (Phase 4)

Removed event-level `requires.hasHaftpflicht` from `EVT_WATER_DAMAGE_NEIGHBOR` and `EVT_ACCIDENT_BIKE` so uninsured players still encounter the teaching scenarios. Choice-level `requiresInsurance: 'HAFTPFLICHT'` on the insurance path is unchanged. Added tests for `minEmergencyMonths` rejection and uninsured eligibility of the two Haftpflicht teaching events.

## Concerns

The npm output still contains the existing warning `Unknown env config "devdir"`. It did not fail tests.

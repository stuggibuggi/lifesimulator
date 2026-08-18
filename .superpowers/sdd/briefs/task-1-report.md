# Task / Phase 1 Report: Student resume across devices

## Status
DONE

## Commit
- `a2a9976` feat: allow student resume via room alias and PIN

## Implementation Summary
- Added `pin_hash VARCHAR(255) NULL` and `last_seen_at DATETIME NULL` to `memberships` in `apps/api/schema.sql` and idempotent `migrate.js` ALTERs.
- Updated `POST /api/classrooms/join` to require a 4-6 digit PIN for first join, store a bcrypt hash, gate existing aliases by PIN, rotate `session_token`, update `last_seen_at`, and return the existing `membershipId` for resume.
- Updated `joinClassroom(roomCode, alias, pin)` and `ClassroomAuthModal` JOIN mode to collect/send the PIN and show clear German PIN errors.
- Updated `docs/plesk-go-live-checklist.md` classroom acceptance for alias + PIN, device switching, and wrong-PIN blocking.

## Automated Checks
- RED check observed before implementation: `npx vitest run apps/api/src/routes/classrooms.test.js` failed against the old duplicate-alias behavior.
- GREEN checks after implementation:
  - `npm test` passed: 8 test files, 33 tests.
  - `npm run build --workspace=apps/player-web` passed. Vite emitted the existing chunk-size warning for a ~504 kB JS chunk.

## Self-Review
- Reviewed committed diff with `git show --stat --oneline HEAD`.
- Ran `git show --check HEAD`; no whitespace errors were reported.
- Confirmed only Phase 1 implementation files were committed. Existing untracked `.superpowers/` and `docs/superpowers/` remain outside the commit.

## Concerns
- No live MariaDB/manual browser acceptance was run in this environment. The route contract is covered with a mocked-DB Vitest test, and the full unit suite/build pass.

## Review Fix: Student Resume PIN Throttle
- Fixed the Important review finding by adding process-local throttling for failed existing-alias PIN resumes in `POST /api/classrooms/join`.
- Throttle key: `classroomId + alias + clientIp`; first 5 wrong PIN attempts still return `401`, subsequent attempts during the 60-second cooldown return `429` with a German error and `Retry-After`.
- A successful PIN resume clears the failed-attempt counter for that key.

## Review Fix Automated Checks
- RED before implementation: `npx vitest run apps/api/src/routes/classrooms.test.js` failed with 2 expected failures because the sixth wrong PIN attempt still returned `401` instead of `429`.
- GREEN after implementation: `npx vitest run apps/api/src/routes/classrooms.test.js` passed.

```text
npm warn Unknown env config "devdir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.

 RUN  v3.2.7 D:/Cursor-Projekte/Lebenssimulator

 ✓ apps/api/src/routes/classrooms.test.js (7 tests) 1183ms
   ✓ POST /api/classrooms/join > clears failed PIN attempts after a successful resume  523ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  16:01:26
   Duration  1.56s (transform 37ms, setup 0ms, collect 147ms, tests 1.18s, environment 0ms, prepare 87ms)
```

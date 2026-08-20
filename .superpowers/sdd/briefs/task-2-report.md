# Task / Phase 2 Report: Teacher Dashboard Hardening

## Status

Implemented Phase 2 for the teacher classroom dashboard on branch `feature/classroom-hardening`.

## Changes

- Added typed classroom summary and certificate response payloads in `apps/player-web/src/api/client.ts`, including `currentAge` for classroom members.
- Added tested classroom member row helpers for age, running/finished status, score display, and certificate eligibility.
- Updated `ClassroomModal` to show the member list as `Alias | Alter | Status | Score`, with German status labels `läuft` and `fertig Note ...`.
- Added 30-second polling while a teacher classroom is selected, with cleanup on classroom change/unmount and a visible `Aktualisiert ...` timestamp.
- Added a lightweight `Zertifikat` action for finished members that calls the existing `fetchCertificate(classroomId, runId)` API and opens the existing certificate print view with the loaded payload.
- Inspected `apps/api/src/routes/classrooms.js`; `GET /api/classrooms/:id/summary` already includes `currentAge` in the `members` JSON, so no API behavior change was needed.

## Verification

- Red test confirmed first for `apps/player-web/src/components/ClassroomModal.helpers.test.ts`: failed because `./ClassroomModal.helpers` did not exist.
- Focused helper test passed after implementation: 2 tests passed.
- `npm test`: passed, 9 test files and 37 tests.
- `npm run build --workspace=apps/player-web`: passed. Vite emitted a chunk-size warning for a 506.20 kB minified JS chunk.

## Manual Acceptance

Not executed in-browser during this task. Expected acceptance path:

1. Two students join the same classroom.
2. Students advance and cloud-save runs.
3. Teacher opens the classroom dashboard and sees both aliases with updated age/status/score after manual load or within the 30-second poll interval.
4. Finished members expose `Zertifikat`, which loads the saved certificate and enables print/PDF.

## Concerns

- Manual two-student browser acceptance remains to be performed.
- The production build keeps the existing Vite chunk-size warning; build still exits successfully.

## Review Fix (2026-08-18)

- Moved `apiError` banner and `Aktualisiert` timestamp above tab panels in `ClassroomModal.tsx` so poll/API failures are visible on both CLASS and CERTIFICATE tabs.

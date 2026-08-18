# Task 5 Report: Classroom delete + GDPR ops

## Status

Implemented.

## Changes

- Added `DELETE /api/classrooms/:id` with teacher JWT enforcement, owner check, `404` for missing/invalid ids, `403` for other teachers, and `204` on successful deletion.
- Added API coverage for `401`, `403`, `404`, and `204` classroom deletion paths.
- Added `deleteClassroom` client helper and a German confirm/delete action in `ClassroomModal`.
- Added production join links and local SVG QR codes for classroom room codes.
- Added `?join=CODE` deep link handling that opens the join modal and pre-fills the room code.
- Added `docs/ops-dsgvo.md` with retention, cascade delete, backup, and manual SQL notes.

## Verification

- `npm test` passed: 10 files, 50 tests.
- `npm run build --workspace=apps/player-web` passed.

## Notes

- `apps/api/schema.sql` already defines the required FK cascade from classrooms to memberships, game runs, and evaluations.
- Build still emits Vite's chunk-size warning for the main bundle.
- CMS/content override work was intentionally skipped per brief.

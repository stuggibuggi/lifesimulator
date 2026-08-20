# Task 2 Report: Shared CertificatePanel + Solo Certificate

## Status
- Extracted the certificate markup from `ClassroomModal` into `apps/player-web/src/components/CertificatePanel.tsx`.
- Reused `CertificatePanel` in `ClassroomModal` while preserving the disabled preview opacity and existing print button behavior.
- Added a solo game-over certificate section to `EvaluationView` with a print/PDF button.
- Added `CertificatePanel.test.tsx` to lock the shared certificate copy and values.

## Verification
- `npx vitest run apps/player-web/src/components/CertificatePanel.test.tsx` passed.
- `npm test` passed: 12 files, 53 tests.
- `npm run build --workspace=apps/player-web` passed.

## Concerns
- Player-web build still reports the existing Vite warning that the main JS chunk is larger than 500 kB after minification.

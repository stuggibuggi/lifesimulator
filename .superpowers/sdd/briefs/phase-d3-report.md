# Phase D3 Report - Teacher School OIDC SSO

## Status

Implemented teacher-only OIDC Authorization Code + PKCE SSO on `feature/phase-d3-school-sso`.

## Changes

- Added nullable unique `teachers.oidc_sub` to `apps/api/schema.sql` and idempotent migration handling.
- Added `/api/auth/oidc/start` and `/api/auth/oidc/callback` with discovery, PKCE, state cookie, token exchange, JWKS-backed ID token validation, email-domain allowlist, role allowlist, verified-email link-or-create, and existing teacher JWT issuance.
- Added teacher modal button "Mit Schul-SSO anmelden" and callback token/error handling while preserving password login.
- Updated `apps/api/.env.example` and `docs/sso-future.md` for active optional OIDC configuration.
- Added mocked OIDC/JWKS backend tests without real IdP calls.

## Verification

- `npx vitest run apps/api/src/routes/auth.test.js apps/player-web/src/components/ClassroomAuthModal.helpers.test.ts`
- `npm run build --workspace=apps/player-web`

## Out Of Scope

- Student SSO was not implemented.
- Multi-IdP federation was not implemented.

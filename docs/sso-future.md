# Future Schul-SSO Placeholder

Phase D intentionally does not implement real school SSO. The current teacher login remains email/password with existing verification and reset flows. This document records the intended OpenID Connect (OIDC) boundary so a later phase can add SSO without reshaping classroom or run storage.

## Intended OIDC Flow

1. Teacher clicks "Mit Schul-SSO anmelden" in a future teacher auth UI.
2. API redirects to the configured identity provider authorization endpoint with `openid profile email` scopes and a CSRF `state`.
3. Identity provider redirects back to the API callback with an authorization code.
4. API exchanges the code server-side, validates issuer, audience, nonce, expiry, and signature against the provider JWKS.
5. API maps the validated identity to a local teacher record by stable subject (`sub`) and verified email.
6. API issues the existing GOAL teacher JWT so current classroom routes keep using `requireTeacher`.

## Planned Environment Variables

These variables are placeholders only. Phase D does not read them at runtime.

```bash
OIDC_ISSUER=https://idp.example.school/realms/school
OIDC_CLIENT_ID=goal-life-simulator
OIDC_CLIENT_SECRET=change-me
OIDC_REDIRECT_URI=https://vorsorgenavigator.stoffner.de/api/auth/oidc/callback
OIDC_SCOPES=openid profile email
OIDC_ALLOWED_EMAIL_DOMAINS=school.example
OIDC_TEACHER_ROLE_CLAIM=roles
OIDC_TEACHER_ROLE_VALUES=teacher,staff
```

## Out Of Scope Now

- no OAuth/OIDC routes
- no token exchange or JWKS validation
- no IdP-specific role mapping
- no SSO button in player-web
- no migration from password accounts to federated accounts

When SSO is implemented later, keep the provider integration behind the auth boundary and continue issuing the same internal teacher JWT used by classroom APIs.

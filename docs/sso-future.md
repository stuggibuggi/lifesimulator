# Schul-SSO (Teacher OIDC)

Track D3 implements teacher-only school SSO via one configured OpenID Connect issuer. The current teacher email/password login remains available as fallback while schools roll out IdP access.

## Intended OIDC Flow

1. Teacher clicks "Mit Schul-SSO anmelden" in the teacher auth UI.
2. API redirects to the configured identity provider authorization endpoint with `openid profile email` scopes and a CSRF `state`.
3. Identity provider redirects back to the API callback with an authorization code.
4. API exchanges the code server-side, validates issuer, audience, nonce, expiry, and signature against the provider JWKS.
5. API maps the validated identity to a local teacher record by stable subject (`sub`) or verified email, then stores `teachers.oidc_sub`.
6. API issues the existing GOAL teacher JWT so current classroom routes keep using `requireTeacher`.

## Environment Variables

Leave `OIDC_ISSUER` unset to disable SSO. In that state `/api/auth/oidc/start` returns a German 503 message and password login remains available.

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

## Out Of Scope

- Student SSO
- Multi-IdP federation
- IdP-specific account migration UI beyond verified-email link-or-create

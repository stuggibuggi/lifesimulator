# Plesk Node.js App (apps/api)

## MariaDB
1. In Plesk: Datenbanken → MariaDB anlegen
2. Schema: `schema.sql` in phpMyAdmin importieren **oder**
   `cd apps/api && npm install && npm run migrate`
   (migrate legt Tabellen an und ergänzt E-Mail-Auth-Spalten per ALTER)
3. `.env` aus `.env.example` mit `DB_*`, `JWT_SECRET`, `CORS_ORIGIN`, `APP_PUBLIC_URL`, `SMTP_*`

## SMTP (Plesk-Mailbox)
Bevorzugt auf demselben Host (zuverlässiger als `localhost:587`):

```
SMTP_TRANSPORT=sendmail
SENDMAIL_PATH=/usr/sbin/sendmail
MAIL_FROM=GOAL <info@vorsorgenavigator.stoffner.de>
APP_PUBLIC_URL=https://vorsorgenavigator.stoffner.de
```

Test auf dem Server: `npm run mail:test -- deine@email.de`  
Fallback SMTP: `SMTP_HOST=127.0.0.1`, `SMTP_PORT=25`, `SMTP_IGNORE_TLS=true` plus Mailbox-Login.

## Node.js in Plesk
- Application Root: `…/apps/api` (Ordner mit `app.js`)
- Document Root (Frontend): `apps/player-web/dist`
- Startup File: `app.js`
- Mode: production
- Env: PORT, JWT_SECRET, CORS_ORIGIN, APP_PUBLIC_URL, DB_*, SMTP_*

## Frontend-Build
```bash
# im Monorepo-Root
set VITE_API_URL=https://vorsorgenavigator.stoffner.de
npm install
npm run build --workspace=apps/player-web
```
Document Root auf `apps/player-web/dist` setzen.

## Smoke-Check
```bash
cd apps/api
node scripts/smoke.js
# oder: GOAL_API_URL=https://… node scripts/smoke.js
```

Lehrer-Flow: Registrieren → Mail-Link `?verifyTeacher=` → Login → Raumcode.
Passwort: „vergessen“ → Mail `?resetTeacher=` → neues Passwort.

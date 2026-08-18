# Plesk Node.js App (apps/api)

## MariaDB
1. In Plesk: Datenbanken → MariaDB anlegen
2. `schema.sql` importieren (phpMyAdmin) **oder** auf dem Server:
   `cd apps/api && npm install && npm run migrate`
3. `.env` aus `.env.example` anlegen mit DB_HOST/DB_USER/DB_PASSWORD/DB_NAME

## Node.js in Plesk
- Application Root: `…/apps/api` (Ordner mit `app.js`)
- Document Root: bleibt fürs Frontend auf `apps/player-web/dist`
- Startup File: `app.js`
- Mode: production
- Env: PORT, JWT_SECRET, CORS_ORIGIN, DB_*

Frontend: in `apps/player-web` Build mit
`VITE_API_URL=https://deine-api-domain` setzen.

# Plesk Go-Live Checklist (vorsorgenavigator.stoffner.de)

## 1. MariaDB
- [ ] Database + user created in Plesk
- [ ] `apps/api/schema.sql` imported OR `npm run migrate` in `apps/api`
- [ ] `npm run seed:content` in `apps/api` (published events/scenarios for CMS)
- [ ] `.env` present with DB_*, JWT_SECRET, CORS_ORIGIN, APP_PUBLIC_URL, SMTP_*
- [ ] Optional Phase E2: `LLM_TIPS_ENABLED`, `LLM_API_URL`, `LLM_TIPS_TIMEOUT_MS` (see `apps/api/.env.example`)
- [ ] Optional Phase E4: `SERVER_SIM_STRICT=1` to block Cloud-Save age/month overwrites
- [ ] Optional Phase D: OIDC_* (see `apps/api/.env.example`)

## 2. Node API
- [ ] Application Root = `apps/api`
- [ ] Startup file = `app.js`
- [ ] `npm install` in apps/api
- [ ] `npm run build` in apps/api (bundles simulation engine for E4)
- [ ] `npm run migrate` (includes `run_action_audit`)
- [ ] App restarted
- [ ] `GET /api/health` returns `{ ok: true, db: "mariadb" }`
- [ ] `node scripts/smoke.js` (with GOAL_API_URL) passes

## 3. Frontend
- [ ] Built with `VITE_API_URL` pointing at the live API (or same host if /api proxied)
- [ ] Frontend always requests tip enhancement after event choices; disable only via API `LLM_TIPS_*` env
- [ ] Optional Phase E4: `VITE_SERVER_SIM=1` for classroom server-sim cutover
- [ ] Document Root = `apps/player-web/dist`
- [ ] No CORS errors in browser console
- [ ] Welcome screen shows Version / Build badge

## 4. Classroom acceptance
- [ ] Teacher register → verification mail → login
- [ ] Forgot password → reset mail → new password → login
- [ ] Create room → student join with alias + 4–6 digit PIN
- [ ] Gerät wechseln: same room + alias + PIN loads cloud save without copying localStorage
- [ ] Wrong PIN blocks alias resume
- [ ] Dashboard shows live aggregates; classroom dropdown switches rooms

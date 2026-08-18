# Plesk Go-Live Checklist (vorsorgenavigator.stoffner.de)

## 1. MariaDB
- [ ] Database + user created in Plesk
- [ ] `apps/api/schema.sql` imported OR `npm run migrate` in `apps/api`
- [ ] `.env` present with DB_*, JWT_SECRET, CORS_ORIGIN, APP_PUBLIC_URL, SMTP_*

## 2. Node API
- [ ] Application Root = `apps/api`
- [ ] Startup file = `app.js`
- [ ] `npm install` in apps/api
- [ ] App restarted
- [ ] `GET /api/health` returns `{ ok: true, db: "mariadb" }`
- [ ] `node scripts/smoke.js` (with GOAL_API_URL) passes

## 3. Frontend
- [ ] Built with `VITE_API_URL` pointing at the live API (or same host if /api proxied)
- [ ] Document Root = `apps/player-web/dist`
- [ ] No CORS errors in browser console

## 4. Classroom acceptance
- [ ] Teacher register → verification mail → login
- [ ] Forgot password → reset mail → new password → login
- [ ] Create room → student join with alias
- [ ] Cloud save across devices
- [ ] Dashboard shows live aggregates; classroom dropdown switches rooms

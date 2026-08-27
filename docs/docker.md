# Docker (local stack)

Three services via Compose:

| Service | Port | Role |
|---------|------|------|
| `web` | http://localhost:8080 | Nginx + player-web (`/api` proxied) |
| `api` | http://localhost:3001 | Express API |
| `db` | localhost:3307 | MariaDB 11 |

## Start

```bash
docker compose up -d --build
```

Open http://localhost:8080

## Useful commands

```bash
docker compose logs -f api
docker compose ps
docker compose down          # stop
docker compose down -v       # stop + wipe DB volume
```

## Notes

- API entrypoint waits for DB, runs `migrate`, then `seed:content`, then starts.
- Frontend uses same-origin `/api` (empty `VITE_API_URL`).
- Optional build arg: `VITE_SERVER_SIM=1` on the `web` service for classroom server-sim.
- Dev credentials are in `docker-compose.yml` only — change before any shared use.

#!/bin/sh
set -e

echo "Waiting for MariaDB at ${DB_HOST:-db}:${DB_PORT:-3306}..."
i=0
until node -e "
const net = require('net');
const host = process.env.DB_HOST || 'db';
const port = Number(process.env.DB_PORT || 3306);
const socket = net.connect(port, host, () => { socket.end(); process.exit(0); });
socket.on('error', () => process.exit(1));
" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "MariaDB did not become ready in time."
    exit 1
  fi
  sleep 2
done

echo "Running migrations..."
node src/db/migrate.js

if [ "${SEED_CONTENT:-1}" = "1" ] || [ "${SEED_CONTENT:-1}" = "true" ]; then
  echo "Seeding published content..."
  node scripts/seed-content.js || echo "Content seed skipped/failed (non-fatal if already seeded)."
fi

echo "Starting GOAL API..."
exec node app.js

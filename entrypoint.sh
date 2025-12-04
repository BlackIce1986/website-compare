#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations (v6.18.0)..."
npx --yes prisma@6.18.0 migrate deploy

echo "[entrypoint] Starting application..."
exec node server.js

#!/usr/bin/env bash
# Factory worker setup for DrillMap: a loopback Postgres 17, the app's packages, and Playwright's Chromium.
set -euo pipefail

docker run --detach --name factory-postgres \
  --env POSTGRES_PASSWORD=local-only \
  --publish 127.0.0.1:5432:5432 \
  mirror.gcr.io/library/postgres:17
until docker exec factory-postgres pg_isready --username postgres >/dev/null 2>&1; do sleep 1; done
echo "DATABASE_URL=postgresql://postgres:local-only@127.0.0.1:5432/postgres" >> "$GITHUB_ENV"


npm ci

tools="$RUNNER_TEMP/playwright"
npm install --prefix "$tools" --no-save --no-package-lock playwright
node "$tools/node_modules/playwright/cli.js" install --with-deps chromium
echo "VERIFY_PLAYWRIGHT_MODULE=$tools/node_modules/playwright/index.mjs" >> "$GITHUB_ENV"

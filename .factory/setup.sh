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

# The pre-commit hook runs gitleaks. Same pinned release and checksum as the Secret scan check.
curl --fail --silent --show-error --location --retry 3 --output "$RUNNER_TEMP/gitleaks.tar.gz" \
  https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz
echo "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  $RUNNER_TEMP/gitleaks.tar.gz" | sha256sum --check
tar -xzf "$RUNNER_TEMP/gitleaks.tar.gz" -C "$RUNNER_TEMP" gitleaks
"$RUNNER_TEMP/gitleaks" version
echo "$RUNNER_TEMP" >> "$GITHUB_PATH"

tools="$RUNNER_TEMP/playwright"
npm install --prefix "$tools" --no-save --no-package-lock playwright
node "$tools/node_modules/playwright/cli.js" install --with-deps chromium
echo "VERIFY_PLAYWRIGHT_MODULE=$tools/node_modules/playwright/index.mjs" >> "$GITHUB_ENV"

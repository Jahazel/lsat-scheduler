#!/usr/bin/env bash
# Factory worker proof for DrillMap: the verify skill's smoke test on a fresh database.
set -euo pipefail

run=".verification/evidence/factory-$(date -u +%Y%m%dT%H%M%SZ)"
out="$RUNNER_TEMP/launch.log"
./.agents/skills/verify/scripts/local.mjs launch "$run" >"$out" 2>&1 &
launcher=$!

finish() {
  ./.agents/skills/verify/scripts/local.mjs cleanup "$run" || true
  if [ -d "$run" ]; then cp "$out" "$run/launch.log"; fi
}
trap finish EXIT

for _ in $(seq 1 300); do
  grep -q "^Ready: http://127.0.0.1:3100" "$out" && break
  if ! kill -0 "$launcher" 2>/dev/null; then cat "$out"; exit 1; fi
  sleep 1
done
grep -q "^Ready: http://127.0.0.1:3100" "$out" || { cat "$out"; echo "The app was not ready after 300 seconds."; exit 1; }

./.agents/skills/verify/scripts/local.mjs doctor "$run" >"$run/doctor.json"
./.agents/skills/verify/scripts/smoke.mjs "$run"

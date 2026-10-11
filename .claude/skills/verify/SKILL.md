---
name: verify
description: "Verify DrillMap's web app through a real browser. Use for sign-up, onboarding, study settings, analytics approval, weekly schedules, activity check-ins, Progress, and Admin controls after behavior changes."
---

# Verify DrillMap

Read [the feature index](features/README.md), then the files for the changed behavior. Drive every entry point listed for that behavior. Report untested entry points separately. Use the domain terms in `GLOSSARY.md`.

## Launch

Run from the repository root. Prerequisites are installed npm dependencies, Node.js, MongoDB Community Server `mongod`, and the macOS `lsof` and `ps` commands. Use the README's local setup if a prerequisite is missing. The current app uses MongoDB, not Postgres. There is no existing end-to-end browser suite. Vitest tests cover components and scheduling rules, and do not replace this browser proof.

Create a new run name and start the executable helper in a terminal session that stays open:

```bash
VERIFY_RUN_DIR=".verification/evidence/$(date -u +%Y%m%dT%H%M%SZ)"
./.claude/skills/verify/scripts/local.mjs launch "$VERIFY_RUN_DIR"
```

Retain the printed absolute run directory across terminal calls. Readiness is the `Ready: http://127.0.0.1:3100` line. It requires `/login` to return HTTP 200 with `Log in`. The helper runs the repo's `next dev` command with `--hostname 127.0.0.1 --port 3100`. It starts an empty, disposable database on port 27117 with a private data directory. It initializes a single-member MongoDB replica set, a database mode that supports the transactions used by Admin resets. This is database infrastructure setup. It creates no app records.

The helper sets a fresh in-memory Auth.js secret and local callback URLs. It overrides Google credentials and `ANTHROPIC_API_KEY` with empty values before Next loads `.env.local`. It does not edit local environment files. Use email/password sign-in. Google sign-in and successful paid screenshot extraction are outside this baseline. Admin Sample analytics snapshots use the app's real review and approval path.

The fixed ports prevent two helper runs at once. A normal local MongoDB on 27017 can remain running. Two Next dev servers cannot share `.next/dev` in one checkout. The helper refuses an occupied port or a live owner of the Next dev lock. Next handles stale locks itself. Use a separate checkout to run alongside another dev server. A second browser tab shares cookies, so it is not a separate signed-in profile. Do not drive the user's signed-in tab or shared local database.

Teardown is `Ctrl+C` in the launch terminal, or the cleanup command below. Run cleanup after a failed attempt before starting a new run.

## Doctor

Run this read-only check before driving, and whenever navigation, authentication, or persistence looks wrong:

```bash
./.claude/skills/verify/scripts/local.mjs doctor "$VERIFY_RUN_DIR"
```

Require exit code 0 and `healthy: true`. It checks the recorded supervisor, port ownership, the Git revision, the installed Next version, the login response, and the disposable database's writable primary. It performs no database writes. Do not drive another process that happens to answer on port 3100. A changed Git commit requires a restart. Uncommitted source changes use normal Next hot reload. Save the command output as `doctor.json` in the run directory.

## Drive

Use the browser tools supplied by the current harness. In T3 Code, use `preview_status` first. If unavailable, call `preview_open`, then `preview_navigate` with `url: "http://127.0.0.1:3100"`. Keep this host consistent with the helper. An environment-port target can resolve to `localhost`, which has a different browser cookie scope. Inspect with `preview_snapshot` before each new screen. Use snapshot locators with `preview_click`, `preview_type` with `clear: true`, `preview_press`, and `preview_wait_for`. Keep the returned tab ID when it remains valid. If a tool says the tab is missing, inspect status and reopen before retrying. Do not switch browser systems just because an initial preview is closed.

In another harness, use its browser automation with equivalent role selectors. Load its tool documentation first. Never assume T3 tool names exist there. The feature recipes use `click(locator)`, `type(locator, text)`, `press(key)`, and `wait(text)` as shorthand for those browser operations. They are not shell commands.

For native selects in T3, click the named combobox, press `Escape` to close its native popup, type the option prefix with `preview_press`, then press `Tab` to commit. Native popup keyboard handling can differ from the page keyboard. Avoid `Enter`, which can submit the enclosing form. Use a label-scoped selector when the accessible name includes hint text. Use read-only DOM inspection to confirm the selected value. For Playwright, use `locator.selectOption` or `getByLabel(...).selectOption` for the native control. Do not assign DOM values, dispatch synthetic change events, call server actions directly, or set React state as a substitute for the user path.

If T3 tools are absent or `preview_open` explicitly reports unsupported or unavailable automation, use the executable browser fallback below. It launches an isolated Chromium context. It never connects to the user's browser. It covers the email/password Account lifecycle and baseline onboarding/settings recipes. See [Playwright library setup](https://playwright.dev/docs/library) for runtime and browser installation.

```bash
mkdir -p "$VERIFY_RUN_DIR/scratch/tools"
npm install --prefix "$VERIFY_RUN_DIR/scratch/tools" --no-save --no-package-lock playwright
node "$VERIFY_RUN_DIR/scratch/tools/node_modules/playwright/cli.js" install chromium
./.claude/skills/verify/scripts/smoke.mjs "$VERIFY_RUN_DIR"
```

An existing Playwright installation can replace that install. Set `VERIFY_PLAYWRIGHT_MODULE` to its absolute `index.mjs` path. Require an empty disposable database for smoke. It captures screenshots, accessibility snapshots, action descriptions, a video, a Playwright trace, and stored-record inspections. Require `smoke-result.json` to have `passed: true`. Its remaining paths are explicitly listed in that file. Run cleanup even if smoke fails. The script closes only the browser it launched in a `finally` block. Browser downloads use Playwright's shared cache; do not delete that cache during cleanup.

The shortest interactive first proof is [sign-up and Account](features/sign-up-account.md). It needs no paid service or seeded app data. For scheduling and Progress, create an Account through the UI, complete onboarding, and follow [Admin setup](features/admin.md) to approve a Sample analytics snapshot. Admin promotion uses the existing local administration command only as fixture setup. It is not proof of a user feature.

## Evidence

All proof survives at `.verification/evidence/<run-name>/`, ignored by Git. Save evidence while the disposable database is running:

```bash
./.claude/skills/verify/scripts/local.mjs doctor "$VERIFY_RUN_DIR" > "$VERIFY_RUN_DIR/doctor.json"
./.claude/skills/verify/scripts/local.mjs inspect "$VERIFY_RUN_DIR" > "$VERIFY_RUN_DIR/records-after.json"
```

`inspect` checks Doctor first, then reads users, students, analytics snapshots, weekly schedules, activity check-ins, and leads from this run's database. It omits password hashes. Capture `records-before.json` before a mutation when proving absence, immutability, or deletion. Compare the affected IDs and values. Do not equate a success notice with persistence.

For a browser proof, save a before snapshot, the actions and their locators, an after snapshot, and screenshots with DrillMap visible. In T3, start `preview_recording_start` before the action and call `preview_recording_stop` afterward. Copy the returned recording file into the run directory. Use `preview_snapshot` with `save: true` for each screenshot and copy its returned `screenshotPath` there. Save text snapshots separately with `includeImage: false`. Tool-result images alone are not files. Use a read-only `preview_evaluate` to inspect DOM values or browser state when needed.

Write `result.md` with the feature, entry point, preconditions, exact actions, expected result, observed result, and artifact paths. Include failed actions and skipped paths. Exercise the real user path. Capture the action and its result. Confirm saved changes by reopening the page and reading database records. Weekly schedule documents must remain unchanged when activity check-ins or study settings change. Check relevant side effects alongside the screen. Use mocks only at an existing production service boundary. The scheduling recipe uses the production Admin sample feature and a real local database. It does not mock extraction or prove Google sign-in. If another run uses a dry-run or test mode, observe its actual network, file, and database effects before claiming it skips them.

The helper also retains `app.log`, `database.log`, `instance.json`, and `cleanup.json`. Capture new browser errors from snapshot diagnostics and review `app.log`. Do not commit screenshots, test passwords, cookies, session tokens, or environment values.

## Cleanup

Stop a browser recording before teardown. Navigate the dedicated verification tab to `about:blank` or close it using the harness's own tab command. Do not close a user tab.

```bash
./.claude/skills/verify/scripts/local.mjs cleanup "$VERIFY_RUN_DIR"
test -f "$VERIFY_RUN_DIR/result.md"
test -f "$VERIFY_RUN_DIR/cleanup.json"
test ! -d "$VERIFY_RUN_DIR/scratch"
```

Require `Cleanup complete` or `Already stopped`. Confirm both ports are free with `lsof -nP -iTCP:3100 -iTCP:27117 -sTCP:LISTEN`. No output is the expected result. Confirm the screenshot, recording, snapshots, and stored-record evidence still exist. The supervisor stops only the child process groups it started and removes only this run's scratch database. It never kills by process name. It retains evidence and leaves `.env.local`, the user's database, and the Next cache alone. Never run `reset:dev-data` against the user's database as verification cleanup.

If launch fails before it creates `instance.json`, it started no app process or has already run its failure cleanup. Inspect the error and logs. If the supervisor no longer matches the recorded command, cleanup refuses to signal that PID. Identify the recorded children from their log paths and process ownership before any manual recovery.

## Helpers

The executable [scripts/local.mjs](scripts/local.mjs) supports four commands, all shown above: `launch`, `doctor`, `inspect`, and `cleanup`. Each requires a run directory below `.verification/evidence/`. Evidence directories cannot be reused. Its process and database operations target only the local verification instance. This helper is specific to the current MongoDB app. Update it when the app moves to Postgres. The executable [scripts/smoke.mjs](scripts/smoke.mjs) runs the browser baseline with the invocation shown in Drive. Both helpers run from the repository root.

Use `/maintain-verification-skill` when app changes make these recipes or the feature map stale.

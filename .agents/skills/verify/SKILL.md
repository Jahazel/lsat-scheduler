---
name: verify
description: "Verify DrillMap's web app through a real browser. Use for sign-up, Account sessions, onboarding, study settings, analytics approval, weekly schedules, activity check-ins, Progress, and Admin controls after behavior changes."
---

# Verify DrillMap

Read [the feature index](features/README.md), then the files for the changed behavior. Drive every entry point listed for that behavior. Report untested entry points separately. Use the domain terms in `GLOSSARY.md`.

## Reuse a passing run

A full run is needed once per behavior change. Before a new launch, compare the code with the last passing run's revision or working tree. When the difference changes no runtime behavior, reuse that run without a launch. Examples are comments, renames, an inlined constant, and test-only edits. Append a `Reuse` section to that run's `result.md` with the current revision, the changed files, and why no behavior changed. Verify all affected entry points for any change to app code that alters what a user sees, what is saved, or who may do it. Use the healthy existing run when it meets their preconditions; launch a new run when required by Doctor or isolation needs.

Keep a healthy isolated run and suitable fixture Accounts through implementation, review, and required fixes. Reuse existing Accounts and records when they meet the next check's preconditions. Create fresh fixtures for checks that require empty state. Reusing setup does not reuse proof: rerun affected entry points after behavior changes. Respect Doctor's restart rules. Perform final cleanup when the task finishes or stops, and record unfinished checks.

## Launch

Run from the repository root. Prerequisites are installed npm dependencies, Node.js, a loopback Postgres 17 server, and the macOS `lsof` and `ps` commands. Use the README's local setup if a prerequisite is missing. All app paths use Postgres. There is no existing end-to-end browser suite. Vitest tests cover components and scheduling rules, and do not replace this browser proof.

Set `DATABASE_URL` to a loopback Postgres owner connection in the shell. The README's `postgres` user is the Docker container's owner. A Homebrew Postgres install has no `postgres` role; its owner is the macOS user, for example `postgresql://$USER@127.0.0.1:5432/postgres`. The helper refuses remote hosts, creates a random database, applies migrations, and drops only that database on cleanup. It overrides the app connection before Next loads `.env.local`. No connection setting is written into evidence. Use the same shell setting for launch, Doctor, inspect, and cleanup.

Create a new run name and start the executable helper in a terminal session that stays open:

```bash
VERIFY_RUN_DIR=".verification/evidence/$(date -u +%Y%m%dT%H%M%SZ)"
./.agents/skills/verify/scripts/local.mjs launch "$VERIFY_RUN_DIR"
```

Retain the printed absolute run directory across terminal calls. Readiness is the `Ready: http://127.0.0.1:3100` line. It requires `/login` to return HTTP 200 with `Log in`. The helper runs the repo's `next dev` command with `--hostname 127.0.0.1 --port 3100`.

The helper sets a fresh in-memory Auth.js secret and local callback URLs. It overrides Google credentials, `ANTHROPIC_API_KEY`, and the spend alert addresses `SCAN_SPEND_WARNING_PING_URL` and `SCAN_LIMIT_REACHED_PING_URL` with empty values, so a run never sends a real spend alert. It sets `SCREENSHOT_EXTRACTOR=fake` before Next loads `.env.local`. It does not edit local environment files. DrillMap signs in with Google only. This baseline has no Google client, so every student and Admin signs in with a session cookie from `local.mjs session`. The cookie carries the session version and sign-in time that the current-Account check requires. Real Google sign-in and its refusals are outside this baseline; the owner checks them on the copy. Screenshot upload uses the fake extractor: any uploaded image returns fixed LR rows or fixed RC passage rows, by drop zone, and makes no Anthropic call. Admin Sample analytics snapshots use the app's real review and approval path.

The fixed app port prevents two helper runs at once. Two Next dev servers cannot share `.next/dev` in one checkout. The helper refuses an occupied port or a live owner of the Next dev lock. Next handles stale locks itself. Use a separate checkout to run alongside another dev server. A second browser tab shares cookies, so it is not a separate signed-in profile. Do not drive the user's signed-in tab or shared local database.

Teardown is `Ctrl+C` in the launch terminal, or the cleanup command below. Run cleanup after a failed attempt before starting a new run.

## Doctor

Run this read-only check before driving, and whenever navigation, authentication, or persistence looks wrong:

```bash
./.agents/skills/verify/scripts/local.mjs doctor "$VERIFY_RUN_DIR"
```

Require exit code 0 and `healthy: true`. It checks the recorded supervisor, port ownership, the Git revision, the installed Next version, the login response, and the migrated Postgres tables. It performs no database writes. Do not drive another process that happens to answer on port 3100. A changed Git commit requires a restart. Uncommitted source changes use normal Next hot reload. Save the command output as `doctor.json` in the run directory.

## Drive

Use the browser tools supplied by the current harness. In T3 Code, use `preview_status` first. If unavailable, call `preview_open`, then `preview_navigate` with `url: "http://127.0.0.1:3100"`. Keep this host consistent with the helper. An environment-port target can resolve to `localhost`, which has a different browser cookie scope. Read a new screen with `preview_snapshot` and `includeImage: false`. Take an image only for an evidence screenshot. After an action with a known result, confirm it with `preview_wait_for` on the expected text or URL. Read a few values with a short read-only `preview_evaluate`. Take a new snapshot only when you need locators that you do not have. Use snapshot locators with `preview_click`, `preview_type` with `clear: true`, `preview_press`, and `preview_wait_for`. Keep the returned tab ID when it remains valid. If a tool says the tab is missing, inspect status and reopen before retrying. If a tool reports that no preview automation host is available, the T3 host has dropped. Run Doctor, call `preview_status` until it is available, and then read the page state. The tab can reload when the host reconnects, and a reload loses unsaved form steps. A click that starts a page change, such as `Log out`, can report a failed or interrupted click while the action still runs. Send the next action only after a wait, and read the URL before you retry. Do not switch browser systems just because an initial preview is closed.

Return only the status, needed locators, relevant values or error, and artifact paths from browser calls. Save full snapshots and evidence to the run directory without printing them into the conversation. Inspect full artifacts when diagnosing a failure. Stop a dependent action sequence when an action fails; inspect the failed state before continuing. These output rules also apply in other harnesses.

In another harness, use its browser automation with equivalent role selectors. Load its tool documentation first. Never assume T3 tool names exist there. The feature recipes use `click(locator)`, `type(locator, text)`, `press(key)`, and `wait(text)` as shorthand for those browser operations. They are not shell commands.

For native selects in T3, click the named combobox, press `Escape` to close its native popup, type the option prefix with `preview_press`, then press `Tab` to commit. Native popup keyboard handling can differ from the page keyboard. Avoid `Enter`, which can submit the enclosing form. Use a label-scoped selector when the accessible name includes hint text. Use read-only DOM inspection to confirm the selected value. For Playwright, use `locator.selectOption` or `getByLabel(...).selectOption` for the native control. Do not assign DOM values, dispatch synthetic change events, call server actions directly, or set React state as a substitute for the user path.

Use Playwright instead of T3 when a check chooses a file, such as the weekly upload, or when T3 tools are absent, or when `preview_open` reports unsupported or unavailable automation. Playwright launches an isolated Chromium context. It never connects to the user's browser. See [Playwright library setup](https://playwright.dev/docs/library) for runtime and browser installation.

```bash
mkdir -p "$VERIFY_RUN_DIR/scratch/tools"
npm install --prefix "$VERIFY_RUN_DIR/scratch/tools" --no-save --no-package-lock playwright
node "$VERIFY_RUN_DIR/scratch/tools/node_modules/playwright/cli.js" install chromium
./.agents/skills/verify/scripts/smoke.mjs "$VERIFY_RUN_DIR"
```

An existing Playwright installation can replace that install. Set `VERIFY_PLAYWRIGHT_MODULE` to its absolute `index.mjs` path. Browser downloads use Playwright's shared cache; do not delete that cache during cleanup.

`smoke.mjs` is the baseline: the Login and Signup states, a minted-session Account lifecycle, and the onboarding and settings recipes. Require an empty disposable database and exit code 0. Its evidence is in `$VERIFY_RUN_DIR/smoke/`, and its untested paths are in its last output line. Run cleanup even if smoke fails.

For any other Playwright check, write a short script in the run directory that calls `drive` from [scripts/browser.mjs](scripts/browser.mjs). Do not write browser setup yourself. Write only the user steps:

```js
import { drive } from "<repo>/.agents/skills/verify/scripts/browser.mjs";
await drive(process.argv[2], "weekly-upload", async ({ page, goto, signInAs, heading, capture, records, log }) => {
  await signInAs("amy@example.test");
  await goto("/dashboard/upload");
  log("Choose the Logical Reasoning screenshot");
  await page.getByLabel("Logical Reasoning screenshot file").setInputFiles("<file>");
  await capture("after-upload");
  records("records-after");
});
```

Wait for a page title with `heading(text)` or `getByRole("heading", ...)`, not `getByText`: Next's hidden route announcer repeats the title, so a text wait fails Playwright's strict mode. After `goto`, call `page.waitForLoadState("networkidle")` before clicking a client control such as a reset button; a click before hydration does nothing. Run it with `node <script> "$VERIFY_RUN_DIR"`. `drive` runs Doctor, opens a signed-out browser, and records a video and a Playwright trace. It saves every page error, console error, and failed request, plus new server errors from `app.log`. When a step throws, it saves `failure-<session>.png` and `.aria.txt`. An uncaught page error fails the drive. Everything goes to `$VERIFY_RUN_DIR/<name>/`; read `result.json` there first when a drive fails. The steps get `page`, `context`, `url`, `log`, `goto`, `signInAs(email, ...sessionOptions)`, `heading`, `capture`, `records` (runs `inspect`), `local` (runs any `local.mjs` command), and `newSession(label)` for a second signed-in browser with the same tools. Prefetches that the browser cancels during navigation are not failures and are not recorded.

The shortest interactive first proof is [sign-up and Account](features/sign-up-account.md). It needs no paid service. It seeds one Account with `--not-onboarded`. For scheduling and Progress, seed an Account as described below, then follow [Admin setup](features/admin.md) to approve a Sample analytics snapshot.

### Fixture Accounts

Seed each fixture Account with one command. The Account is onboarded with the feature map's baseline answers. Add `--not-onboarded` for an Account with no Student, as a first Google sign-in leaves it:

```bash
./.agents/skills/verify/scripts/local.mjs seed "$VERIFY_RUN_DIR" student amy@example.test
./.agents/skills/verify/scripts/local.mjs seed "$VERIFY_RUN_DIR" admin verify-admin@example.test
```

The command prints the email, the role, the Account ID, and whether it is onboarded. Every fixture gets a made-up Google ID and no password. Sign in as an Admin with `local.mjs session "$VERIFY_RUN_DIR" verify-admin@example.test`. It prints a session cookie `name`, `value`, and `url`. Set that cookie in the browser, then open `/admin`. In T3, sign out first and wait for the public landing page. Then set it with `preview_evaluate` and `document.cookie = "<name>=<value>; path=/; SameSite=Lax"`. A signed-in student's HttpOnly session cookie blocks that overwrite. The cookie is signed with this run's secret and expires in one hour. The first protected request re-signs it with the 14-day idle limit. The same command mints student sessions, for example a second browser's session in [Account sessions](features/account-sessions.md). Add `--signed-in-minutes-ago <minutes>` to backdate the sign-in time, for example to reach the Account deletion sign-in step. Seeding uses the app's own Account and student save functions against this run's database. A seeded Account is fixture setup and proves no user feature. When the change touches onboarding, seed with `--not-onboarded` and enter the answers through the UI.

Each Account can save analytics 5 times per America/Chicago day on the real clock. An onboarding Confirm snapshot and each weekly upload or Admin sample approval count once. Simulated date and the Admin resets do not give saves back. Plan a run's approvals per Account, and seed a fresh Account when one runs out. The count is the `analyticsSnapshotSave` row in `action_counters`.

## Evidence

All proof survives at `.verification/evidence/<run-name>/`, ignored by Git. Save evidence while the disposable database is running:

```bash
./.agents/skills/verify/scripts/local.mjs doctor "$VERIFY_RUN_DIR" > "$VERIFY_RUN_DIR/doctor.json"
./.agents/skills/verify/scripts/local.mjs inspect "$VERIFY_RUN_DIR" > "$VERIFY_RUN_DIR/records-after.json"
```

`inspect` checks Doctor first, then reads Accounts, students, Analytics snapshots, practice-test results, Weekly schedules, Activity check-ins, leads, and action counters from this run's Postgres database. Evidence uses the SQL table and column names. It never reads password hashes. Capture `records-before.json` before a mutation when proving absence, immutability, or deletion. Compare the affected IDs and values. Do not equate a success notice with persistence.

For a browser proof, save a before snapshot, the actions and their locators, an after snapshot, and screenshots with DrillMap visible. In T3, start `preview_recording_start` before the action and call `preview_recording_stop` afterward. Copy the returned recording file into the run directory. Use `preview_snapshot` with `save: true` for each screenshot and copy its returned `screenshotPath` there. Save text snapshots separately with `includeImage: false`. Tool-result images alone are not files. Use a read-only `preview_evaluate` to inspect DOM values or browser state when needed.

Write `result.md` with the feature, entry point, preconditions, exact actions, expected result, observed result, and artifact paths. Include failed actions and skipped paths. Exercise the real user path. Capture the action and its result. Confirm saved changes by reopening the page and reading database records. Weekly schedule documents must remain unchanged when activity check-ins or study settings change. Check relevant side effects alongside the screen. Use mocks only at an existing production service boundary. The scheduling recipe uses the production Admin sample feature and a real local database. It does not mock extraction or prove Google sign-in. If another run uses a dry-run or test mode, observe its actual network, file, and database effects before claiming it skips them.

The helper also retains `app.log`, `database.log`, `instance.json`, and `cleanup.json`. Capture new browser errors from snapshot diagnostics. Read new server errors with `local.mjs logs "$VERIFY_RUN_DIR"`. It prints each error with its detail lines and the log's byte length as `to`; pass that as `--from <byte>` next time to see only newer errors. A hydration mismatch whose only difference is `caret-color: transparent` is not a product bug: Playwright adds that style to hide the text cursor when a screenshot runs before the page hydrates. A Turbopack `FATAL` error is a dev-server failure, not a product bug. Restart the run before you trust a check that failed after it. A session cookie left from an earlier run logs `JWTSessionError` with `no matching decryption secret`. The app treats that browser as signed out, so this error is expected on the first page load. Do not commit screenshots, cookies, session tokens, or environment values.

## Cleanup

Stop a browser recording before teardown. Navigate the dedicated verification tab to `about:blank` or close it using the harness's own tab command. T3 refuses `about:blank` and has no tab close command; leave its dedicated tab on the stopped app. Do not close a user tab.

```bash
./.agents/skills/verify/scripts/local.mjs cleanup "$VERIFY_RUN_DIR"
test -f "$VERIFY_RUN_DIR/result.md"
test -f "$VERIFY_RUN_DIR/cleanup.json"
test ! -d "$VERIFY_RUN_DIR/scratch"
```

Require `Cleanup complete` or `Already stopped`. Confirm the app port is free with `lsof -nP -iTCP:3100 -sTCP:LISTEN`. No output is the expected result. Confirm the screenshot, recording, snapshots, and stored-record evidence still exist. The supervisor stops only the child process groups it started and removes only this run's scratch folder and random Postgres database. It never kills by process name. It retains evidence and leaves `.env.local`, the user's database, and the Next cache alone. Never run `reset:dev-data` against the user's database as verification cleanup.

If launch fails before it creates `instance.json`, it started no app process or has already run its failure cleanup. Inspect the error and logs. If the supervisor no longer matches the recorded command, cleanup refuses to signal that PID. Identify the recorded children from their log paths and process ownership before any manual recovery.

## Helpers

The executable [scripts/local.mjs](scripts/local.mjs) supports seven commands, all shown above: `launch`, `doctor`, `seed`, `session`, `inspect`, `logs`, and `cleanup`. Each requires a run directory below `.verification/evidence/`. Evidence directories cannot be reused. `local.mjs --help` lists the commands, and `local.mjs <command> --help` shows one command's arguments and an example; neither needs `DATABASE_URL`. Its process and database operations target only the local verification instance. The executable [scripts/smoke.mjs](scripts/smoke.mjs) runs the browser baseline with the invocation shown in Drive. [scripts/browser.mjs](scripts/browser.mjs) exports `drive`, which `smoke.mjs` and every other Playwright check use. Run the helpers from the repository root.

Use `/maintain-verification-skill` when app changes make these recipes or the feature map stale.

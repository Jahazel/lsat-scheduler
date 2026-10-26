# Stage 5 evidence and Stage 6 handoff

Record for [#255](https://github.com/Jahazel/lsat-scheduler/issues/255), under the Stage 5 spec [#245](https://github.com/Jahazel/lsat-scheduler/issues/245). Started on 2026-10-26 UTC.
This file holds no password, key, connection string, ping URL, cookie, email, or Google ID.
It approves no release, exception, or launch. No launch checklist row passes because of this file.

**Status: waiting for the owner's copy run.** The run sheet below lists the steps. The wizard
[`scripts/issue-255-copy-run-wizard.sh`](../../scripts/issue-255-copy-run-wizard.sh) walks through them in order.
Run it from this checkout on a Mac. Stop with Ctrl-C at any time, and go on later with `--from STAGE_NUMBER`.
Every result reads `Pending` until the owner reports it.

## Words in this file

- **Scan**: one paid Anthropic call that reads one screenshot (an "extraction" in the launch checklist).
- **Place**: a row in `running_scans`. A scan holds a place while it runs. Each student has 1 place, and the site has 5.
- **Month's total**: `total_usd` in `scan_spending` for the current America/Chicago month.
- **Deployment A**: the copy's promoted Production deployment, on the copy's domain.
- **Deployment B**: a second Production deployment of the same commit, not promoted, reached by its own Vercel URL.
  Two deployments are two separate sets of server instances, so a burst split across A and B reaches at least two instances.
- **Burst**: N+5 requests sent at the same time, split between A and B.

## Child ticket results

| Ticket | Result | Evidence |
| --- | --- | --- |
| #246 Scan-limit decisions in the docs | Done 2026-10-24 | PR #266 |
| #247 Page designs | Done 2026-10-24 | PR #259, `docs/design/scan-limits/` |
| #248 Screenshot file and model output checks | Done 2026-10-24 | PR #267 |
| #249 Shared counters for lead capture and snapshot saves | Done 2026-10-24. Migration `0008_action_counters`. | PR #269 |
| #250 Per-student scan limits and one running scan | Done 2026-10-25. Migration `0009_running_scans`. | PR #272 |
| #251 Money limit, emergency switch, and spend alerts | Done 2026-10-25. Migration `0010_scan_spending`. | PR #273 |
| #252 One set of save checks for every snapshot source | Done 2026-10-25. Migration `0011_manual_entry_snapshots`. | PRs #274, #291 |
| #253 Hand-typed analytics in onboarding and the weekly upload | Done 2026-10-26 | PR #296 |
| #254 Scanning off: hand-typed analytics and practice-test skip | Done 2026-10-26 | PR #297 |
| #231 Column grants for the app role (copy part moved here) | Code done 2026-10-25 | PR #276, `sql/app-role-grants.sql` |

## Version for the copy run

| Item | Value |
| --- | --- |
| Commit | `11660b02fef74b3dcaf16aeb10ceffd0c77c1ace` (`main` after PR #297) |
| Owner SQL bundle (fallback only) | `node scripts/sql-editor-migrations.mjs`, 507 lines, SHA-256 `d8b24294…9c22da37` |
| `sql/app-role.sql` | SHA-256 `23374b3d…f39f17c86`. Unchanged role setup. |
| `sql/app-role-grants.sql` | SHA-256 `db022eda…46db7a78b9b3a`. From PR #276. Grants for the four new tables, and column grants on `accounts`. |
| Copy migrations before the run | `0000` to `0007`, 8 journal rows (#220 copy proof, 2026-10-24). The owner confirms in step A4. |
| Migrations the run adds | `0008_action_counters`, `0009_running_scans`, `0010_scan_spending`, `0011_manual_entry_snapshots`. After the run: 12 rows, last journal time `1792454400000`. |
| New environment settings | `SCAN_SPEND_WARNING_PING_URL` and `SCAN_LIMIT_REACHED_PING_URL`, server only, copy Production. New since the Stage 4 build `fcc8277`. |
| Changed for one step only | `ANTHROPIC_BASE_URL`, in step C4-7. It is removed before C5. |

The release migrations workflow applies the migrations and then reapplies `sql/app-role-grants.sql`.
The SQL Editor bundle is the fallback from the [controlled-move runbook](../runbooks/controlled-neon-move.md#apply-the-owner-sql).

## Owner run sheet

Run every step on the **copy** only. The real site and Neon production stay unchanged.
The **test student** is a Google Account that is not an Admin. The **Admin** is the owner's Admin Account on the copy.
In the SQL steps, replace `TEST_EMAIL` and `ADMIN_EMAIL`. Do not paste an email, a cookie, a ping URL, or a result row into chat or the issue.
Report counts, money amounts, HTTP status codes, and what the page showed.

Each SQL step runs in Neon's SQL Editor on the **copy** project, as the Neon owner. The month's total query is:

```sql
SELECT total_usd, warning_sent_at IS NOT NULL AS warned, limit_alert_sent_at IS NOT NULL AS limit_alerted
FROM scan_spending
WHERE month_start = date_trunc('month', now() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago';
```

The wizard sends the scan requests with `curl`, using the session cookie that the owner copies from the browser.
It keeps cookies only in a mode-600 folder outside the repository, and it deletes that folder in the last stage.

### A. Bring the copy to the Stage 5 version

| Step | Action | Expected |
| --- | --- | --- |
| A1 | In this checkout, `git rev-parse origin/main` and the bundle hash. Record the real site's Production deployment ID in Vercel. | The commit above. The hash starts with `d8b24294`. |
| A2 | In Healthchecks.io, create two checks for the copy: "Copy: app spend at 80%" and "Copy: app extraction limit reached". Connect the owner's email. Pause both. Put each ping URL in the copy Vercel project, Production, as a sensitive setting: `SCAN_SPEND_WARNING_PING_URL` and `SCAN_LIMIT_REACHED_PING_URL`. Follow [Spend alerts](../runbooks/emergency.md#spend-alerts). | Both checks show "Paused". Both settings exist on copy Production only. |
| A3 | In the Anthropic Console, open the copy's workspace. In the copy Vercel project, check the settings. | The workspace limit is $5. The copy's `ANTHROPIC_API_KEY` belongs to that workspace. `SCREENSHOT_EXTRACTOR` is not set on copy Production. |
| A4 | GitHub Actions, **Release migrations**, branch `main`, **Stop after the copy** on. | Last line: `Target: copy. Journal rows before: 8. After: 12. New migrations: 4.` The production job is skipped. |
| A5 | SQL: `SELECT count(*), max(created_at) FROM drillmap_migrations.applied;` then `SELECT scanning_off, monthly_limit_usd FROM scan_settings;` | `12`, `1792454400000`. Then `false`, `10.00`. |
| A6 | In the copy Vercel project, deploy the commit to Production and promote it. This is deployment A. | Record its ID. The copy's domain serves it. The real site's deployment did not change. |
| A7 | `npm run db:check-copy`, with the copy's app-login `DATABASE_URL` typed at a hidden prompt for that one command. | Every line starts with `PASS`, including `PASS: Admin role, disabled time, and Google ID changes refused`. |
| A8 | The test student signs up and finishes onboarding with **Type your analytics**. The Admin signs in. Copy each session cookie (`__Secure-authjs.session-token`) from DevTools into the wizard. | Onboarding ends on This week. No scan ran: the month's total is unchanged. |

### C4. Money counted before each scan (part 1)

| Step | Action | Expected |
| --- | --- | --- |
| C4-1 | SQL: the month's total query. | Record the total, or no row. |
| C4-2 | The wizard sends one analytics scan (LR screenshot) as the test student. Then the month's total query. | HTTP 200. The total grew by the real cost, less than $0.02. The Anthropic Console shows one request for this scan, so the SDK made no retry. |
| C4-3 | The wizard sends one practice-test section scan (`pt158-s1.png`) as the test student, then one analytics scan as the Admin. The month's total query after each. | HTTP 200 twice. Each one adds its real cost, less than $0.03 and $0.02. The Admin scan counts. |

### C2. Bursts across two server instances

| Step | Action | Expected |
| --- | --- | --- |
| C2-1 | In the copy Vercel project, redeploy deployment A to Production without promoting it. This is deployment B. Give the wizard its URL. If the URL answers HTTP 401, create a Protection Bypass for Automation secret and give it to the wizard. | Record B's ID. B answers HTTP 200 on `/login`. The copy's domain still serves A. |
| C2-2 | One student, 6 scans at once: 3 to A, 3 to B. Then SQL: `SELECT count(*) FROM running_scans;` | Exactly one scan runs (HTTP 200 or 502). Five get HTTP 429 with "We're still reading your last screenshot." Then `0`. |
| C2-3 | SQL: `INSERT INTO running_scans (subject, started_at) SELECT 'stage5-held-' \|\| g, now() FROM generate_series(1, 4) g;` Within 2 minutes, the test student scans on A and the Admin scans on B at the same time. Then `DELETE FROM running_scans WHERE subject LIKE 'stage5-held-%';` | The 5th place goes to one scan. The other gets HTTP 429 with "Many students are scanning right now." `DELETE 4`. |
| C2-4 | SQL: `INSERT INTO running_scans (subject, started_at) SELECT id::text, now() - interval '100 seconds' FROM accounts WHERE email = 'TEST_EMAIL';` The wizard sends one scan, waits for its `Retry-After`, and sends one more. | The first gets HTTP 429 "still reading", with `Retry-After` of 20 seconds or less. The second runs. A place held by a stopped scan frees after 2 minutes. |
| C2-5 | Lead capture. On A, submit the home page email form with a test address until it shows "Too many tries from this network." On that last try, copy the request as cURL. On B, submit once (it is refused at once) and copy as cURL. SQL: `DELETE FROM action_counters WHERE action = 'leadCapture';` The wizard sends 10 at once: 5 replays to A, 5 to B. | Exactly 5 replies are successes and 5 say "Too many tries from this network." Then SQL `SELECT sum(count) FROM action_counters WHERE action = 'leadCapture';` returns `10`. |
| C2-6 | Snapshot saves, as the Admin. In Test controls, set the date to the coming Saturday so the weekly upload is open. Fill the counter: the SQL in the wizard sets the Admin's `analyticsSnapshotSave` count for today to 5. On A, open the weekly upload, choose **Type your analytics**, approve, and copy the refused request as cURL. Sign in on B by adding the Admin's cookie in DevTools, repeat, and copy as cURL. SQL: `SELECT count(*) FROM analytics_snapshots s JOIN students st ON st.id = s.student_id JOIN accounts a ON a.id = st.account_id WHERE a.email = 'ADMIN_EMAIL';` Then `DELETE FROM action_counters WHERE action = 'analyticsSnapshotSave' AND subject = (SELECT id::text FROM accounts WHERE email = 'ADMIN_EMAIL');` The wizard sends 10 at once: 5 to A, 5 to B. | Both captured tries say "You've saved your analytics 5 times today." After the burst, the snapshot count grew by exactly 5. Five replies carry the refusal text. |

### C4. Money counted before each scan (part 2) and alerts

| Step | Action | Expected |
| --- | --- | --- |
| C4-4 | SQL in the wizard sets the limit to `floor((total + 0.02) / 0.8 × 100) / 100` and shows two checks. The wizard sends one analytics scan. Then the month's total query. | Both checks are `true` (if not, run one more scan in C4-3 first). HTTP 200. `warned` is `true`. The "Copy: app spend at 80%" email arrives. |
| C4-5 | SQL: `UPDATE scan_settings SET monthly_limit_usd = ceil((total) × 100) / 100 + 0.01` (full SQL in the wizard). The total is now more than the limit minus $0.02 and at most the limit minus $0.01. The wizard sends one analytics scan and one practice-test section scan. Then the month's total query. | Both get HTTP 429 with "Scanning is off right now. Enter your analytics by hand." The total did not change. The Anthropic Console shows no new request. `limit_alerted` is `true`. The "Copy: app extraction limit reached" email arrives once. |
| C4-6 | SQL: `UPDATE scan_settings SET monthly_limit_usd = 10;` The wizard sends one analytics scan. | HTTP 200. No release ran: the changed limit worked on the next scan. |
| C4-7 | In the copy Vercel project, set `ANTHROPIC_BASE_URL` on Production to `https://10.255.255.1` (an address that never answers). Redeploy A and promote. The wizard sends one analytics scan and times it. While it waits, run the month's total query and `SELECT count(*) FROM running_scans;`. After the reply, run the total query again. Then delete `ANTHROPIC_BASE_URL`, redeploy, and promote. | During the wait, the total already holds $0.02 more and one place is held: the count comes before the call. HTTP 504 "Reading took too long and stopped. Try again." after 30 to 32 seconds: one attempt, no retry. Afterwards the total still holds the $0.02: a timeout keeps the count. The Anthropic Console shows no request. |

### C5. Emergency switch

| Step | Action | Expected |
| --- | --- | --- |
| C5-1 | SQL: `UPDATE scan_settings SET scanning_off = true;` The wizard sends one analytics scan. Then the month's total query. | HTTP 429 with "Scanning is off right now. Enter your analytics by hand." The total did not change. The Anthropic Console shows no new request. |
| C5-2 | As the Admin (date still on Saturday), open the weekly upload. | The upload area shows "Scanning is off right now. Enter your analytics by hand." and the hand-typed form is open. |
| C5-3 | C2-6 used the Admin's 5 saves for today, so first run `DELETE FROM action_counters WHERE action = 'analyticsSnapshotSave' AND subject = (SELECT id::text FROM accounts WHERE email = 'ADMIN_EMAIL');` Type analytics, confirm "these are my latest analytics", and approve. SQL: `SELECT extraction_source FROM analytics_snapshots s JOIN students st ON st.id = s.student_id JOIN accounts a ON a.id = st.account_id WHERE a.email = 'ADMIN_EMAIL' ORDER BY s.approved_at DESC LIMIT 1;` | The upload saves and This week opens. `manual_entry`. |
| C5-4 | Open This week and Progress. | Both pages load with the Admin's data. |
| C5-5 | If This week shows a practice test in the coming week, set the date to the Saturday after it, open the weekly upload, and approve without the practice-test result. If no practice test appears within 4 weeks, record `Not run`. | The note says the practice test is skipped this week. The upload saves. The next weekly schedule has no "missed type goes first" for that week. |
| C5-6 | SQL: `UPDATE scan_settings SET scanning_off = false;` | `UPDATE 1`. |

### Z. Clean up

| Step | Action | Expected |
| --- | --- | --- |
| Z1 | SQL: `SELECT scanning_off, monthly_limit_usd FROM scan_settings;` and `DELETE FROM leads WHERE email = 'LEAD_TEST_EMAIL';` | `false`, `10.00`. `DELETE 1`. |
| Z2 | Pause both Healthchecks.io checks again. Delete the Protection Bypass secret if one was made. Delete deployment B. Clear the Admin's test date in Test controls. | Both checks show "Paused". |
| Z3 | Press "Sign out of all devices" for the test student and the Admin on the copy. | The copied cookies stop working. |
| Z4 | Record the real site's Production deployment ID again. | Same as in A1. |

## Results

| Step | Copy deployment | Result | Notes |
| --- | --- | --- | --- |
| A1 to A8 | Pending | Pending | |
| C4-1 to C4-3 | Pending | Pending | |
| C2-1 to C2-6 | Pending | Pending | |
| C4-4 to C4-7 | Pending | Pending | |
| C5-1 to C5-6 | Pending | Pending | |
| Alert emails (80% and limit reached) | Pending | Pending | |
| Z1 to Z4 | Pending | Pending | |

## What the copy run cannot prove

- **Daily and monthly scan counts under a burst (C2, C3).** One student holds only 1 place, so a burst from one student lets 1 scan through before any counter matters. The Postgres tests send N+5 counts at the same time. The 11th and 41st scans (C3) are covered by the Postgres tests.
- **Six real students at once (C2).** The run has two signed-in Accounts. Four held places come from owner SQL. The Postgres tests cover 5 places for the site with real concurrency.
- **A slow Anthropic reply (C4).** Anthropic cannot be made to answer after 30 seconds. Step C4-7 uses an address that never answers, with the real SDK and the deployed build. It is not a paid call.
- **The month's total going back to $0 (C4).** The month changes at midnight on 2026-11-01, America/Chicago. The Postgres tests cover it. The owner can run the month's total query after that time; a November row starts from the next scan only.
- **Password signup, login, and reset limits (C1).** They wait for [#230](https://github.com/Jahazel/lsat-scheduler/issues/230).

## Launch checklist effect

Every launch checklist row stays `Not tested`. Stage 5 adds evidence only.

## Stage 6 handoff

Written after the copy run.

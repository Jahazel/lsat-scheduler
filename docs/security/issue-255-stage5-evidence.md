# Stage 5 evidence and Stage 6 handoff

Record for [#255](https://github.com/Jahazel/lsat-scheduler/issues/255), under the Stage 5 spec [#245](https://github.com/Jahazel/lsat-scheduler/issues/245). Started on 2026-10-26 UTC.
This file holds no password, key, connection string, ping URL, cookie, email, or Google ID.
It approves no release, exception, or launch. No launch checklist row passes because of this file.

**Status: copy run done on 2026-10-26. Every step that ran passed, except the LR scan reads (see Findings).** The owner ran the steps with a wizard
and reported each result. The agent recorded them below. Two steps did not run: C2-5 and C5-5. The wizard was removed after the run;
its last version is `scripts/issue-255-copy-run-wizard.sh` at commit `49fddde`.

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

The owner ran every step on 2026-10-26 between about 14:30 and 17:20 US Central time. Each result is the owner's observation,
or the HTTP reply that the wizard recorded. The agent saw pages, SQL results, the Anthropic Console, and the alert emails
only in the owner's screenshots.

| Step | Copy deployment | Result | Notes |
| --- | --- | --- | --- |
| A1 | n/a | Pass | `origin/main` at `11660b0`. The bundle hash starts with `d8b24294`. Real site Production: `dpl_CAAk52hEdgNHEhxu2waHEQPUNMnp`. |
| A2, A3 | n/a | Pass | Both checks paused, email on, both ping settings on copy Production only. Workspace `drillmap-copy`, $5 limit, key `drillmap-copy-vercel` in it. `SCREENSHOT_EXTRACTOR` not set. |
| A4, A5 | n/a | Pass | Run `40391366888`: `Target: copy. Journal rows before: 12. After: 12. New migrations: 0.` The production job was skipped. An earlier start of the workflow had applied `0008` to `0011`. A5: `12`, `1792454400000`, then `false`, `10.00`. |
| A6 | `dpl_564BVWxobwcr8hugH4Gf7Ce46a1p` | Pass | Built after the new settings were added, then promoted. `/login` answered HTTP 200. |
| A7 | same | Pass | All 8 lines start with `PASS`, including `PASS: Admin role, disabled time, and Google ID changes refused`. See Findings for the connection string. |
| A8 | same | Pass | Onboarding with **Type your analytics** ended on This week. |
| C4-1 to C4-3 | same | Pass, with 502 reads | The month's total started at $0.02 (a scan on the fake extractor before the run). LR scans: HTTP 502 (see Findings). Each one still replaced the $0.02 hold with its real cost, $0.004514. The Console showed 1 request, 2,774 in and 348 out, which is exactly $0.004514: no retry. Practice-test section: HTTP 200, +$0.003266. The Admin scan counted. |
| C2-1 | `dpl_B95StitUtuuBWeHAUTEkMxFyFRLD` (B) | Pass | B was behind Vercel Deployment Protection. The wizard used a Protection Bypass for Automation secret. `/login` answered HTTP 200. |
| C2-2 | A and B | Pass | 6 at once, 3 to A and 3 to B: 1 ran, 5 got HTTP 429 `still-reading`, 3 of them from B. Places after: `0`. |
| C2-3 | A and B | Pass | With 4 held places, the student on A took the 5th. The Admin on B got HTTP 429 `site-busy`. |
| C2-4 | A | Pass | First: HTTP 429 `still-reading`, `Retry-After` 57. Second, after the wait: it ran. |
| C2-5 | n/a | Not run | The home page has no email form. See Findings. The form and its limit were removed on #303, so this step no longer applies. |
| C2-6 | A and B | Pass | Both captured tries were refused with the 5-a-day text. 10 at once, 5 to A and 5 to B: 5 carried the refusal, and the snapshot count went from 1 to 6. |
| C4-4 | A | Pass | Limit $0.11. `warned` became `true`, and the "Copy: app spend at 80%" email arrived in about 1 minute. |
| C4-5 | A | Pass | Limit $0.09, total $0.078604. Both scans got HTTP 429 `scanning-off` with the expected text. The total did not change. No new Console request. `limit_alerted` became `true`. The limit email arrived once. |
| C4-6 | A | Pass | Limit back to $10. The next scan was allowed (HTTP 502 read, +$0.0051). |
| C4-7 | `dpl_avN9rocpSwshS8YxpfTMXuKCR8FA`, then `dpl_6a9UTbg9do2jXCYLHtnBGkHou2cg` | Pass, with a shorter wait | HTTP 504 "Reading took too long and stopped. Try again." after 12.6 seconds, not 30. The $0.02 hold stayed: $0.083703 to $0.103703. No Console request. See Findings. `ANTHROPIC_BASE_URL` was removed and the restored deployment promoted. |
| C5-1 | `dpl_6a9UTbg9do2jXCYLHtnBGkHou2cg` | Pass | HTTP 429 `scanning-off`. The total stayed $0.103703. No new Console request. |
| C5-2 to C5-4 | same | Pass | The weekly upload showed the scanning-off text with **Type them** open and Screenshots off. The save worked: `manual_entry`, snapshots 6 to 7. This week loaded. Progress loaded with its empty state, because no week had finished. |
| C5-5 | same | Not run | See Findings. |
| C5-6 | same | Pass | Scanning back on. |
| Alert emails | n/a | Pass | "DOWN \| Copy: app spend at 80%" and "DOWN \| Copy: app extraction limit reached", once each. |
| Z1 to Z4 | n/a | Pass | `false`, `10.00`. Checks paused, bypass secret deleted, B deleted, test date reset, both Accounts signed out everywhere. Real site Production still `dpl_CAAk52hEdgNHEhxu2waHEQPUNMnp`. |

### What differed from the run sheet

- **Row counts.** The Neon SQL editor reports success, not a row count. Each count above comes from a `SELECT` that followed.
- **C2-4 timing.** The first try started the held place 100 seconds back, and it freed before the owner pressed Enter. The redo started it 60 seconds back.
  The redo also cleared the test student's `scanInDay` count, because the earlier scans had used 8 of the 10.
- **C2-6 and C5-3 dates.** The Admin's date moved to 2026-10-31, then 2026-11-07, 2026-11-14, and 2026-11-21. Each weekly upload needs a Saturday in a week with a weekly schedule.
- **C2-6 on B.** B's build has its own server action ID. The agent built B's request from A's request, with B's host, B's action ID, and the bypass header, and checked that B refused it once.
- **Wizard faults.** The wizard stopped or misread a step five times: a variable name in stage 4, B's address in stage 10, the C2-4 timing, a skipped lead step in cleanup, and two SQL steps that shared the clipboard in C5-3. Each fault was fixed and the step redone. The commits are on this branch.

### Findings

- **LR scans fail on 7Sage's "HIGH" tier (launch blocker).** The owner's 7Sage LR page shows a "HIGH" tier, for example on Conditional reasoning.
  DrillMap knows only Highest, Medium, and Low (`PriorityTier`). Every LR scan of that screenshot got HTTP 502 "Couldn't read that screenshot",
  after a paid call that Anthropic answered with status OK. The likely cause: the model reported `HIGH`, and the reply check refused it.
  The app does not log the model's reply, so this is not confirmed. A student whose page shows a HIGH row cannot scan LR analytics.
- **No lead form on any page.** `EmailCaptureForm` and `captureLead` are imported by no page since commit `96ca5d2`. The leadCapture limit has no request
  on the deployed site. Only the Postgres tests cover it. Either remove the form code and the limit, or put the form back and run C2-5.
  Resolved on #303: the owner chose removal (2026-10-27).
- **`db:check-copy` needs `sslmode=verify-full`.** Neon's connection string ends with `sslmode=require`. The check refuses it with
  "Remote Postgres requires sslmode=verify-full.", which `check-neon` reports only as "Database foundation check failed." That was the A7 failure before this run.
- **The 504 came from the connect timeout.** Node's fetch gives up on a TCP connect after 10 seconds. The SDK reads that as a timeout. So C4-7 proves the
  timeout path, the kept hold, and no retry, but not the 30-second limit for a slow reply.
- **The 80% warning counts the hold.** The warning fires when the total plus the $0.02 hold reaches 80%. After the real cost replaces the hold, the total can sit
  below 80% with `warned` already `true`. In C4-4 it ended at 71%. This errs early, which is the safe side.
- **Saturday-start schedules skip the week's practice test.** A weekly upload on a Saturday, in a week with no weekly schedule, plans the current week from Saturday.
  Monday to Friday read "Not scheduled", so the Wednesday practice test was never on a plan, and the next upload asked for no practice test.
  C5-5 could not run within four date moves. The `WeeklyCheck` test "with scanning off, opens Type them, skips the practice test, and confirms without it" covers it.
- **Spend.** The copy's month's total ended at $0.103703. It includes the $0.02 fake-extractor hold and the $0.02 timeout hold.

## What the copy run cannot prove

- **Daily and monthly scan counts under a burst (C2, C3).** One student holds only 1 place, so a burst from one student lets 1 scan through before any counter matters. The Postgres tests send N+5 counts at the same time. The 11th and 41st scans (C3) are covered by the Postgres tests.
- **Six real students at once (C2).** The run has two signed-in Accounts. Four held places come from owner SQL. The Postgres tests cover 5 places for the site with real concurrency.
- **A slow Anthropic reply (C4).** Anthropic cannot be made to answer after 30 seconds. Step C4-7 uses an address that never answers, with the real SDK and the deployed build. It is not a paid call.
- **The month's total going back to $0 (C4).** The month changes at midnight on 2026-11-01, America/Chicago. The Postgres tests cover it. The owner can run the month's total query after that time; a November row starts from the next scan only.
- **Password signup, login, and reset limits (C1).** They wait for [#230](https://github.com/Jahazel/lsat-scheduler/issues/230).

## Launch checklist effect

Every launch checklist row stays `Not tested`. Stage 5 adds evidence only.

## Stage 6 handoff

Stage 5 is proven on the copy, with real Anthropic calls and two server instances. Stage 6 builds on it. Do not rebuild these.

**Proven on the copy (Stage 5).**

- One student runs 1 scan at a time, and the site runs 5. Both limits hold across two deployments.
- The 5-a-day Analytics snapshot save limit holds across two deployments: exactly 5 of 10 saved.
- Each scan holds $0.02 before the call. The real cost replaces it, and it matches the Anthropic Console. A timeout keeps the hold. No call is retried.
- At the money limit, and with the emergency switch on, scans get HTTP 429 with no Anthropic call. A changed limit works on the next scan, with no release.
- The 80% and limit-reached alerts reach the owner's email once each, about 1 minute later.
- With scanning off, hand-typed analytics save as `manual_entry`, and This week and Progress load.
- The copy role cannot change `role`, the disabled time, or the Google ID, and cannot write the migration journal.

**Stage 6 work.** Stage 6 is browser, data, and operations ([#79](https://github.com/Jahazel/lsat-scheduler/issues/79)):

- Request origin checks, security headers, and no caching of private pages.
- All-or-nothing Account deletion and onboarding. Deletion replay after each backup restore.
- Data retention, safe error messages, security logs, and accurate privacy and AI pages with a working privacy contact.

**Carried forward.**

- **7Sage "HIGH" tier.** LR scans fail when the page shows HIGH. This blocks launch. It needs its own ticket.
- **Lead form code.** Removed on #303. The `leads` table stays, unused.
- **Model reply logging (Stage 6 security logs).** A refused model reply leaves no trace. Log its shape, never the screenshot's values.
- **`db:check-copy` error text.** Show the `sslmode=verify-full` reason, which holds no secret, and say so in the release steps.
- **30-second slow-reply limit.** Not proven on the copy. Only the unit tests cover it.
- **Cancel shows as `Configuration`.** Carried from Stage 4: the sign-in event logs must not count a Google cancel as a setup fault.
- **The real site is not on Stage 5.** It gets `0008` to `0011`, the grants, the two ping settings, and the Stage 5 build only through a release that the owner approves in writing.
- **Password sign-in** waits for a domain ([#230](https://github.com/Jahazel/lsat-scheduler/issues/230)). **Admin 2** is not on the real site yet ([#216](https://github.com/Jahazel/lsat-scheduler/issues/216)).
- **No promotion.** The no-promotion rule stays until launch approval.

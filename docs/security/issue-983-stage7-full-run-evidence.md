# Stage 7 full run, live checks, and readiness record

Record for [#983](https://github.com/Jahazel/lsat-scheduler/issues/983), under the Stage 7 spec [#978](https://github.com/Jahazel/lsat-scheduler/issues/978).
The owner fills it in [#988](https://github.com/Jahazel/lsat-scheduler/issues/988) (the full run on the copy),
[#989](https://github.com/Jahazel/lsat-scheduler/issues/989) (the release and the live checks), [#987](https://github.com/Jahazel/lsat-scheduler/issues/987)
and [#980](https://github.com/Jahazel/lsat-scheduler/issues/980) (the settings record), and [#990](https://github.com/Jahazel/lsat-scheduler/issues/990) (the readiness record).
This file holds no password, key, connection string, cookie, email, Account ID, or Google ID.
It approves no release, exception, or launch. No launch checklist row passes because of this file.

**Status: not run.** The owner runs `scripts/issue-983-checklist-wizard.sh` on the release candidate after the drills
([#984](https://github.com/Jahazel/lsat-scheduler/issues/984), [#985](https://github.com/Jahazel/lsat-scheduler/issues/985),
[#986](https://github.com/Jahazel/lsat-scheduler/issues/986)), the settings record (#987), the package checks (#980), and
[#695](https://github.com/Jahazel/lsat-scheduler/issues/695) are done.

## Words in this file

- **Copy**: the copy of the site, with its own Vercel project, Neon project, Stripe sandbox, and Anthropic workspace.
- **Real site**: `drillmap.xyz`, with Neon production and live Stripe.
- **Release candidate**: the one commit that every check runs on. The owner picks it in #984.
- **Docs-only commit**: a commit after the candidate that changes only files under `docs/`. It may be released with the
  candidate. The readiness record lists it. Any other commit makes a new candidate.
- **Checks run**: the GitHub **Checks** workflow run on the candidate's push. It runs lint, the type check, the unit
  tests, the real Postgres tests, `npm audit --omit=dev`, and gitleaks. It is the evidence for every Auto row.
- **Drill**: the Stage 7 drills in [`issue-982-stage7-drill-evidence.md`](issue-982-stage7-drill-evidence.md). A drill result counts only if it ran on the candidate.
- **Students**: password test Accounts at plus addresses of the owner's inbox. A and B are on the copy. RA and RB are on the real site.
  A **Google test user** is a Google Account that is not an Admin and has never signed in to the copy.

## How to run it

```sh
bash scripts/issue-983-checklist-wizard.sh             # the whole run
bash scripts/issue-983-checklist-wizard.sh --from 3    # resume at stage 3
bash scripts/issue-983-checklist-wizard.sh --from 2.25 # resume at step 2.25
bash scripts/issue-983-checklist-wizard.sh --dry-run   # print every step; call no provider
```

`scripts/issue-983-checklist-wizard.test.mjs` checks the wizard with `bash -n`, with `shellcheck -x --severity=warning`
when shellcheck is installed, and with a dry run whose provider commands fail if called. It also checks that the
[row map](#row-map) names every launch checklist row exactly once, and that a stage 2 step exists for exactly the rows
whose Kind includes Auto, Copy, or Settings.

The wizard reads stage 2 from the [run sheet](#owner-run-sheet) below and each row's text from the
[launch checklist](release-gate.md#the-checks), so the three cannot drift apart. It shares its helpers with the drill
wizard (`scripts/stage7-wizard-lib.sh`). It sends the site's `Origin` header on every page request, keeps cookies, emails,
and test passwords in `~/.drillmap-issue-983-run` (mode 700), and prints no secret. A result prompt refuses an answer
with an `@`, a key prefix, or a link. Step 5.3 copies the results to `~/drillmap-issue-983-results.md` and deletes the folder.

A failed row stops the run. The wizard asks for the failure's ticket number, records the row as failed, and exits.
Resume at that step after the fix. If the fix changes anything outside `docs/`, it makes a new candidate, and the run
starts again at step 1.1.

## What the wizard may touch

- **The copy**: its pages, its Neon project in the SQL Editor, its Stripe sandbox, and its Vercel project.
- **GitHub, read only**: the issue states in step 1.1, the candidate's runs in step 1.2. Step 3.3 starts one
  **Release migrations** run; its production job waits for the owner's approval.
- **The real site, after the owner's approval in step 3.1**: the release (stage 3), the read-only grant check (step 3.4),
  pages and headers with the test students RA and RB and the Admin, one scanning switch on and off (step 4.7), the price
  check with the restricted read-only price key (step 4.8), and the cleanup of the test Accounts and their subscriptions (step 4.10).
- No step touches a real student's data. The SQL on production selects or deletes only rows of this run's test addresses,
  or flips the scanning switch for a few minutes.

## Version

| Item | Value |
| --- | --- |
| Release candidate | |
| Checks run and Release migrations run on the candidate | |
| Copy deployment | |
| Real site Production before and after | |
| Docs-only commits after the candidate | |
| Run dates | |

## Row map

One line for each launch checklist row. The steps are in the [owner run sheet](#owner-run-sheet). C5 and J8 have a copy
step and a real-site step; the row passes only when both pass.

| Row | Kind | Steps |
| --- | --- | --- |
| A1 | Auto, Copy | 2.1 |
| A2 | Auto | 2.2 |
| A3 | Auto, Copy | 2.3 |
| A4 | Auto | 2.4 |
| A5 | Real | 4.5 |
| B1 | Auto, Copy | 2.5 |
| B2 | Auto, Copy | 2.6 |
| B3 | Copy | 2.7 |
| B4 | Auto, Copy | 2.8 |
| B5 | Auto | 2.9 |
| B6 | Auto | 2.10 |
| B7 | Copy | 2.11 |
| B8 | Copy | 2.12 |
| B9 | Copy, Settings | 2.13 |
| B10 | Auto, Copy | 2.14 |
| C1 | Auto, Copy | 2.15 |
| C2 | Copy | 2.16 |
| C3 | Auto, Copy | 2.17 |
| C4 | Copy (real calls, $5 workspace) | 2.18 |
| C5 | Copy, Real | 2.19, 4.7 |
| C6 | Auto, Copy | 2.20 |
| D1 | Auto | 2.21 |
| D2 | Auto | 2.22 |
| D3 | Auto | 2.23 |
| D4 | Auto | 2.24 |
| E1 | Copy | 2.25 |
| E2 | Real | 4.2 |
| E3 | Real | 4.3 |
| E4 | Real | 4.4 |
| F1 | Copy | 2.26 |
| F2 | Copy | 2.27 |
| F3 | Settings | 2.28 |
| F4 | Copy | 2.29 |
| F5 | Auto, Copy | 2.30 |
| F6 | Copy | 2.31 |
| G1 | Auto, Settings | 2.32 |
| G2 | Auto, Settings | 2.33 |
| G3 | Settings | 2.34 |
| H1 | Settings | 2.35 |
| H2 | Copy, Settings | 2.36 |
| H3 | Settings | 2.37 |
| H4 | Auto, Settings | 2.38 |
| H5 | Copy, Settings | 2.39 |
| H6 | Settings | 2.40 |
| H7 | Auto, Copy, Settings | 2.41 |
| I1 | Settings | 2.42 |
| I2 | Copy | 2.43 |
| I3 | Settings | 2.44 |
| I4 | Copy | 2.45 |
| J1 | Auto, Copy | 2.46 |
| J2 | Auto, Copy | 2.47 |
| J3 | Auto, Copy | 2.48 |
| J4 | Auto, Copy | 2.49 |
| J5 | Auto, Copy | 2.50 |
| J6 | Auto | 2.51 |
| J7 | Settings, Copy | 2.52 |
| J8 | Auto, Settings | 2.53, 4.8 |
| J9 | Auto, Copy | 2.54 |
| J10 | Auto, Copy | 2.55 |
| J11 | Auto, Copy | 2.56 |
| J12 | Copy | 2.57 |
| J13 | Copy | 2.58 |
| J14 | Copy | 2.59 |
| J15 | Settings | 2.60 |
| J16 | Real | 4.6 |

## Owner run sheet

Stage 2 has one step for each row whose Kind includes Auto, Copy, or Settings. Each step names its evidence: the Checks
run for Auto, a procedure on the copy for Copy, and the dated [settings record](#settings-record) for Settings. A Copy
result from another version does not count; it runs again on the candidate. A Settings record from any version counts.

| Step | Check | Action | Expected |
| --- | --- | --- | --- |
| 1.1 | Candidate | Record the candidate. The wizard checks that it is on `main`, lists the commits after it, and reads the state of #695, #972, #980, #984, #985, #986, and #987. | The candidate is on `main`. Every commit after it is docs-only. Every listed issue is closed. |
| 1.2 | Auto, H7 | The wizard finds the candidate's Checks run and Release migrations run. | Both succeeded on the candidate's push. The copy job says `Target: copy.` |
| 1.3 | Version | A and B sign up with a password on the copy at this run's addresses and verify. The Admin signs in with Google. Record the copy's Production deployment, its commit, and the real site's Production deployment. | The copy serves the candidate. A and B reach onboarding. |
| 2.1 | A1 | Auto: the Checks run (1.2). Copy: with the verify skill, A opens B's Student page, weekly schedule, and check-in by ID, and sends a check-off with B's check-in ID. Then the same with no session. SQL fingerprints B's records before and after. | Checks passed. Every foreign address answers not found or a refusal and shows none of B's data. B's fingerprint is unchanged. |
| 2.2 | A2 | Auto: the Checks run (1.2). | Checks passed. |
| 2.3 | A3 | Auto: the Checks run (1.2). Copy: the Admin opens A's weekly schedule. SQL counts A's weekly schedules before and after. | Checks passed. The Admin sees the schedule. The count is the same. |
| 2.4 | A4 | Auto: the Checks run (1.2). | Checks passed. |
| 2.5 | B1 | Auto: the Checks run (1.2). Copy: the [Stage 4 run sheet](issue-229-stage4-evidence.md#owner-run-sheet) steps B1-1 to B1-5, with a Google test user. | Checks passed. The other browser goes to Login each time. The disabled Account cannot sign in. Nothing is recreated. |
| 2.6 | B2 | Auto: the Checks run (1.2). Copy: Stage 4 run sheet steps B2-1 to B2-3, with the Google test user. | Checks passed. A new Google ID with a known email is refused. The known Google ID opens its Account after the email change, and the DrillMap email stays. |
| 2.7 | B3 | Copy: the [issue 289 run sheet](issue-289-copy-run-evidence.md#owner-run-sheet) steps 5 and 6. | The same "Check your email" screen in all four cases. The pending signup cannot sign in. The older link stops working. An 8-day-old pending signup is gone after the daily job. |
| 2.8 | B4 | Auto: the Checks run (1.2). Copy: Stage 4 run sheet steps B4-1 to B4-3, with the Google test user. | Checks passed. The Google sign-in is refused and starts no session. No Account has both a password and a Google ID. |
| 2.9 | B5 | Auto: the Checks run (1.2). | Checks passed. |
| 2.10 | B6 | Auto: the Checks run (1.2). | Checks passed. |
| 2.11 | B7 | Copy: issue 289 run sheet steps 9 and 10. | The same reset screen for all three emails. A link works once, expires after 30 minutes, and stops after a newer one. The database holds only hashes. A reset signs out the other browser. Login gives one message, at similar times. |
| 2.12 | B8 | Copy: make a Neon branch of the copy from before the candidate's copy migration, add synthetic Accounts shaped like the real data, and run the candidate's bundle on it as in the [manual fallback](../runbooks/release-migrations.md#manual-fallback). Compare each Account's role, verified email, and `session_version` before and after. Delete the branch. | No role changes. No email becomes verified. Every `session_version` is raised, so every older session is refused. The branch is deleted. |
| 2.13 | B9 | Copy: Stage 4 run sheet steps B9-1 and B9-2. Settings: the dated row in [Settings record](#settings-record). | Login shows only "Continue with Google" for an Admin, and `0` Admins with a password. Both Admins' 2-Step Verification is dated. |
| 2.14 | B10 | Auto: the Checks run (1.2). Copy: issue 289 run sheet step 11, and Stage 4 run sheet steps B10-1 to B10-3. | Checks passed. A stale sign-in cannot delete or change the password. A new sign-in can. |
| 2.15 | C1 | Auto: the Checks run (1.2). Copy: issue 289 run sheet steps 13 and 14. | Checks passed. Each limit refuses request N+1 before any hash work, email, or write. Form actions show the message on the form. |
| 2.16 | C2 | Copy: the [Stage 5 run sheet](issue-255-stage5-evidence.md#c2-bursts-across-two-server-instances) bursts. | Exactly N succeed for each limit. The second scan at once and the 6th on the site are refused. A stopped scan's place is free after 2 minutes. |
| 2.17 | C3 | Auto: the Checks run (1.2). Copy: SQL sets A's scan count to 10 today, then 40 this month. A scans each time. | Checks passed. Both scans are refused with no Anthropic request in the copy workspace. |
| 2.18 | C4 | Copy, real calls in the $5 workspace: the Stage 5 run sheet C4 parts 1 and 2. | $0.02 and $0.03 counted before each call, then the real cost. At the limit minus $0.01 the next scan is refused. One 80% warning this month. |
| 2.19 | C5 | Copy: the Stage 5 run sheet C5 steps, and the drill's [step 2.2](issue-982-stage7-drill-evidence.md#owner-run-sheet) if it ran on the candidate. The real-site part is step 4.7. | No Anthropic call with the switch on. The student sees the scanning-off text. Hand entry, This week, and Progress work. The next weekly schedule has no "missed type goes first". |
| 2.20 | C6 | Auto: the Checks run (1.2). Copy: A types analytics by hand with scanning on, off, and at its limit, and approves them. | Checks passed. A weekly schedule each time. SQL shows source `manual_entry`. |
| 2.21 | D1 | Auto: the Checks run (1.2). | Checks passed. |
| 2.22 | D2 | Auto: the Checks run (1.2). | Checks passed. |
| 2.23 | D3 | Auto: the Checks run (1.2). | Checks passed. |
| 2.24 | D4 | Auto: the Checks run (1.2). | Checks passed. |
| 2.25 | E1 | Copy: the [Stage 6 run sheet](issue-360-stage6-evidence.md#owner-run-sheet) step 7, on the candidate. | 403, 403, 415 for the Server Action, and 403, 403, 415, 415 for the routes. No write. Each refusal is in the security log. The same-site request saves. |
| 2.26 | F1 | Copy: Stage 6 run sheet step 13. | "Your Account is being deleted." The saved session goes to Login. After the daily job, no record is left, and one deletion list row. |
| 2.27 | F2 | Copy: Stage 6 run sheet step 8. | One Student and one set of its records. No error page. |
| 2.28 | F3 | Copy: Stage 6 run sheet steps 14 and 15. Settings: the dated row in Settings record. | The 91-day and 31-day rows are gone. Both pages match the approved text and the release-day facts. The upload screen shows the notice. |
| 2.29 | F4 | Copy: the drill's steps 3.3, 3.6, and 3.10 on the candidate ([#985](https://github.com/Jahazel/lsat-scheduler/issues/985)). | The deleted Accounts stay deleted after the replay, one by email hash only. No backup older than 30 days. |
| 2.30 | F5 | Auto: the Checks run (1.2). Copy: Stage 6 run sheet steps 9 and 18. | Checks passed. Each failure shows "Something went wrong. Try again." with a code, and one log row with the same code. No private data in the logs. |
| 2.31 | F6 | Copy: Stage 6 run sheet steps 14 and 18. | Each event has one entry with the time, event, result, Account ID or email hash, IP address, and route. 90-day rows are gone. |
| 2.32 | G1 | Auto: the Checks run (1.2). Settings: the dated row in Settings record ([#980](https://github.com/Jahazel/lsat-scheduler/issues/980)). | Checks passed. Each open advisory is fixed or has a current note in `docs/security/advisory-notes.md`. |
| 2.33 | G2 | Auto: the Checks run (1.2). Settings: the dated row in Settings record (#980). | The secret scan job passed. Dependabot alerts and security updates are on. The full-history scan is recorded. |
| 2.34 | G3 | Settings: the dated row in Settings record (#980). | A dated run link shows the checks ran after a push. |
| 2.35 | H1 | Settings: the dated row in Settings record ([#987](https://github.com/Jahazel/lsat-scheduler/issues/987)). | Every provider and login method has a passkey or authenticator app, no text-message codes, and recovery codes. |
| 2.36 | H2 | Copy: `npm run db:check-copy` with the copy's app login at a hidden prompt. Settings: the dated row in Settings record (#987). | Every line starts with `PASS`. The real site's role record is dated. |
| 2.37 | H3 | Settings: the dated row in Settings record (#987). | Each password is at least 32 characters, and each connection uses `verify-full`. |
| 2.38 | H4 | Auto: the Checks run (1.2). Settings: the dated row in Settings record (#987). | Checks passed. The hash comparison shows no shared value except the allowed sandbox key. |
| 2.39 | H5 | Copy: the drill's stage 1 on the candidate ([#984](https://github.com/Jahazel/lsat-scheduler/issues/984)). Settings: the dated row in Settings record. | Every old credential refused, the site works with the new ones, and the date is recorded. |
| 2.40 | H6 | Settings: the dated row in Settings record (#987). | The production Google client is In production with only `openid email profile`, and the copy has its own client. |
| 2.41 | H7 | Auto: the Checks run (1.2). Copy: the candidate's Release migrations copy job (1.2). Settings: the dated row in Settings record (#987). | Checks passed. The copy job succeeded. Both migration roles and both environments are recorded. |
| 2.42 | I1 | Settings: the dated row in Settings record (#987), and the drill's steps 4.6 and 4.7 ([#986](https://github.com/Jahazel/lsat-scheduler/issues/986)). | A daily schedule, a snapshot under 24 hours old, a history window of at least 1 day, retention of 30 days or less. The stale and 30-day alerts are proven. |
| 2.43 | I2 | Copy: the drill's steps 3.2 to 3.10 on the candidate (#985). | Every table count matches. The restore took under 48 hours. The branch is deleted. |
| 2.44 | I3 | Settings: the drill's stage 4 (#986), with the date each alert arrived. | Six alerts, each with the date it reached the owner. |
| 2.45 | I4 | Copy: the drill's stage 2 on the candidate (#984). | Each emergency step was tried once and worked as the guide says. |
| 2.46 | J1 | Auto: the Checks run (1.2). Copy: the five bad messages of the [payments run](issue-695-payments-evidence.md#owner-run-results) to the copy's receiver, and the security log count. | Checks passed. Each gets 400 and changes no billing record. Exactly 5 `badSignature` rows. |
| 2.47 | J2 | Auto: the Checks run (1.2). Copy: after this stage's payment walks, search every table and the Vercel logs for the test card number, the Stripe key and message secret prefixes, and `stripe-signature`. | Checks passed. No match. |
| 2.48 | J3 | Auto: the Checks run (1.2). Copy: a student opens the Checkout return address with a made-up session ID and with another student's session ID. | Checks passed. No plan changes. |
| 2.49 | J4 | Auto: the Checks run (1.2). Copy: resend one `checkout.session.completed` message twice with the Stripe CLI and fingerprint the billing record. | Checks passed. The fingerprint is the same. |
| 2.50 | J5 | Auto: the Checks run (1.2). Copy: a student double-clicks "Add card on Stripe" and pays with test card 4242. | Checks passed. One customer and one subscription in Stripe. |
| 2.51 | J6 | Auto: the Checks run (1.2). | Checks passed. |
| 2.52 | J7 | Copy: the drill's steps 1.7 and 1.8 (#984). Settings: the dated row in Settings record (#987). | Both old Stripe values refused. Each site uses only its own mode and price IDs. |
| 2.53 | J8 | Auto: the Checks run (1.2). Settings: `npm run check-stripe-prices` with the copy's sandbox settings here; the real site's run is step 4.8. | Checks passed. `{"ok":true,"status":"match","mode":"test"}`. |
| 2.54 | J9 | Auto: the Checks run (1.2). Copy: the test-clock walk of [#695](https://github.com/Jahazel/lsat-scheduler/issues/695), only if it ran on the candidate; otherwise again with a new test clock. | Checks passed. The held schedule stays hidden until the first charge, then shows. |
| 2.55 | J10 | Auto: the Checks run (1.2). Copy: a student with no plan opens the weekly upload; a lapsed student opens This week. | Checks passed. Back to onboarding, and the lapsed state. |
| 2.56 | J11 | Auto: the Checks run (1.2). Copy: the drill's steps 1.11 and 3.9 (#984, #985), and a new email that gets a free week. | Checks passed. A used email gets no free week after the rotation and the restore. A new email does. |
| 2.57 | J12 | Copy: a test Account with a plan deletes itself. A test clock moves past the next charge. | The subscription is cancelled first, and no later charge. |
| 2.58 | J13 | Copy: the drill's step 3.7 (#985). | Every billing record matches Stripe. A deleted Account's plan does not come back. |
| 2.59 | J14 | Copy: search the security log and the Vercel logs after this stage's payment walks, including the failed-charge and cancel paths of #695. | No key, secret, signature, full body, card data, or full email. A receiver failure has a log row with the same code. |
| 2.60 | J15 | Settings: the dated row in Settings record (#987), and the cancellation email of #695. | Every setting in the row is recorded with its date. |
| 3.1 | Release | [Release migrations](../runbooks/release-migrations.md#release-order-production-by-hand) step 1 and the [controlled move gate](../runbooks/controlled-neon-move.md#release-gate-and-manual-domain-assignment): record the real project's deployment of the candidate, and where the owner's written approval of that commit and deployment is. | Approval names the same commit and deployment. |
| 3.2 | Release | [Restore runbook](../runbooks/restore.md): read the newest production snapshot and the history window. Record the restore point. | The newest snapshot is under 24 hours old. The restore point is inside the history window. |
| 3.3 | Release, H7 | Release migrations steps 2 to 5: start the run on `main`, approve the production job, read both last lines. | Copy: `Target: copy.` with `New migrations: 0`. Production: `Target: production.` and the same journal count as the copy. |
| 3.4 | #79 grant check | In the SQL Editor on production, as the Neon owner, run [`sql/production-grant-check.sql`](../../sql/production-grant-check.sql). It only reads. | 7 rows, each `refused` true: the app login cannot give the Admin role or change the disabled time or Google ID. |
| 3.5 | Release | Release migrations step 6: assign the real domain to the candidate's deployment. Both Admins sign in with Google. | The real domain serves the deployment from step 3.1. Both Admins reach the Admin pages. |
| 4.1 | Setup | RA and RB sign up with a password on the real site and click the verify links. The Admin signs in with Google. | Both verify links work. RA and RB reach onboarding. |
| 4.2 | E2 | Read the session cookie's flags in DevTools. RB asks for a reset, uses the link, and signs in with the new password. | Secure, HttpOnly, SameSite Lax. The verify link, the reset link, and Google sign-in work. |
| 4.3 | E3 | The wizard reads every student and Admin page with RA's and the Admin's cookies, an RSC request, and a signed-out redirect. RA saves Study settings with DevTools open and reads the Server Action reply. | Every reply that reads a session sends `Cache-Control` with `private` and `no-store`, the Server Action reply too ([#972](https://github.com/Jahazel/lsat-scheduler/issues/972)). |
| 4.4 | E4 | The wizard reads the security headers and the CSP of every page, and loads `/login` twice. Walk the pages with the console filtered to CSP errors. | Every header and CSP part, two different nonces, no CSP error. |
| 4.5 | A5 | The Stage 6 back-button walk with RA and RB on one browser. The wizard reads RA's pages with no cookie and with RB's cookie. | No page shows RA's data, from the browser or the CDN. Signed out, every page goes to Login. |
| 4.6 | J16 | RA finishes onboarding, opens Checkout, starts the free week with the owner's card, returns, and opens the Customer Portal. Console filtered to CSP errors. | Checkout and the Portal open from DrillMap with no CSP error. The return lands on `drillmap.xyz`. |
| 4.7 | C5 | [Emergency guide, scanning switch](../runbooks/emergency.md#turn-scanning-off): turn scanning off on production. The wizard sends one practice-test scan as RA. RA opens the weekly upload and types analytics by hand. Turn scanning on. | HTTP 429 with reason `scanning-off`, the scanning-off text, no new spend in `scan_spending`. Hand entry works. Scanning is on again. |
| 4.8 | J8 | `npm run check-stripe-prices` with the real site's restricted price key and price IDs at hidden prompts. | `{"ok":true,"status":"match","mode":"live"}`. |
| 4.9 | F3, F6 | [#937](https://github.com/Jahazel/lsat-scheduler/issues/937): after 09:00 UTC on the day after the release, find the daily cleanup in the real project's Vercel logs. | `GET /api/cron/daily-cleanup` answered 200. #937 can close. |
| 4.10 | Cleanup | RA and RB delete their Accounts. SQL counts this run's test Accounts on production. Check Stripe live for their subscriptions. | 0 test Accounts. RA's subscription is cancelled with nothing charged. Scanning is on. |
| 5.1 | Cleanup | Delete the copy's test Accounts of this run and the Google test user's Account, and cancel their sandbox subscriptions. | 0 test Accounts on the copy. No open sandbox subscription of this run. |
| 5.2 | Readiness | The wizard lists the commits from the candidate to `main` again. | Every one is docs-only, or the readiness record names a new candidate. |
| 5.3 | Readiness | Fill the [readiness record](#readiness-record) from the results. The wizard keeps the results file and deletes its folder. | Every row has a result and an evidence link. |

### Why some steps work this way

- **One data source.** Stage 2's steps come from this table, and each row's text comes from the launch checklist. A new
  checklist row without a step fails `scripts/issue-983-checklist-wizard.test.mjs`.
- **Auto rows.** The Checks run on the candidate's push runs every unit and real Postgres test. The wizard records that run
  for each Auto row, so a row passes only if the run passed on the candidate.
- **The grant check (step 3.4).** The SQL asks Postgres what the app login may do. It writes nothing:
  `tests/postgres/productionGrantCheck.test.ts` runs it inside a read-only transaction. A table-wide grant also shows as
  not refused, because Postgres counts it for every column.
- **The scan in step 4.7.** The route checks the plan before the scanning switch, so RA needs the plan from step 4.6. With
  scanning off, the scan stops before any Anthropic call, so it costs nothing.
- **The live free week (step 4.6).** Checkout on the real site is live mode, so it needs a real card. The free week charges
  nothing. RA's Account deletion in step 4.10 cancels the subscription at once (J12), before any charge. RA's address stays on
  the used free week list as a hash, which is harmless.

## Settings record

The owner fills this in #987 and #980. A dated record from any version counts (#978). "Not checked" counts as a failure.

| Row | Date | What was read, and where | Result |
| --- | --- | --- | --- |
| B9 | | | |
| F3 | | | |
| G1 | | | |
| G2 | | | |
| G3 | | | |
| H1 | | | |
| H2 | | | |
| H3 | | | |
| H4 | | | |
| H5 | | | |
| H6 | | | |
| H7 | | | |
| I1 | | | |
| I3 | | | |
| J7 | | | |
| J8 | | | |
| J15 | | | |

### Unknown items

Each item in the launch checklist's [Unknown items](release-gate.md#unknown-items) needs a dated answer.

| Item | Covered by | Date | Answer |
| --- | --- | --- | --- |
| Anthropic Console two-step sign-in and login methods | H1 | | |
| Which credentials the real site actually uses | H4 | | |
| Other GitHub tokens, apps, and deploy keys | H5 | | |
| Vercel shareable links for old deployments | H5 | | |
| Log retention, redaction, and access | F5, F6 | | |
| Alert delivery | I3 | | |
| External backups and restore history | I1, I2 | | |
| Recovery codes for each provider account | H1 | | |
| GitHub branch protection (blocked by plan) | G3 | | |
| Whether the Stripe account can turn on Managed Payments with free trials | J15 | | |

## Results

The wizard writes one line for each answer to `~/drillmap-issue-983-results.md`. Paste them here after the run.

| Step | Result |
| --- | --- |

## Readiness record

Template for #990. It follows [Ready and go](release-gate.md#ready-and-go). Ready does not launch anything.

### Version and date

| Item | Value |
| --- | --- |
| Version (full commit SHA of the release candidate) | |
| Real site deployment that serves it | |
| Date of the checks (first and last) | |
| Docs-only commits after the candidate (each SHA and title) | |

### Evidence for each check

Each row needs a result (Passed, Failed, or Accepted risk) and a link to its evidence on this version.

| Row | Result | Evidence link |
| --- | --- | --- |
| A1 | | |
| A2 | | |
| A3 | | |
| A4 | | |
| A5 | | |
| B1 | | |
| B2 | | |
| B3 | | |
| B4 | | |
| B5 | | |
| B6 | | |
| B7 | | |
| B8 | | |
| B9 | | |
| B10 | | |
| C1 | | |
| C2 | | |
| C3 | | |
| C4 | | |
| C5 | | |
| C6 | | |
| D1 | | |
| D2 | | |
| D3 | | |
| D4 | | |
| E1 | | |
| E2 | | |
| E3 | | |
| E4 | | |
| F1 | | |
| F2 | | |
| F3 | | |
| F4 | | |
| F5 | | |
| F6 | | |
| G1 | | |
| G2 | | |
| G3 | | |
| H1 | | |
| H2 | | |
| H3 | | |
| H4 | | |
| H5 | | |
| H6 | | |
| H7 | | |
| I1 | | |
| I2 | | |
| I3 | | |
| I4 | | |
| J1 | | |
| J2 | | |
| J3 | | |
| J4 | | |
| J5 | | |
| J6 | | |
| J7 | | |
| J8 | | |
| J9 | | |
| J10 | | |
| J11 | | |
| J12 | | |
| J13 | | |
| J14 | | |
| J15 | | |
| J16 | | |

### Accepted risks

Every row of [Accepted risks](release-gate.md#accepted-risks), with its status on this version.

| Risk (short name) | Accepted on | Status: open, or ended with its date and evidence |
| --- | --- | --- |
| No database backups | 2026-10-01 | |
| Real site on Atlas until the move to Neon | 2026-10-19 | |
| Checks left from the move to Neon | 2026-10-19 | |
| 30-day backup age alert not proven | 2026-10-20 | |
| Stale-backup alert not proven | 2026-10-22 | |
| Production migration secret in GitHub | 2026-10-24 | |
| Second free week with a different email | 2026-11-09 | |
| First promotion before the checklist is complete | 2026-11-16 | |

### Items outside the checklist

The owner decides on these knowingly in the go decision.

| Item | Status |
| --- | --- |
| Terms lawyer review and seller details ([#731](https://github.com/Jahazel/lsat-scheduler/issues/731)) | |
| Form field names ([#973](https://github.com/Jahazel/lsat-scheduler/issues/973)) | |
| Whether the analytics scan refuses a practice-test page ([#974](https://github.com/Jahazel/lsat-scheduler/issues/974)) | |

### When this record expires

This readiness record expires when any of these happens:

- The live version changes.
- A provider setting on the launch checklist changes.
- 30 days pass after the last check date above.

### Go decision

Go is a separate step. The owner writes it as a separate comment that names the same version. This record does not hold it.

| Item | Value |
| --- | --- |
| Link to the owner's written go decision | |
| Version it names | |
| Date | |

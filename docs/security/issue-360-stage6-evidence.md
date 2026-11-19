# Stage 6 evidence and Stage 7 handoff

Record for [#360](https://github.com/Jahazel/lsat-scheduler/issues/360), under the Stage 6 spec [#348](https://github.com/Jahazel/lsat-scheduler/issues/348) and [#79](https://github.com/Jahazel/lsat-scheduler/issues/79).
This file holds no password, key, connection string, cookie, email, Account ID, or Google ID.
It approves no release, exception, or launch. No launch checklist row passes because of this file.

**Status: owner run finished on 2026-11-19.** The owner ran the steps on the copy with
`scripts/issue-360-copy-run-wizard.sh` (run tag `t11180132`), and the agent recorded each result below. The
[first promotion exception](release-gate.md) names this run and ends on November 30, 2026.

## Words in this file

- **Copy**: the copy of the site, its own Vercel project and Neon project. The real site does not change in this run.
- **Report-only**: the CSP is sent as `Content-Security-Policy-Report-Only`. The browser logs a blocked source in its console and still loads it. `CSP_MODE=enforce` sends `Content-Security-Policy`, and the browser blocks the source.
- **Students A to E**: password test Accounts at plus addresses of the owner's inbox. A has a plan and is the main student. B is the second student on the same browser and the onboarding burst. C is the failed deletion. D is the inactive Account. E walks onboarding under the enforced CSP.
- **Restore point**: the UTC time that the wizard records just before C's deletion. Every deletion in this run happens after it.
- **Silent server**: a program on the owner's Mac that accepts a connection and never answers. A Cloudflare quick tunnel gives it a public address for one step.

## Scope

The ticket names A5, E1, E3, E4, F1, F2, F4, F5, F6, the CSP switch, the log search, and the Stage 5 carries.
The owner added F3 on 2026-11-17, because spec user story 58 lists it and no other ticket proves the page text on the copy.
A5 changed after the ticket was written: sign-out sends no `Clear-Site-Data` since 2026-11-04 (rule 14 of the
[browser and data rules](issue-76-decisions.md)). A5 rests on `Cache-Control: private, no-store` and a hand check of the Back button.

## Version for the copy run

| Item | Value |
| --- | --- |
| Commit | `aed506c` (`origin/main` at the start of the run). A first start on `323c249` was stopped and restarted on `aed506c`; only the restarted run counts. |
| Migrations | `0000` to `0025` in the commit, 26 files. The journal holds 26 rows. |
| Copy deployments | Report-only `dpl_2aBP6xoW7Aozk68yDc6QJsjmXUvf`. Slow-reply `dpl_AUqZcsuoBuRTvTXpcjmtTTFJ2mEw`. Back to normal `dpl_6XFzDr9Yn11zTcm3iLsoce16BzA`. Enforced `dpl_AMJerUWQwdi4KRZMaK6hQwDaSjSz`. |
| Changed for one step only | `ANTHROPIC_BASE_URL`, in step 10. It is removed in the same step. |
| Changed for the rest of the run | `CSP_MODE=enforce` on copy Production, from step 17. It stays on. |
| Real site Production | `dpl_5rpzz6Uy5TBbzNyjNDhyeXrZySja` before and after (live since 2026-11-16). |

## Owner run sheet

Run it from the repository with `bash scripts/issue-360-copy-run-wizard.sh`. Resume a stopped run with `--from N`, where N is the stage number.
Every step runs on the copy. The wizard sends every request with the copy's `Origin` header, keeps cookies and emails in a mode-700
folder in `$HOME`, and deletes that folder in the last step. SQL runs in Neon's SQL Editor on the copy project, as the Neon owner.

| Step | Check | Action | Expected |
| --- | --- | --- | --- |
| 1 | Version | Record `origin/main`, the list of migrations in it, and the real site's Production deployment ID. | One commit for the whole run. |
| 2 | Version | Release migrations with **Stop after the copy**. Deploy the commit to copy Production and promote it, with `CSP_MODE` unset. | `Target: copy.` and the production job skipped. The journal holds 26 rows. The app role's column insert grant on `deletion_list` is present, and `leads` is gone. `/login` sends the report-only CSP. |
| 3 | Setup | Sign up A, C, and D with passwords. A finishes onboarding and starts a plan with test card 4242. C finishes onboarding and stops at the plan step. The Admin signs in with Google. | 3 test Accounts. A and C each have a Student. |
| 4 | CSP | Walk Google sign-in, password sign-in, B's onboarding up to its last step, the weekly upload with a preview, This week, Progress, Study settings, Account, and the Admin pages with the console filtered to CSP reports. | No report. The bars have their size, and the screenshot preview shows. |
| 5 | E3, E4 headers | The wizard reads each student, Admin, and public page, an RSC request, and a signed-out redirect. It loads `/login` twice. | Every private response sends `Cache-Control: private, no-store`. Every response sends the five security headers and the CSP parts. Two different nonces. |
| 6 | A5 | A saves goal 168, opens four pages, and logs out. Back five times, reload, and direct visits. Then B signs in on the same browser. | No page shows A's email, name, or 168. B's `/account` shows B. |
| 7 | E1 | The wizard changes A's real Study settings request: a foreign `Origin`, no `Origin`, a wrong content type. It sends forged scans and a form body to a JSON route. Then the real request, same site. | 403, 403, 415 for the Server Action. 403, 403, 415, 415 for the routes. Goal stays 163 and no scan holds a place. The security log holds 2 `noOrigin`, 2 `wrongOrigin`, and 3 `wrongContentType`. The same-site request saves 170, and its reply sends `Cache-Control: private, no-store` (E3 for a Server Action). |
| 8 | F2 | Copy B's final onboarding request. Delete B's Student. The wizard sends the request 5 times at once. | One Student and one set of its records. B's window opens with no error. A Vercel log search covers the first hour. |
| 9 | F5 | A malformed upload, a bad Student ID by API and page, and a database failure: the SQL revokes the app's `SELECT` on `students` for one request, then grants it back. | Each one returns "Something went wrong. Try again." with a code, or a planned message. Each code has one `unexpected_failure` row with the route and error type. |
| 10 | Stage 5 carry, F5 | `ANTHROPIC_BASE_URL` points at the silent server through the tunnel. One practice-test scan as A. Then the setting is removed. | HTTP 504 "Reading took too long and stopped. Try again." after 30 to 32 seconds: F5's Anthropic failure, with its planned message. No Anthropic Console request. |
| 11 | Stage 5 carry | A practice-test page sent to the analytics scan. A Google cancel on Google's screen. Vercel log search for the last hour. | `sign_in` `googleCancelled` once, no `setupFault`. A `model_reply_refused` row with only the check name and a row count if the model's reply failed a check. If the model answers with a wrong-page refusal, no row is made, and the handoff carries this check to the unit tests. No private data in the logs. |
| 12 | Stage 5 carry | The month rows of `scan_spending`. | A row that starts 2026-11-01 00:00 America/Chicago, apart from October. |
| 13 | F1 | Record the restore point. Save C's session cookie. Revoke the app's `DELETE` on `accounts`. C deletes the Account, then signs in again. C's saved session opens three pages. Grant back. Run the daily job. | "Your Account is being deleted." twice. The saved session goes to Login. C stays marked. After the job: no Account, Student, Analytics snapshot, Weekly schedule, or practice-test result, and one deletion list row. Activity check-ins belong to Weekly schedules and go with them. |
| 14 | F3, F6 | Add two test failure rows to the security log at 91 and 89 days, two deletion list rows with made-up hashes at 31 and 29 days, and move D's last sign-in back 2 years and 1 day. Run the daily job. Move D's warning back 31 days. Run it again. | The 91-day and 31-day rows are gone, the others stay. D gets the warning email, then D is deleted with one deletion list row. |
| 15 | F3 | The wizard reads the privacy and AI pages and A's weekly upload. The owner reads both pages against the approved text and mails the privacy address. | Every fact is present: 14 days, 90 days, 30 days, 2 years, `privacy@drillmap.xyz`, Anthropic. The screenshot notice shows. The mail arrives. |
| 16 | F4 | [Restore runbook](../runbooks/restore.md) steps 1 to 4 and 6 at the restore point, into a new branch. Age check, replay twice, check the restored branch, delete it, age check again. | The age check does not name the restored branch. The replay deletes at least 2 Accounts (C and D), then 0. C and D are gone from the restored branch. The last age check shows no copy older than 30 days. |
| 17 | E4 | Set `CSP_MODE=enforce`, redeploy, and promote. The wizard reads the headers again. Walk Google sign-in, password sign-in, E's onboarding up to Stripe Checkout, A's pages, and the Admin pages. | Only `Content-Security-Policy`, with every part, two different nonces. No CSP error, and every page works. |
| 18 | F5, F6, log search | Search the security log rows of this run. Group them by event and result. Search the Vercel logs for the last hour. | No row with an `@`, a token, a key, a link, or base64. Every email hash is 64 hex characters. Each event has a route and an IP address. No private data in the Vercel logs. |
| 19 | Cleanup | Delete the test Accounts, cancel A's sandbox subscription in Stripe (a SQL delete does not reach Stripe), revoke the Neon API key, and record the real site's deployment again. | No test Account left. `CSP_MODE=enforce` stays on the copy. The real site's deployment is the same as in step 1. |

### Why some steps differ from Stage 5

- **The 30-second limit (step 10).** Stage 5 used an address that never accepts a connection. Node gave up at the 10-second connect timeout, so the reply came after 12.6 seconds. A server that accepts and stays silent reaches the SDK's 30-second limit. A local run of the real SDK with `timeout: 30_000` and `maxRetries: 0` against such a server stopped after 30.1 seconds, with `APIConnectionTimeoutError`. The tunnel sends the copy's request, and its Anthropic key, only to the owner's Mac. That workspace has a $5 limit.
- **A real database failure (steps 9 and 13).** Revoking one table permission makes a real Postgres error on the deployed build. The security log can still take its entry, because the app keeps its insert permission on `security_log`.
- **The restore (step 16).** The copy site keeps its current database. Stage 7 practices the switch to a restored branch.

## Results

Run `t11180132` on `aed506c`, from 2026-11-18 01:32 UTC to 2026-11-19 15:21 UTC. Each row gives what the run showed.
"Passed" means the result matched the Expected column of the run sheet. It does not pass a launch checklist row.

| Step | Result |
| --- | --- |
| 1 Version | `aed506c`, 26 migration files. Real site `dpl_5rpzz6Uy5TBbzNyjNDhyeXrZySja`. Passed. |
| 2 Version | Release run 44410250464: `Target: copy.`, production job skipped, 0 new migrations. Journal 26 rows, the `deletion_list` insert grant is present, `leads` is gone. `/login` sends the report-only CSP. Passed. |
| 3 Setup | 3 test Accounts, 2 Students (A and C). Passed. |
| 4 CSP, report-only | 0 reports on the pages walked. The walk was partial: B was not made in this step. Step 17 walked every page under the enforced CSP, so step 17 carries this check (finding 3). |
| 5 E3, E4 headers | Every private page sends `private, no-cache, no-store, max-age=0, must-revalidate`, which holds `private` and `no-store` (finding 2). The five security headers and the CSP parts are present. Two different nonces. RSC request and signed-out 307 both private, no-store. Passed. |
| 6 A5 | Back five times, reload, and direct visits all land on Login. No page showed A's data. B's `/account` showed B. Passed. |
| 7 E1 | 403, 403, 415 for the Server Action. 403, 403, 415, 415 for the routes. Goal stayed 163, no scan held a place. Log: 2 `noOrigin`, 2 `wrongOrigin`, 3 `wrongContentType`. The same-site request saved 170. Its reply sends `no-cache, no-store, max-age=0, must-revalidate` **without** `private` (finding 1). E1 passed. E3 for a Server Action did not pass. |
| 8 F2 | 5 requests at once, all HTTP 200. 1 Student, 1 Analytics snapshot. B's window opened on the plan step with no error. No private data in the Vercel logs. Passed. |
| 9 F5 | Malformed upload 400. Bad Student ID 404 by API and "Student not found" by page. Database failure: HTTP 500 "Something went wrong. Try again." with code `a7a2325b`, and one `unexpected_failure` row with route `/api/students` and Postgres code 42501. Passed. |
| 10 Stage 5 carry, F5 | HTTP 504 "Reading took too long and stopped. Try again." after 33.0 s (finding 9). No Anthropic request. The setting was removed. Passed, with the time a little over the expected 32 s. |
| 11 Stage 5 carry | The Google cancel landed on Login with the planned message, and made `googleCancelled` rows with no `setupFault` (finding 10). The analytics scan of a practice-test page got HTTP 200, so no `model_reply_refused` row was made (finding 6). No private data in the logs. The refused-reply check moves to the unit tests. |
| 12 Stage 5 carry | A November row from 2026-11-01 00:00 Chicago time, apart from October. Passed. |
| 13 F1 | "Your Account is being deleted." twice. C's saved session went to Login on three pages. C stayed marked. After the daily job: 0 Accounts, Students, Analytics snapshots, Weekly schedules, and practice-test results, 1 deletion list row. Passed. |
| 14 F3, F6 | The 91-day log row and the 31-day deletion list row were gone, the others stayed. D got the warning email, then D was deleted with one deletion list row. Passed. |
| 15 F3 | Both pages hold every approved sentence word for word, and every fact: 14 days, 90 days, 30 days, 2 years, `privacy@drillmap.xyz`, Anthropic. The screenshot notice shows. The mail to the privacy address arrived. Passed. |
| 16 F4 | Restored at the restore point into a new branch. The age check named only an old October snapshot, not the restored branch; the owner approved its deletion. Replay: 2 Accounts deleted, then 0. C and D were gone from the restored branch. Last age check: within 30 days. Passed, with email-hash matching untested (finding 7). |
| 17 E4 | Only `Content-Security-Policy`, every part, two different nonces. The owner walked Google sign-in, password sign-in, E's onboarding to Checkout, A's pages, and the Admin pages: 0 CSP errors, every page worked, bars and the preview showed. The preview was checked in E's onboarding, because A's Weekly upload was closed for the week. Passed. |
| 18 F5, F6, log search | 42 log rows this run. 3 matched the private-text search, all false positives (`sign_in` rows with result `wrongEmailOrPassword`). 0 bad email hashes. 11 event and result groups, each with a route and an IP address. 0 private data in 462 request log lines and the runtime logs. Passed. |
| 19 Cleanup | Test Accounts: DELETE 3, then 0. A's test subscription cancelled in Stripe. The Neon API key deleted. Real site still `dpl_5rpzz6Uy5TBbzNyjNDhyeXrZySja`. `CSP_MODE=enforce` stays on the copy. Passed. |

### Findings

1. **The Server Action reply has no `private`.** The `/settings` Server Action reply sends `no-cache, no-store, max-age=0, must-revalidate`. Next.js writes this header over the app's header. `no-store` still stops every cache from saving it, but the rule asks for `private` on every non-GET reply. [#972](https://github.com/Jahazel/lsat-scheduler/issues/972) fixes it or changes the rule.
2. **The long `Cache-Control` form is correct.** Private pages send the long Next.js form. It holds `private` and `no-store`. The wizard's exact text check was too strict.
3. **Step 4 was partial.** Step 17 covers the same pages with the stronger enforced CSP.
4. **11 DevTools issues on onboarding.** 10 form fields have no `id` or `name`, and 1 lazy image has no size. They are not security issues. [#973](https://github.com/Jahazel/lsat-scheduler/issues/973) fixes them.
5. **`/forgot-password` requests in the logs.** Next.js link prefetch makes them. They hold no private data.
6. **The analytics scan accepts a practice-test page.** It returned 31 question type rows and no accuracy. [#974](https://github.com/Jahazel/lsat-scheduler/issues/974) decides whether the scan refuses the wrong page type.
7. **The copy's `AUTH_SECRET` cannot be read.** Vercel stores it as sensitive, and no other copy exists. The replay ran with a stand-in, so only Account ID matching was tested. Rotate the copy's `AUTH_SECRET`, save it in the password manager, and test email-hash matching in the Stage 7 restore practice.
8. **Wizard gaps.** Fixed in this branch; see the commit that follows the run.
9. **The slow reply took 33.0 s.** The SDK limit is 30 s; the rest is the tunnel and the function start.
10. **The Google cancel was scripted.** Google skips its consent screen for an app the account already approved. The wizard sent Google's `access_denied` reply to the site's callback, with the issuer, as Google does.
11. **The copy uses its own Stripe test account.** It is named "DrillMap sandbox". It is not the sandbox listed in the DrillMap account menu. Three old trialing test subscriptions from earlier runs remain in it.
12. **A real-site build is ready but not live.** `dpl_6DNPtqjU9SNeVGJem2LRvhns2mpZ` (2026-11-18) is built and was not promoted. The run did not touch it. The owner checks it before the next release.

## Stage 7 handoff

**Proven on the copy**

- E1: forged and wrong-type requests are refused and logged, and nothing is written.
- E3: every private page, RSC request, and signed-out redirect sends `private` and `no-store` (except finding 1).
- E4: the CSP works in report-only and in enforced mode, with a new nonce on each load and no error on any page.
- A5 on the copy: the Back button and the saved session show no data after sign-out.
- F1: a failed deletion stays marked and the daily job finishes it.
- F2: five onboarding requests at once make one Student.
- F3: the privacy and AI pages hold the approved text, and the privacy mailbox receives mail.
- F4: a restore into a new branch, then the deletion replay by Account ID, run twice.
- F5: each failure gives a planned message or a code with one log row, including the 30-second scan limit.
- F6: the 90-day log limit, the 30-day deletion list limit, and the 2-year Inactive Account warning and deletion.
- The month row of `scan_spending` starts at midnight Chicago time.
- The logs hold no private data.

**Carried forward**

- Email-hash matching in the deletion replay: test it in the Stage 7 restore practice with the saved copy `AUTH_SECRET`.
- The `model_reply_refused` row for a failed reply check: prove it with unit tests ([#974](https://github.com/Jahazel/lsat-scheduler/issues/974)).
- Finding 1 (Server Action `private`), finding 4 (form field names), and finding 6 (wrong page type) as [#972](https://github.com/Jahazel/lsat-scheduler/issues/972), [#973](https://github.com/Jahazel/lsat-scheduler/issues/973), and [#974](https://github.com/Jahazel/lsat-scheduler/issues/974).

**Only the real site can prove**

- A5: after sign-out, the Back button, a reload, and A's addresses show none of A's data on the real domain, from the browser or the CDN.
- E2: the real site's session cookies are Secure, HttpOnly, and SameSite=Lax, and the verification link, the reset link, and Google sign-in still work.
- E3: every real-site reply that reads a session sends `Cache-Control: private, no-store`, including Server Action replies (finding 1).

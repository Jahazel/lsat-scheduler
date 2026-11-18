# Stage 6 evidence and Stage 7 handoff

Record for [#360](https://github.com/Jahazel/lsat-scheduler/issues/360), under the Stage 6 spec [#348](https://github.com/Jahazel/lsat-scheduler/issues/348) and [#79](https://github.com/Jahazel/lsat-scheduler/issues/79).
This file holds no password, key, connection string, cookie, email, Account ID, or Google ID.
It approves no release, exception, or launch. No launch checklist row passes because of this file.

**Status: run sheet ready. The owner run has not started.** The owner runs the steps on the copy with
`scripts/issue-360-copy-run-wizard.sh`, and the agent records each result below. The
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
| Commit | To record in step 1. |
| Migrations | `0000` to `0025` in the commit, 26 files. Step 2 records the journal count. |
| Copy deployments | To record: report-only, slow-reply, and enforced. |
| Changed for one step only | `ANTHROPIC_BASE_URL`, in step 10. It is removed in the same step. |
| Changed for the rest of the run | `CSP_MODE=enforce` on copy Production, from step 17. It stays on. |
| Real site Production | To record before and after. |

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
| 17 | E4 | Set `CSP_MODE=enforce`, redeploy, and promote. The wizard reads the headers again. Walk Google sign-in, E's onboarding up to Stripe Checkout, A's pages, and the Admin pages. | Only `Content-Security-Policy`, with every part, two different nonces. No CSP error, and every page works. |
| 18 | F5, F6, log search | Search the security log rows of this run. Group them by event and result. Search the Vercel logs for the last hour. | No row with an `@`, a token, a key, a link, or base64. Every email hash is 64 hex characters. Each event has a route and an IP address. No private data in the Vercel logs. |
| 19 | Cleanup | Delete the test Accounts, cancel A's sandbox subscription in Stripe (a SQL delete does not reach Stripe), revoke the Neon API key, and record the real site's deployment again. | No test Account left. `CSP_MODE=enforce` stays on the copy. The real site's deployment is the same as in step 1. |

### Why some steps differ from Stage 5

- **The 30-second limit (step 10).** Stage 5 used an address that never accepts a connection. Node gave up at the 10-second connect timeout, so the reply came after 12.6 seconds. A server that accepts and stays silent reaches the SDK's 30-second limit. A local run of the real SDK with `timeout: 30_000` and `maxRetries: 0` against such a server stopped after 30.1 seconds, with `APIConnectionTimeoutError`. The tunnel sends the copy's request, and its Anthropic key, only to the owner's Mac. That workspace has a $5 limit.
- **A real database failure (steps 9 and 13).** Revoking one table permission makes a real Postgres error on the deployed build. The security log can still take its entry, because the app keeps its insert permission on `security_log`.
- **The restore (step 16).** The copy site keeps its current database. Stage 7 practices the switch to a restored branch.

## Results

The owner has not run the steps yet.

## Stage 7 handoff

To write after the run, in three lists: proven on the copy, carried forward, and only the real site can prove (A5, E2, and E3 on the real site).

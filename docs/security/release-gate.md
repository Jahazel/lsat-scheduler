# DrillMap launch checklist

Release gate for [issue 73](https://github.com/Jahazel/lsat-scheduler/issues/73), under [issue 69](https://github.com/Jahazel/lsat-scheduler/issues/69). Drafted October 1, 2026, America/Chicago, against checkout `5b01ac4`.

**Status: draft.** No check on this list passes yet. DrillMap is not ready to launch. This file does not deploy anything or approve a launch.

The evidence comes from [issue 70](issue-70-evidence.md) (app code), [issue 71](issue-71-evidence.md) (provider settings), and [issue 72](issue-72-decisions.md) (the required protections). Finding IDs such as F01 refer to issue 70.

## Words in this file

- **Launch** means "start to promote DrillMap to the public." Signup is already open. Launch is not the day signup opens.
- **Launch checklist** is this file. It lists one or more checks for each required protection.
- **Check** is one test with a clear pass or fail result.
- **Copy of the site** (staging) is a second deployment with its own database, own Anthropic key, and own sign-in settings. Tests on it never touch real students' data.
- **Release** means "make one exact version of the code live on the real site."
- **Ready** means "one exact version passed every check." See [Ready and go](#ready-and-go).
- **Go** means "the owner approves the launch of that version."
- **Risky change** means a change that touches sign-in or accounts, student data, admin powers, uploads, or money.

## Rules

1. Every check must pass on the exact version you launch.
2. "We do not know" counts as a failure. An unverified setting does not pass.
3. The owner can accept a known risk. The acceptance must be written in [Accepted risks](#accepted-risks). It must name the risk, the reason, the protection used instead, and an end date. No risk is accepted in advance.
4. "Ready" and "go" are two separate steps. Ready does not launch anything.
5. Full checks run on the copy of the site. A short test then runs on the real site with test accounts.
6. New code goes live only when the owner releases it. Pushes to `main` do not go live automatically.
7. A risky change adds or updates its checks here. It goes live only after those checks pass.
8. Payments need a new security review before work starts. This checklist does not cover payments.

## Until launch

Signup stays open. The owner does not promote DrillMap. The risk is small because few people know the site. These limits hold spending down until launch:

| Setting | Required value | Status |
| --- | --- | --- |
| Anthropic auto-reload | Off | Observed off on October 1, 2026 |
| Anthropic credit balance | Under $10; add no credit | $4.68 observed on October 1, 2026 |
| Anthropic monthly spend limit | $20 (was $500) | Set to $20 on October 1, 2026 |
| Anthropic spend emails | At $5 and at $8 | Added on October 1, 2026 (Billing > Add notifications) |

Only screenshot extraction uses this Anthropic organization, so the $20 limit affects nothing else.

## The checks

Each row needs a policy before its exact limits can be written. The policy ticket column names where that decision happens. The "Kind" column says how the check runs:

- **Auto**: a code test that GitHub runs after every push.
- **Copy**: a manual or scripted test on the copy of the site.
- **Real**: a short test on the real site with test accounts.
- **Settings**: a person reads a provider setting and records the date.

### A. Student data and admin powers

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| A1 | Use student A, student B, an admin, and no session on every protected page, API, and action. A foreign ID returns no foreign data and changes no foreign record. | Auto, Copy | F10 | None needed | Not tested |
| A2 | A submitted owner, role, or operator field cannot change who owns a record or who has power. | Auto | F10 | None needed | Not tested |
| A3 | An admin can view a student's weekly schedule. The view creates no weekly schedule and writes nothing. | Auto, Copy | ADR 0003, domain model | None needed | Not tested |
| A4 | Admin test actions, such as a simulated date or a sample analytics snapshot, change only the admin's own student side. | Auto | Domain model | None needed | Not tested |
| A5 | Student A opens this week, progress, settings, and the Account page, then signs out. Sign-out sends `Clear-Site-Data: "cache"`. Student B signs in on the same browser. The back button, a reload, and each of student A's addresses show none of student A's data, from the browser or the CDN. | Real | F13 | Browser and data ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)); [Browser and data rules](issue-76-decisions.md) | Not tested |

### B. Sign-in and accounts

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| B1 | Keep a session in two browsers. Then demote, disable, delete, reset the password, change the password, or press "Sign out of all devices." The next protected request in the other browser is refused, including admin pages, onboarding, and extraction. No paid call starts and no record is recreated. A disabled account cannot sign in. Student sessions end after 14 days without use and 30 days after sign-in. Admin sessions end 24 hours after sign-in. | Auto, Copy | F01, F02 | Account security ([#74](https://github.com/Jahazel/lsat-scheduler/issues/74)); [Account rules](issue-74-decisions.md) | Not tested |
| B2 | A known Google ID opens its account after the Google email changes, and the DrillMap email stays the same. A new Google ID with the email of a Google account is refused. A Google profile whose `email_verified` is not `true` is refused. | Auto, Copy | F03 | Account security ([#74](https://github.com/Jahazel/lsat-scheduler/issues/74)); [Account rules](issue-74-decisions.md) | Not tested |
| B3 | A password signup with someone else's email makes a pending account that cannot sign in. The real owner gets the email back through Google sign-in or a newer signup. The signup screen is the same for all four signup cases. A pending account is deleted after 7 days. | Copy | F03 | Account security ([#74](https://github.com/Jahazel/lsat-scheduler/issues/74)); [Account rules](issue-74-decisions.md) | Not tested |
| B4 | A Google sign-in with the email of a verified password account is refused and starts no session. A password signup with the email of a Google account makes no account. No account has both a password and a Google ID. | Auto, Copy | F03 | Account security ([#74](https://github.com/Jahazel/lsat-scheduler/issues/74)); [Account rules](issue-74-decisions.md) | Not tested |
| B5 | Signup, login, reset, and change refuse passwords over 72 UTF-8 bytes. A multibyte password of exactly 72 bytes works. Two passwords with the same first 72 bytes cannot both work. | Auto | F04 | Account security ([#74](https://github.com/Jahazel/lsat-scheduler/issues/74)); [Account rules](issue-74-decisions.md) | Not tested |
| B6 | Signup, reset, and change refuse a password on the common list, the person's own email, and "drillmap". | Auto | F04 | Account security ([#74](https://github.com/Jahazel/lsat-scheduler/issues/74)); [Account rules](issue-74-decisions.md) | Not tested |
| B7 | The reset screen is the same for an unknown email, a password account, and a Google account. A reset link works once, expires after 30 minutes, and stops working when a newer link is requested. The database holds only token hashes. A reset signs out all devices. Login gives the same message, with the same hash work, for a wrong email and a wrong password. | Copy | F04 | Account security ([#74](https://github.com/Jahazel/lsat-scheduler/issues/74)); [Account rules](issue-74-decisions.md) | Not tested |
| B8 | On synthetic data shaped like the real data, the migration rules hold. No role changes. No email becomes verified without a link, a reset, or a verified Google sign-in. Every session from before the release is refused. | Copy | F03 | Account security ([#74](https://github.com/Jahazel/lsat-scheduler/issues/74)); [Account rules](issue-74-decisions.md) | Not tested |
| B9 | An admin password sign-in is refused, even when a password hash exists. Admin accounts have no password after migration. Both admins have Google 2-Step Verification on, with the date recorded. | Copy, Settings | Issue 72 | Account security ([#74](https://github.com/Jahazel/lsat-scheduler/issues/74)); [Account rules](issue-74-decisions.md) | Not tested |
| B10 | Account deletion and password change are refused when the last sign-in is more than 10 minutes old. They work after a new sign-in. A password change also works with the current password. | Auto, Copy | F02 | Account security ([#74](https://github.com/Jahazel/lsat-scheduler/issues/74)); [Account rules](issue-74-decisions.md) | Not tested |

### C. Abuse limits and spending

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| C1 | At each limit, request N+1 gets HTTP 429 with `Retry-After` before any bcrypt, email, write, or paid call. Signup: the 4th email in 1 hour and the 6th in 1 day for one email, and the 11th signup in 1 hour for one IP address. The signup screen does not change. Login: the 11th failure in 15 minutes for one email, known or unknown, and the 51st in 1 hour for one IP address. The message is the same for every email. Reset: the 4th in 1 hour for one email, and the 11th for one IP address. Lead capture: the 6th in 1 hour for one IP address, and a repeat email writes nothing. Analytics snapshot saves: the 6th in 1 day for one student. Each limit works again after its window ends. A simulated date does not change any limit. | Auto, Copy | F05, F09 | Abuse and extraction ([#75](https://github.com/Jahazel/lsat-scheduler/issues/75)); [Abuse rules](issue-75-decisions.md) | Not tested |
| C2 | Send N+5 requests at the same time for each limit in C1 and C3, across at least two server instances. Exactly N succeed. One student's second extraction at the same time is refused. A 6th extraction at the same time on the site is refused. A place held by a stopped extraction is free after 2 minutes. | Copy | F05 | Abuse and extraction ([#75](https://github.com/Jahazel/lsat-scheduler/issues/75)); [Abuse rules](issue-75-decisions.md) | Not tested |
| C3 | The 6th extraction in 1 day and the 21st in 1 month for one student, including an admin, are refused. No Anthropic call starts. | Auto, Copy | F05 | Abuse and extraction ([#75](https://github.com/Jahazel/lsat-scheduler/issues/75)); [Abuse rules](issue-75-decisions.md) | Not tested |
| C4 | Each extraction counts $0.02 before the call. A reply changes it to the real cost. A timeout or error keeps $0.02. With the total at the limit minus $0.01, the next extraction is refused and no call starts. The SDK makes no retry. The timeout is 30 seconds. Admin and failed extractions count. The total goes back to $0 at midnight on the 1st, America/Chicago. A changed limit works on the next extraction, with no new release. Run on the copy of the site with real calls in the $5 workspace. | Copy (real calls, $5 workspace) | Issue 72 | Abuse and extraction ([#75](https://github.com/Jahazel/lsat-scheduler/issues/75)); [Abuse rules](issue-75-decisions.md) | Not tested |
| C5 | With the emergency switch on, no new Anthropic call starts on the next extraction, and the student sees "Scanning is off right now. Enter your analytics by hand." Hand-typed analytics snapshots, this week, and progress still work. The emergency guide lists the commands for the switch and the limit. | Copy, Real | Issue 72 | Abuse and extraction ([#75](https://github.com/Jahazel/lsat-scheduler/issues/75)); [Abuse rules](issue-75-decisions.md) | Not tested |
| C6 | With extraction on, off, and at its limit, a student types analytics by hand, approves them, and gets a weekly schedule. The analytics snapshot has source `manual_entry`. Every source refuses unknown type names, accuracy outside 0 to 1, a top-priority type that is not a Stimulus Logic type, and two rows for one type. A student cannot save `admin_sample`. | Auto, Copy | Issue 72, F09 | Abuse and extraction ([#75](https://github.com/Jahazel/lsat-scheduler/issues/75)); [Abuse rules](issue-75-decisions.md) | Not tested |

### D. Screenshots and model output

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| D1 | An anonymous or deleted account causes zero extraction calls. The handler checks the session itself. | Auto | F06 | None needed | Not tested |
| D2 | The server refuses a file whose first bytes are not PNG, JPEG, or WebP, whatever type the browser sends. It refuses GIF, a broken image, a file over 4 MB, a request over 4.5 MB, a side over 8,000 px, more than 25 megapixels, and an animated PNG or WebP. Each refusal happens before the server reads the whole file and before an Anthropic call. A file at each limit is accepted. The browser shrinks a large screenshot until its longer side is at most 1,568 px. | Auto | F07 | Abuse and extraction ([#75](https://github.com/Jahazel/lsat-scheduler/issues/75)); [Abuse rules](issue-75-decisions.md) | Not tested |
| D3 | The app refuses a wrong tool, unknown labels, too many rows, bad true/false values, and numbers out of range. Nothing usable returns and no analytics snapshot saves. | Auto | F08 | None needed | Not tested |
| D4 | Onboarding works for an existing account with no student record. | Auto | Issue 72 | None needed | Not tested |

### E. Browser protections and private responses

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| E1 | Send each request that changes data with a foreign `Origin`, with no `Origin`, and with a wrong content type. A wrong or missing `Origin` gets HTTP 403. A wrong content type gets HTTP 415. JSON routes accept only `application/json`, and only extraction accepts `multipart/form-data`. No write, email, or Anthropic call happens, and each refusal is in the security log. A same-site request works. | Copy | F12 | Browser and data ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)); [Browser and data rules](issue-76-decisions.md) | Not tested |
| E2 | Session cookies on the real site are Secure, HttpOnly, and SameSite=Lax. The email verification link, the reset link, and Google sign-in still work. | Real | F13 | Browser and data ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)); [Browser and data rules](issue-76-decisions.md) | Not tested |
| E3 | Every page, Route Handler, and Server Action response that reads a session sends `Cache-Control: private, no-store`. The landing page, legal pages, login, and signup may be cached. | Real | F13 | Browser and data ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)); [Browser and data rules](issue-76-decisions.md) | Not tested |
| E4 | Every page sends an enforced CSP with a new nonce on each request, `'strict-dynamic'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'none'`. Every response sends `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Two loads of the same page get different nonces. Google sign-in, onboarding, upload, this week, progress, and the admin pages work with no CSP violations. | Real | F13, issue 71 | Browser and data ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)); [Browser and data rules](issue-76-decisions.md) | Not tested |

### F. Deletion, privacy, errors, and logs

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| F1 | Force a failure after the Account is marked "deleting." Every protected request is refused at once. The student retry or the daily job finishes the deletion. No Account, Student, analytics snapshot, weekly schedule, activity check-in, or matching lead remains. Exactly one deletion list row exists. A retry never restores access. | Copy | F11 | Browser and data ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)); [Browser and data rules](issue-76-decisions.md) | Not tested |
| F2 | Onboarding survives failures and parallel requests without broken records. | Copy | F11 | None needed | Not tested |
| F3 | The privacy and AI disclosure pages match the approved text and the facts on the release day: data kept, admin access, screenshots sent to Anthropic, Anthropic's 30-day retention, providers, security log, retention periods, deletion, backups, and the privacy contact address. The upload screen shows the screenshot notice. Leads older than 12 months, security log entries older than 90 days, and deletion list rows older than 30 days are gone. An Account with no sign-in for 2 years gets the warning email and is deleted 30 days later. | Settings | F11, issue 71 | Browser and data ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)); [Browser and data rules](issue-76-decisions.md) | Not tested |
| F4 | Delete a test Account on the copy of the site. Restore a backup from before the deletion. The deletion list runs before the site opens. The Account, its records, and its lead stay deleted. No backup is kept longer than 30 days. | Copy | Issue 72 | Browser and data ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)); [Browser and data rules](issue-76-decisions.md) | Not tested |
| F5 | A malformed upload, a bad student ID, an Anthropic failure, and a database failure each return "Something went wrong. Try again." with an error code, or a planned message. The security log has an entry with the same code. A search of the security log and the Vercel logs after the test run finds no test password, cookie, token, reset link, screenshot, model output, request body, or full email. | Auto, Copy | F15 | Browser and data ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)); [Browser and data rules](issue-76-decisions.md) | Not tested |
| F6 | Each event in rule 27 of the browser and data rules makes one security log entry with the time, event, result, Account ID or email hash, IP address, and route. Entries are deleted after 90 days. | Copy | F15 | Browser and data ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)); [Browser and data rules](issue-76-decisions.md) | Not tested |

### G. Dependencies and code

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| G1 | Each known runtime advisory is patched or shown unreachable, within the agreed response time. | Auto, Settings | F16 | Infrastructure ([#77](https://github.com/Jahazel/lsat-scheduler/issues/77)) | Not tested |
| G2 | GitHub Dependabot alerts and secret scanning are on, or a stated replacement covers them. | Settings | Issue 71 | Infrastructure ([#77](https://github.com/Jahazel/lsat-scheduler/issues/77)) | Not tested |
| G3 | GitHub runs the automatic checks after every push. | Settings | Issue 73 | None needed | Not tested |

### H. Provider access and credentials

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| H1 | Two-step sign-in is on for Vercel, GitHub, Atlas, Google Cloud, and the Anthropic Console, for every login method. | Settings | Issue 71 | Infrastructure ([#77](https://github.com/Jahazel/lsat-scheduler/issues/77)) | Not tested |
| H2 | The app's database user can do the app's work only. It cannot manage users or other databases. | Copy, Settings | Issue 71 | Infrastructure ([#77](https://github.com/Jahazel/lsat-scheduler/issues/77)) | Not tested |
| H3 | Database network access matches the chosen policy, or the policy's replacement protection is in place. | Settings | Issue 71 | Infrastructure ([#77](https://github.com/Jahazel/lsat-scheduler/issues/77)) | Not tested |
| H4 | Your computer, the copy of the site, and the real site use different credentials. Local work cannot read or change real records. | Settings | Issue 71 | Infrastructure ([#77](https://github.com/Jahazel/lsat-scheduler/issues/77)) | Not tested |
| H5 | Each credential can be revoked at its provider. The steps are tested without showing any secret. | Copy | Issue 71 | Infrastructure ([#77](https://github.com/Jahazel/lsat-scheduler/issues/77)) | Not tested |
| H6 | The Google sign-in client has home, privacy, and terms links and no logo. It is published to "In production" with only `openid email profile`. The copy of the site uses a separate client. | Settings | Issue 71 | Account security ([#74](https://github.com/Jahazel/lsat-scheduler/issues/74)); [Account rules](issue-74-decisions.md) | Not tested |

### I. Recovery and alerts

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| I1 | A daily backup exists and is no more than 24 hours old. | Settings | Issue 71 | Database research ([#78](https://github.com/Jahazel/lsat-scheduler/issues/78)) | Not tested |
| I2 | A restore into a separate database finishes within 48 hours and the data is complete. | Copy | Issue 71 | Database research ([#78](https://github.com/Jahazel/lsat-scheduler/issues/78)) | Not tested |
| I3 | Each of the five alerts reaches the owner. | Settings | Issue 71 | None needed | Not tested |
| I4 | The emergency guide exists, and each step was tried once on the copy of the site. | Copy | Issue 71 | None needed | Not tested |

## Unknown items

These items were not verified in issue 71. Rule 2 makes each one a failure until a person checks it and records the date.

| Item | Covered by |
| --- | --- |
| Anthropic Console two-step sign-in and login methods | H1 |
| Which credentials the real site actually uses | H4 |
| Other GitHub tokens, apps, and deploy keys | H5 |
| Vercel shareable links for old deployments | H5 |
| Log retention, redaction, and access | F5, F6 |
| Alert delivery | I3 |
| External backups and restore history | I1, I2 |
| Recovery codes for each provider account | H1 |
| GitHub branch protection (blocked by plan) | G3 |

## Recovery

- **Most data you can lose:** 1 day.
- **Longest time to recover:** 2 days.
- **Restore test:** once before launch, then every 3 months.
- **Plan:** Set up daily backups on the database that the research ticket chooses. If it keeps Atlas, use the Flex plan ($8 to $30 per month). Flex keeps a daily snapshot for the last 8 days. The recovery targets do not change.

## Owner and alerts

The owner is the only person with provider access. The owner accepts this single-person risk. `CONTEXT.md` names two admins. The other admin can get permission to pause the site later, without other provider access.

**Response times:**

- Acknowledge each alert within 1 day.
- For a spend alert or a suspected breach, pause extraction or the site within 1 day.

**Required alerts.** Each alert needs a delivery test before launch.

| Alert | Source |
| --- | --- |
| Anthropic spend at $5 and $8 | Anthropic Console |
| App extraction limit reached | DrillMap |
| Database problems | Atlas email alerts |
| Site is down | A free external uptime check |
| Backup failed | Atlas or the backup job |

**Emergency guide.** A runbook in `docs/runbooks/` lists the steps: pause the Vercel project, turn off extraction with the database switch, change the app extraction limit, revoke the Anthropic key, rotate the database and Google credentials, and sign out all sessions. Redeploying with new settings does not, by itself, revoke old copies.

## Ready and go

**Ready.** A readiness claim names:

- The exact version (commit SHA).
- The date of the checks.
- A link to the evidence for each check.
- Any accepted risks.

A readiness claim expires when any of these happens:

- The live version changes.
- A provider setting on this list changes.
- 30 days pass.

**Go.** The owner gives a separate written approval that names the same version. Only then does the owner start to promote DrillMap.

## Workflow for every change

This workflow applies before and after launch.

1. **Write the code.** Work from an issue.
2. **Check the risk.** If the change is a risky change, add or update its checks in this file. If the change stores new data, sends data to a new provider, or changes a retention period, update the privacy page in the same change.
3. **Run the tests locally.**
4. **Commit the checked changes.**
5. **Push.** GitHub runs the automatic checks. The copy of the site updates. The real site does not change.
6. **Try the change on the copy of the site.**
7. **Release.** Green on GitHub means the owner can release. Red means fix first. The owner releases that exact version.
8. **Run the short test on the real site** with test accounts.

If something goes wrong, use Vercel Instant Rollback to return to the last good version. Rollback does not restore database contents or revoke credentials.

## After launch

| When | What |
| --- | --- |
| Every release | The short test on the real site |
| A change to one area | All checks for that area |
| Every month | Review the provider settings in sections G, H, and I |
| Every 3 months | A restore test |

## Accepted risks

Add a row only after the owner's written decision.

| Risk | Reason | Protection used instead | Accepted by and date | Ends |
| --- | --- | --- | --- | --- |
| The database has no backups. The free Atlas plan has none (issue 71). Lost student data cannot be recovered. | The owner wants to choose the database before paying for backups. | Check I1 fails, so DrillMap is not promoted. Few students use the site. | The owner, October 1, 2026 | November 1, 2026, or earlier if daily backups run on the chosen database |

## Remediation handoff

This work follows from the decisions above. Issue 69 keeps implementation out of scope, so no implementation tickets exist yet.

**Operations**

1. Make the four Anthropic changes in [Until launch](#until-launch). Done on October 1, 2026.
2. Set up daily backups on the database that the research ticket chooses. If it keeps Atlas, use the Flex plan ($8 to $30 per month). Flex keeps a daily snapshot for the last 8 days.
3. Create the copy of the site: its own Vercel deployment, its own database, its own Google sign-in client, and a separate Anthropic workspace with its own key and a $5 monthly limit.
4. Turn off automatic production deploys. Release by manual promotion only.
5. Set up the five alerts and test each one.
6. Write the emergency guide in `docs/runbooks/`.
7. Run the first restore test.

**Automation**

8. Add a GitHub Actions workflow that runs the automatic checks after every push.
9. Add a rule to `AGENTS.md`: a risky change must read this file and add or update its checks.
10. Add a fake extractor for tests and for the copy of the site.

**App fixes**

11. Build the protections in sections A to F after their policy tickets close.

## Policy tickets

Created on October 1, 2026, as children of issue 69. None blocks issue 73. Account security (#74) was decided on October 2, 2026. Its rules are in [issue-74-decisions.md](issue-74-decisions.md). Abuse and extraction (#75) was decided on October 2, 2026. Its rules are in [issue-75-decisions.md](issue-75-decisions.md). Browser and data (#76) was decided on October 5, 2026. Its rules are in [issue-76-decisions.md](issue-76-decisions.md).

| Ticket | Type | Scope |
| --- | --- | --- |
| Account security ([#74](https://github.com/Jahazel/lsat-scheduler/issues/74)) | Decision | Email verification, Google ID storage, account linking, password policy, reset, existing-account migration, session length, revocation timing, sign-out everywhere, recent sign-in for deletion, admin MFA, Google client publishing |
| Abuse and extraction ([#75](https://github.com/Jahazel/lsat-scheduler/issues/75)) | Decision | Signup, login, and lead limits; upload formats, size, and pixels; limit per student; retries; parallel requests; budget counting; the emergency switch; where hand-entered analytics snapshots come from |
| Browser and data ([#76](https://github.com/Jahazel/lsat-scheduler/issues/76)) | Decision | CSP and header policy, SameSite value, deletion handling, data retention, log retention, which events to log, privacy page text |
| Infrastructure ([#77](https://github.com/Jahazel/lsat-scheduler/issues/77)) | Decision | Database network access, least-privilege database user, separate credentials, credential rotation, dependency response times, two-step sign-in on provider accounts, Dependabot and secret scanning |
| Database research ([#78](https://github.com/Jahazel/lsat-scheduler/issues/78)) | Research | Keep MongoDB Atlas or move to hosted Postgres. Review again if DrillMap needs reports across many students, the data stops fitting documents, or Flex costs more than $30 per month |

## Decisions recorded

All decisions were made by the owner on October 1, 2026, in the issue 73 discussion.

| Topic | Decision |
| --- | --- |
| Signup now | Keep it open. Do not promote yet. |
| Strictness | Every check must pass. The owner can accept a named risk in writing, with an end date. |
| Unknown items | Count as failures. |
| Ready and go | Two separate steps. Readiness expires after 30 days or on any change. |
| Where checks run | The copy of the site first, then a short test on the real site. |
| Real model calls on the copy | A fake extractor by default. Real calls only in a separate workspace with a $5 limit. |
| Release control | Manual release only. |
| Recovery targets | At most 1 day of data loss and 2 days to recover. |
| Backups | Decide the database first, in the research ticket. Then set up daily backups on the database you choose. |
| Owner | The owner alone, with the risk accepted. Respond within 1 day. |
| Alerts | Five alerts, each tested. |
| Spend until launch | $20 Anthropic limit, no new credit, and emails at $5 and $8. |
| Rechecks | Each release, each changed area, monthly, and every 3 months. |
| Meaning of launch | Start to promote DrillMap. |
| New features | A risky change adds its own checks. Payments need a new review. |
| How the checklist runs | An agent rule, automatic tests on GitHub, and a stop before release. |
| Deliverable | This file, five child tickets, and summary comments on issues 73 and 69. |

The owner decided the account security rules on October 1 and 2, 2026, in the issue 74 discussion. See [issue-74-decisions.md](issue-74-decisions.md). They set checks B1 to B10 and H6.

The owner decided the abuse and extraction rules on October 2, 2026, in the issue 75 discussion. See [issue-75-decisions.md](issue-75-decisions.md). They set checks C1 to C6 and D2.

The owner decided the browser and data rules on October 5, 2026, in the issue 76 discussion. See [issue-76-decisions.md](issue-76-decisions.md). They set checks A5, E1 to E4, F1, and F3 to F6.

## Standards references

Requirement IDs come from [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.csv). They mark relevant requirements. They are not a certification.

| Section | ASVS IDs |
| --- | --- |
| A. Student data and admin powers | `v5.0.0-8.2.1`, `v5.0.0-8.2.2`, `v5.0.0-8.3.1` |
| B. Sign-in and accounts | `v5.0.0-6.2.4`, `v5.0.0-6.2.5`, `v5.0.0-6.2.8`, `v5.0.0-6.2.12`, `v5.0.0-6.3.3`, `v5.0.0-7.4.1`, `v5.0.0-7.4.2` |
| C. Abuse limits and spending | `v5.0.0-6.1.1`, `v5.0.0-6.3.1`, `v5.0.0-2.4.1` |
| D. Screenshots and model output | `v5.0.0-5.2.1`, `v5.0.0-5.2.2`, `v5.0.0-1.2.4` |
| E. Browser protections | `v5.0.0-3.4.1` to `v5.0.0-3.4.6`, `v5.0.0-3.3.1`, `v5.0.0-14.3.2` |
| F. Deletion, privacy, errors, logs | `v5.0.0-14.1.2`, `v5.0.0-14.2.3`, `v5.0.0-14.2.4`, `v5.0.0-16.2.5`, `v5.0.0-16.3.1`, `v5.0.0-16.3.2` |
| H. Provider access | `v5.0.0-13.2.1`, `v5.0.0-13.2.2`, `v5.0.0-13.3.1`, `v5.0.0-13.3.2` |

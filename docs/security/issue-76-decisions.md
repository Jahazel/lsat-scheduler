# Browser and data rules

Decisions for [issue 76](https://github.com/Jahazel/lsat-scheduler/issues/76), under [issue 69](https://github.com/Jahazel/lsat-scheduler/issues/69). Decided by the owner on October 5, 2026, America/Chicago, against checkout `c9b2304`.

**Status: decided.** These are rules for later work. None of them is built yet. The checks in [release-gate.md](release-gate.md#e-browser-protections-and-private-responses) still fail until the code passes them.

The evidence comes from issue 70 findings F11, F12, F13, and F15, and from issue 71. Recent sign-in for deletion and sign-out on all devices come from [issue 74](issue-74-decisions.md). The limit refusals that the log records come from [issue 75](issue-75-decisions.md).

## Words in this file

- **Cookie** means a small piece of data that the site stores in the browser. DrillMap uses one to keep a person signed in.
- **SameSite** is a cookie setting. It tells the browser when to send the cookie with a request that starts on another website.
- **Forged request** (CSRF) means a request that another website makes the student's browser send to DrillMap without the student knowing.
- **Origin header** is a label that the browser adds to a request. It names the website that sent the request. A website cannot fake it.
- **Header** means an instruction that the site sends with a response. The browser obeys it.
- **CSP** (Content Security Policy) is a header that tells the browser which scripts it may run.
- **Nonce** means a random value that changes on every request. With a nonce CSP, only scripts that carry the current nonce can run.
- **Cache** means a saved copy of a response, in the browser or on a CDN server between the site and the browser.
- **Transaction** means a group of database changes that succeed together or fail together.
- **Restore** means copying an old backup back into the database after a failure.
- **Lead** means an email address from the form on the landing page. A lead is not an Account. The form was removed on [issue 303](https://github.com/Jahazel/lsat-scheduler/issues/303). The `leads` table and every old lead were dropped on [issue 349](https://github.com/Jahazel/lsat-scheduler/issues/349). DrillMap keeps no leads.
- **Security log** means the list of security events that the app records.
- **Hash** means a one-way scramble of a value. Nobody can read the value back from it.
- **Private response** means any page or API response that reads a session.

## What the app does today

- Auth.js cookies use HttpOnly and SameSite=Lax. They use Secure on HTTPS (F12). The real site was not checked.
- Server Actions check the Origin header. The approval and extraction Route Handlers do not. Approval accepts any content type (F12).
- `next.config.ts` sets no CSP, framing, referrer, content-type, HSTS, or permissions header (F13). The landing page on the real site sent none of these headers (issue 71).
- Private JSON handlers set no `Cache-Control` header (F13).
- Account deletion removes records one at a time, with no transaction or retry. A failure can leave part of the data (F11).
- Account deletion does not remove the lead with the same email (F11).
- The privacy page promises encrypted backups that expire in 30 days. No backups exist (issue 71). The page does not say that screenshots go to Anthropic, which keeps them for 30 days.
- The AI disclosure page is a placeholder. It says AI makes the weekly plan. Only screenshot extraction uses AI.
- No security log exists. Vercel keeps runtime logs for 1 hour on the Hobby plan ([runtime logs](https://vercel.com/docs/logs/runtime)).
- Some failures have no safe response branch, such as a bad upload body or a bad student ID (F15).

## Decisions

### Cookies

1. The session cookie is Secure, HttpOnly, and SameSite=Lax.

**Why:** Strict sends no cookie when a person clicks a link from another site. The verification and reset links from issue 74 come from email, and the Google sign-in return comes from Google. Rule 2 gives the real protection against forged requests.

### Forged requests

2. One shared check runs on every request that changes data, before any write, email, or Anthropic call.
3. The `Origin` header must equal the DrillMap site origin. A request with a different or missing `Origin` is refused with HTTP 403.
4. JSON routes need `Content-Type: application/json`. Only the extraction route accepts `multipart/form-data`. A wrong content type is refused with HTTP 415.
5. Each refusal goes in the security log (rule 27).

**Why:** A secret token in each request adds little for a site with SameSite=Lax cookies and an Origin check.

Built on [issue 337](https://github.com/Jahazel/lsat-scheduler/issues/337):

- The proxy applies one pure function, `requestPolicy`, before any page, Server Action, or Route Handler runs.
- "Changes data" means every method except GET, HEAD, and OPTIONS.
- The site origin comes from `SITE_URL`, the same setting as the email links. A local run without it uses `http://localhost:3000`. A Vercel place without it refuses every request that changes data.
- Server Actions accept the two content types that Next.js 16 sends: `text/plain` for encoded arguments and `multipart/form-data` for arguments that hold a file or form data. A plain HTML form's `application/x-www-form-urlencoded` gets HTTP 415.
- The two extraction routes accept only `multipart/form-data`. Every other `/api/` route accepts only `application/json`.
- Two routes are exempt. The Auth.js routes under `/api/auth/`: Google's redirect back is a GET, and Auth.js checks its own CSRF token on its POSTs. The daily cleanup cron route: Vercel calls it with a GET and the cron secret.
- Each refusal writes one `forged_request_refused` entry with the result `wrongOrigin`, `noOrigin`, or `wrongContentType`. The entry names the route template, never the typed path. A path that is not an app route is logged as `/other`. Migration `0016_forged_request_event` adds the event to the check list.

### Content Security Policy

6. Every page response sends a CSP with a fresh nonce for each request: `script-src 'self' 'nonce-…' 'strict-dynamic'` and `style-src 'self' 'nonce-…'`.
7. The CSP also holds `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'none'`. A new source is added only when a feature needs it.
8. Pages render on each request so that the nonce works.
9. The CSP runs in report-only mode on the copy of the site first. It is enforced when sign-in, onboarding, upload, this week, progress, and the admin pages work with no CSP reports.

**Why:** A CSP that allows inline scripts does not stop an injected script. Most DrillMap pages already render on each request because they need a session, so the cost is small. Google sign-in is a redirect, not a script, so the CSP does not affect it.

**Owner decision, October 28, 2026 ([#348](https://github.com/Jahazel/lsat-scheduler/issues/348)): style attributes are allowed.** The CSP adds `style-src-attr 'unsafe-inline'`. This replaces the strict reading of rule 6 for style attributes only. `<style>` elements still need the nonce, and `script-src` stays strict.

**Why:** The bars in Progress, onboarding, the week preview, and the progress bar set their size with style attributes. A style attribute cannot run a script.

Built on [issue 350](https://github.com/Jahazel/lsat-scheduler/issues/350):

- The full CSP is `default-src 'self'`; `script-src 'self' 'nonce-…' 'strict-dynamic'`; `style-src 'self' 'nonce-…'`; `style-src-attr 'unsafe-inline'`; `img-src 'self' blob: data:`; `font-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`. Development also allows `'unsafe-eval'` in `script-src`, because React uses `eval` there to show server error stacks in the browser.
- `requestPolicy` makes a new nonce and the CSP for each request. The proxy puts the CSP on the request, where Next.js reads the nonce and adds it to its scripts and styles, and on the response.
- Every page already renders on each request, because the root layout reads the session. The production build lists every route as dynamic.
- `CSP_MODE` chooses the mode. Unset, the header is `Content-Security-Policy-Report-Only`. `CSP_MODE=enforce` makes it `Content-Security-Policy`. Turning on enforcement is a setting change and a new deployment, with no code change.

### Other headers

10. Every response sends:
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Strict-Transport-Security: max-age=63072000`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
11. HSTS does not use `includeSubDomains` or `preload`, because DrillMap uses a `vercel.app` address.

Built on [issue 350](https://github.com/Jahazel/lsat-scheduler/issues/350): the proxy sets these headers from `requestPolicy` on every response it handles, including redirects and refusals. `next.config.ts` sets the same headers on the static files that the proxy skips. The email verification and reset pages send `Referrer-Policy: no-referrer` in place of the default, because their URLs hold a token.

### Private responses

12. Every private response sends `Cache-Control: private, no-store`. This covers pages, Route Handlers, and Server Action responses.
13. Public pages may be cached: the landing page, the legal pages, login, and signup.
14. Sign-out sends `Clear-Site-Data: "cache"`.

### Account deletion

15. Step 1 marks the Account as "deleting." From then on, every protected request is refused, through the session check in issue 74 rule 24.
16. Step 2 deletes, in one transaction, the Account, the Student, its analytics snapshots, weekly schedules, and activity check-ins.
17. Step 2 also adds a row to the deletion list (rule 30).
18. If step 2 fails, the student sees a message that deletion will finish. A retry by the student or a daily job finishes every Account marked "deleting."
19. A retry never removes the mark and never restores access.

Built on [issue 351](https://github.com/Jahazel/lsat-scheduler/issues/351):

- Migration `0017_two_step_deletion` adds `accounts.deleting_since` and the `deletion_list` table. A trigger refuses any change to `deleting_since` once it is set, for every database login. The app role can add deletion list rows, and cannot read, change, or delete them. It removes rows older than 30 days only through `prune_deletion_list()`, as it does for the security log.
- Step 1 sets `deleting_since` after the Recent sign-in, `DELETE`, and current password checks. The session check refuses a marked Account the same way it refuses a Disabled one.
- Step 2 deletes the marked Account and adds its deletion list row in one transaction. Step 2 never deletes an unmarked Account. The deletion list row holds the email hash from the security log's keyed hash.
- If step 2 fails, the student is signed out to Login, which shows the "deletion will finish" message. The failure is in the security log with its code, and the `account_deletion` entry has the result `willFinish`.
- The student retry is a sign-in, because a marked Account has no session. A Google sign-in, or a password sign-in with the right password, runs step 2 and is always refused. Login then says the Account is deleted, or shows the "will finish" message again. The `sign_in` entry has the result `accountDeleted` or `deletionWillFinish`.
- Waiting for owner approval on issue 351's pull request: the two Login texts, "Your Account is being deleted and can't log in. DrillMap will finish the deletion." and "Your Account is deleted."
- The privacy page states the deletion list and its 30 days. The sentence about restores waits for deletion replay ([issue 353](https://github.com/Jahazel/lsat-scheduler/issues/353)), as above for rule 36.
- The daily job runs step 2 for every marked Account, then deletes deletion list rows older than 30 days (rule 24).

### How long data is kept

20. Account data stays until the student deletes the Account.
21. An Account with no sign-in for 2 years gets a warning email. If there is still no sign-in 30 days later, the app deletes it with rules 15 to 19.
22. DrillMap keeps no leads. The `leads` table is dropped.
23. Security log entries are deleted 90 days after they are written.
24. Deletion list rows are deleted 30 days after they are written.

**Why:** LSAT study usually lasts months. Two years keeps data for students who come back after a break.

Changed by the owner on October 28, 2026 (owner decision 2 on [issue 348](https://github.com/Jahazel/lsat-scheduler/issues/348)), built on [issue 349](https://github.com/Jahazel/lsat-scheduler/issues/349):

- The `leads` table is dropped. Migration `0015_drop_leads` deletes the table and every old lead.
- This replaces rule 22. It also replaces the lead parts of rule 16 (delete the lead with the same email) and rule 31 (delete each restored lead).
- No lead retention or lead matching is built. The privacy page does not name leads.

### Security log

25. The security log is a collection in the main database. The database deletes old entries automatically (rule 23).
26. Each entry holds the time, the event, the result, the Account ID, the IP address, and the route. For a failed sign-in with an unknown email, the entry holds a hash of the email instead of an Account ID.
27. The app logs these events:
    - Sign-in success and failure
    - Sign-out on all devices
    - Email verification
    - Password reset request and completion
    - Password change
    - Admin role change
    - Account deletion
    - Refused access to another student's data
    - Refused admin action
    - Each limit refusal from issue 75
    - The extraction budget cutoff and the emergency switch change
    - Refused forged requests (rules 3 and 4)
    - Unexpected errors (rule 29)
28. An entry never holds a password, token, cookie, reset link, screenshot, model output, request body, or full email address.

Added by the owner on October 28, 2026, on [issue 316](https://github.com/Jahazel/lsat-scheduler/issues/316):

- When an Account is deleted, its security log entries stay until their 90 days end. The Account ID in them becomes empty. The time, event, result, route, and IP address stay.
- The Admin role change and the emergency switch change are made outside the app, with `npm run make-admin` or SQL. Database triggers record them, so every path makes an entry.
- Refused forged requests are recorded when the check for rules 2 to 5 is built ([issue 337](https://github.com/Jahazel/lsat-scheduler/issues/337)).

**Why:** Vercel Hobby keeps logs for 1 hour, which is too short to look into an attack. A database collection needs no new provider, as with the issue 75 counters. Ninety days is long enough to find slow attacks.

### Errors

29. Every unexpected failure returns one plain message, "Something went wrong. Try again.", and a short error code. The security log stores the same code with the time, the route, and the error type.

### Restores

30. The deletion list holds the Account ID, a hash of the email, and the date. It holds nothing else.
31. After every restore, the app runs the deletion list again before the site opens. This deletes each restored Account and its records.
32. No backup is kept longer than a deletion list row (rule 24).

**Why:** Without rule 31, a restore from a backup made before a deletion brings the deleted Account back. Atlas Flex keeps backups for 8 days, so 30 days leaves a wide margin.

### Screenshots

33. The upload screen shows this notice before the student sends an image: "Your screenshot is sent to Anthropic to read your analytics. Anthropic keeps it for up to 30 days. DrillMap does not store it. Crop out anything you do not want to share."
34. DrillMap accepts Anthropic's 30-day retention. Zero data retention needs a sales agreement, which does not fit DrillMap.

### Privacy page

35. The privacy page uses the [approved text](#approved-privacy-page-text). The AI disclosure page uses the [approved text](#approved-ai-disclosure-text).
36. The pages state only what is true on the day of release. Text in square brackets is filled in with the facts of that day.
37. Privacy requests go to an address used only for DrillMap. It has Google 2-Step Verification on. The owner chooses the address before launch.
38. A change that stores new data, sends data to a new provider, or changes a retention period updates the privacy page in the same change.

## Approved privacy page text

Updated on October 19, 2026 (#145) for the move to Neon ([issue 78](issue-78-database-research.md#decision)). The database line names Neon. The backup period is 14 days, as set in #144. Stage 6 builds deletion replay. Until then, the live page leaves out the sentence about deleting Accounts again after a restore (rule 36).

> **Privacy Policy**
> Last updated: [release date]
>
> **What DrillMap stores**
> - Your Account: your email address, your sign-in method (Google or password), and the date you last signed in. For a password, we store only a secure scramble (hash) of it, never the password itself.
> - Your study information: your study settings, approved analytics snapshots, weekly schedules, and activity check-ins.
> - If you join the email list on the home page, we store that email address.
>
> We use this information only to make and show your weekly study schedule and your progress. We do not sell it. We do not show ads. We do not use tracking or advertising cookies. We use one cookie to keep you signed in.
>
> **Who can see your data**
> You can see your own data. The two people who run DrillMap (admins) can see every student's saved weekly schedule, for support and to check that the app works.
>
> **Your 7Sage screenshots**
> When you upload a screenshot, DrillMap sends it to Anthropic, an AI company, to read your analytics numbers. Anthropic keeps the image for up to 30 days and then deletes it. DrillMap does not store the screenshot. It stores only the numbers you review and approve. Crop out anything you do not want to share before you upload. AI does not make your schedule. Fixed rules make it from your approved numbers and settings.
>
> **Companies that handle your data for us**
> - Vercel runs the website.
> - Neon stores the database.
> - Google handles sign-in if you choose "Sign in with Google."
> - Anthropic reads screenshots, as described above.
> - Resend sends verification, password reset, and account notices.
>
> **Security records**
> To protect your Account, we record security events, for example sign-ins, failed sign-ins, and password resets. Each record holds the time, the event, your Account ID, and the IP address of the request. It never holds your password or your screenshots. We delete these records after 90 days.
>
> **How long we keep data**
> - Your Account and study information: until you delete your Account. If you do not sign in for 2 years, we email you, and we delete your Account 30 days later.
> - Email list addresses: 12 months, or until you delete an Account with the same email.
> - Security records: 90 days.
>
> **Deleting your Account**
> You can delete your Account on the Account page. You must have signed in within the last 10 minutes. Deletion removes your Account, study settings, analytics snapshots, weekly schedules, activity check-ins, and email list address. You are signed out on all devices. We keep only a short record that holds your Account ID and a scrambled form of your email. We use it for 30 days to make sure a restore from backup cannot bring your data back.
>
> **Backups**
> [Before issue 78 is done:] DrillMap does not keep backups of the database at this time. If the database fails, data can be lost.
> [After backups start:] We keep daily database backups for [14] days. We use them only to recover the service after a failure. After a restore, we delete again every Account that was deleted before.
>
> **Contact**
> For questions about your data, or to ask us to delete your Account when you cannot sign in, email [DrillMap privacy address].

## Approved AI disclosure text

> **How DrillMap uses AI**
> DrillMap uses AI for one task only: reading the numbers in your 7Sage analytics screenshot. Anthropic's Claude model does this. You see the numbers before anything is saved, and you can correct them. If AI cannot read the screenshot, or if the monthly reading limit is reached, you can type the numbers in by hand.
>
> AI does not make your weekly schedule. Fixed rules make it from your approved numbers and study settings.
>
> Anthropic keeps each screenshot for up to 30 days and then deletes it. DrillMap does not store screenshots. See the Privacy Policy for more.

## Checks

The [launch checklist](release-gate.md#e-browser-protections-and-private-responses) holds the full text of each check. This table shows which rules each check tests.

| Check | Rules |
| --- | --- |
| [A5](release-gate.md#a-student-data-and-admin-powers) | 12 to 14 |
| E1 | 2 to 5 |
| E2 | 1 |
| E3 | 12, 13 |
| E4 | 6 to 11 |
| [F1](release-gate.md#f-deletion-privacy-errors-and-logs) | 15 to 19 |
| F3 | 20 to 24, 33 to 38 |
| F4 | 24, 30 to 32 |
| F5 | 26, 28, 29 |
| F6 | 25 to 27 |

## Not decided here

- The email provider belongs to issue 74 and the infrastructure ticket ([#77](https://github.com/Jahazel/lsat-scheduler/issues/77)).
- Backups and the database choice belong to the database research ticket ([#78](https://github.com/Jahazel/lsat-scheduler/issues/78)).
- The privacy contact address is chosen by the owner before launch (rule 37).
- A lawyer has not reviewed the privacy text. Issue 69 does not include legal review.

## Decisions recorded

The owner made each decision in the issue 76 discussion.

| Topic | Answer |
| --- | --- |
| SameSite | Lax. |
| Forged requests | Origin and content-type checks on every request that changes data. No CSRF token. |
| CSP | Strict, with a nonce. Report-only on the copy of the site first. Style attributes allowed (owner decision, October 28, 2026). |
| Other headers | As in rule 10. |
| Private responses | `private, no-store`. Sign-out clears the browser cache. |
| Account deletion | Mark first, then one transaction. A retry or a daily job finishes it. |
| Account data | Kept until deletion, or 2 years with no sign-in after a warning email. |
| Leads | None kept. The owner dropped the `leads` table on October 28, 2026 (rule 22). |
| Security log | A database collection, kept 90 days. |
| Logged events and fields | As in rules 26 to 28. |
| Restores | A deletion list, kept 30 days, runs again after every restore. |
| Screenshots | A notice on the upload screen. Anthropic's 30-day retention is accepted. |
| Errors | A plain message and an error code. |
| Privacy contact | An address used only for DrillMap, chosen before launch. |
| Privacy page upkeep | Updated in the same change as any data handling change. |
| Privacy and AI disclosure text | As approved above. |

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
- **Lead** means an email address from the form on the landing page. A lead is not an Account. The form was removed on [issue 303](https://github.com/Jahazel/lsat-scheduler/issues/303). The `leads` table stays, unused: the app no longer writes to it.
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

### Content Security Policy

6. Every page response sends a CSP with a fresh nonce for each request: `script-src 'self' 'nonce-…' 'strict-dynamic'` and `style-src 'self' 'nonce-…'`.
7. The CSP also holds `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'none'`. A new source is added only when a feature needs it.
8. Pages render on each request so that the nonce works.
9. The CSP runs in report-only mode on the copy of the site first. It is enforced when sign-in, onboarding, upload, this week, progress, and the admin pages work with no CSP reports.

**Why:** A CSP that allows inline scripts does not stop an injected script. Most DrillMap pages already render on each request because they need a session, so the cost is small. Google sign-in is a redirect, not a script, so the CSP does not affect it.

### Other headers

10. Every response sends:
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Strict-Transport-Security: max-age=63072000`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
11. HSTS does not use `includeSubDomains` or `preload`, because DrillMap uses a `vercel.app` address.

### Private responses

12. Every private response sends `Cache-Control: private, no-store`. This covers pages, Route Handlers, and Server Action responses.
13. Public pages may be cached: the landing page, the legal pages, login, and signup.
14. Sign-out sends `Clear-Site-Data: "cache"`.

### Account deletion

15. Step 1 marks the Account as "deleting." From then on, every protected request is refused, through the session check in issue 74 rule 24.
16. Step 2 deletes, in one transaction, the Account, the Student, its analytics snapshots, weekly schedules, activity check-ins, and the lead with the same email.
17. Step 2 also adds a row to the deletion list (rule 30).
18. If step 2 fails, the student sees a message that deletion will finish. A retry by the student or a daily job finishes every Account marked "deleting."
19. A retry never removes the mark and never restores access.

### How long data is kept

20. Account data stays until the student deletes the Account.
21. An Account with no sign-in for 2 years gets a warning email. If there is still no sign-in 30 days later, the app deletes it with rules 15 to 19.
22. A lead is deleted 12 months after it is saved, or when an Account with the same email is deleted.
23. Security log entries are deleted 90 days after they are written.
24. Deletion list rows are deleted 30 days after they are written.

**Why:** LSAT study usually lasts months. Two years keeps data for students who come back after a break.

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

**Why:** Vercel Hobby keeps logs for 1 hour, which is too short to look into an attack. A database collection needs no new provider, as with the issue 75 counters. Ninety days is long enough to find slow attacks.

### Errors

29. Every unexpected failure returns one plain message, "Something went wrong. Try again.", and a short error code. The security log stores the same code with the time, the route, and the error type.

### Restores

30. The deletion list holds the Account ID, a hash of the email, and the date. It holds nothing else.
31. After every restore, the app runs the deletion list again before the site opens. This deletes each restored Account, its records, and its lead.
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
| CSP | Strict, with a nonce. Report-only on the copy of the site first. |
| Other headers | As in rule 10. |
| Private responses | `private, no-store`. Sign-out clears the browser cache. |
| Account deletion | Mark first, then one transaction. A retry or a daily job finishes it. |
| Account data | Kept until deletion, or 2 years with no sign-in after a warning email. |
| Leads | 12 months, and deleted with the matching Account. |
| Security log | A database collection, kept 90 days. |
| Logged events and fields | As in rules 26 to 28. |
| Restores | A deletion list, kept 30 days, runs again after every restore. |
| Screenshots | A notice on the upload screen. Anthropic's 30-day retention is accepted. |
| Errors | A plain message and an error code. |
| Privacy contact | An address used only for DrillMap, chosen before launch. |
| Privacy page upkeep | Updated in the same change as any data handling change. |
| Privacy and AI disclosure text | As approved above. |

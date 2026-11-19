# Emergency guide

Steps for abuse, a leaked key, spend near the limit, or a lost database. Stage 5 ([issue 251](https://github.com/Jahazel/lsat-scheduler/issues/251))
adds the scanning switch and the monthly money limit. Stage 7 adds the other steps listed in the
[launch checklist](../security/release-gate.md#owner-and-alerts).

## Words in this file

- **Scan**: one paid Anthropic call that reads one screenshot.
- **Emergency switch**: the `scanning_off` setting. When it is `true`, no scan starts.
- **Monthly limit**: the `monthly_limit_usd` setting. The month's money total never goes over it.
- **Month's total**: the `total_usd` value for the current month in `scan_spending`. Each scan adds $0.02
  (analytics) or $0.03 (practice-test section) before its call. A reply replaces that amount with the real cost.
  A month starts at midnight on the 1st, America/Chicago. The app keeps this month and last month and deletes older months.

Students who are refused see "Scanning is off right now. Enter your analytics by hand."

## Which section to use

Each step in the launch checklist's [emergency guide list](../security/release-gate.md#owner-and-alerts) has its own section:

| Emergency step | Section |
| --- | --- |
| Pause the Vercel project | [Pause the site](#pause-the-site) |
| Turn off extraction with the database switch | [Turn scanning off](#turn-scanning-off) |
| Change the app extraction limit | [Change the monthly limit](#change-the-monthly-limit) |
| Revoke the Anthropic key | [Revoke the Anthropic key](#revoke-the-anthropic-key) |
| Rotate the database, Google, and Stripe credentials, and every other credential | [Rotate a credential](#rotate-a-credential) |
| Sign out all sessions | [Sign out every session](#sign-out-every-session) |
| Restore the database | [Restore the database from a backup](#restore-the-database-from-a-backup) |

## Where to run the commands

Run each command in Neon's browser SQL Editor as the Neon owner, on the right branch: the copy or production.
The app's database login can read these settings but cannot change them. A change works on the next scan,
with no release.

## Turn scanning off

```sql
UPDATE scan_settings SET scanning_off = true;
```

Turn it back on:

```sql
UPDATE scan_settings SET scanning_off = false;
```

## Change the monthly limit

```sql
UPDATE scan_settings SET monthly_limit_usd = 15;
```

The limit starts at $10. If you set it above $20, also raise the Anthropic monthly spend limit in the
Anthropic Console. Otherwise Anthropic stops all scans first.

## Read the current state

```sql
SELECT scanning_off, monthly_limit_usd FROM scan_settings;
SELECT month_start, total_usd, warning_sent_at, limit_alert_sent_at FROM scan_spending;
```

## Spend alerts

The app sends a fail signal to a Healthchecks.io check in two cases, at most once each month:

| Alert | When | Server setting |
| --- | --- | --- |
| App spend at 80% of the limit | A scan's count moves the month's total to 80% of the limit or more. | `SCAN_SPEND_WARNING_PING_URL` |
| App extraction limit reached | A scan is refused because its count would put the total over the limit. | `SCAN_LIMIT_REACHED_PING_URL` |

Set up each check once for the copy and once for the real site, four checks in total. Put each ping URL in
the Vercel server settings for its own environment. Never share a URL between the copy and the real site.
A missing URL is logged as `spend_alert_not_configured` and does not stop the scan. A missing URL or a failed send leaves the alert unsent, so the next scan that meets the condition tries again.

The checks must alert only on a fail signal, never on silence:

1. Create the check in Healthchecks.io and connect your email.
2. Pause the check. A paused check sends no alert when no ping arrives.
3. When a fail signal arrives, the check leaves the paused state, goes down, and emails you.
4. After you act on the alert, pause the check again so the next month's signal alerts.

Do not turn on "Ignore the ping, stay in the paused state". It hides the fail signal.

## Pause the site

Use this when the site must go offline at once: a breach, a leaked database login, or abuse that the
scanning switch cannot stop.

**What students see:** every page answers with Vercel's `503` page, `DEPLOYMENT_PAUSED`. Nothing they
typed is saved while the site is paused. Stripe keeps each message it cannot deliver and retries it for up
to 3 days. The daily cleanup cannot run.

1. In Vercel, open the site's project: the copy's project or the real site's project. Check the name twice.
2. Open Settings → General. In the Pause Project section, above Delete Project, choose Pause Project.
3. Type the project name to confirm, and choose Pause Project.
4. Check: open the site in a private window. It must show the `503` page.

   ```sh
   curl -s -o /dev/null -w '%{http_code}\n' https://SITE/
   ```

   It must print `503`.
5. Record the UTC time of the pause.

Pausing stops the site from answering. It does not revoke any credential. A leaked key or password still
works at its provider until you revoke it there, so go on to the right section below while the site is
paused.

### Bring the site back

1. In the same project, open Settings → General and choose Resume Project. Vercel resumes the production
   deployment within a few minutes without a redeploy.
2. Check: `curl` as above must print `200`. Sign in with a test Account and open This week.
3. In Vercel, open the project's Cron Jobs and choose Run on the daily cleanup. Request Logs must show
   `GET /api/cron/daily-cleanup` with `200`.
4. In Stripe, Developers → Webhooks → the site's endpoint: the messages sent during the pause are delivered,
   or retry by themselves.
5. Record the UTC time the site came back.

## Revoke the Anthropic key

Use this when the Anthropic key leaked or scans cost money they should not.

**What students see:** with scanning off, "Scanning is off right now. Enter your analytics by hand."
Typing analytics by hand, This week, and Progress keep working. Without the switch, a scan fails with an
error and a code instead, so turn the switch on first.

1. [Turn scanning off](#turn-scanning-off) on the site's branch.
2. Copy only, if the password manager holds the current key: enter it, and run the check below. Anthropic
   must answer `200`. Keep the terminal open. The request lists models and costs nothing.

   ```sh
   read -rs OLD_ANTHROPIC_KEY && export OLD_ANTHROPIC_KEY   # the copy's current Anthropic key
   : "${OLD_ANTHROPIC_KEY:?enter the old key first}" &&
     node -e 'fetch("https://api.anthropic.com/v1/models", { headers: { "x-api-key": process.env.OLD_ANTHROPIC_KEY, "anthropic-version": "2023-06-01" } }).then((response) => console.log(response.status))'
   ```

3. In the Anthropic Console, open the site's workspace: the $5 copy workspace or the real site's workspace.
   Open Settings → API keys. Find the key whose name matches the site. Choose its menu → Delete.
4. Prove that Anthropic refuses the old key: the key is gone from the list. Copy: run the check from step 2
   again in the same terminal. Anthropic must answer `401`. Then `unset OLD_ANTHROPIC_KEY`. Do not test the
   real site's key from your computer, not even the old one.
5. Record the UTC time of the revoke. Scans stay off until you give the site a new key with
   [Rotate the Anthropic key](#rotate-the-anthropic-key).

## Sign out every session

Use this when a session cookie may be stolen, or after a breach.

DrillMap keeps no session rows. Each session is a cookie that Auth.js encrypts with `AUTH_SECRET`. The
cookie holds the Account's session number, and the site checks it against `accounts.session_version` on
every page. Raising every Account's number ends every session at once.

**What students see:** the next page they open sends them to Log in, with "Your session ended. Log in
again." They sign in again with Google or
their password. Nothing they saved is lost. Both Admins are signed out too.

1. In Neon's SQL Editor, on the site's branch, as the Neon owner, run:

   ```sql
   UPDATE accounts SET session_version = session_version + 1;
   ```

   It must report one updated row for each Account. No release is needed.
2. Check: a browser that was signed in before the step opens This week and goes to Log in with "Your
   session ended. Log in again." A fresh sign-in works.
3. Record the UTC time and the updated row count.

A new `AUTH_SECRET` also refuses every old cookie, because the site can no longer read it. Use
[Rotate `AUTH_SECRET`](#rotate-auth_secret) when the secret itself may have leaked. When only cookies leaked,
the update above is enough and leaves the email hashes alone.

## Restore the database from a backup

Follow the [restore runbook](restore.md) step by step. Restore into a new branch. Before the site uses
that branch:

1. Run `npm run check-backup-ages` with the current branch's ID as `BACKUP_BRANCH_ID`. It must not
   name the restored branch. If it names only other copies, go on and remove them afterwards.
2. Run `npm run replay-deletions` on the restored branch, with the current branch's deletion list. Run it
   twice. The second run must print `Restored Accounts deleted: 0.`
3. Then run `npm run resync-billing` on the restored branch with a Stripe key and the site's
   `AUTH_SECRET`. The copy uses its sandbox key. The real site uses a one-run restricted key that you create
   for the restore and delete after it; the [restore runbook](restore.md) says how. Run it twice. Both
   runs must print the same counts and end with `Billing records Stripe does not list: 0.`

Only then change the site's `DATABASE_URL`, as [restore runbook step 7](restore.md#steps) says. It records
how long the restore took against the 48-hour limit. The replay refuses production hosts. On the real site, do not
let the site use a restored branch until the owner decides how to run the replay there. Afterwards, remove the former branch, every `_old_` branch,
unused restore branches, and every expired snapshot, each with the owner's approval.

## Rotate a credential

Each site has its own value of every credential (H4). Rotate the copy's value on the copy and the real
site's value on the real site. The drill (H5) rotates every copy credential once before launch and then each
year.

| Credential | Setting | Where it lives | Section |
| --- | --- | --- | --- |
| App database password | `DATABASE_URL` | Vercel | [Rotate the app database password](#rotate-the-app-database-password) |
| Migration role password | `MIGRATION_DATABASE_URL` | GitHub environments `migrations-copy` and `migrations-production` | [Rotate the migration role password](#rotate-the-migration-role-password) |
| Google client secret | `AUTH_GOOGLE_SECRET` | Vercel | [Rotate the Google client secret](#rotate-the-google-client-secret) |
| Auth.js secret | `AUTH_SECRET` | Vercel, and the password manager for restores | [Rotate `AUTH_SECRET`](#rotate-auth_secret) |
| Anthropic key | `ANTHROPIC_API_KEY` | Vercel | [Rotate the Anthropic key](#rotate-the-anthropic-key) |
| Resend key | `RESEND_API_KEY` | Vercel | [Rotate the Resend key](#rotate-the-resend-key) |
| Backup checker's Neon key | `NEON_API_KEY` | GitHub environments `backup-checker-copy` and `backup-checker-production`, and the password manager for restores | [Rotate the backup checker's Neon key](#rotate-the-backup-checkers-neon-key) |
| Cron secret | `CRON_SECRET` | Vercel | [Rotate the cron secret](#rotate-the-cron-secret) |
| Stripe secret key | `STRIPE_SECRET_KEY` | Vercel | [Rotate the Stripe secret key](#rotate-the-stripe-secret-key) |
| Stripe message secret | `STRIPE_WEBHOOK_SECRET` | Vercel | [Rotate the Stripe message secret](#rotate-the-stripe-message-secret) |
| J8 price-check key | none | The password manager | [Rotate the price-check key](#rotate-the-price-check-key) |

Rules for every rotation:

- **A redeploy does not revoke old copies.** A new value in Vercel or GitHub only changes what the next
  deployment or run reads. Whoever holds the old value can still use it at the provider until you revoke it
  there. Older Vercel deployments also keep the old settings at their own deployment URLs. Before each
  rotation, check the project's Settings → Deployment Protection: Vercel Authentication must be on with
  Standard Protection, so only the production domain is public. If it is not, delete the older deployments
  after the rotation.
- **Enter values at a hidden prompt.** Use `read -rs`, never a command argument, a file, an issue, or a chat.
  `unset` each value after its check. Never print a value. Record only the date of each rotation.
- **Never test a real-site value from your computer, not even the old one** (H4, J7). On the real site the
  refusal proof is the provider's own list, which shows the old value revoked, expired, or gone.
- **Prove a copy check works before you trust its refusal.** Enter the old value at the hidden prompt
  before you revoke it, and run the section's check once: it must give the "works" answer the section
  names. Keep that terminal open. After the revoke, run the same check again: it must give the refusal
  answer. To run it again, run only the lines after `read -rs`. Each check stops with an error when its
  value is empty, so a blank prompt cannot pass.
- **The copy's old value must come from the password manager.** Most providers show a value only once. If
  the password manager does not hold the copy's old value, the provider's list is the copy's proof too, and
  the evidence says so.
- **Redeploy in Vercel** means: open the project's Deployments, choose the latest production deployment's
  menu → Redeploy, and wait until it is Ready. Each setting in Vercel is for Production only and marked
  Sensitive.

### Rotate the app database password

The app's login is the role `drillmap_app` on the site's Neon branch. `DATABASE_URL` in Vercel holds its
password.

**What students see:** pages that read data fail between step 1 and step 4, so do the steps without a
break, or [pause the site](#pause-the-site) first after a leak. Nothing saved is lost.

1. In Neon, open the site's project and branch → Roles → `drillmap_app` → Reset password. Neon shows the new
   password once. Copy it; do not save it in a file.
2. In Vercel, replace `DATABASE_URL`: the same connection string as before, with only the password changed.
   Keep the pooled host and `sslmode=verify-full`. Build the value in the Vercel field, not in a file.
3. A changed password stops only new logins. End the sessions that logged in with the old one. In Neon's
   SQL Editor as the Neon owner:

   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'drillmap_app';
   ```

4. Redeploy in Vercel.
5. Check that the site works with the new password: sign in with a test Account and open This week and
   Progress.
6. Check that Neon refuses the old password. Copy only, with the old value from the password manager:

   ```sh
   PSQL_HISTORY=/dev/null PGSSLMODE=verify-full PGSSLROOTCERT=system \
     psql -X -h DIRECT_HOST -U drillmap_app -d DATABASE_NAME -W -c 'select 1'
   ```

   Enter the old password at the prompt. It must fail with `password authentication failed`. Real site: in
   Neon's SQL Editor, `SELECT count(*) FROM pg_stat_activity WHERE usename = 'drillmap_app'
   AND backend_start < 'RESET_TIME';` returns `0`, with the UTC time of step 1.
7. Save the new password in the password manager. Clear the clipboard.

If Neon's Reset password refuses the role, use the two-step method in the
[controlled move runbook](controlled-neon-move.md#set-the-app-password).

### Rotate the migration role password

The migration role `drillmap_migrator` runs the release migrations. Its password lives only in the GitHub
environment secret `MIGRATION_DATABASE_URL` and the password manager. See the
[release migrations runbook](release-migrations.md#replace-or-remove-the-migration-password).

**What students see:** nothing. Only migration runs use this role.

1. After a leak: delete the environment secret first, so no run can use it. Then, as the Neon owner, run the
   three statements in
   [Replace or remove the migration password](release-migrations.md#replace-or-remove-the-migration-password).
   The last one must return `0`.
2. Set a new password with
   [setup step 2](release-migrations.md#2-set-the-migration-password). Use Neon's Reset password on the
   role when it already has one.
3. End the sessions that logged in with the old password:

   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'drillmap_migrator';
   ```

4. Store the new value with [setup step 3](release-migrations.md#3-store-the-secret), in the site's
   environment only: `migrations-copy` or `migrations-production`.
5. Check that the new password works. Copy: in GitHub Actions, run the migration workflow by hand from
   `main`. The copy job must print `Target: copy.` and `New migrations: 0.` Real site: the next approved
   release run proves it; record that run.
6. Check that Neon refuses the old password: copy only, the `psql` check from the
   [app database password](#rotate-the-app-database-password) step 6 with `-U drillmap_migrator`, using the
   old value from the password manager. It must fail. Real site: the `pg_stat_activity` count for
   `drillmap_migrator` with `backend_start` before the reset is `0`.

### Rotate the Google client secret

Each site has its own Google client in Google Cloud Console. `AUTH_GOOGLE_SECRET` in Vercel holds its
secret. Google lets a client hold two secrets at once, so the rotation can overlap.

**What students see:** nothing during the overlap. After a leak, when you disable the old secret first,
Google sign-in shows "Google sign-in didn't finish. Try again, or use a Google account with a verified
email." until step 5 is done. Students already signed in stay signed in, and password sign-in keeps working.

1. Copy only, if the password manager holds the current secret: enter the client ID and the secret, and run
   the check in step 8. Google must print `invalid_grant`, which means it accepted the secret and refused
   only the fake code. Keep the terminal open.
2. In Google Cloud Console, open APIs & Services → Credentials → the site's OAuth client. Check the client
   name twice.
3. Choose Add secret. Copy the new secret once; do not save it in a file.
4. In Vercel, replace `AUTH_GOOGLE_SECRET`.
5. Redeploy in Vercel.
6. Check that the site works with the new secret: sign in with Google in a private window. This week opens.
7. In the OAuth client, disable the old secret, then delete it.
8. Check that Google refuses the old secret. Real site: the old secret is gone from the client's list.
   Copy: the same, and run this check again in the terminal from step 1. A refused secret gets
   `invalid_client`.

   ```sh
   read -rs GOOGLE_CLIENT_ID     # the copy's Google client ID
   read -rs OLD_GOOGLE_SECRET    # the copy's current (old) Google client secret
   export GOOGLE_CLIENT_ID OLD_GOOGLE_SECRET
   : "${GOOGLE_CLIENT_ID:?enter the client ID first}" "${OLD_GOOGLE_SECRET:?enter the old secret first}" &&
     node -e 'fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ grant_type: "authorization_code", code: "rotation-check", redirect_uri: process.argv[1] + "/api/auth/callback/google", client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.OLD_GOOGLE_SECRET }) }).then((response) => response.json()).then((body) => console.log(body.error))' https://COPY-SITE
   ```

   After step 7 it must print `invalid_client`. Then `unset GOOGLE_CLIENT_ID OLD_GOOGLE_SECRET`.
9. Save the new secret in the password manager.

### Rotate `AUTH_SECRET`

`AUTH_SECRET` does two jobs:

- Auth.js encrypts every session cookie with it. A new secret refuses every old cookie.
- `emailHash` in `src/lib/emailHash.ts` keys each email hash with it (HMAC-SHA256). The deletion list
  (`deletion_list.email_hash`), the used free week list (`used_free_weeks.email_hash`), and the security
  log's unknown-email entries hold these hashes.

**What the new secret does to old rows.** Every hash made after the rotation uses the new secret, so it
differs from the hash of the same email made before. The old rows are not rewritten, because the app
cannot turn a hash back into an email. So after a rotation:

- **Used free week list.** Checkout gives a free week only to an Account with no billing record whose email
  hash is not on the list (`src/lib/stripeCheckout.ts`). It looks up the hash made with the new secret, so a
  row written before the rotation never matches. An Account that still has its billing record, such as a
  lapsed student, is still refused by that record. But **a new Account for an email whose earlier Account
  used its free week before the rotation gets a second free week**, whether that Account was deleted before
  or after the rotation, until the row would
  have expired anyway, 12 months after its date. This breaks J11,
  which requires the refusal to hold after every rotation. It is a defect, reported from
  [issue 979](https://github.com/Jahazel/lsat-scheduler/issues/979). This guide does not change the rule.
- **Deletion list.** The deletion replay (`npm run replay-deletions`) matches restored Accounts by Account ID
  and by email hash, with the one `AUTH_SECRET` it is given. After a rotation, rows written before it match
  only by Account ID; their email-hash matching no longer works. The daily cleanup removes deletion list
  rows after 30 days, so this lasts at most 30 days after the rotation. This is part of the same defect.
- **Security log.** Unknown-email entries before and after the rotation no longer link to each other. The
  daily cleanup removes them after 90 days.

**Safe order.**

1. Finish any restore first. When a restore is in progress, run its replay and billing resync with the
   current secret to the end ([restore runbook](restore.md) steps 4 and 5), and switch the site to the
   restored branch. Never rotate between a replay and its billing resync.
2. Then rotate. After a leak, rotate at once anyway: a leaked secret lets anyone make a valid session cookie
   for any Account. The broken matching above is the cost.

**What students see:** every student and both Admins are signed out at the next page and sign in again.

Steps:

1. In the password manager, generate a random value of at least 32 characters. Save it in the site's entry
   as the new `AUTH_SECRET`, with the date. A restore needs it for the replay and the billing resync.
2. In Vercel, replace `AUTH_SECRET`.
3. Redeploy in Vercel.
4. Check that the site refuses the old secret: a browser that was signed in before the redeploy opens This
   week and goes to Log in with "Your session ended. Log in again."

   Copy only, also check a saved cookie. Before step 2, sign in as a test Account that has finished
   onboarding. In the browser's
   developer tools, copy the session cookie as one `name=value` pair: the name is
   `__Secure-authjs.session-token`. If the browser splits it into `.0` and `.1` parts, copy both pairs,
   joined by `; `. Enter it at the prompt and run the check. It opens the Account page, which redirects only
   a signed-out or not-onboarded Account: it must print `200` and `null`. Keep the terminal open. After
   step 3, run it again: it must print a `3xx` status and a location that ends in
   `/login?error=SessionEnded`. A missing or misnamed cookie goes to plain `/login`, so that answer
   does not pass. Do not do this on the real site.

   ```sh
   read -rs OLD_COOKIE && export OLD_COOKIE   # __Secure-authjs.session-token=VALUE, from before the rotation
   : "${OLD_COOKIE:?enter the old cookie first}" &&
     node -e 'fetch(process.argv[1] + "/account", { headers: { cookie: process.env.OLD_COOKIE }, redirect: "manual" }).then((response) => console.log(response.status, response.headers.get("location")))' https://COPY-SITE
   ```

   Then `unset OLD_COOKIE`.
5. Check that the site works with the new secret: sign in with Google and with a test password Account.
   This week opens.
6. Check J11 on the copy and record each result:
   - A lapsed test Account that used its free week before the rotation is still refused a free week: its
     billing record refuses it.
   - Delete a test Account that used its free week after the rotation, and sign up again with the same email.
     Checkout offers no free week.
   - Do the same with a test Account that used its free week before the rotation; delete it after the
     rotation. Checkout offers a free week again, because of the defect above. Record it as the defect, not
     as a pass.

### Rotate the Anthropic key

`ANTHROPIC_API_KEY` in Vercel holds the site's key. The copy's key belongs to the $5 copy workspace.

**What students see:** nothing, when you create the new key before you delete the old one. After a leak,
follow [Revoke the Anthropic key](#revoke-the-anthropic-key) first; scanning stays off until step 4 below.

1. In the Anthropic Console, open the site's workspace → Settings → API keys → Create key. Name it after the
   site and the date. Copy it once; do not save it in a file.
2. In Vercel, replace `ANTHROPIC_API_KEY`.
3. Redeploy in Vercel.
4. If scanning is off, [turn it back on](#turn-scanning-off).
5. Check that the site works with the new key: on the copy, upload a real analytics screenshot as a test
   Account. The scan fills the form. On the real site, check that the Console's usage page shows the new key's
   next call; do not spend money only to test.
6. Delete the old key and prove Anthropic refuses it, as in
   [Revoke the Anthropic key](#revoke-the-anthropic-key) steps 2 to 4.

### Rotate the Resend key

`RESEND_API_KEY` in Vercel holds a sending-only key for the site's own domain: the copy's mail domain or
the real site's mail domain.

**What students see:** nothing during the overlap. After a leak, when you delete the old key first, emails
(verify, reset, and plan emails) are not sent until step 4 is done; the site logs `Email not sent`.

1. Copy only, if the password manager holds the current key: enter it, and run the check in step 7 with
   the copy's `EMAIL_FROM` address. Resend must answer `200`. Keep the terminal open.
2. In Resend, open API Keys → Create API key. Give it Sending access, for the site's domain only. Copy it
   once; do not save it in a file.
3. In Vercel, replace `RESEND_API_KEY`.
4. Redeploy in Vercel.
5. Check that the site works with the new key: on the site's Log in page, ask for a password reset for a test
   password Account. The email arrives.
6. In Resend, delete the old key.
7. Check that Resend refuses the old key: it is gone from the API Keys list. Copy: run this check again in
   the terminal from step 1. Resend's test address receives the message, so nobody gets an email.

   ```sh
   read -rs OLD_RESEND_KEY && export OLD_RESEND_KEY   # the copy's current (old) Resend key
   : "${OLD_RESEND_KEY:?enter the old key first}" &&
     node -e 'fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${process.env.OLD_RESEND_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ from: process.argv[1], to: ["delivered@resend.dev"], subject: "Rotation check", text: "Rotation check" }) }).then((response) => console.log(response.status))' 'COPY_EMAIL_FROM'
   ```

   After step 6 it must print `401` or `403`. Then `unset OLD_RESEND_KEY`.

### Rotate the backup checker's Neon key

Each backup checker has its own Neon API key, scoped to its project, in the GitHub environment secret
`NEON_API_KEY`. The [restore runbook](restore.md) uses the same key for the age check, from the password
manager. See the [backup checker guide](../security/backup-checker.md).

**What students see:** nothing. The checker only reads Neon.

1. Copy only, if the password manager holds the current key: enter it with the copy's project ID, and run
   the check in step 6. Neon must answer `200`. Keep the terminal open.
2. In the Neon Console, create a new key of the same kind the
   [backup checker guide](../security/backup-checker.md#owner-setup) records for this checker (steps 2 to 4
   there): a key of the read-only Viewer collaborator, or the approved project-scoped key when Viewer access
   is not available. Never use the owner's personal key or an organization-wide key. Copy it once; do not
   save it in a file.
3. Run `gh secret set NEON_API_KEY --env backup-checker-copy` (copy) or
   `gh secret set NEON_API_KEY --env backup-checker-production` (real site), and paste the key at the hidden
   prompt.
4. Check that the checker works with the new key: in GitHub Actions, run the site's backup checker workflow
   by hand from `main`. It must pass, and its Healthchecks.io check must show the success ping.
5. In the Neon Console, revoke the old key.
6. Check that Neon refuses the old key: it is gone from the API keys list. Copy: run this check again in the
   terminal from step 1.

   ```sh
   read -rs OLD_NEON_KEY        # the copy checker's current (old) Neon key
   read -rs BACKUP_PROJECT_ID   # the copy's Neon project ID
   export OLD_NEON_KEY BACKUP_PROJECT_ID
   : "${OLD_NEON_KEY:?enter the old key first}" "${BACKUP_PROJECT_ID:?enter the project ID first}" &&
     node -e 'fetch(`https://console.neon.tech/api/v2/projects/${process.env.BACKUP_PROJECT_ID}`, { headers: { authorization: `Bearer ${process.env.OLD_NEON_KEY}` } }).then((response) => console.log(response.status))'
   ```

   After step 5 it must print `401`. Then `unset OLD_NEON_KEY BACKUP_PROJECT_ID`.
7. Replace the key in the password manager.

### Rotate the cron secret

Vercel Cron sends `CRON_SECRET` as the bearer token on each daily cleanup run. No provider holds it; the
site is the only place that checks it.

**What students see:** nothing. If the daily run fails between steps 3 and 4, it runs again the next day.

1. Copy only, if the password manager holds the current value: enter it, and run the old-value check in
   step 6. It must print `200`, which also runs the daily cleanup once. Keep the terminal open.
2. In the password manager, generate a random value of at least 32 characters, with letters and digits only.
3. In Vercel, replace `CRON_SECRET`.
4. Redeploy in Vercel.
5. Check that the site works with the new secret: open the project's Cron Jobs and choose Run on the daily
   cleanup. Request Logs show `GET /api/cron/daily-cleanup` with `200`.
6. Check that the site refuses the old secret. Each site, with no secret:

   ```sh
   curl -s -o /dev/null -w '%{http_code}\n' https://SITE/api/cron/daily-cleanup
   ```

   It must print `401`. Copy: also send the old value, from the terminal of step 1.

   ```sh
   read -rs OLD_CRON_SECRET && export OLD_CRON_SECRET   # the copy's current (old) CRON_SECRET
   : "${OLD_CRON_SECRET:?enter the old secret first}" &&
     node -e 'fetch(process.argv[1] + "/api/cron/daily-cleanup", { headers: { authorization: `Bearer ${process.env.OLD_CRON_SECRET}` } }).then((response) => console.log(response.status))' https://COPY-SITE
   ```

   After step 4 it must print `401`. Then `unset OLD_CRON_SECRET`.

7. Save the new value in the password manager.

## Rotate the Stripe credentials

Rotate the Stripe secret key and the Stripe message secret after a leak, and in the yearly rotation drill
(H5 in the [launch checklist](../security/release-gate.md)). Each site has its own pair:

| Site | Stripe mode | `STRIPE_SECRET_KEY` | `STRIPE_WEBHOOK_SECRET` |
| --- | --- | --- | --- |
| Copy | Sandbox (test mode) | Test secret key (`sk_test_`). Your computer's `.env.local` holds the same key (J7). | The copy's endpoint signing secret |
| Real site | Live mode | Restricted live key (`rk_live_`) | The real site's endpoint signing secret |

The copy's sandbox is its own Stripe test account, named "DrillMap sandbox". It is not the sandbox in the
DrillMap account menu. Look for the copy's customers and subscriptions there.

The real site also has a price-check key: a restricted live key whose only permission is Prices: Read. The
release check in J8 uses it. It lives only in the password manager.

Never place a live key or the real site's message secret on your computer, not even the old one. J7 allows
two exceptions. Each is entered with `read -rs`, set in the shell for one run, and saved in no file:

- the price-check key, for the J8 release check;
- a one-run restore key, which the [restore runbook](restore.md) creates for a real-site billing resync
  and deletes right after. It needs no rotation.

Never print a key or a secret, and never paste one into an issue or a chat. Record only the date of each
rotation.

The [rules for every rotation](#rotate-a-credential) apply here too. A redeploy with the new value does not
revoke the old one: Stripe keeps accepting it until it expires in the Dashboard.

**What students see:** nothing during an overlap. After a leak, when the old key expires at once, Checkout
and the Customer Portal fail until the redeploy. When the old message secret expires at once, plan changes
reach DrillMap late: Stripe retries each message for up to 3 days.

### Rotate the Stripe secret key

1. Copy only: before you rotate, open Developers → API keys in the sandbox, reveal the current secret key, and
   enter it in the shell, so it stays out of shell history. Stripe must answer `200`, which proves the shell
   holds the working old key. Keep this terminal open until step 11; the check there needs the key.

   ```sh
   read -rs OLD_STRIPE_KEY && export OLD_STRIPE_KEY
   node -e 'fetch("https://api.stripe.com/v1/balance", { headers: { authorization: `Bearer ${process.env.OLD_STRIPE_KEY}` } }).then((response) => console.log(response.status))'
   ```

2. In the Stripe Dashboard, switch to the site's mode: the sandbox for the copy, live mode for the real site.
3. Open Developers → API keys. Find the secret key (copy) or the site's restricted key (real site), and choose
   Rotate key.
4. Choose when the old key expires. After a leak, choose Now: Checkout fails until step 7 is done. In the
   drill, choose a short overlap, such as 1 hour.
5. Copy the new key once from the Stripe dialog. Do not save it in a file.
6. In Vercel, open the site's project → Settings → Environment Variables. Replace `STRIPE_SECRET_KEY` for
   Production, marked Sensitive.
7. Redeploy the latest production deployment so it reads the new key.
8. Copy only: replace the sandbox key in `.env.local` with the new test key. Your computer shares the
   copy's key (J7), so the old key now fails there too.
9. Run the checks below that the site works with the new key.
10. If you chose an overlap, return to Developers → API keys and make the old key expire now.
11. Run the checks below that Stripe refuses the old key.

**Check that the site works with the new key:**

1. Sign in on the site with a test Account and choose a plan on the plan choice screen. Stripe Checkout
   opens. On the real site, close Checkout without paying.
2. In Stripe, Developers → Webhooks → the site's endpoint shows no failed deliveries since the rotation.

**Check that Stripe refuses the old key:**

- Copy: run this in the terminal from step 1. Stripe must answer `401`. If the shell no longer holds the
  old key, the command stops with an error and tests nothing. Then rotate the key again from step 1.

  ```sh
  : "${OLD_STRIPE_KEY:?enter the old key from step 1}" &&
    node -e 'fetch("https://api.stripe.com/v1/balance", { headers: { authorization: `Bearer ${process.env.OLD_STRIPE_KEY}` } }).then((response) => console.log(response.status))'
  unset OLD_STRIPE_KEY
  ```

- Real site: in Developers → API keys, the old restricted key is listed as expired or is gone. Do not test
  it from your computer.

### Rotate the price-check key

This key exists only for the real site (J8), so this section has no copy steps.

**What students see:** nothing; only the release check uses it.

1. In the Stripe Dashboard, switch to live mode and open Developers → API keys.
2. Find the restricted key whose only permission is Prices: Read, and choose Rotate key. Choose Now: only the
   release check uses this key.
3. Copy the new key once from the Stripe dialog. Replace the old key in the password manager. Do not save it
   in a file.
4. Check that the new key works: run `npm run check-stripe-prices` with the real site's settings, as J8
   describes. It must pass and print that it read live mode. Then `unset STRIPE_SECRET_KEY`.
5. Check that Stripe refuses the old key: in Developers → API keys, the old key is listed as expired or is
   gone. Do not test it from your computer.

### Rotate the Stripe message secret

1. Copy only: before you roll, open the copy's endpoint in the sandbox (Developers → Webhooks), reveal the
   current signing secret, and enter it in the shell, so it stays out of shell history. The check below
   needs it.

   ```sh
   read -rs OLD_WEBHOOK_SECRET && export OLD_WEBHOOK_SECRET
   ```

2. In the Stripe Dashboard, switch to the site's mode.
3. Open Developers → Webhooks, then the site's endpoint (its URL ends in `/api/stripe/webhook`). Choose Roll
   signing secret.
4. Choose when the old secret expires. After a leak, choose Now: messages fail until step 7 is done, and
   Stripe retries them for up to 3 days. In the drill, choose a short overlap, such as 1 hour. During the
   overlap, Stripe signs each message with both secrets.
5. Reveal the new signing secret (`whsec_`) and copy it once. Do not save it in a file.
6. In Vercel, replace `STRIPE_WEBHOOK_SECRET` for Production, marked Sensitive.
7. Redeploy the latest production deployment before the old secret expires. The site now holds only the new
   secret, so it refuses the old one at once.

**Check that the site refuses the old secret:**

1. On each site, send a message with no signature. The site must answer `400`.

   ```sh
   curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'content-type: application/json' -d '{}' \
     https://SITE/api/stripe/webhook
   ```

2. Copy only: send a message signed with the old test secret from step 1. The site must answer `400`.

   ```sh
   node -e '
   const { createHmac } = require("crypto");
   const body = JSON.stringify({ id: "evt_rotation_check", type: "customer.subscription.updated" });
   const t = Math.floor(Date.now() / 1000);
   const v1 = createHmac("sha256", process.env.OLD_WEBHOOK_SECRET).update(`${t}.${body}`).digest("hex");
   fetch(process.argv[1] + "/api/stripe/webhook", {
     method: "POST", headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${v1}` }, body,
   }).then((response) => console.log(response.status));
   ' https://COPY-SITE
   unset OLD_WEBHOOK_SECRET
   ```

3. Real site: on the endpoint's page in Stripe, the old secret is expired. Do not test it from your computer.

**Check that the site handles messages with the new secret:**

1. Copy: start and finish a test Checkout with a Stripe test card, so Stripe sends messages. Real site: wait
   for the next real message.
2. On the endpoint's page in Stripe, the next message after the redeploy was delivered with HTTP 200, and
   no delivery has failed since the rotation.
3. Copy: the test Account's plan in DrillMap shows the new subscription.

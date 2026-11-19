# Stage 7 drill evidence

Record for [#982](https://github.com/Jahazel/lsat-scheduler/issues/982), under the Stage 7 spec [#978](https://github.com/Jahazel/lsat-scheduler/issues/978).
This file holds no password, key, connection string, cookie, email, Account ID, or Google ID.
It approves no release, exception, or launch. No launch checklist row passes because of this file.

**Status: not run.** The owner runs `scripts/issue-982-drill-wizard.sh` on the release candidate, after the
emergency guide sections from [#979](https://github.com/Jahazel/lsat-scheduler/issues/979) are merged.

## Words in this file

- **Copy**: the copy of the site, with its own Vercel project, Neon project, Stripe sandbox, and backup checker.
- **Release candidate**: the one commit that every Stage 7 check runs on. The owner picks it.
- **Old value**: a credential before its rotation. The wizard tries it once more after the rotation, to show the provider refuses it.
- **Restore point**: the UTC time the wizard records in step 3.2. Steps 3.3 and later delete Accounts after it.
- **Former branch**: the copy's Neon branch before step 3.8 switches the copy to the restored branch.
- **Students**: password test Accounts at plus addresses of the owner's inbox. R is the rotation student. F used its free week and was deleted. W walks the site after the rotations. K and N stay through the restore, K with a plan and N without. D, with a plan, and M, without, are deleted after the restore point. The replay can match M only by its email hash.

## How to run it

```sh
bash scripts/issue-982-drill-wizard.sh             # the whole run
bash scripts/issue-982-drill-wizard.sh --from 3    # resume at stage 3
bash scripts/issue-982-drill-wizard.sh --from 3.6  # resume at step 3.6
bash scripts/issue-982-drill-wizard.sh --dry-run   # print every step; call no provider
```

`scripts/issue-982-drill-wizard.test.mjs` checks the wizard with `bash -n`, with `shellcheck -x --severity=warning` when
shellcheck is installed, and with a dry run whose provider commands fail if called. Its shared helpers live in
`scripts/stage7-wizard-lib.sh`, which the full-checklist wizard of #983 also uses.

The wizard sends the copy's `Origin` header on every request to a copy page, form, or scan. It calls the daily job and the Stripe message route without it, as Vercel and Stripe do. It keeps cookies, emails, and test
passwords in `~/.drillmap-issue-982-run` (mode 700). It never prints a secret: a new `AUTH_SECRET` goes to the
clipboard only, and old values are typed at a hidden prompt. A result prompt refuses an answer with an `@`, a key
prefix, or a link. Step 4.8 copies the results to `~/drillmap-issue-982-results.md` and deletes the folder.

Each step names the section of the [emergency guide](../runbooks/emergency.md), the
[restore runbook](../runbooks/restore.md), or the [backup checker guide](backup-checker.md) that it follows. It reads
the heading from the checked-out file. When a section is missing, the step says so and the owner stops.

## What the wizard may touch

- **The copy**: its Vercel project, Neon project, Stripe sandbox, Healthchecks.io checks, and the `backup-checker-copy` and `migrations-copy` GitHub environments.
- **The real site, read only**: the deployment ID that the real domain serves (steps 1.1 and 4.8), a request for a page that does not exist (step 4.5), and one run of the production backup checker (steps 4.6 and 4.7). The checker only reads Neon's backup list.
- **The real site's alert services, not the site**: one fail signal to each real-site spend check (steps 4.2 and 4.3), and a few minutes with the uptime check pointed at a missing page (step 4.5).
- The connection string probes in steps 1.2 and 1.3 refuse any host that is not in `scripts/copyDatabaseHosts.json`.

## Version

| Item | Value |
| --- | --- |
| Release candidate | |
| Copy deployments | |
| Real site Production before and after | |
| Drill dates | |

## Owner run sheet

| Step | Check | Action | Expected |
| --- | --- | --- | --- |
| 1.1 | Setup, J11 | Record the candidate, the copy deployment, and the real site's deployment. R signs up and starts a plan with a free week. F does the same, then deletes the Account. The Admin signs in with Google. | The copy serves the candidate. 1 test Account (R) with 1 plan. At least 2 used free week rows. |
| 1.2 | H5 | [Emergency guide](../runbooks/emergency.md): rotate the app role's database password (`DATABASE_URL`). Try the old connection string before and after. | Before: accepted. After: refused with `28P01`. R signs in, and `/progress` answers 200. |
| 1.3 | H5 | Emergency guide: rotate the migration role's password (`MIGRATION_DATABASE_URL` in `migrations-copy`). Release migrations with `copy_only=true`. | `Target: copy.`, the copy job succeeds, the production job is skipped. The old string is refused with `28P01`. |
| 1.4 | H5 | Emergency guide: rotate the Google client secret. The Admin signs in with Google. The wizard sends the old secret to Google's token endpoint with a made-up code. | `/admin` answers 200. Before: `invalid_grant` (the secret works). After: `invalid_client`. |
| 1.5 | H5 | Emergency guide: rotate the Anthropic key. One practice-test scan as R. | The scan answers 200 with a reading. The old key gets 401 from Anthropic. |
| 1.6 | H5 | Emergency guide: rotate the Resend key. Ask for a reset email for R. | The email arrives from the DrillMap address. Resend refuses the old key. |
| 1.7 | H5, J7 | [Emergency guide, Stripe secret key](../runbooks/emergency.md#rotate-the-stripe-secret-key). Replace the key in `.env.local` too. R opens the Customer Portal. | The portal opens with R's plan. Stripe answers the old key with 401. |
| 1.8 | H5, J7 | [Emergency guide, Stripe message secret](../runbooks/emergency.md#rotate-the-stripe-message-secret). The wizard sends a message with no signature and one signed with the old secret. | Both get 400. Step 1.11's payment is delivered with 200. |
| 1.9 | H5 | Emergency guide: rotate the backup checker's Neon key (`backup-checker-copy`). Run Backup checker copy. | The checker reports `fresh`. Neon answers the old key with 401. |
| 1.10 | H5 | Emergency guide: rotate the cron secret. Run the daily job from Vercel. The wizard calls the job with the old secret. | The daily job answers 200. The old secret gets 401. |
| 1.11 | H5, J11 | Emergency guide: rotate `AUTH_SECRET`. Save the new value in the password manager. Try R's saved cookie. Walk: W signs up, verifies, onboards, and pays; R uses the weekly upload and Progress; the Admin signs in with Google. F signs up again and reaches Checkout. | The new `AUTH_SECRET` is in the password manager. The old cookie goes to `/login`. Every walk step works, and Stripe delivers its messages with 200. Checkout offers F no free week. |
| 2.1 | I4 | Emergency guide: pause the copy's Vercel project, look at it, then resume it. | Paused: no DrillMap page; Vercel's page instead, which the owner describes. Resumed: `/login` answers 200. |
| 2.2 | I4 | [Emergency guide, scanning switch](../runbooks/emergency.md#turn-scanning-off). Turn scanning off, scan, look at the weekly upload, turn it on, scan. | Off: 429 with reason `scanning-off` and "Scanning is off right now. Enter your analytics by hand." On: 200. |
| 2.3 | I4 | [Emergency guide, monthly limit](../runbooks/emergency.md#change-the-monthly-limit). Read the limit, set it to 0, scan, restore it. | At 0: 429 with reason `scanning-off`. The limit is back to its first value. |
| 2.4 | I4 | Emergency guide: revoke the Anthropic key, scan, look at the weekly upload. Create a new key, set it, redeploy, scan. | Revoked: a planned message and no reading. New key: 200. |
| 2.5 | I4 | Emergency guide: sign out every session. The SQL raises every Account's `session_version`. Try R's and the Admin's saved cookies. | Every saved cookie goes to `/login`. R's and the Admin's tabs land on Login. |
| 3.1 | F4, J13 | K and D sign up and start a plan. N and M sign up and stop at the plan step. Keep M's Account ID in the run folder. | 4 Accounts, 2 plans. |
| 3.2 | I2 | Record the restore point. Count the records of every table on the current branch at once. | One count for each table. |
| 3.3 | F4 | D and M delete their Accounts. The SQL gives M's deletion list row a new random Account ID. | D and M are gone. No deletion list row holds M's real ID. |
| 3.4 | I2 | [Restore runbook](../runbooks/restore.md) step 1: restore the restore point into a new branch. The clock starts. | A new branch. The current branch is untouched. |
| 3.5 | I2, F4 | Restore runbook steps 2 and 3: the age check, the migration journal, and every table's count on the restored branch. | The age check does not name the restored branch. The journal holds one row for each migration in the candidate. Every count equals step 3.2. |
| 3.6 | F4 | Restore runbook step 4: the replay, twice, with the `AUTH_SECRET` saved in step 1.11. | The first run deletes at least 2 Accounts, the second 0. D and M are gone from the restored branch, M by email hash only. K and N stay. |
| 3.7 | J13 | Restore runbook steps 5 and 6: the billing resync, twice, with the sandbox key. Compare K's plan with Stripe. Count every table again. | Both runs print the same counts and `Billing records Stripe does not list: 0.` K matches Stripe. N has no plan. D's plan does not come back. |
| 3.8 | I2 | Restore runbook steps 7 and 8: switch the copy's `DATABASE_URL` and `MIGRATION_DATABASE_URL` to the restored branch. Point `backup-checker-copy` at it and run the checker. | The copy runs on the restored branch. The checker reports `fresh`. The result names the new host, which `scripts/copyDatabaseHosts.json` must list before the next copy release. |
| 3.9 | I2, J13 | Restore runbook step 7: K's pages, N's plan step, D and M refused, D signs up again and reaches Checkout, the Admin pages. Stop the clock. | K and N work. D and M cannot sign in. Checkout offers D no free week. The restore took under 48 hours. |
| 3.10 | F4, I2 | Restore runbook step 9: delete every unused restore or `_old_` branch, with approval. Keep the former branch for step 4.6. Age check with the restored branch. | No branch named except the former branch, which step 4.6 deletes. Only the restored and the former branch are left. |
| 4.1 | I3 | [Launch checklist alerts](release-gate.md#owner-and-alerts) and the alert setup ([#981](https://github.com/Jahazel/lsat-scheduler/issues/981)): set the copy workspace's spend notification just above this month's spend. Scan once. Restore it. Read the real organization's settings. | The Anthropic email arrives. The copy's notification is back. The real site has notifications at $5 and $8. |
| 4.2 | I3 | [Emergency guide, spend alerts](../runbooks/emergency.md#spend-alerts): clear this month's alert times. Lower the copy's limit so the next scan crosses 80%. Scan. Send one fail signal to the real site's 80% check. Pause both checks again. | The scan answers 200, and `warning_sent_at` is set. Both DOWN emails arrive. `SCAN_SPEND_WARNING_PING_URL` is set on real Production. |
| 4.3 | I3 | Emergency guide, spend alerts: lower the copy's limit to this month's total. Scan. Restore the limit. Send one fail signal to the real site's limit check. Pause both checks again. | The scan answers 429 "Scanning is off right now. Enter your analytics by hand." `limit_alert_sent_at` is set. Both DOWN emails arrive. `SCAN_LIMIT_REACHED_PING_URL` is set on real Production. |
| 4.4 | I3 | Launch checklist alerts and the alert setup (#981): trigger the Neon alert on the copy project only. Read the real project's alert. | The Neon email arrives. The real project has the same alert to the owner. |
| 4.5 | I3 | Launch checklist alerts and the alert setup (#981): point the real site's uptime check at a missing page for a few minutes, then back. | The missing page answers 404. DOWN and UP emails arrive. The check watches the home page again. |
| 4.6 | I1, I3, F4 | [Backup checker guide, copy proof](backup-checker.md#copy-proof-before-production): point `backup-checker-copy` at the former branch for one run, then back. Delete the former branch, with approval, and run the age check. Run the production checker once. | `"status":"stale"` and a DOWN email, then `fresh` and an UP email. The age check says `within-30-days`. Production reports `fresh`, and its schedule, grace, and email match. |
| 4.7 | I1, I3 | [Backup checker guide, retention cleanup](backup-checker.md#owner-retention-cleanup): run both live checkers. If one reports a backup over 30 days, clean it up with approval and run it again. | `retention-overdue` with the retention check DOWN and the freshness check UP, then `fresh`. If no real backup is over 30 days, the result says so, and the owner decides. |
| 4.8 | Cleanup | Delete the test Accounts. Cancel their sandbox subscriptions. Pause the spend checks. Revoke the Neon API key. Record the real site's deployment again. | No test Account left. Scanning is on, and the limit is back. The real site serves the same deployment as in step 1.1. |

### Why some steps work this way

- **Old values (stage 1).** A provider shows most secrets once, and Vercel keeps them Sensitive. When the owner has the old value in the password manager, the wizard tries it before and after. Otherwise the step records the guide's console proof, such as a key listed as revoked.
- **Signing out every session (step 2.5).** Sessions are signed cookies, not database rows. Each cookie carries the Account's `session_version`, and the site refuses a cookie whose version is not the Account's current one. Raising every version signs everyone out. A new `AUTH_SECRET` also refuses every old cookie (step 1.11).
- **J11 after the rotation (step 1.11).** The used free week list holds email hashes keyed with `AUTH_SECRET`. F's row was made with the old secret. If Checkout offers F a free week, J11 fails after the rotation. #978 calls that a defect that blocks the candidate.
- **Email-hash matching (step 3.3).** The app makes M's deletion list row with the copy's real `AUTH_SECRET`. The SQL then replaces only the row's Account ID. M's Account is still on the restored branch, under its old ID. So the replay can delete it only if the saved `AUTH_SECRET` makes the same hash.
- **The spend alerts (steps 4.2 and 4.3).** A scan counts $0.03 before its call. Step 4.2 sets the limit to this month's total plus $0.03, rounded up to a cent, so the next scan reaches 80% and stays under the limit. Step 4.3 sets the limit to the total, so the next scan is refused. Both steps clear this month's alert times first, because each alert goes out once a month.
- **The stale backup (step 4.6).** The checker ages the newest backup of the branch it is told to watch. After step 3.8, the former branch gets no new backups, so its newest one passes 24 hours a day later. No backup or limit changes. If the checker reports `no-snapshots` instead, Neon no longer lists the former branch's backups, and the result says so.
- **The 30-day alert (step 4.7).** The rules forbid a false backup age. The alert fires only when a real backup is over 30 days old. The step runs both live checkers, which only read.

## Results

| Step | Result |
| --- | --- |
| 1.1 | |
| 1.2 | |
| 1.3 | |
| 1.4 | |
| 1.5 | |
| 1.6 | |
| 1.7 | |
| 1.8 | |
| 1.9 | |
| 1.10 | |
| 1.11 | |
| 2.1 | |
| 2.2 | |
| 2.3 | |
| 2.4 | |
| 2.5 | |
| 3.1 | |
| 3.2 | |
| 3.3 | |
| 3.4 | |
| 3.5 | |
| 3.6 | |
| 3.7 | |
| 3.8 | |
| 3.9 | |
| 3.10 | |
| 4.1 | |
| 4.2 | |
| 4.3 | |
| 4.4 | |
| 4.5 | |
| 4.6 | |
| 4.7 | |
| 4.8 | |

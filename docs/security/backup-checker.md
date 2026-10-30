# Backup checker

This checker is separate from DrillMap. It reads Neon backup metadata through the provider API. An API is a provider's program interface. It does not connect to Postgres or use the app's database login. It cannot create, restore, or delete a backup.

Issue #144 recorded the live proof below. Issue #148 holds the checks that need calendar time. The implementation alone does not pass the production backup requirement in #137.

```text
GitHub daily schedule -> checker -> Neon snapshots for the selected project
                            |
                            +-> Healthchecks.io freshness + retention -> owner email
                                also alerts when the checker sends no result
```

## Checked behavior

Run `node --import tsx scripts/check-backups.mts`. Exit code 0 means that the selected branch has a backup no more than 24 hours old, no project backup exceeds 30 days by the age rules below, and both Healthchecks.io checks accepted their results. Every other result exits 1. The `expired` list reports retention separately. Retention has its own monitor so an old backup cannot hide a new freshness failure. The command reads only these settings. Both monitor URLs must use `https://hc-ping.com/` and must be different:

| Setting | Location | Purpose |
| --- | --- | --- |
| `BACKUP_PROJECT_ID` | Checker environment variable | Exact active Neon project ID |
| `BACKUP_BRANCH_ID` | Checker environment variable | Exact active branch ID, never a branch name or a guessed default |
| `NEON_API_KEY` | Checker environment secret | Approved monitoring key |
| `HEALTHCHECKS_PING_URL` | Checker environment secret | Private UUID ping URL for freshness and checker failures |
| `HEALTHCHECKS_RETENTION_PING_URL` | Checker environment secret | Distinct private UUID ping URL for retention |

No `.env` file is loaded. Do not put these secrets in local files, repository secrets, app settings, previews, command arguments, or logs. GitHub environment secrets are settings confined to one named job environment. Use separate keys and monitors for `backup-checker-copy` and `backup-checker-production`. The production monitoring key belongs only to the latter environment's secret settings.

The checker uses `source_branch_id`, not the human-readable backup name. Freshness uses `timestamp`, the point in time captured by the backup. A newly created backup of old data cannot hide an old recovery point. Neon's snapshot list omits `timestamp` and `lsn` from every backup observed on October 19, 2026: scheduled, console, and an API backup of an earlier point. A scheduled backup captures the branch at its creation, so the checker ages it from `created_at`. A manual backup without `timestamp` can hold an earlier point, so it never proves freshness. A backup with `lsn` but no `timestamp` fails the check. Neon only accepts an earlier point inside the project's restore history window. When the list holds a manual backup without `timestamp`, the checker reads `history_retention_seconds` from `GET /projects/{project_id}`. Retention then ages that backup from `created_at` minus the current window. Its reported age is the oldest possible age, so it can exceed the real age. The checker cannot see a past window. Before shortening the restore window, list manual backups made of an earlier point and remove any that would pass 30 days under the old window. Missing branch IDs, creation times, or manual/scheduled flags fail the check. Invalid and future dates fail the check. A provider response that omits these fields needs investigation, not a fallback to guessed values.

The command examines every returned project snapshot for retention. This includes manual snapshots, other branches, and the retained latest scheduled snapshot. It reports ages strictly over 30 days. Exactly 30 days is allowed. Retention uses the older of the captured and creation times. Each overdue row contains its age, its manual/scheduled kind, and a SHA-256 fingerprint of its ID. A fingerprint is a one-way identifier. Compute the first 12 hexadecimal characters of SHA-256 over the console's snapshot ID to match a row. Names, raw IDs, provider responses, exception text, keys, and connection strings never enter the report.

Neon's published snapshot endpoint currently returns one `snapshots` array without documented pagination parameters. If the provider returns `pagination.cursor`, the checker follows each cursor. Repeated cursors, repeated IDs, unsupported pagination fields, more than 100 pages, or a failed later page fail the whole check. Each provider request has a 10-second deadline. The provider scan has a 60-second deadline. Each of the two monitor requests has a separate 10-second deadline. Redirects fail instead of forwarding credentials.

| Report status | Meaning and owner action |
| --- | --- |
| `fresh` | Freshness and retention passed. Both monitors accepted their results. |
| `stale` | The newest matching backup captures data older than 24 hours. Check the Neon schedule and its failed operations. |
| `no-snapshots` | No scheduled backup, and no backup with a known captured time, matches the selected active branch. A manual backup without `timestamp` does not count. Confirm the IDs and the backup schedule. |
| `retention-overdue` | Freshness passed, but a project backup exceeds 30 days. The retention monitor alerts. Follow owner cleanup below. |
| `checker-failed` | Provider access, data, clock, pagination, or request failed. Check access and provider status privately. |
| `configuration-failed` | Required settings are missing or invalid. A valid monitor URL still receives a failure signal. |
| `alert-failed` | Healthchecks.io did not accept the result. Treat the run as failed. Check the monitor and owner delivery. |

Completed inspections include retention rows in the command output and both monitor event bodies. If alert delivery fails, the output reports only `alert-failed`. Repair delivery, then rerun immediately to inspect backup freshness and retention details. A fresh active-branch backup sends a success signal to the freshness monitor even when retention is overdue. The separate retention monitor receives `/fail` in that case. The command exits 1. A stale or missing backup sends `/fail` to the freshness monitor. Unreadable provider data or invalid configuration sends `/fail` to every valid configured monitor.

The retention request runs first. If it fails, the freshness monitor receives an `alert-failed` failure signal. If the freshness request fails, the command still exits 1. A failed alert request never leads to an overall successful result. A missing or invalid URL alerts through the remaining valid URL. If neither URL is usable, no success signal is sent. Both external monitors must detect missing runs. Failure before the command starts also leaves no success signal. An HTTP acceptance proves receipt by Healthchecks.io. It does not prove receipt by the owner's mailbox. The live proof must check both.

## Owner setup

Deployment and activation require owner approval. Paid plans and destructive cleanup require separate approval. The owner selected GitHub Actions and Healthchecks.io. No paid upgrade is authorized. Check the account's actual limits before activation. Healthchecks.io currently lists a free plan with 20 checks and 100 retained log entries per check.

1. Confirm the active production project and branch with the owner. Record both IDs and the date in the private operations record. Repeat this check after a restore or branch switch. Update `BACKUP_BRANCH_ID` before treating the replacement branch as protected. A fresh backup on a former branch does not protect the new branch.
2. Inspect the Neon organization's actual permissions model. New organizations support an organization Collaborator with an explicit Viewer grant on one project. Viewer permits listing snapshots but refuses SQL and backup deletion. A personal key inherits that account's access. Confirm this account has no other project grants, inherited broad role, or projects it created. An organization-wide Viewer is too broad.
3. Existing and Vercel-managed organizations may use legacy permissions. If production-only Viewer access is unavailable, record why and use the already approved project-scoped Editor API key. An Editor key can change resources. This checker still sends only GET requests to Neon. Never substitute the owner's personal key or an organization-wide key. Confirm the monitored project and other-project access refusal without making a write or delete request.
4. Record the observed model, account role, project grant, key type, project-only scope, successful snapshot listing, and other-project refusal. Record no key value. These observations are currently **pending**. Public documentation is not proof of this account's permissions.
5. Create four separate Healthchecks.io checks: `DrillMap backup copy`, `DrillMap retention copy`, `DrillMap backup production`, and `DrillMap retention production`. For each check, use Cron schedule `37 10 * * *`, UTC time, and an eight-hour grace time. Grace time is the wait after an expected run before the monitor alerts. GitHub started the scheduled runs 3.5 to 6.5 hours late on October 18 to 20, 2026. A two-hour grace time sent a false DOWN alert each day, so the owner raised it to eight hours on October 20, 2026 (#148). Select POST-only pings. Leave request-body content filtering off. The command sends no start signal. A run must send its final result to count as complete.
6. Add and verify the owner's email integration. Send its test notification and confirm mailbox receipt. Enable failure, missing-run, and recovery notifications. Confirm the actual account supports these features without a paid upgrade. Set provider two-step sign-in and private recovery methods under #137.
7. Create GitHub environments `backup-checker-copy` and `backup-checker-production`. Restrict each environment's deployment branches to `main`. Give each environment only the five settings above. Do not add `DATABASE_URL`. Keep production credentials out of repository and organization secrets.
8. The two workflow files are independent. Both run at 10:37 UTC daily and offer a manual run on `main`. Choose a check time after the actual daily Neon backup time. If you change the workflow time, change its Healthchecks.io Cron schedule too. Keep the 24-hour backup-age limit. GitHub may delay or drop runs and disables public-repository schedules after 60 days of inactivity. The external monitor covers this absence.
9. Both jobs start disabled. After approval, set the repository variable `BACKUP_CHECKER_COPY_ENABLED=true` to enable the copy workflow. Keep `BACKUP_CHECKER_ENABLED` absent until copy proof and production access proof pass. Later approval can enable production with `BACKUP_CHECKER_ENABLED=true`. A repository variable is a nonsecret switch. Enabling a switch does not configure or verify the monitor.
10. Install the checked revision on `main` before activation. The workflows refuse other branches. The runner installs locked dependencies with install scripts disabled. It injects secrets only into the checker step. No pull-request event receives checker secrets. A runner timeout, checkout failure, dependency failure, or disabled workflow is detected by missing-run monitoring.

## Copy proof before production

Use only the separate Neon copy project, its monitoring key, and its two Healthchecks.io checks. Keep production unchanged. Do not paste a ping URL, key, connection string, or full provider response into evidence.

| What to prove | Controlled action | Required observation |
| --- | --- | --- |
| Owner destination works | Send the integration's test alert | Owner confirms receipt at the intended address; record time and a redacted destination label |
| Manual checker works | Run `Backup checker copy` on the checked revision | Successful command, correct branch, accepted ping, and matching monitor event |
| Scheduler works | Wait for an actual `schedule` event | Workflow event type is `schedule`; record UTC start and finish and monitor event |
| Missing backup alerts | Temporarily select a nonexistent but syntactically valid copy branch ID | Exit 1, `no-snapshots`, monitor down event, and owner receives alert |
| Old backup alerts | Select an isolated copy branch whose newest actual snapshot is older than 24 hours | Exit 1, `stale`, recorded age, and owner receives alert. If none exists, wait for a safe fixture; do not weaken the age limit or change the real backup schedule |
| Checker failure alerts | Temporarily select an inaccessible project ID in the copy environment | Exit 1, `checker-failed`, monitor down event, and owner receives alert |
| Failed alert is detectable | Temporarily set the copy freshness ping URL to an invalid value | Exit 1, `configuration-failed`, the retention monitor alerts on configuration failure, and the freshness monitor detects a missing run |
| A missing run alerts | After successful pings to both copy monitors, set `BACKUP_CHECKER_COPY_ENABLED=false` across the next expected run | No new success ping, down event after grace time, and owner receives the missing-run alert |
| Recovery works | Restore the copy settings and enable its switch | Successful check and owner receives recovery notice |
| Actual retention is checked | Run the read-only check on all project snapshots | Inspect all overdue rows, including manual and latest scheduled backups. Record the count and ages, or zero overdue backups |
| Retention alerts remain separate | On the copy, select a fresh branch in a project with a backup over 30 days old | Exit 1, `retention-overdue`, retention monitor down and owner alert, freshness monitor healthy. Do not create a false old time or weaken the limit; wait for a safe actual fixture when needed |

Return the monitor to healthy before each separate failure demonstration. A monitor already down might not send a second transition alert. If a notification does not arrive, stop and repair delivery before continuing. Restore copy settings after each case. Once copy proof ends, disable its switch and pause its two test monitors unless continued monitoring is wanted. Do not pause the production monitor to hide a failure.

Record revision, workflow run URLs, event types, safe command reports, monitor event times, owner receipt times, observed permissions, schedule/grace settings, and cleanup results. Issue #144 closed with the checks that need calendar time moved to #148; each must still pass there. Local tests cover a rejected or timed-out alert receiver; the invalid-URL copy exercise covers a missing signal, not a live provider delivery failure.

## Owner retention cleanup

The checker has no deletion operation. A Viewer must remain read-only. Use the owner's separate administration session for cleanup, after approval of the exact backup or branch to remove.

1. Inspect all actual backup ages in Neon. Match overdue fingerprints and ages to console IDs privately. Inspect manual snapshots and snapshots on old restore branches. Retention configuration alone is not proof.
2. Confirm the active branch has a valid replacement snapshot capturing current data no more than 24 hours old. Verify its source branch and creation/captured times. Confirm at least one day of restore history remains configured. If there is no valid replacement, fix backup creation first.
3. Neon can retain the last scheduled snapshot after its retention period. Create and verify the replacement through the owner's session before trying to remove the protected old snapshot. If protection remains or the provider refuses deletion, stop and inspect provider guidance. Do not remove protection by deleting the only backup or the active branch.
4. Ask for approval of the exact expired backup deletion. Remove only the approved copy through the provider console. Remove unused restore and `_old_` branches only with their own approval and after confirming no site uses them.
5. Rerun the checker. Confirm zero overdue snapshots, a fresh backup for the active branch, and a healthy monitor. Record the safe result. This task does not prove Stage 6 deletion replay or the Stage 7 restore rehearsal.

## Backup age check after a restore

`npm run check-backup-ages` is a separate command for the [restore runbook](../runbooks/restore.md) ([issue 353](https://github.com/Jahazel/lsat-scheduler/issues/353)). It reads `BACKUP_PROJECT_ID`, `BACKUP_BRANCH_ID`, and `NEON_API_KEY`, with the same GET-only requests and limits as the checker. It sends no monitor signal. It checks every snapshot and every branch except the active one, and exits 1 when any can hold data older than 30 days. Unlike the daily checker, it names each one by its Neon name, so the owner can find it in the console. It never prints an ID or a key.

## Local verification and sources

Run `npx vitest run scripts/backupChecker.test.ts scripts/check-backups.test.ts`. Synthetic responses cover branch selection, all-page inspection, exact age boundaries, malformed/future times, provider failures, timeouts, alert failures, and safe output. The command test launches a real child process against a local HTTP provider and alert receiver. It checks process exit status, stdout, stderr, and received requests. It uses no provider credential and cannot prove a hosted schedule or owner mailbox receipt. No web route changes, so the web app's browser recipes do not apply.

Provider references checked October 17, 2026:

- [Neon API schema](https://neon.com/api_spec/release/v2.json), `GET /projects/{project_id}/snapshots`, `GET /projects/{project_id}`, `Snapshot`, and `Project.history_retention_seconds`.
- [Neon API key scope](https://neon.com/docs/manage/api-keys) and [current and legacy permissions](https://neon.com/docs/manage/user-permissions).
- [Neon backups](https://neon.com/docs/guides/backup-restore) and the approved [Neon monitoring decisions](issue-69-assessment.md#neon-access-and-monitoring-decisions).
- [GitHub schedule limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
- [Healthchecks.io schedules](https://healthchecks.io/docs/configuring_checks/), [failure signals](https://healthchecks.io/docs/signaling_failures/), and [plan limits](https://healthchecks.io/pricing/).

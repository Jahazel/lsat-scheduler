# Stage 2 browser verification

Issue [#109](https://github.com/Jahazel/lsat-scheduler/issues/109), part of
[Stage 2](https://github.com/Jahazel/lsat-scheduler/issues/92).
Recorded on October 16, 2026, America/Chicago.

The requested local browser and script checks passed.
Current owner confirmation of the real site's served build remains outstanding.
No launch checklist check passes because of this note.
The no-promotion rule remains in force.

## Integration and earlier owner steps

The integration branch `stage2-postgres` already merged into `main` through
[PR #125](https://github.com/Jahazel/lsat-scheduler/pull/125) on
October 15, 2026 at 23:12:08 UTC. Its merge commit is `b7b2645`.
The integration branch has no commits missing from the tested main revision.

The browser run uses main revision `74197aa3e25452c371743ffbac3d8f2bd833cbd1`.
[GitHub Checks](https://github.com/Jahazel/lsat-scheduler/actions/runs/38910980262)
passed on that exact revision. The run includes the secret scan, dependency
security check, lint, type checking, ordinary tests, and Postgres tests.

The owner completed Stage 2 step 1 on **2026-10-08**. They turned off
Auto-assign Custom Production Domains on the real Vercel project.
After the next merge built a new version, the Current marker stayed on
`86ee8c3`. The real site loaded and both Admin Accounts signed in.
The [issue #93 closing record](https://github.com/Jahazel/lsat-scheduler/issues/93#issuecomment-6071821609)
supplies the final check that was still pending in the
[original step 1 note](issue-93-evidence.md).

The owner ran the Neon copy check on **2026-10-16 at 13:44:00 UTC**.
It passed. The [issue #108 evidence](issue-108-evidence.md) records encrypted
access with certificate and host-name checks, app reads and writes, limited
role restrictions, immutable Weekly schedules, database rules, Account
deletion, and rollback of throwaway records. This browser run does not repeat
the remote check.

## Local test boundary

The verification helper created a new disposable database on loopback
Postgres 17. The app ran at port 3100 with a fresh local sign-in secret.
Doctor confirmed the app process, revision, login response, and migrated
tables. The database started with no app records.

The helper selected `SCREENSHOT_EXTRACTOR=fake` and removed paid-service and
Google credentials from the app process. Sample analytics approval uses the
normal app review path. No test reads or changes Atlas or the Neon copy.
No environment file changed. This note contains no credential or full
connection string.

## Browser and script results

| Check | Observed result |
| --- | --- |
| Sign up | Created `verify-admin109@example.test` through the public signup form and reached onboarding. |
| Promote the Account | Ran `make-admin` against the disposable database. Signed out and signed in again. All students opened with no onboarded students. |
| Onboard | Opened My student side. Saved 7Sage, scores 150 and 165, 90 minutes for each day, Saturday, standard time, and June 2027. The database held one Student and no schedule before analytics approval. |
| Approve a Sample analytics snapshot | Selected Steady, generated a sample, and checked both approval statements. Confirm snapshot was disabled before approval. Approval saved an `admin_sample` snapshot and one Weekly schedule with five Activity check-ins. |
| Save an Activity check-in | Marked the Friday Conditional reasoning activity completed, entered 25 actual minutes, and reloaded. The UI and database retained completed and 25. The entire saved Weekly schedule stayed equal. |
| Correct an Activity check-in | Marked the uploaded-analytics student's Friday Conditional reasoning activity skipped. Waited for saving to finish, reloaded, and confirmed skipped in the UI and database. Cleared it, reloaded again, and confirmed not started with no actual minutes. Both captures retained the entire saved Weekly schedule unchanged. |
| Rebuild the Admin's week | Opened Rebuild this week and confirmed its deletion scope. The database held a new schedule ID and new check-in IDs. The Account, Study settings, and Analytics snapshot stayed equal. |
| Upload through the fake extractor | The owner selected an image in onboarding for a second browser-created Account, `verify-student109@example.test`. The review showed Strengthen 68%, Necessary assumption 74%, Conditional reasoning 81%, and Causal reasoning flagged. Checked both screenshot approval statements and submitted Generate my schedule. The database saved a `7sage_screenshot` snapshot, a Weekly schedule, and five check-ins. |
| View a student as Admin | Signed in as the Admin and opened the student's card from All students. The saved schedule showed the student's email and the read-only banner, with no check-in editing controls. Reopened its direct URL. All six app tables stayed equal before and after both views. |
| Delete a student Account | Signed back in as the student, opened Account through its menu, entered DELETE, and submitted Delete account. The app returned to the landing page. The Account, Student, Analytics snapshot, Weekly schedule, and Activity check-ins were absent from the database. The Admin's records remained. The deleted student's old login returned Invalid email or password. |
| Run the reset script with `--yes` | Ran `npm run reset:dev-data -- --yes` with an explicit connection to the disposable verification database and development mode. It deleted five check-ins, one schedule, one snapshot, and one Student. A stored-record capture confirmed those tables were empty and the Admin Account remained unchanged. |
| Confirm the real site still serves MongoDB and Atlas | Current owner confirmation requested. The 2026-10-08 evidence remains the last confirmed live-build record. |

## Evidence and limits

Local evidence is retained under
`.verification/evidence/issue-109-20261016/` and is excluded from Git.
It includes Doctor, stored-record captures, screenshots, command output,
comparison assertions, and `result.md` with the actions and artifact names.
The recording `browser-run.mp4` covers the owner-assisted upload and subsequent
student and Admin checks. The first tab's recording was unavailable after that
tab closed. Earlier checks have stored-record captures and a completion
screenshot, but no retained recording.

The helper reported `Cleanup complete`. It stopped its own app process,
dropped its disposable database, and removed its scratch folder. It retained
the evidence. Port 3100 had no listener after cleanup.

Initial navigation refused a stale local sign-in cookie from an earlier run,
as expected with the helper's fresh secret. Fresh signup and sign-in worked.
Some automation attempts used a wrong wait condition or selector.
Browser-host disconnects required reopening the preview, and closing the first
tab cleared the unsaved student onboarding form. The form was filled again.
An initial rapid skip sequence captured not started, so it did not prove the
skip saved. The repeated test waited for saving to finish and checked the
result after reload. Failed automation attempts do not count as successful
app checks. The app log contained the stale-cookie refusal and the expected
deleted-Account login refusal. It showed no other app error.

Google sign-in and real Anthropic extraction are outside this local run.
The Neon check covers the limited database role separately. The local browser
helper uses a local database owner, so it does not prove browser behavior
under the limited role. Backups, restores, alerts, the live database move,
and launch approval remain outside Stage 2.

Every launch checklist row stays `Not tested`. No build was promoted.

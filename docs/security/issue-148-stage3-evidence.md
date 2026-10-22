# Stage 3 evidence and Stage 4 handoff

Record for [#148](https://github.com/Jahazel/lsat-scheduler/issues/148), under the Stage 3 spec [#137](https://github.com/Jahazel/lsat-scheduler/issues/137). Compiled on 2026-10-22 UTC from the child tickets, their evidence files, and GitHub workflow runs.
This file holds no password, key, ping URL, connection string, recovery code, email, or Google ID.
It approves no release, exception, or launch. No launch checklist row passes because of this file.

## Where Stage 3 ended

- The real site `lsat-scheduler.vercel.app` serves commit `315fad4` on Neon production since 2026-10-21 22:53 UTC (#146).
- One Admin (Admin 1) works on the real site through Google only. The second Admin is open in [#216](https://github.com/Jahazel/lsat-scheduler/issues/216), which blocks nothing.
- The Atlas project was deleted on 2026-10-22 00:39 UTC (#147). Recovery now uses only the Neon restore procedure from #144.
- The stale-backup alert has not run. The owner moved it to Stage 7 on 2026-10-22, as an accepted risk in the [launch checklist](release-gate.md#accepted-risks). See [Still open](#still-open).
- DrillMap is not promoted. Stages 4 to 7 and a separate launch approval remain.

## Child ticket results

| Ticket | Result | Evidence |
| --- | --- | --- |
| #138 Controlled-move procedure | Done 2026-10-16. Runbook and regression tests. Exact production-host refusal moved to #143. | [`docs/runbooks/controlled-neon-move.md`](../runbooks/controlled-neon-move.md) |
| #139 Provider two-step sign-in | Done 2026-10-16 for Vercel, GitHub, Neon, Atlas, Google Cloud owner, and both intended Admins. Owner-reported. Anthropic moved to #151. | [#139](https://github.com/Jahazel/lsat-scheduler/issues/139) |
| #151 Anthropic Console sign-in | Done 2026-10-18. The Console has no second step of its own; its one Gmail account meets rule 30. The 2-Step Verification phone was removed. A recovery phone stays as an accepted risk (rule 26). | [#151](https://github.com/Jahazel/lsat-scheduler/issues/151), [infrastructure rules](issue-77-decisions.md) |
| #140 Google identity for Admins | Done 2026-10-16. Stable Google ID, verified email required, no email joining, student-only creation, Admin password refusal. | `src/lib/authAccounts.ts`, `tests/postgres/accountsStudents.test.ts` |
| #141 Hosted copy | Done 2026-10-17 on commit `9b9a8bb`, with two gaps. Both gaps were closed later in #145 (items 4 and 5). | [#141 closing note](https://github.com/Jahazel/lsat-scheduler/issues/141#issuecomment-6238310190) |
| #142 Backup checker | Done 2026-10-19. Built in PR #157, fixed in PR #160. A real failure and its recovery reached the owner for both copy monitors. Calendar checks moved to #144. | [#142](https://github.com/Jahazel/lsat-scheduler/issues/142), [`backup-checker.md`](backup-checker.md) |
| #143 Production Neon project | Done 2026-10-18. Every acceptance check passed. | [Issue 143 evidence](issue-143-evidence.md) |
| #144 Production backups and restore rehearsal | Done 2026-10-19. Calendar checks moved to #148. | [Issue 144 evidence](issue-144-evidence.md) |
| #145 Disclosure and release candidate | Done 2026-10-20 on candidate `4170ab8`. All 8 owner and agent checks passed. | [Issue 145 package](issue-145-release-candidate.md), [owner results](https://github.com/Jahazel/lsat-scheduler/issues/145#issuecomment-6295241730) |
| #146 Real-site move | Done 2026-10-21. Released `315fad4`. Admin 1 verified. Admin 2 moved to #216. | [#146 move evidence](https://github.com/Jahazel/lsat-scheduler/issues/146#issuecomment-6329109838) |
| #147 Atlas retirement | Done 2026-10-22. Project deleted after a separate approval. | [#147 retirement evidence](https://github.com/Jahazel/lsat-scheduler/issues/147#issuecomment-6329835918) |

## Versions

| Place | Version | Date | Source |
| --- | --- | --- | --- |
| Real site, live | Commit `315fad4155f344635ff767428609041e5c07bdc1`, build `dpl_EnQvQeJELf4c4EvTuHVvR9FENgEG` | Promoted 2026-10-21 about 22:53 UTC | #146 |
| Real site, first promotion of the same commit | `dpl_4WMaoTPyYud29M3CvdKuB9uQriY4`, replaced after the sign-in incident | 2026-10-21 | #146 |
| Real site, old MongoDB build | Commit `86ee8c3`, `dpl_3L4FFoaWxxdzKJ5mbYqtToPiiZoQ`. It can no longer reach a database. | Until 2026-10-21 | #146, #147 |
| Copy, last recorded build | Commit `4170ab8`, `dpl_BqijN5WRL2o1vhXLmjY8Ku5YRg78`, fake extraction | 2026-10-20 | #145 |
| Copy, first full walkthrough | Commit `9b9a8bb`, `dpl_HsPiK1K1x` | 2026-10-17 | #141 |
| Production database structure | 3 migrations. Owner SQL hash `8d30aed7…c2bc6f9`. | 2026-10-18 | [Issue 143 evidence](issue-143-evidence.md#version-and-project) |

**The release is not the checked candidate.** The copy checks in #145 ran on `4170ab8`. The owner released `315fad4`, because Vercel blocks redeploying an older build when a newer production build exists. Between the two commits, `main` gained 5 merges (#190, #203 to #206) and 115 changed files, including scheduling engine v3 and the activity model. No migration or SQL file changed. The bounded live checks in #146 ran on `315fad4`. The full copy walkthrough has not run on `315fad4`.

## Dated provider observations

| Date (UTC) | Observation | Observer | Source |
| --- | --- | --- | --- |
| 2026-10-16 | Two-step sign-in and stored recovery codes on Vercel, GitHub, Neon, Atlas, Google Cloud owner | Owner | #139 |
| 2026-10-18 | Anthropic Console: Google sign-in and email link lead to one Gmail account with passkey, authenticator app, and Google prompt. 10 backup codes stored. | Owner | #151 |
| 2026-10-18 | Neon monitoring account: two-factor on. Healthchecks: authenticator app on. Monitoring Google account: 2-Step Verification on (owner-reported). | Agent read-back and owner | #142 |
| 2026-10-18 | Neon Launch plan active | Agent read-back | #142 |
| 2026-10-18 | Real Vercel project: `DATABASE_URL` in Production only, Sensitive. Preview and Development hold no credentials. Automatic domain assignment off. | Owner | [Issue 143 evidence](issue-143-evidence.md) |
| 2026-10-18 | Real Google client: real origin and callback only, home, privacy, and terms links, no logo, `openid email profile`, In production | Owner | [Issue 143 evidence](issue-143-evidence.md) |
| 2026-10-18 | Anthropic interim controls unchanged: auto-reload off, balance under $10, $20 limit, emails at $5 and $8 | Owner | [Issue 143 evidence](issue-143-evidence.md) |
| 2026-10-19 | Production: daily backups, 14-day retention, 1-day restore window. Time moved to 22:00 UTC. | Owner | [Issue 144 evidence](issue-144-evidence.md) |
| 2026-10-20 | Copy automatic domain assignment was on at the start, then turned off. Real project still off. Real `SCREENSHOT_EXTRACTOR` absent. | Owner | #145 |
| 2026-10-20 | All four Healthchecks checks: grace raised from 2 to 8 hours | Owner-reported. The agent has not observed the setting. | PR #190 |
| 2026-10-21 | Real site: fake extractor absent after release. Atlas app user read-only during the move. | Owner | #146 |
| 2026-10-22 | Neon production: 1-day history window, daily snapshots at 22:00 UTC kept 14 days, newest 2 hours old at 00:21 | Owner | #147 |
| 2026-10-22 | Atlas: two-step sign-in asked, then project deleted. Only the unrelated `trading-journal` project remains. Vercel `MONGODB_URI` deleted. | Owner | #147 |

## Google and Admin checks

| Check | Copy | Real site |
| --- | --- | --- |
| Google sign-in finds the Account by stable ID; unverified email refused; no email joining; student-only creation | Proven by Postgres tests in CI on every push (#140) | Same code in `315fad4` |
| Admin 1: owner grant, Google-only row, fresh sign-in opens Admin pages, password refused | Passed on `9b9a8bb` (#141) and `4170ab8` (#145) | Passed 2026-10-21 (#146). Rechecked 2026-10-22 00:14 and 00:40 UTC (#147). |
| Admin 2: same four checks | Passed on `9b9a8bb` (#141) and `4170ab8` (#145) | Not run. Open in #216. |
| Admin 1 Google 2-Step Verification seen on | Not recorded for the copy | 2026-10-21 (#146), 2026-10-22 (#147) |
| Admin 2 Google 2-Step Verification seen on | 2026-10-20 (#145) | Not recorded for the real site |
| `make-admin` not used on production | Grants used owner SQL | Grants used owner SQL by exact Account ID (#146) |

Open question from #145: the second Admin disappeared from the copy between #141 and #145. The cause is unknown.

## Limited-role checks

| Check | Result | Source |
| --- | --- | --- |
| Production `drillmap_app` from `sql/app-role.sql`: no administration rights, memberships, owned objects, or Weekly schedule updates; migration journal refused | Passed 2026-10-18, as owner and as the app | [Issue 143 evidence](issue-143-evidence.md) |
| Production app password random, 32 characters, pooled host, `verify-full` | Passed 2026-10-18. Reset on 2026-10-21 during the sign-in incident with the same method. | #143, #146 |
| Copy `db:check-copy` through the pooled host: encryption with certificate and host-name checks, app reads and writes, limited role, immutable Weekly schedules, owner-only journal refused, database rules, Account deletion, rollback | All 7 PASS on 2026-10-20 | #145 item 4 |
| Copy app password 32 characters | Passed 2026-10-20 | #145 item 4 |
| Local scripts refuse both production hosts: `migrate-postgres`, `make-admin`, `reset-dev-data`, `create-test-user`, `check-neon` | Passed 2026-10-18. `scripts/productionHostRefusal.test.mjs` repeats it on every run. | [Issue 143 evidence](issue-143-evidence.md) |
| `create-test-user` refuses every non-local host, including the copy | Passed 2026-10-20 | #188 |
| Owner administration access browser-only, absent from Vercel and local files | Owner-reported 2026-10-18 | #143 |

Not proven: refusal on the real site's own app role of creating roles or changing the schema through the app. The copy check covers the same SQL file.

## Backup and alert results

| Check | Result | Source |
| --- | --- | --- |
| Newest production backup 24 hours old or less before the move | 20.4 hours at 2026-10-21 18:26 UTC | [Run 39652614129](https://github.com/Jahazel/lsat-scheduler/actions/runs/39652614129) |
| Newest production backup after the move | Fresh at 2026-10-22 00:15 UTC | [Run 39698528531](https://github.com/Jahazel/lsat-scheduler/actions/runs/39698528531) |
| Each checker sees only its own project | Passed both ways 2026-10-19 | [Issue 144 evidence](issue-144-evidence.md#production-checker-access) |
| Missing production backup alert and recovery | Passed 2026-10-19 | [Issue 144 evidence](issue-144-evidence.md#production-alerts) |
| Copy checker failure and recovery alerts | Passed 2026-10-19 | #142 |
| Copy missing-run alert and recovery | Passed 2026-10-19 | [Issue 144 evidence](issue-144-evidence.md#copy-alerts) |
| First `schedule`-event run of each checker | Passed 2026-10-20: production [run 39447327360](https://github.com/Jahazel/lsat-scheduler/actions/runs/39447327360), copy [run 39447533376](https://github.com/Jahazel/lsat-scheduler/actions/runs/39447533376). Both started 4 h 42 min late. | [#148 owner decisions](https://github.com/Jahazel/lsat-scheduler/issues/148#issuecomment-6295484127) |
| Second scheduled runs | Both `fresh` on 2026-10-21, started about 15:31 UTC (about 4.9 hours late). Production [run 39626451130](https://github.com/Jahazel/lsat-scheduler/actions/runs/39626451130), copy [run 39626661283](https://github.com/Jahazel/lsat-scheduler/actions/runs/39626661283). Whether the 8-hour grace prevented a false DOWN alert is not recorded. | GitHub Actions |
| Stale-backup alert (`stale` and owner receipt) | **Not run.** No checker run has reported `stale`. Moved to Stage 7 as an accepted risk (owner, 2026-10-22). | GitHub Actions run list, 2026-10-22; [launch checklist accepted risks](release-gate.md#accepted-risks) |
| 30-day age alert (`retention-overdue`) | Not possible before 2026-11-17 18:34 UTC. Moved to Stage 7 as an accepted risk (owner, 2026-10-20). | [Launch checklist accepted risks](release-gate.md#accepted-risks) |

## Restore rehearsal

On the copy, 2026-10-19 (#144). Source backup 2026-10-19 00:00 UTC. Restore ran 19:55:29 to 19:57:58 UTC, under 3 minutes. Data age at the start was 1195 minutes, under the 1-day target. All six table counts matched: `accounts=1 students=0 leads=0 analytics_snapshots=0 weekly_schedules=0 activity_check_ins=0`. The restored branch was deleted with owner approval at 20:09 UTC.

Limits: the copy held almost no data, so this proves the restore path, not speed at real size. No deletion replay ran.

## Manual release proof

| Item | Result | Source |
| --- | --- | --- |
| Automatic real-domain assignment off | Observed 2026-10-18 and 2026-10-20. A staged `0ed485d` build appeared on 2026-10-21 and was not promoted. | #143, #145, #146 |
| A new copy build leaves the domain unchanged until promotion | Passed 2026-10-20 | #145 item 3 |
| Owner approval naming the exact version | "release 315fad4 to lsat-scheduler.vercel.app", 2026-10-21 18:29 UTC | #146 |
| GitHub checks on `315fad4` | All success: dependency check, Postgres tests, secret scan, checks, both Vercel builds | #146 |
| Old writes paused, final Atlas inventory | Paused about 17:57 UTC. Inventory 18:20 UTC: 5 Accounts (2 Admins, 1 pause-test, 2 students with study data). The owner approved the release with this inventory. No data was copied. | #146 |
| Sign-in incident after the first promotion | Wrong app password in Vercel. Fixed by a password reset and a new build of the same commit. Neon held 0 records, so no data was lost. | #146 |
| Bounded live checks | Sample analytics approved, This week built, Admin check-in saved and corrected, Admin read-only student view wrote nothing, test student deleted | #146 |

## Atlas deletion

Approved separately by the owner on 2026-10-22 00:29 UTC after seeing the scope and the data loss. Steps in order: Vercel `MONGODB_URI` deleted (00:32), Atlas database user deleted (00:33), IP access list emptied (00:36), `Cluster0` terminated (00:37), project deleted (00:39). The real site and Admin 1 still worked at 00:40.

Known and accepted data loss: 2 student Accounts with study data (2 analytics snapshots, 2 weekly schedules, 12 activity check-ins) were not copied to Neon. Source: [#147](https://github.com/Jahazel/lsat-scheduler/issues/147#issuecomment-6329835918).

## Still open

| Item | Owner | Blocks |
| --- | --- | --- |
| Stale-backup alert: a checker reports `stale` and the owner receives the DOWN email | Stage 7 (owner decision, 2026-10-22) | Launch. Must pass by the Stage 7 alert proof, the first promotion, or 2026-11-30, whichever comes first. |
| Admin 2 on the real site | Owner and tutor partner, #216 | Nothing in Stage 3. Launch check B9 needs both Admins. |
| Full copy walkthrough on the live version `315fad4` | Agent and owner | Launch. Excepted for the move until first promotion or 2026-11-30. |
| Apply migrations `0003` and `0004` to Neon production before promoting any build after `315fad4` | Owner | The next real-site release |
| Delete the 2026-10-18 `ALTER ROLE drillmap_app` statement from the Neon SQL Editor history | Owner | Nothing. The password is no longer valid. |
| Delete the old Atlas database password from the password manager | Owner | Nothing |
| Why Admin 2 left the copy after #141 | Unassigned | Nothing |

## Launch checklist effect

Every launch checklist row stays `Not tested`. Stage 3 adds partial evidence only. The full rows also need the parts listed here.

| Row | Stage 3 evidence | Still missing |
| --- | --- | --- |
| B2 | Stable ID, changed email, and unverified email rules in Postgres tests | Copy run of the full row on the launch version |
| B9 | Admin password refusal with a hash; Admin 1 on the real site | Admin 2 on the real site (#216) |
| H1 | All current providers checked 2026-10-16 to 2026-10-18 | Email provider (not chosen yet, Stage 4); recheck on the launch version |
| H2 | Production and copy role checks | Recheck on the launch version |
| H3 | Production and copy passwords 32 characters, `verify-full` | Recheck on the launch version |
| H4 | Separate secrets, previews empty, script refusals | Email keys (Stage 4) |
| H6 | Real Google client published | Recheck on the launch version |
| I1 | Production schedule, retention, checker, access, missing-backup alert | Stale-backup alert and 30-day age alert (Stage 7) |
| I2 | Copy restore rehearsal | Deletion replay (Stage 6); full rerun (Stage 7) |
| I3 | Backup alerts | Four other alerts (Stage 7) |

## Stage 4 handoff

Stage 4 reuses the Google identity and Google-only Admin code from #140. Do not rebuild it.

**Already built (rules 2 to 5, 31, 32 of the [Account rules](issue-74-decisions.md)).**

- Google sign-in finds the Account by Google's stable ID only.
- Google sign-in requires `email_verified` to be `true`.
- An email match never joins a Google ID to an existing Account. Rules 39 and 41 (email binding for old Accounts) are not built, because the new database started empty.
- A new Google ID with an unused email creates a student Account only.
- A changed Google email keeps the same Account and DrillMap email.
- Password sign-in refuses every Admin, even with a stored hash. Only owner SQL grants the Admin role.

**Remaining work for Stage 4.**

- Current-Account guard on every protected request: Account exists, not disabled, role, and session version (rule 24). Today the role is read into the token only at sign-in.
- Session controls: student 14-day idle and 30-day maximum, Admin 24-hour maximum, sign out of all devices, and revocation after role change, reset, password change, deletion, or disabling (rules 22, 23, 25 to 27).
- Disabled Accounts (rule 28).
- Email provider and sending domain, and password-Account email verification with pending Accounts (rules 1, 7 to 9, 16). Today signup says "An account with that email already exists."
- Password work: 72-byte limit, common-password list, removal of the letters-and-digits rule, same-work login, reset links, and password change (rules 10 to 21). Today signup still requires a letter and a digit.
- Recent sign-in within 10 minutes for Account deletion and password change (rules 29, 30).
- The password-signup side of rule 6: a password signup with the email of a Google Account makes no Account.

## Later stages and launch

- **Stage 6:** deletion list and replay after restore, retention jobs, security logs, browser protections, and the final privacy, terms, and AI disclosure text.
- **Stage 7:** full restore check with deletion replay, credential rotation drill, all five alert tests, the stale-backup alert, the 30-day age alert, and the emergency guide rehearsal on the release version.
- **Launch approval** is a separate written owner decision that names one exact version. Stage 3 does not give it.
- **No promotion.** The owner does not promote DrillMap until launch approval.

## Verification limits

- Most provider rows are owner observations from wizards and screenshots that were not stored. The agent read back only the GitHub runs and the items marked as agent read-back.
- The 8-hour Healthchecks grace is owner-reported.
- The compilation used the child tickets as written. It reran no provider check.

# Issue 145 release candidate

Evidence package for the controlled move to Neon ([#137](https://github.com/Jahazel/lsat-scheduler/issues/137)), prepared on 2026-10-19.
It approves no release, cutover, Atlas deletion, exception, or launch. No launch checklist row passes because of this file.
The real site still serves the MongoDB build `86ee8c3` (owner observation, 2026-10-18, #143).
This file holds no password, key, connection string, email, or Google ID.

## The candidate

- **Version.** The candidate is the `main` commit that merges this file's pull request. A SHA is the unique ID of one commit. After the merge, the agent records the candidate SHA and its GitHub check results in a [#145](https://github.com/Jahazel/lsat-scheduler/issues/145) comment. A file cannot name the commit that contains it.
- **Database structure matches production.** A SHA-256 value is a fingerprint of a file's exact contents. On 2026-10-19 the agent compared the fingerprints of the three migration files, `sql/app-role.sql`, and the generated owner SQL. Each matched the value the owner applied on production in [issue 143 evidence](issue-143-evidence.md). The owner SQL hash is `8d30aed734bb09faa734f5f1a13ff8bfc6fd253eaa2e765b7e1905a09c2bc6f9`. Recheck with `node scripts/sql-editor-migrations.mjs | shasum -a 256` on the exact candidate.
- **Google and Admin protections.** `src/lib/authAccounts.ts` holds five rules. It finds a Google Account by its stable ID only. It refuses an unverified Google email. It never joins Accounts by email. It creates only student Accounts. It refuses password sign-in for every Admin. `tests/postgres/accountsStudents.test.ts` proves each rule against real Postgres. GitHub runs it in the "Postgres tests" job.
- **No fake extraction on the real site.** The app uses the fake extractor only when `SCREENSHOT_EXTRACTOR` is set (`src/lib/screenshotExtractor.ts`). The owner observed that setting absent from real Production on 2026-10-18 (#143).
- **Disclosure.** The privacy page names Vercel, Neon, Google, and Anthropic. It states Anthropic's 30-day screenshot retention and 14 days of daily Neon backups. It claims no deletion replay, retention job, or security log. The approved text in [issue 76 decisions](issue-76-decisions.md#approved-privacy-page-text) now names Neon instead of MongoDB Atlas.

## Evidence already recorded

| Area | Result | Source |
| --- | --- | --- |
| Provider two-step sign-in and recovery access | Passed | #139, #151 |
| Production Neon project, limited app role, 32-character password, `verify-full` | Passed, 2026-10-18 | [Issue 143 evidence](issue-143-evidence.md) |
| Local scripts refuse both production hosts | Passed, and repeated by `scripts/productionHostRefusal.test.mjs` on every test run | [Issue 143 evidence](issue-143-evidence.md#local-scripts-refuse-the-exact-production-hosts) |
| Real Production settings: database setting only in Production, previews hold no credentials, automatic domain assignment off | Passed, 2026-10-18 | [Issue 143 evidence](issue-143-evidence.md#real-project-settings-owner-vercel) |
| Real Google sign-in client: real origin and callback, links, no logo, three scopes, In production | Passed, 2026-10-18 | [Issue 143 evidence](issue-143-evidence.md#google-sign-in-client-owner) |
| Both Admins on the copy: Google sign-in, owner grant, fresh sign-in, no password, password refused | Passed on commit `9b9a8bb`, not on this candidate | [#141 closing note](https://github.com/Jahazel/lsat-scheduler/issues/141) |
| Copy student walkthrough, Admin read-only view, Admin test controls, Account deletion | Passed on commit `9b9a8bb`, not on this candidate | [#141 closing note](https://github.com/Jahazel/lsat-scheduler/issues/141) |
| Production daily backups, 14-day retention, 1-day restore window | Passed, 2026-10-19 | [Issue 144 evidence](issue-144-evidence.md#production-backups) |
| Newest production backup | 1.0 hours old at 2026-10-19 23:05 UTC. Must be 24 hours old or less at cutover. | [Run 39339260468](https://github.com/Jahazel/lsat-scheduler/actions/runs/39339260468) |
| Production checker access, missing-backup alert, recovery alert | Passed, 2026-10-19 | [Issue 144 evidence](issue-144-evidence.md#production-checker-access) |
| Restore rehearsal on the copy | Passed, 2026-10-19, without deletion replay | [Issue 144 evidence](issue-144-evidence.md#restore-rehearsal-on-the-copy) |
| Anthropic interim controls | Passed, 2026-10-18 | [Issue 143 evidence](issue-143-evidence.md#anthropic-interim-controls-owner) |

## Recovery

Use the recovery table in the [controlled move runbook](../runbooks/controlled-neon-move.md#recovery). It gives one safe action for each state of the move. A Vercel rollback does not restore database contents. The old MongoDB build cannot read Postgres. Keep Atlas until #147 gets a separate deletion approval.

## Unresolved checks

Each row stays unresolved until it passes on the exact candidate. A failed or unavailable required check blocks the move. Only an owner-recorded permitted exception removes that block. The owner records it in the [launch checklist's accepted risks](release-gate.md#accepted-risks), with its risk, reason, substitute protection, and end date. This file grants none.

| Check | Why it is open | Who acts | Blocks the move |
| --- | --- | --- | --- |
| Exact candidate SHA and green required GitHub checks | Exist only after this file merges | Agent, after merge | Yes |
| Hosted copy on the candidate: student walkthrough, Admin read-only view, Admin test controls, Account deletion, as the limited app role | The copy last ran the full path on `9b9a8bb`. The candidate adds 27 app commits, including the new onboarding and the signed-out handling in `src/proxy.ts`. | Agent for student steps, owner for Admin steps | Yes |
| Both Admins on the copy with the candidate | Google sign-in needs the owner's two Google Accounts | Owner | Yes |
| A new copy build leaves the domain assignment unchanged | The Stage 3 spec asks for this proof on the copy rehearsal as well as in the real settings. The owner checked only the real settings (#143). | Owner | Yes |
| Copy app password is 16 characters; the rule needs 32 (H3) | #141 gap 1. Production meets the rule. Fix with the #143 starter-password method. | Owner | Yes, unless excepted |
| Real `AUTH_SECRET` not compared with the computer's and the copy's (H4) | #141 gap 2. Vercel hides the value. | Owner | Yes, unless excepted |
| `create-test-user` accepts the copy host (H4 says it must refuse every non-local host) | #143 follow-up, not filed yet | Agent, separate ticket | Yes, unless excepted |
| Stale-backup alert, first scheduled checker run at 10:37 UTC, 30-day age alert (I1, I3) | Need calendar time. Moved to #148. | Owner and agent | Stale and scheduled-run alerts: yes, unless excepted. The 30-day alert cannot run before 2026-11-17. |
| Newest production backup 24 hours old or less | Must be read on the day of cutover | Owner | Yes |
| Real site runs on Atlas with no backups and no current risk acceptance | The acceptance ended when Neon backups started. See the note below the table. | Owner | Owner records a decision now |
| Final Atlas inventory with writes paused | Belongs to #146, immediately before the move | Owner | Yes |
| Real model reading the owner's real 7Sage screenshot through onboarding Steps 3 and 4 | Paid call. Every browser run used the fake extractor. It runs only with owner approval. Declining the call does not pass the check. | Owner approves, agent runs | Yes, unless excepted |
| Drag and drop on the Step 3 drop zone in a real browser | Covered only in jsdom. The file picker passed in a real browser. | Agent | No, lower risk |
| Privacy page full text, terms page, and AI disclosure (F3) | Stage 6. The privacy page does not describe Google sign-in data or a privacy contact. The terms page is a placeholder. The AI disclosure placeholder wrongly says AI makes weekly plans. | Stage 6 | Not for the move; yes for launch |
| Deletion replay after restore (F4, I2), five alerts (I3), emergency guide (I4), rotation drill (H5) | Stages 6 and 7 | Later stages | Not for the move; yes for launch |

The no-backup risk acceptance ends on 2026-11-01, or earlier when daily backups run on the chosen database. Daily Neon backups started on 2026-10-19 (#144). By its own words, the acceptance ended on that day. The real site still uses Atlas, which has no backups. The owner must now record an interim backup decision or a dated renewed acceptance in the launch checklist. This file renews nothing.

## Owner action order

1. Merge this pull request. The copy updates. The real site does not.
2. The agent records the candidate SHA and its GitHub checks in #145.
3. Record an interim backup decision or a dated renewed acceptance for Atlas. Fix or except each "Yes" row above. Record any exception in the launch checklist.
4. Run the candidate on the copy. The agent drives the student steps. The owner signs in as each Admin and checks the domain assignment after the new copy build.
5. Approve and run the paid real-screenshot test, or record an exception.
6. In #146: pause old writes, take the final Atlas inventory, and check backup freshness. Approve the exact commit, deployment, database, real domain, and recovery limits together.
7. Release that version by hand, then create and check both Admins on the real site (#146).
8. Request Atlas deletion separately (#147).

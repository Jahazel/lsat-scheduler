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
| A5 | Student A signs out and student B signs in on the same browser. Student B sees none of student A's data, including from browser or CDN caches. | Real | F13 | Browser and data | Not tested |

### B. Sign-in and accounts

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| B1 | Keep a session in two browsers. Demote, disable, or delete the account. The next protected request refuses the removed power, including admin pages, onboarding, and extraction. No paid call starts and no record comes back. | Auto, Copy | F01, F02 | Account security | Not tested |
| B2 | Google sign-in stores the stable Google account ID. A matching email alone cannot attach a person to an existing account. | Auto, Copy | F03 | Account security | Not tested |
| B3 | A password signup with someone else's email cannot later take over that person's account. | Copy | F03 | Account security | Not tested |
| B4 | Linking Google and password sign-in needs proof of control of both. A changed Google email cannot move an account. | Copy | F03 | Account security | Not tested |
| B5 | Two passwords that differ only after byte 72 do not both work. Multibyte passwords work at the limit. | Auto | F04 | Account security | Not tested |
| B6 | The chosen password policy rejects common passwords. | Auto | F04 | Account security | Not tested |
| B7 | Password reset tokens expire and work once. A reset signs out other sessions. Reset does not reveal whether an email has an account. | Copy | F04 | Account security | Not tested |
| B8 | Existing accounts move to the new rules without a silent email verification or a moved admin role. | Copy | F03 | Account security | Not tested |
| B9 | Admin MFA works as the chosen policy says. | Copy | Issue 72 | Account security | Not tested |

### C. Abuse limits and spending

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| C1 | At each agreed limit N for signup, login, lead capture, and snapshot saves, request N+1 gets a clear refusal before any expensive work or write. | Auto, Copy | F05, F09 | Abuse and extraction | Not tested |
| C2 | Limits hold under parallel requests and across server instances. | Copy | F05 | Abuse and extraction | Not tested |
| C3 | A student who reaches the extraction limit gets a clear refusal. No paid call starts. | Auto, Copy | F05 | Abuse and extraction | Not tested |
| C4 | The app's $10 monthly extraction limit counts each provider attempt, including retries. When it is reached, no new paid call starts. | Copy (real calls, $5 workspace) | Issue 72 | Abuse and extraction | Not tested |
| C5 | An emergency switch stops extraction. No new paid call starts. Manual entry, this week, and progress still work. | Copy, Real | Issue 72 | Abuse and extraction | Not tested |
| C6 | A student can enter analytics by hand when scanning fails or is off, and can still get a weekly schedule. | Copy | Issue 72 | Abuse and extraction | Not tested |

### D. Screenshots and model output

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| D1 | An anonymous or deleted account causes zero extraction calls. The handler checks the session itself. | Auto | F06 | None needed | Not tested |
| D2 | The app refuses a forged file type, a broken image, an oversized request, and too many pixels or frames before it reads the whole file or calls the model. | Auto | F07 | Abuse and extraction | Not tested |
| D3 | The app refuses a wrong tool, unknown labels, too many rows, bad true/false values, and numbers out of range. Nothing usable returns and no analytics snapshot saves. | Auto | F08 | None needed | Not tested |
| D4 | Onboarding works for an existing account with no student record. | Auto | Issue 72 | None needed | Not tested |

### E. Browser protections and private responses

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| E1 | A request from another site, or with a wrong content type, cannot change data or start a paid call. | Copy | F12 | Browser and data | Not tested |
| E2 | Session cookies are Secure, HttpOnly, and use the chosen SameSite value on the real site. | Real | F13 | Browser and data | Not tested |
| E3 | Private pages send `no-store`. | Real | F13 | Browser and data | Not tested |
| E4 | The chosen CSP, framing, referrer, and content-type headers are present. Google sign-in still works. | Real | F13, issue 71 | Browser and data | Not tested |

### F. Deletion, privacy, errors, and logs

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| F1 | Force a failure during account deletion. Deletion finishes or can be finished. A retry does not restore access or leave unexplained records. | Copy | F11 | Browser and data | Not tested |
| F2 | Onboarding survives failures and parallel requests without broken records. | Copy | F11 | None needed | Not tested |
| F3 | The privacy page matches real handling: data kept, screenshots sent to Anthropic, Anthropic's 30-day retention, and backups. | Settings | F11, issue 71 | Browser and data | Not tested |
| F4 | A restore from backup does not bring back a deleted account. | Copy | Issue 72 | Browser and data | Not tested |
| F5 | Bad requests and provider or database failures return safe errors. Logs contain no credentials, cookies, screenshots, or extra student data. | Auto, Copy | F15 | Browser and data | Not tested |
| F6 | The chosen sign-in, permission, and abuse events appear in logs. | Copy | F15 | Browser and data | Not tested |

### G. Dependencies and code

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| G1 | Each known runtime advisory is patched or shown unreachable, within the agreed response time. | Auto, Settings | F16 | Infrastructure | Not tested |
| G2 | GitHub Dependabot alerts and secret scanning are on, or a stated replacement covers them. | Settings | Issue 71 | Infrastructure | Not tested |
| G3 | GitHub runs the automatic checks after every push. | Settings | Issue 73 | None needed | Not tested |

### H. Provider access and credentials

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| H1 | Two-step sign-in is on for Vercel, GitHub, Atlas, Google Cloud, and the Anthropic Console, for every login method. | Settings | Issue 71 | Infrastructure | Not tested |
| H2 | The app's database user can do the app's work only. It cannot manage users or other databases. | Copy, Settings | Issue 71 | Infrastructure | Not tested |
| H3 | Database network access matches the chosen policy, or the policy's replacement protection is in place. | Settings | Issue 71 | Infrastructure | Not tested |
| H4 | Your computer, the copy of the site, and the real site use different credentials. Local work cannot read or change real records. | Settings | Issue 71 | Infrastructure | Not tested |
| H5 | Each credential can be revoked at its provider. The steps are tested without showing any secret. | Copy | Issue 71 | Infrastructure | Not tested |
| H6 | The Google sign-in client has branding, privacy, and terms links, and is published as the chosen policy says. | Settings | Issue 71 | Account security | Not tested |

### I. Recovery and alerts

| ID | Check | Kind | Evidence | Policy ticket | Status |
| --- | --- | --- | --- | --- | --- |
| I1 | A daily backup exists and is no more than 24 hours old. | Settings | Issue 71 | Database research | Not tested |
| I2 | A restore into a separate database finishes within 48 hours and the data is complete. | Copy | Issue 71 | Database research | Not tested |
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

**Emergency guide.** A runbook in `docs/runbooks/` lists the steps: pause the Vercel project, turn off extraction, revoke the Anthropic key, rotate the database and Google credentials, and sign out all sessions. Redeploying with new settings does not, by itself, revoke old copies.

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
2. **Check the risk.** If the change is a risky change, add or update its checks in this file.
3. **Run the tests locally.**
4. **The owner approves the commit and the push.**
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

To be created as children of issue 69. None blocks issue 73.

| Ticket | Type | Scope |
| --- | --- | --- |
| Account security | Decision | Email verification, Google ID storage, account linking, password policy, reset, existing-account migration, session length, revocation timing, sign-out everywhere, recent sign-in for deletion, admin MFA, Google client publishing |
| Abuse and extraction | Decision | Signup, login, and lead limits; upload formats, size, and pixels; limit per student; retries; parallel requests; budget counting; the emergency switch; where hand-entered analytics snapshots come from |
| Browser and data | Decision | CSP and header policy, SameSite value, deletion handling, data retention, log retention, which events to log, privacy page text |
| Infrastructure | Decision | Database network access, least-privilege database user, separate credentials, credential rotation, dependency response times, two-step sign-in on provider accounts, Dependabot and secret scanning |
| Database research | Research | Keep MongoDB Atlas or move to hosted Postgres. Review again if DrillMap needs reports across many students, the data stops fitting documents, or Flex costs more than $30 per month |

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

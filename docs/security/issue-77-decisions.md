# Infrastructure access rules

Decisions for [issue 77](https://github.com/Jahazel/lsat-scheduler/issues/77), under [issue 69](https://github.com/Jahazel/lsat-scheduler/issues/69). Decided by the owner on October 6, 2026, America/Chicago, against checkout `bfa27c4`.

**Status: decided.** These are rules for later work. None of them is built yet. The checks in [release-gate.md](release-gate.md#g-dependencies-and-code) still fail until the settings and code pass them.

The evidence comes from [issue 70](issue-70-evidence.md) finding F16 and from [issue 71](issue-71-evidence.md). The copy of the site, the 1-day response time, and the emergency guide come from [the launch checklist](release-gate.md). The email provider comes from [issue 74](issue-74-decisions.md) rule 1.

## Words in this file

- **Credential** means a secret that gives access: a database password, the Anthropic key, the Auth.js secret, the Google client secret, the email provider key, or a provider access token.
- **Place** means one of three places where DrillMap runs: the owner's computer, the copy of the site, and the real site.
- **Network access list** means the list of internet addresses that may connect to the database.
- **TLS** means the encryption on a connection between the app and the database.
- **Least privilege** means each user gets only the powers its work needs.
- **Temporary database user** means a database user that Atlas deletes automatically at a set time.
- **Rotation** means you replace a credential with a new one and turn the old one off at its provider.
- **Advisory** means a public warning that a package version has a security bug. The advisory gives a severity: critical, high, moderate, or low.
- **Runtime package** means a package that the real site uses. A **development-only package** is used only for tests and builds.
- **Unreachable note** means a written record that DrillMap cannot reach the bug in an advisory.
- **Two-step sign-in** means a second proof after the password, such as a passkey or a code from an authenticator app.
- **Dependabot** is a GitHub tool. It warns about advisories and opens pull requests that fix them.
- **Secret scanning** means a search of the code and its history for credentials.
- **gitleaks** is a free secret scanning tool. The pre-commit hook in `.githooks/pre-commit` already runs it before each commit.

## What exists today

- The database network access list holds `0.0.0.0/0` and some single addresses (issue 71). Any IPv4 address can try to sign in to the database.
- The only database user is `atlasAdmin@admin`, with power over all resources (issue 71).
- The owner's computer and the real site use the same database, the same admin user, and the same password. Issue 71 found that `.env.local` and `.env.vercel.local` match. The owner confirmed on October 6, 2026, that the local database is the real one. `npm run reset:dev-data -- --yes` deletes every student's weekly schedules, activity check-ins, and analytics snapshots on that database. No backup exists.
- The Anthropic key, Auth.js secret, and Google client are also the same in both local files (issue 71).
- Nobody has tried a rotation. The Anthropic key has no expiry date (issue 71).
- F16 found six vulnerable package entries: one critical, three high, and two moderate. Next.js and sharp are runtime packages. No deadline for fixes exists.
- Two-step sign-in is off on Vercel and GitHub. It is on for the owner's Google account. Atlas allows a password sign-in without its own two-step sign-in. The Anthropic Console was not checked (issue 71).
- Dependabot alerts and GitHub secret scanning are off (issue 71). GitHub secret scanning on a private repository of a personal account needs the GitHub Team plan and the paid Secret Protection product ([GitHub](https://docs.github.com/en/code-security/how-tos/secure-your-secrets/detect-secret-leaks/enable-secret-scanning)).

## Decisions

### Database network access

1. The network access list holds `0.0.0.0/0` and no other entry.
2. These protections replace a short list. All are required:
   - The app's database user follows rule 4.
   - Each database password is random and at least 32 characters long.
   - Every connection uses TLS. No connection setting turns off TLS or certificate checks.
3. If issue 78 chooses a different database, or the Vercel plan changes, the owner decides this rule again. If the chosen provider gives a private connection on the plan in use at no extra cost, DrillMap uses it.

**Why:** Vercel Hobby sends requests from addresses that change. Fixed addresses need Vercel Pro and Static IPs at $100 a month for each project ([Vercel](https://vercel.com/docs/networking/static-ips)). The main risk is a leaked password, and rules 4 to 20 reduce that risk directly.

### Database users

4. The real site's database user has only the built-in `readWrite` role on the `lsat-scheduler` database. It has no role on another database. It cannot manage users or roles.
5. The owner's own work, such as migrations, `make-admin`, and index changes, uses a temporary database user. Atlas deletes it after 1 week or less. Its password is never saved in Vercel or in a file.
6. No permanent database user has admin powers. The owner deletes `atlasAdmin` after the new app user works.
7. The copy of the site follows rule 4 on its own database, so the check can run there.

**Why:** `readWrite` covers all the app's work, including indexes and the deletion transaction from issue 76. A custom role that also stops collection drops adds little, because the same user can delete every document.

### Separate credentials for each place

8. Each place has its own database, database user, Auth.js secret, and Google sign-in client. Each place has its own Anthropic key and email provider key, or none. No credential is shared by two places.
9. The real site's credentials exist only in the Production settings of the real Vercel project. No file on the owner's computer holds one. Preview deployments of the real project get no credentials.
10. The copy of the site is a separate Vercel project with its own settings. It is not a preview of the real project.
11. The owner's computer has its own database that holds only test data. It has its own Auth.js secret and its own Google sign-in client for `localhost`. It has no Anthropic key and uses the fake extractor.
12. A script that deletes or changes data refuses to run when its database host is the real site's host.

**Why:** Today a local test or a reset script changes or deletes real students' records. A stolen laptop gives the full admin password.

### Rotation

13. The credential list is: each database password, the Anthropic key, the Auth.js secret, the Google client secret, the email provider key, and each Vercel, GitHub, or Atlas access token.
14. The owner rotates a credential within 1 day after any of these events:
    - A suspected leak.
    - A lost or stolen device that held the credential.
    - The credential is found in a commit, a log, an issue, or a chat.
    - A person with access leaves.
15. The real site has no rotation on a fixed schedule.
16. Before launch, and then once each year, the owner runs a rotation drill on the copy of the site. The drill rotates every credential with the steps in the emergency guide. The owner records the date and the result. The record shows no secret.
17. A new Auth.js secret signs every student out one time. The emergency guide says so.

**Why:** One day matches the owner's response time in the launch checklist. A fixed schedule adds work and signs students out, but it does not reduce a known risk.

### Moving the real credentials off the owner's computer

18. This work is urgent. It comes before other launch work.
19. Until it is done, the owner runs no script and no local test that saves data.
20. When it is done, the owner rotates all four real-site credentials: the database password, the Anthropic key, the Auth.js secret, and the Google client secret. The old ones are turned off. `.env.vercel.local` is deleted, and `.env.local` holds only the values from rule 11.

**Why:** Deleting a file does not erase every copy. Computer backups and old copies can still hold the real credentials.

### Package security bugs

21. The clock starts when Dependabot or `npm audit` reports the advisory. For the advisories that F16 found before these rules, the clock starts on October 6, 2026.
22. The fix deadline depends on the advisory's severity:

    | Severity | Runtime package | Development-only package |
    | --- | --- | --- |
    | Critical | 2 days | 30 days |
    | High | 7 days | 30 days |
    | Moderate | 30 days | Next routine update |
    | Low | Next routine update | Next routine update |

23. An unreachable note can replace a fix. It goes in `docs/security/advisory-notes.md`. It names the package, the advisory ID, the reason DrillMap cannot reach the bug, the date, and a recheck date no more than 90 days later. A note past its recheck date counts as no note.
24. GitHub runs `npm audit --omit=dev` after every push. A critical or high runtime advisory with no fix and no current note stops the release.

### Two-step sign-in on provider accounts

25. These accounts need two-step sign-in: Vercel, GitHub, MongoDB Atlas, the Google account that owns Google Cloud, the Anthropic Console, and the email provider when it is added.
26. The second step is a passkey or an authenticator app. Text-message codes are not allowed.
27. Every login method on each account needs the second step, or the owner removes that method. Examples are Vercel's email, Google, and GitHub logins, and the Atlas password.
28. Recovery codes go in the owner's password manager and on one printed copy.
29. The monthly settings review records the method and the date for each account.

**Why:** A thief with a password on one of these accounts can change the site or read its credentials. A phone number can be moved to another SIM card, so text-message codes can be stolen.

### Dependabot and secret scanning

30. Dependabot alerts and Dependabot security updates are on. Dependabot version updates are not required.
31. gitleaks replaces GitHub secret scanning. GitHub Actions runs gitleaks on every push. The local pre-commit hook stays.
32. Before launch, gitleaks scans the full Git history once. The owner records the date and the result with `--redact`, so no secret is shown.
33. A found credential stops the release. It is a rotation event under rule 14. Removing the credential from Git history does not replace rotation.

**Why:** GitHub secret scanning costs money on this repository. Issue 71 ruled out a public repository. A commit can skip the local hook with `--no-verify` or come from another computer, so GitHub must run the scan too.

## Checks

The [launch checklist](release-gate.md#g-dependencies-and-code) holds the full text of each check. This table shows which rules each check tests.

| Check | Rules |
| --- | --- |
| G1 | 21 to 24 |
| G2 | 30 to 33 |
| [H1](release-gate.md#h-provider-access-and-credentials) | 25 to 29 |
| H2 | 4 to 7 |
| H3 | 1 to 3 |
| H4 | 8 to 12, 18 to 20 |
| H5 | 13 to 17, 20 |

## Not decided here

- The database choice and its backups belong to the database research ticket ([#78](https://github.com/Jahazel/lsat-scheduler/issues/78)). Rule 3 reopens network access if the database changes.
- The exact email provider is chosen when the work is built (issue 74 rule 1). Its key follows rules 8, 13, and 14. Its account follows rule 25.
- The sending domain for email is not chosen. When DrillMap gets a domain, the domain registrar account joins rule 25.

## Decisions recorded

The owner made each decision in the issue 77 discussion.

| Topic | Answer |
| --- | --- |
| Database network access | Any address, with a limited app user, long random passwords, and TLS. Decide again if the database or plan changes. |
| App database user | `readWrite` on the DrillMap database only. Temporary users for owner work. No permanent admin user. |
| Separate credentials | Three separate sets. Real credentials only in Vercel Production. Local work uses its own database and the fake extractor. Scripts refuse the real host. |
| Rotation | After an event, within 1 day. A yearly drill on the copy of the site. No fixed schedule. |
| Separating the databases | Urgent. No local writes until done. |
| Real credentials after the move | Rotate all four and turn off the old ones. |
| Package security bugs | Deadlines by severity, as in rule 22. Unreachable notes are rechecked within 90 days. |
| Advisories found before these rules | The clock starts on October 6, 2026. |
| Two-step sign-in | Passkey or authenticator app on every provider account and every login method. No text messages. |
| Dependabot and secret scanning | Dependabot alerts and security updates on. gitleaks on every push, plus one full-history scan before launch. |

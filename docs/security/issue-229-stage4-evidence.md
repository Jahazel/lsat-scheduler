# Stage 4 evidence and Stage 5 handoff

Record for [#229](https://github.com/Jahazel/lsat-scheduler/issues/229), under the Stage 4 spec [#222](https://github.com/Jahazel/lsat-scheduler/issues/222). Started on 2026-10-23 UTC.
This file holds no password, key, connection string, cookie, recovery code, email, or Google ID.
It approves no release, exception, or launch. No launch checklist row passes because of this file.

**Status: copy run done on 2026-10-23. Every step passed.** The owner ran the steps with a wizard and reported each result. The agent recorded them below.

## Child ticket results

| Ticket | Result | Evidence |
| --- | --- | --- |
| #223 Google sign-in only in the docs | Done 2026-10-22 | PR #233, [ADR 0005](../adr/0005-google-sign-in-only-until-drillmap-has-a-domain.md) |
| #224 Page designs | Done 2026-10-22 | PR #235, `docs/design/accounts/` |
| #225 Current-Account check and session limits | Done 2026-10-22. Migration `0007_account_sessions`. | PR #234 |
| #226 Google-only Login and Signup | Done 2026-10-22. Real Google paths moved to this ticket. | PR #236 |
| #227 Sign out of all devices | Done 2026-10-22 | PR #237 |
| #228 Sign in again before Account deletion | Done 2026-10-23 | PR #238 |

## Version for the copy run

| Item | Value |
| --- | --- |
| Commit | `fcc8277c8bc501a3379e15377b6edc6abb2795ad` (`main` after PR #238) |
| Owner SQL bundle | `node scripts/sql-editor-migrations.mjs`, 404 lines, SHA-256 `67b8ecab…4d102ff4` |
| `sql/app-role.sql` | SHA-256 `833994e3…a59850012`. Adds `practice_test_results` to the app role grants. |
| Copy migrations before the run | `0000` to `0006`: 7 journal rows, last time `1792022400000`. Owner read-back on 2026-10-23. |
| Migrations the run adds | `0007_account_sessions` |
| New environment variables | None since `315fad4` |

## Owner run sheet

Run every step on the **copy** only. The real site and Neon production stay unchanged.
A **Google test user** is a Google Account that is not an Admin and has never signed in to the copy. Use a private window for the second browser.
In the SQL steps, replace `TEST_EMAIL` with the test user's email. Do not paste that email or any result row into chat or the issue. Report counts and what the page showed.

### A. Bring the copy to the Stage 4 version

Follow [Apply the owner SQL](../runbooks/controlled-neon-move.md#apply-the-owner-sql) in the controlled-move runbook.

1. In a clean checkout of the commit above, run `npm ci`, then `node scripts/sql-editor-migrations.mjs > /tmp/drillmap-owner-migrations.sql`. Check that `shasum -a 256 /tmp/drillmap-owner-migrations.sql` starts with `67b8ecab`.
2. In the Neon SQL editor, select the **copy** project, its branch, its database, and the owner role. Run `SELECT current_database(), current_user;`. Then run `SELECT count(*), max(created_at) FROM drillmap_migrations.applied;`. Report both values. The copy showed `7` and `1792022400000` (`0006`) on 2026-10-23.
3. Paste the whole bundle as one run. Rerun the count query. Expect `8` and `1792108800000`, the journal time of `0007`.
4. Paste the whole `sql/app-role.sql` from the same commit as one run.
5. In the copy Vercel project, deploy the commit above to Production. Report the deployment ID. Check that the copy's domain points at it, and that the real site's deployment did not change.

### B. Google sign-in checks

| Step | Action | Expected |
| --- | --- | --- |
| B4-1 | SQL: `INSERT INTO accounts (email, name, password_hash) VALUES ('TEST_EMAIL', 'Stage 4 check', 'not-a-hash');` | `INSERT 0 1` |
| B4-2 | On the copy's Signup page, tick the box and continue with Google as the test user. | Login shows "Google sign-in didn't finish. Try again, or use a Google account with a verified email." No session starts: opening `/dashboard` goes to Login. |
| B4-3 | SQL: `SELECT count(*) FROM accounts WHERE password_hash IS NOT NULL AND google_id IS NOT NULL;` then `DELETE FROM accounts WHERE email = 'TEST_EMAIL' AND google_id IS NULL;` | `0`, then `DELETE 1` |
| S-1 | Signup with the box ticked, as the test user. | Lands on onboarding. |
| S-2 | Signup, continue with Google, and cancel at Google's account chooser. | Login shows the refusal text above, not an Auth.js error page. |
| B2-1 | Sign out. SQL: `UPDATE accounts SET google_id = 'stage4-' || google_id WHERE email = 'TEST_EMAIL';` Sign in with Google. | Refused with the refusal text, because a new Google ID arrives with an email that an Account already uses. SQL `SELECT count(*) FROM accounts WHERE email = 'TEST_EMAIL';` returns `1`. |
| B2-2 | SQL: `UPDATE accounts SET google_id = substr(google_id, 8) WHERE email = 'TEST_EMAIL';` Then `UPDATE accounts SET email = 'stage4-' || email WHERE email = 'TEST_EMAIL';` Sign in with Google. | `UPDATE 1` twice. Sign-in works. SQL `SELECT count(*) FROM accounts WHERE email IN ('TEST_EMAIL', 'stage4-TEST_EMAIL');` returns `1`: no new Account, and the DrillMap email stayed. |
| B2-3 | Sign out. SQL: `UPDATE accounts SET email = substr(email, 8) WHERE email = 'stage4-TEST_EMAIL';` | `UPDATE 1` |
| B1-1 | Sign in as the test user in browser A and browser B. In A, open Account and press "Sign out of all devices", then confirm. | A lands on Login. In B, reloading onboarding goes to Login with "Your session ended. Sign in again." |
| B1-2 | Sign in again in A and B. SQL: `UPDATE accounts SET disabled_at = now() WHERE email = 'TEST_EMAIL';` Reload B. Then try Google sign-in in B. | B goes to Login. The new sign-in shows "This Account can't sign in." |
| B1-3 | SQL: `UPDATE accounts SET disabled_at = NULL WHERE email = 'TEST_EMAIL';` Sign in again. | Sign-in works. |
| B1-4 | SQL: `UPDATE accounts SET role = 'admin' WHERE email = 'TEST_EMAIL';` Reload the open page. Sign in again, then open `/admin` in A and B. | The reload goes to Login. After the new sign-in, both browsers show the Admin pages. |
| B1-5 | SQL: `UPDATE accounts SET role = 'student' WHERE email = 'TEST_EMAIL';` Reload `/admin` in B. | B goes to Login. It does not show the Admin pages. |
| B10-1 | Sign in again in A and B. Wait more than 10 minutes. In A, open Account. | The deletion form is replaced by "Sign in again to delete" and "Continue with Google". |
| B10-2 | Press "Continue with Google". | Google shows the account chooser. After you choose the test user, A returns to the deletion form. |
| B10-3 | Type DELETE and delete the Account. Then reload B. | A lands on the home page. B goes to Login. SQL `SELECT count(*) FROM accounts WHERE email = 'TEST_EMAIL';` returns `0`. |
| B9-1 | Sign in to the copy as Admin 1 with Google. | The Admin pages open. Login shows only "Continue with Google". |
| B9-2 | SQL: `SELECT count(*) FROM accounts WHERE role = 'admin' AND password_hash IS NOT NULL;` | `0` |

## Results

The owner ran every step on 2026-10-23 between about 09:30 and 15:15 US Central time. Each result is the owner's observation. The agent read back no page or row.

| Step | Copy deployment | Result | Notes |
| --- | --- | --- | --- |
| A1 to A5 | `dpl_GuAhid4jZNLxKF7vWNSfKrXJkGR1` | Pass | A2: the copy's `neondb` as `neondb_owner` showed `7` and `1792022400000`. A3: `8` and `1792108800000`. A5: the copy build was `Staged`, and the owner promoted it in the copy project only. |
| B4-1 to B4-3 | same | Pass | B4-2 showed the refusal text, and `/dashboard` went to Login. B4-3: `0` Accounts with both a password and a Google ID. |
| S-1, S-2 | same | Pass | S-2 came back with `error=Configuration`, not `AccessDenied`. Login showed the refusal text. |
| B2-1 to B2-3 | same | Pass | B2-1 came back with `error=AccessDenied`, and the count was `1`. B2-2 signed in by Google ID, and the changed DrillMap email stayed. |
| B1-1 to B1-5 | same | Pass | Each reload went to Login. B1-1 showed "Your session ended. Sign in again." B1-2 showed "This Account can't sign in." |
| B10-1 to B10-3 | same | Pass | B10-2 showed the account chooser. After deletion, the count was `0`. |
| B9-1, B9-2 | same | Pass | Login showed only "Continue with Google". `0` Admins with a password. |

### What differed from the run sheet

- **Real site.** The run sheet expected the Stage 3 build `315fad4`. The real site served `7103300`, deployment `2ryju7FX3dhkA3nB245xRVUSLPqL`. That is the intentional release recorded on [#148](https://github.com/Jahazel/lsat-scheduler/issues/148) on 2026-10-22. The owner reported that it did not change during the run.
- **Row counts.** The Neon SQL editor reports success, not a row count, for `INSERT`, `UPDATE`, and `DELETE`. Each `INSERT 0 1`, `UPDATE 1`, and `DELETE 1` above was checked by a `SELECT count(*)` that followed it.
- **Placeholder rows (B4).** The first B4-1 insert used the literal text `TEST_EMAIL`, because the clipboard was overwritten. The owner deleted that row, confirmed a count of `0`, and redid the insert. The first B4-3 delete also used the placeholder and matched nothing. The owner reran it with the real email and confirmed a count of `0`.
- **Google cancel (S-2).** Google skipped the account chooser, because the test user had already given the copy access in S-1. The owner removed the copy's access in the test Google account. Then Google showed its permission screen, and the owner pressed Cancel there.
- **B1-1.** The test user had finished onboarding, so B reloaded the dashboard in place of onboarding.
- **B10-1.** The wizard's timer was skipped early. The owner opened Account after more than 10 minutes by the clock.
- **B10-3.** The owner deleted the Account before answering the wizard's "test user, not an Admin" question. B1-5 had already set the role back to student, and A showed no Admin link.

## What the copy run cannot prove

- **Unverified Google email (B2).** Google does not give a test user an unverified email. The Postgres tests cover this rule.
- **Session time limits (B1).** The 14-day idle, 30-day student, and 24-hour Admin limits need days of waiting. The session-step tests cover them.
- **Changed Google email (B2).** Steps B2-1 and B2-2 change the DrillMap side instead. They prove that sign-in finds the Account by Google ID and never by email.
- **Extraction after revocation (B1).** The weekly upload refusal with a minted cookie is covered locally by `verify`. The run starts no paid call.
- **Password parts of B4 and B10.** They wait for [#230](https://github.com/Jahazel/lsat-scheduler/issues/230).
- **Admin 2 (B9).** Admin 2 is not on the real site yet ([#216](https://github.com/Jahazel/lsat-scheduler/issues/216)). Both Admins' Google 2-Step Verification dates are from #139 (2026-10-16).

## Launch checklist effect

Every launch checklist row stays `Not tested`. Stage 4 adds evidence only.

## Stage 5 handoff

Stage 4 is proven on the copy with real Google sign-in. Stage 5 builds on it. Do not rebuild these.

**Proven on the copy (Stage 4).**

- Login and Signup offer only "Continue with Google". No Admin has a password.
- A Google sign-in whose email belongs to a password Account makes no session and joins nothing.
- Sign-in finds the Account by Google ID only. A new Google ID with a used email is refused. A changed DrillMap email keeps the same Account.
- Every session read checks the current Account. "Sign out of all devices", disabling, and role changes end the other sessions on the next request.
- Account deletion needs a Google sign-in, with the account chooser, from the last 10 minutes.

**Stage 5 work.** Stage 5 is abuse and paid scanning limits ([#79](https://github.com/Jahazel/lsat-scheduler/issues/79)):

- Signup and login rate limits. [#222](https://github.com/Jahazel/lsat-scheduler/issues/222) moved them here.
- Shared database counters.
- Upload size and type limits, and checks on the model's output.
- Daily and monthly scan limits, with spend counted before each call.
- Time and concurrency limits.
- The emergency switch.
- Hand-typed Analytics snapshots.

**Carried forward.**

- **Cancel shows as `Configuration` (Stage 6).** A cancel at Google comes back to Login as `error=Configuration`. Login shows the right text. But the sign-in event logs must not count each cancel as a setup fault.
- **The real site lacks `0007_account_sessions`.** Stage 4 ran on the copy only. The real site changes only through a release that the owner approves in writing.
- **Password sign-in** waits for a domain ([#230](https://github.com/Jahazel/lsat-scheduler/issues/230)).
- **Admin 2** is not on the real site yet ([#216](https://github.com/Jahazel/lsat-scheduler/issues/216)).
- **Copy releases are `Staged`.** Production builds from `main` in the copy project need a manual promotion, as A5 did. Release steps must say so.
- **No promotion.** The no-promotion rule stays until launch approval.

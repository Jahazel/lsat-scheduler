# Password sign-in copy run evidence

Record for [#289](https://github.com/Jahazel/lsat-scheduler/issues/289), under the password sign-in spec [#278](https://github.com/Jahazel/lsat-scheduler/issues/278) and [#230](https://github.com/Jahazel/lsat-scheduler/issues/230). Run on 2026-10-27 US Central time (22:36 UTC on 2026-10-27 to about 01:25 UTC on 2026-10-28).
This file holds no password, key, connection string, cookie, link token, or test email address.
It approves no release or launch. No launch checklist row passes because of this file.

**Status: copy run done. Every step that ran passed.** The owner ran the steps with a wizard and reported each result.
The agent recorded them below. One step did not run (7). Two answers were left blank in the wizard (10f, 11c); see [What differed](#what-differed-from-the-run-sheet).
The wizard was removed after the run; its last version is `scripts/issue-289-copy-run-wizard.sh` at commit `6ae9f10`.

## Words in this file

- **Main Account**: the password Account that the run signs up, resets, and changes.
- **Pending signup**: a password signup whose email is not verified yet (see `GLOSSARY.md`).
- **Burst**: requests that the wizard sent one after another from the owner's computer, with the copy's own form requests.
  One computer means one IP address, so the IP limits count every request in a burst.
- **Same screen**: the reply that a person sees does not show whether the email has an Account.

## Version for the copy run

| Item | Value |
| --- | --- |
| `main` at the start | `70a2b1a`. It includes the cron fix `1773c09` from #288. |
| Copy migrations | Run `40597812207` from `1a253d9`: `Target: copy. Journal rows before: 12. After: 13. New migrations: 1.` The production job was skipped. This added `0012_password_sign_in`. |
| Copy deployment | `dpl_AQhBxKzFE9S2fhozkXPCaN8c5Rms` after the migration. It was rebuilt and promoted once after the Resend key change (`dpl_3uFdoeWUiab91J5sXzhaV9Sf8…`). Every step from 4a on used the rebuilt deployment. |
| Email | Resend, from `no-reply@copy-mail.drillmap.xyz`, with a new sending-only key for the copy domain. |
| Cron | `/api/cron/daily-cleanup`, schedule `0 9 * * *`, with the copy's own `CRON_SECRET`. |
| Real site Production | `dpl_DJiqR9kKL5Ge9KtRksQEdBe2p48x` before and after the run. |

## Results

Each result is the owner's observation, or the HTTP reply that the wizard recorded. The agent saw pages, emails, SQL results,
and Vercel logs only in the owner's screenshots.

| Step | Row | Result | Notes |
| --- | --- | --- | --- |
| 2 | — | Pass, after a fix | The first run (`40596174944`) refused: "An Account has no Google ID." Two old test Accounts on the copy had no Google ID. The owner deleted them, and the second run passed. See Findings. |
| 4a | Email | Pass | The verify email arrived in the Primary inbox, not spam, in under 1 minute, from `no-reply@copy-mail.drillmap.xyz`. |
| 4b | Email | Pass | "Email verified" showed. Login worked, and onboarding Step 1 opened. |
| 5a | B3, B4 | Pass | Four signups: a new email, the same email again, a password Account's email, and a Google Account's email. All four showed the same "Check your email" screen. Only the email differed. |
| 5b | B3, B4 | Pass | The new email got "Verify your email" twice. The password Account got "You already have a DrillMap Account". The Google Account got "You sign in to DrillMap with Google". All in the inbox. |
| 5c | B3 | Pass | The older verify link showed "This link doesn't work" after the newer signup. |
| 5d | B3 | Pass | Login as the Pending signup showed "Verify your email first" and started no session. |
| 5e | B3, B4 | Pass | `1, 0, 0, 0, 0, 0`: one Pending signup, no Account for it, and no Pending signup or password for the Google Account's email. |
| 6a, 6b | B3, cron | Pass | The owner moved the Pending signup 8 days back and pressed Run on the copy's Cron Job. Request Logs showed `GET /api/cron/daily-cleanup` 200. |
| 6c, 6d | B3 | Pass | `0` Pending signups left. Its newer verify link showed "This link doesn't work". |
| 6e | Cron | Pass | Without the secret: HTTP 401 `{"error":"Not allowed"}`. With a wrong secret: HTTP 401. |
| 7 | B4 | Not run | The Google-side refusal needs a Google Account with no Account on the copy. The owner's inbox is an Admin's Google Account. See [What the copy run cannot prove](#what-the-copy-run-cannot-prove). |
| 9 | B7 | Pass | 6 of 6 wrong logins showed the same "don't match" message. Unknown email: 0.92, 0.59, 0.57 s. Wrong password: 0.59, 0.56, 0.68 s. |
| 10a, 10b | B7 | Pass | Reset for an unknown email, the Main Account, and the Google Account: the same screen. The Main Account got the reset email; the Google Account got "You sign in to DrillMap with Google"; the unknown email got nothing. |
| 10c | B7 | Pass | The older reset link showed "This link doesn't work" after a newer one was requested. |
| 10d | B7 | Pass | `0, 1, 0, 0`: the raw link token is in no row; its SHA-256 hash is in one row. |
| 10e | B7 | Pass | The reset showed "Password changed. Log in with your new password." |
| 10f | B7 | Pass | Browser 1, signed in as the Main Account before the reset, was signed out and sent to Log in. The owner reported it in chat; the wizard line was left blank. |
| 10g | B7 | Pass | The used reset link showed "This link doesn't work". |
| 10h, 10i | B7 | Pass | A reset link moved 31 minutes back showed "This link doesn't work". |
| 11a | B10 | Pass | A change with a wrong current password: "That's not your current password. Try again." |
| 11b | B10 | Pass | A change with the current password: signed out, with "Password changed. Log in with your new password." |
| 11c | B10 | Not recorded | Login with the old password. The answer was left blank. See [What differed](#what-differed-from-the-run-sheet). |
| 11d | B10 | Pass | Login with the new password worked. |
| 11e to 11g | B10 | Pass | A second Account: deletion with a wrong current password was refused with the same message. Deletion with the right one went to the home page. `0` rows left for it. |
| 13a, 13b | C1 | Pass | Bursts started at 01:00:29 UTC. 12 of 12 signup replies and 12 of 12 reset replies showed the same "Check your email" screen, refused or not. |
| 13c | C1 | Pass | 10 wrong logins for the Main Account got "don't match". The 11th, with the right password, was paused with "Too many tries", in 0.34 s against 0.68 s for a wrong try. So the pause came before the hash work. |
| 13d | C1 | Pass | The same for an unknown email: 10 "don't match", then the 11th paused with the same text. |
| 13e | C1 | Pass | New unknown emails: paused at #31, after 50 counted failures this hour. |
| 13f | C1 | Pass, as owner-decided | 77 replies, all HTTP 200. Form actions show the refusal on the form (owner, 2026-10-24, #249). |
| 14a | C1 | Pass | 3 verify emails for one email. The 4th signup sent nothing. |
| 14b | C1 | Pass | `ip1` to `ip7` got verify emails; `ip8` did not. The refused 4th signup for one email did not count toward the IP limit, so the 11th counted signup from the IP address was refused. |
| 14c | C1 | Pass | 3 reset emails for the Main Account. The 4th sent nothing. |
| 14d | C1 | Pass | The 11th reset from the IP address, for the Google Account, sent no email. |
| 14e | C1 | Pass | `1, 1, 0`: a refused signup writes no Pending signup. |
| 15a | — | Pass | `0, 0`: no test Account or Pending signup left on the copy. |

### What differed from the run sheet

- **Resend key.** The copy's first `RESEND_API_KEY` was refused (`401 validation_error`). The owner made a new sending-only key for `copy-mail.drillmap.xyz`,
  set it on copy Production, redeployed, promoted, and deleted the old key.
- **Stale page.** A browser tab opened before the redeploy showed "Failed to find Server Action". A reload fixed it.
- **Form requests.** The agent built the three burst requests from the copy's form action IDs and one recorded browser request,
  and tested each once with a placeholder email.
- **Onboarding first.** Account opens Onboarding until onboarding is done. The owner finished onboarding for each test Account before steps 11 and 11e.
- **Row counts.** The Neon SQL editor reports success, not a row count. Each count above comes from a `SELECT` that followed.
- **10h order.** The first backdate ran before the third reset link existed (0 rows). The owner asked for the link and ran it again.
- **Blank answers.** 10f and 11c were left blank when the owner pressed Enter. 10f was reported in chat. 11c was not, and the Main Account was deleted in cleanup.
  The Postgres test `passwordChange.test.ts` covers that the old password stops working.
- **Wizard faults.** Four steps confused the owner: the 6d wording, the clipboard copy, the missing onboarding step, and Neon's missing row counts.

### Findings

- **Migration `0012` refuses an Account with no Google ID.** This is by design. The copy had two old test Accounts with no Google ID.
  The real site may have the same kind of Account. Before the real-site migration, run
  `SELECT count(*) FROM accounts WHERE google_id IS NULL;` on production. The owner decides what happens to each one.
- **The real site's Resend key shows "No activity".** The copy's old key was invalid. Check the real-site key before password sign-in goes live there.
- **Auth.js logs refused logins as errors.** A wrong password writes an error line in the Vercel logs. This is noise, not a fault.

## What the copy run cannot prove

- **Google sign-in with a verified password Account's email (B4, step 7).** It needs a spare Google Account. `passwordSignup.test.ts` covers the refusal.
- **The 6th signup in 1 day for one email, and each limit after its window ends (C1).** The run had one hour. `passwordSignup.test.ts` and `actionLimits.test.ts` cover them.
- **The 10-minute Recent sign-in (B10).** For a password Account, the current password is the Recent sign-in, so no wait applies. `passwordChange.test.ts` covers it.
- **Password length and common-password rules (B5, B6).** These are Auto rows. `passwordRules.test.ts`, `passwordSignup.test.ts`, and `passwordChange.test.ts` cover them.

## Launch checklist effect

The "waits for issue 230" lines are removed from B3, B5, B6, B7, and the password parts of B4, B10, and C1. The row text keeps every check.
Every row stays `Not tested`, because each check must pass on the exact version that launches. The owner decides when password sign-in ships to the real site.

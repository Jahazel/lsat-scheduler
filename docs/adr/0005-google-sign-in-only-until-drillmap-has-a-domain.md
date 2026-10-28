# Google sign-in only until DrillMap has its own domain

Status: replaced by [issue 230](https://github.com/Jahazel/lsat-scheduler/issues/230) on 2026-10-27. DrillMap owns `drillmap.xyz`, and the code has password sign-in again, with verified email through Resend. The owner decides when it ships to the real site. Account rules 6 to 21 and all of rule 29 apply again. The [issue 289 copy run](../security/issue-289-copy-run-evidence.md) proved password sign-in on the copy with real email. The text below is the original decision.

Original status: accepted. This ADR paused [Account rules](../security/issue-74-decisions.md) 6 to 21, and the password-change part of rule 29, until [issue 230](https://github.com/Jahazel/lsat-scheduler/issues/230) brings password sign-in back.

The owner decided on 2026-10-22 ([Stage 4, issue 222](https://github.com/Jahazel/lsat-scheduler/issues/222)) that DrillMap signs people in with Google only. Password signup and password login leave the app. Password Accounts need email for verification and reset, and an email provider sends only from a domain that the sender owns and proves with DNS records. DrillMap runs on `lsat-scheduler.vercel.app` and owns no domain, so it cannot send that email.

The owner weighed three other options:

- **Buy a domain now.** The domain, its DNS records, and the email provider become Stage 4 work, ahead of the session fixes.
- **Split Stage 4.** The session fixes ship first, and the password fixes follow later in the stage. Until then password signup stays open and unsafe: it does not verify the email, it says when an email already exists, and it allows common passwords.
- **Send through Gmail.** A personal Gmail account sends the verification and reset email. The email then comes from a Gmail address, not from DrillMap.

Google sign-in only removes the unsafe password paths now and needs no email. Issue 230 holds the password work and its decisions already made: Resend as the email provider, a sending subdomain, and a daily Vercel Cron job for pending Accounts. It starts only when the owner buys a domain.

## Consequences

- Every student needs a Google Account. A Google Account can be made with any email address, so a student without Gmail can still sign up. The owner accepted this assumption.
- The `password_hash` column stays in the database, unused. No code reads it for sign-in, and no migration removes it. Issue 230 decides what to do with it.
- Launch checklist rows B3, B5, B6, and B7 wait for issue 230 and must pass before password sign-in returns. B4 and B10 drop only their password parts. See the [launch checklist](../security/release-gate.md#b-sign-in-and-accounts).
- The Google sign-in rules from Stage 3 (Account rules 2 to 5) do not change.

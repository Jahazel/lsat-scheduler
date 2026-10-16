# Issue 140: Google identity for the recreated Admin Accounts

Part of [issue 137](https://github.com/Jahazel/lsat-scheduler/issues/137) (Stage 3). Built on October 16, 2026.

## What changed

- Migration `0002_google_identity` adds a unique `accounts.google_id` (Google's stable `sub`).
- Google sign-in needs `email_verified === true`. It finds the Account by Google ID, never by email.
- A new ID with an unused email makes a student Account. Any email match with a password Account or another Google identity is refused. Concurrent first sign-ins make one Account and never join identities (the insert uses `ON CONFLICT DO NOTHING` on both unique columns).
- A changed Google email opens the same Account. The DrillMap email does not change.
- Password sign-in refuses every Admin, with or without a stored hash.
- `make-admin` (owner database access) refuses an Account with no Google ID and clears the password. No signup field, public route, or Google callback sets the role.
- `create-test-user --admin` is removed, because a password Admin cannot sign in.

## Moved forward from Stage 4

Rules 2 to 5, 31 and 32 of [issue-74-decisions.md](issue-74-decisions.md) are now built. Rules 39 and 41 (bind a Google ID to an existing Account by email) are not built, because the new database starts empty. Stage 4 keeps session controls, password verification and recovery, disabled Accounts, and its other rules. It must reuse this code.

## Evidence

- `tests/postgres/accountsStudents.test.ts`, on real throwaway Postgres as the limited app role: first sign-in, unverified or missing claims, email collisions, changed email, concurrent sign-ins, no Admin grant from Google or signup, Admin password refusal, owner grant then fresh sign-in with the same Account.
- `tests/postgres/devScripts.test.ts`: `make-admin` refusal and promotion; `--admin` refused.
- `tests/postgres/migrations.test.ts`: migrations apply once, and a second run changes nothing.
- Local browser run under the verify skill (throwaway database, fake extractor): the Admin login form refused a password; a minted Admin session opened `/admin` and listed students; anonymous `/admin` went to `/login`; a student signed in to `/dashboard` and `/admin` returned them to `/dashboard`. Real Google sign-in was not run locally.

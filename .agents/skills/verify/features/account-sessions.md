# Account sessions

Every protected request checks the current Account in the database. A deleted, disabled, or demoted Account loses access on its next request, in every browser. "Sign out of all devices" on the Account page does the same on request. Student sessions end after 14 days without use and 30 days after sign-in. Admin sessions end 24 hours after sign-in.

## Sub-features

- `session-current` keeps a fresh session working and renews its cookie on use.
- `session-disabled` refuses every open session of a Disabled Account on its next request.
- `session-role-change` refuses every open session after the owner changes the Account's role.
- `session-deleted` refuses the open sessions of a deleted Account.
- `session-sign-out-all` ends every session of the Account from the Account page, including the current browser. The ordinary "Log out" ends only the current browser.
- `session-time-limits` ends sessions on time. The Postgres tests in `tests/postgres/accountSessions.test.ts` prove the time limits with a fake clock. A browser run cannot wait 14 days.

## How to get to it (user POV)

- A signed-in student or Admin opens any protected page, such as `/dashboard`, `/account`, or `/admin`.
- A signed-in student or Admin opens `/account` and presses "Sign out of all devices" in the Sessions card.
- The owner disables an Account or changes its role with SQL. There is no screen for this.

## Driving it with browser tools

Preconditions:

- Doctor passes. Seed one student and one Admin with `local.mjs seed`.
- Find this run's database with `local.mjs doctor "$VERIFY_RUN_DIR" | jq -r .postgresDatabase`. Run owner-style SQL with `psql` against that database, using the owner user from `DATABASE_URL`. This stands in for the owner's SQL on the real database.
- Two browsers need two cookie stores. A second tab shares cookies, so it is not a second browser. Use the harness's browser for one session and an isolated Playwright context for the other. See the parent skill's browser fallback for the Playwright setup.

Steps:

- Mint two sessions for the student with `local.mjs session` and set one cookie in each browser. Open `/account` in both. Expect the `Account` heading and the student's email in both.
- Save `records-before.json`. Run `update accounts set disabled_at = now() where email = '<student email>'`. Reload `/account` in each browser. Expect `/login?error=SessionEnded` and "Your session ended. Sign in again." in both. Inspect records and require `disabled_at` set, `session_version` raised by one, and the student's records unchanged.
- Run `update accounts set disabled_at = null where email = '<student email>'`. Open `/account` in the old browsers. Expect plain `/login`: the first refusal cleared the cookie, and the old sessions stay ended. Mint a new session and expect `/account` to open.
- Sign out of all devices. Mint three sessions for one student. Set one in the harness browser (A) and one in the isolated browser (B); open `/account` in both. In A, open the Account menu and press `Log out`. Reload `/account` in B and expect the `Account` heading: ordinary sign-out ends only A. Set the second session in A and open `/account`. Save `records-before.json`. Click `Sign out of all devices`. Expect the grey panel "Sign out of all devices?" with `Cancel` and a dark `Sign out of all devices` button. `Cancel` closes it. Reopen it and press the dark button. Expect "Signing out…" with both buttons disabled, then plain `/login` with no ended-session notice. Reload `/account` in B and expect `/login?error=SessionEnded`. Open `/account` in a fresh isolated browser with the third session and expect the same refusal. Inspect records and require only `session_version` raised by one.
- Mint two sessions for the Admin and set one in each browser. Open `/admin` in both. Expect `All students`. Run `update accounts set role = 'student' where email = '<Admin email>'`. Reload `/admin` in each browser. Expect `/login?error=SessionEnded` in both.

## Gotchas

- The working state lasts well under a second. Record it with a `MutationObserver` that writes to `sessionStorage`, or with a recording; a snapshot taken after the click usually misses it.

- The minted cookie expires one hour after minting. The first protected request re-signs it with the 14-day idle limit.
- A refused browser lands on `/login?error=SessionEnded` and reads "Your session ended. Sign in again." A browser with no session cookie lands on plain `/login`.
- `JWTSessionError` in `app.log` is expected only for a cookie signed by an earlier run's secret. A refused session clears the cookie without that error.

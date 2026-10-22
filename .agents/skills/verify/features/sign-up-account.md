# Sign-up and Account

DrillMap signs people in with Google only. Signup asks for the Terms and Privacy agreement before Google sign-in starts. Login shows one Google button and explains why a sign-in failed or a session ended. Account shows the email and lets a student delete their own records.

## Sub-features

- `signup-entry` reaches Signup from the public navigation and landing action.
- `signup-consent` starts no Google sign-in until the Terms and Privacy box is ticked, and shows "Tick the box to continue."
- `login-states` shows one "Continue with Google" button, no email or password field, and one message per reason: refused sign-in, Disabled Account, and ended session.
- `logout` returns to the public app with protected pages unavailable.
- `account-delete` removes the student's Account and associated records, and ends the Account's sessions in every browser.

## How to get to it (user POV)

- On `/`, click `Build my first plan` or the navigation `Sign up` link. Both reach `/signup`.
- On `/login`, click `Sign up`. On `/signup`, click `Log in`. Public navigation also has `Log in`.
- Auth.js sends every Google sign-in failure to `/login?error=<type>`. A refused Google sign-in (`AccessDenied`) and any other Auth.js error type show the refusal text. `AccountDisabled` and `SessionEnded` show their own text. The proxy adds `SessionEnded` when the browser sent a session cookie that the current-Account check ended, on a protected page or on a direct `/login` visit.
- In the student workspace, open `Account menu for verify-student@example.test`. Choose `Account` or `Log out`.
- Direct `/signup`, `/login`, and `/account` links must enforce the same sign-in rules.

## Driving it with browser tools

Preconditions:

- Doctor passes. Start signed out with no Account for the chosen email.
- Save a database inspection before Signup. Start the browser action recording.

Steps:

- Open each Signup entry with `click('role=link[name="Build my first plan"]')` and `click('header a[href="/signup"]')` on fresh public visits. Expect the `Sign up for DrillMap` heading and `/signup`. The page has no site header or site footer; its own `DrillMap` wordmark and `Terms`, `Privacy`, and `AI disclosure` links replace them.
- On `/signup`, leave the box unticked and click `role=button[name="Continue with Google"]`. Expect `Tick the box to continue.` under the box, the box with `aria-invalid="true"`, the URL still `/signup`, and no new Account record. Capture this state.
- Open `/login`. Expect the `Log in to DrillMap` heading, exactly one button, `Continue with Google`, and no input. Open `/login?error=AccessDenied`, `/login?error=AccountDisabled`, and `/login?error=SessionEnded`. Expect, in order, the alert `Google sign-in didn't finish. Try again, or use a Google account with a verified email.`, the alert `This Account can't sign in.`, and the status `Your session ended. Sign in again.` Capture each.
- Seed the student with `local.mjs seed "$VERIFY_RUN_DIR" student verify-student@example.test --not-onboarded`. Set its minted session cookie. Open `/onboarding` and expect `Set your target`. Complete [onboarding](study-settings.md) to obtain student navigation. Open `role=button[name="Account menu for verify-student@example.test"]`, then `role=menuitem[name="Account"]`. Expect `/account`, the `Account` heading, and the same email.
- Open the Account menu and click `role=menuitem[name="Log out"]`. Wait for `role=link[name="Build my first plan"]` on the landing page; a direct visit before that still lands signed in. Visit `/account` directly. Expect plain `/login` with no message: the browser sent no session cookie.
- For deletion, use only this disposable student. Mint a second session in a second browser (an isolated Playwright context) and open `/account` there. Save records and affected IDs first. In the first browser, reach Account through its menu and through `/account`. Type `DELETE` into `input[name="confirmation"]`, then click `role=button[name="Delete account"]`. Expect the public landing page. Inspect records and require the user's ID, their Student, analytics snapshots, weekly schedules, and activity check-ins to be absent. Reload `/account` in the second browser. Expect `/login?error=SessionEnded` and `Your session ended. Sign in again.`

## Gotchas

- A signed-in student visiting `/signup` or `/login` redirects to `/dashboard`. From there, an Account without a Student goes to `/onboarding`, and a week without a weekly schedule goes to `/dashboard/upload`. An Admin lands on `/admin`.
- Admin Accounts have no deletion form. Verify student deletion with a student Account.
- This baseline supplies no Google client. Do not click `Continue with Google` with the box ticked, and do not use the user's connected Google account. Real Google sign-in, its refusals, and the Disabled Account refusal at sign-in are checked by the owner on the copy with a Google test user. Record them as untested here.
- UI validation alone proves no write only when the read-only database check also shows no new user.

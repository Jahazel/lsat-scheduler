# Sign-up and Account

DrillMap signs people in with Google or with an email-verified password. Signup offers "Continue with Google", whose press counts as agreement to the Terms and Privacy Policy, then a name, email, and password form with the Terms box above "Create account". Every password signup shows "Check your email". The email's link opens "Verify my email"; only the button press makes the Account. Login offers Google, then the email and password form, and explains why a sign-in failed or a session ended. Account shows the email and lets a student delete their own records after a Google sign-in from the last 10 minutes.

## Sub-features

- `signup-entry` reaches Signup from the public navigation and landing action.
- `signup-consent` saves and sends nothing until the Terms and Privacy box is ticked, and shows "Tick the box to continue." beside the box, keeping the typed values.
- `password-signup` shows "Check your email" with the email, and the fake sender writes the verification email to `app.log`.
- `verify-email` opens `Verify your email` from the logged link without using it; `Verify my email` makes the Account and lands on `/login?notice=EmailVerified` with "Email verified. Log in." A used, expired, or unknown link shows "This link doesn't work".
- `password-login` signs the verified student in with the password and lands on onboarding.
- `login-states` shows "Continue with Google", then the email and password form with "Log in", and one message per reason: refused sign-in, Disabled Account, ended session ("Your session ended. Log in again."), wrong email or password, and email verified.
- `logout` returns to the public app with protected pages unavailable.
- `account-delete` removes the student's Account and associated records, and ends the Account's sessions in every browser.
- `account-delete-sign-in-age` asks for a new Google sign-in when the sign-in is more than 10 minutes old. "Continue with Google" there forces the Google account chooser and returns to `/account#delete-account`.

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
- On `/signup`, fill `Name`, `Email`, and `Password`, leave the box unticked, and click `role=button[name="Create account"]`. Expect `Tick the box to continue.` under the box, the box with `aria-invalid="true"`, the typed values kept, the URL still `/signup`, and no new Account record. Capture this state.
- Tick the box and click `Create account`. Expect the `Check your email` heading with the email, and no Account record. Read the newest `Fake email to <email>` entry in `app.log` and open its `/verify-email?token=` link. Expect `Verify your email` and no record change after a reload. Click `Verify my email`. Expect `/login?notice=EmailVerified`, the status `Email verified. Log in.`, and one Account with no Google ID. Open the link again and press the button: expect `This link doesn't work`. On `/login`, type the email and password and click `Log in`. Expect `/onboarding` and `Set your target`. `smoke.mjs` drives these steps.
- Open `/login`. Expect the `Log in to DrillMap` heading, the buttons `Continue with Google` and `Log in`, and the `Email` and `Password` inputs. Open `/login?error=AccessDenied`, `/login?error=AccountDisabled`, and `/login?error=SessionEnded`. Expect, in order, the alert `Google sign-in didn't finish. Try again, or use a Google account with a verified email.`, the alert `This Account can't sign in.`, and the status `Your session ended. Log in again.` Capture each.
- Seed the student with `local.mjs seed "$VERIFY_RUN_DIR" student verify-student@example.test --not-onboarded`. Set its minted session cookie. Open `/onboarding` and expect `Set your target`. Complete [onboarding](study-settings.md) to obtain student navigation. Open `role=button[name="Account menu for verify-student@example.test"]`, then `role=menuitem[name="Account"]`. Expect `/account`, the `Account` heading, and the same email.
- Open the Account menu and click `role=menuitem[name="Log out"]`. Wait for `role=link[name="Build my first plan"]` on the landing page; a direct visit before that still lands signed in. Visit `/account` directly. Expect plain `/login` with no message: the browser sent no session cookie.
- For an old sign-in, seed a second student and mint its session with `local.mjs session "$VERIFY_RUN_DIR" <email> --signed-in-minutes-ago 15`. Open `/account`. Expect `Sign in again to delete`, `Deleting your account needs a Google sign-in from the last 10 minutes.`, and one `Continue with Google` button in the deletion card with no confirmation field. Click it. The browser reaches `accounts.google.com`, which refuses the empty baseline client ID. To read the address, POST the page's `$ACTION_ID_…` form field with that cookie and an `Origin: http://127.0.0.1:3100` header: require `prompt=select_account` in the `Location` header and `/account#delete-account` in the `authjs.callback-url` cookie.
- For deletion, use only this disposable student. Mint a second session in a second browser (an isolated Playwright context) and open `/account` there. Save records and affected IDs first. In the first browser, reach Account through its menu and through `/account`. Type `delete` into `role=textbox[name="Type DELETE to confirm"]` and click `role=button[name="Delete account"]`. Expect `Type DELETE in capital letters to confirm.` under the field, the field with `aria-invalid="true"` and still holding `delete`, and no record change. Type `DELETE` and click again. Expect `Deleting…` on the disabled button with a read-only field, then the public landing page. Inspect records and require the user's ID, their Student, analytics snapshots, practice-test results, weekly schedules, and activity check-ins to be absent. Reload `/account` in the second browser. Expect `/login?error=SessionEnded` and `Your session ended. Log in again.`

## Gotchas

- A signed-in student visiting `/signup` or `/login` redirects to `/dashboard`. From there, an Account without a Student goes to `/onboarding`, and a week without a weekly schedule goes to `/dashboard/upload`. An Admin lands on `/admin`.
- Admin Accounts have no deletion form. Their deletion card shows `Admin account` and `This action is not available for admin accounts.` Verify student deletion with a student Account.
- A minted session counts as a fresh sign-in for 10 minutes. Mint the deleting student's session just before the deletion steps.
- This baseline supplies no Google client. Do not click `Continue with Google`, and do not use the user's connected Google account. Real Google sign-in, its refusals, and the Disabled Account refusal at sign-in are checked by the owner on the copy with a Google test user. Record them as untested here.
- UI validation alone proves no write only when the read-only database check also shows no new user.

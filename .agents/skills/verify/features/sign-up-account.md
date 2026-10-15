# Sign-up and Account

A visitor creates an Account, signs in, and reaches their student workspace. Account shows the email and lets a student delete their own records.

## Sub-features

- `signup-entry` reaches sign-up from the public navigation and landing action.
- `signup-consent` requires acceptance of the Terms and Privacy Policy.
- `signup-create` creates an Account and signs the student in.
- `login` accepts valid email/password and rejects an invalid password.
- `logout` returns to the public app with protected pages unavailable.
- `account-delete` removes the student's Account and associated records.

## How to get to it (user POV)

- On `/`, click `Build my first plan` or the navigation `Sign up` link. Both reach `/signup`.
- On `/login`, click `Sign up`. On `/signup`, click `Log in`. Public navigation also has `Log in`.
- In the student workspace, open `Account menu for verify-student@example.test`. Choose `Account` or `Log out`.
- Direct `/signup`, `/login`, and `/account` links must enforce the same sign-in rules.

## Driving it with browser tools

Preconditions:

- Doctor passes. Start signed out with no Account for the chosen email.
- Save a database inspection before signup. Start the browser action recording.

- Open each signup entry with `click('role=link[name="Build my first plan"]')` and `click('header a[href="/signup"]')` on fresh public visits. Expect the `Create your account` heading and `/signup`.
- Fill `input[name="name"]` with `Verify Student`, `input[name="email"]` with `verify-student@example.test`, and `input[name="password"]` with a disposable valid password. Leave `input[name="agreedToTerms"]` unchecked and submit with `click('role=button[name="Sign up"]')`. Expect browser validation and no new user record. Capture this state.
- Click `input[name="agreedToTerms"]`. Submit again. Wait for `Tell us about your prep` and `/onboarding`. Inspect records and require exactly one matching user, role `student`, and no Student profile yet. Reload the route to prove the sign-in session survives navigation.
- Complete [onboarding](study-settings.md) to obtain student navigation. Open `role=button[name="Account menu for verify-student@example.test"]`, then `role=menuitem[name="Account"]`. Expect `/account`, the `Account` heading, and the same email.
- Open the Account menu and click `role=menuitem[name="Log out"]`. Visit `/account` directly. Expect `/login`. Type the email and an invalid password into the login form and click `role=button[name="Log in"]`. Expect `Invalid email or password.` and no authenticated workspace. Repeat with the valid password. Expect `/dashboard` after completed onboarding.
- For deletion, use only this disposable student. Save records and affected IDs first. Reach Account through its menu and through `/account`. Type `DELETE` into `input[name="confirmation"]`, then click `role=button[name="Delete account"]`. Expect the public landing page. Inspect records and require the user's ID, their Student, analytics snapshots, weekly schedules, and activity check-ins to be absent. Attempt the old login and require refusal.

## Gotchas

- A signed-in student visiting `/signup` or `/login` redirects to `/dashboard`, then onboarding if needed. An Admin lands on `/admin`.
- Admin Accounts have no deletion form. Verify student deletion before promoting that fixture, or use a second student Account.
- Google buttons are visible but this baseline supplies no Google client. Record that path as untested. Do not use the user's connected Google account.
- UI validation alone proves no write only when the read-only database check also shows no new user.
- The login form clears its inputs after a refused submission. Refill both email and password before retrying. Filling only the password leaves the required email blank.

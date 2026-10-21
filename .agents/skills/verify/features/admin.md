# Admin

An Admin views students' saved schedules without editing them. Their own student side supports Sample analytics snapshots, a forward-only Simulated date, and controlled resets.

## Sub-features

- `admin-students` lists students and opens read-only saved schedules.
- `admin-workspaces` switches All students and My student side.
- `admin-date` moves the Admin's own clock forward.
- `admin-sample` generates improving, steady, or slipping analytics for approval.
- `admin-resets` rebuilds this week or resets test history with confirmation.

## How to get to it (user POV)

- An Admin signs in and lands on `/admin`, the All students list. The list includes onboarded ordinary students and excludes Admin-owned profiles.
- Open the workspace switcher with `All students` or `My student side`, then choose the other workspace option.
- Choose a student card on All students to open `/admin/students/<id>`. Use `← All students` to return.
- On the Admin's student side, use the open Test controls panel. The desktop dock starts expanded. If collapsed, use the button whose name includes `Expand test controls` and the current date. At narrow widths, use the header button whose name includes `Open test controls` to open the overlay.

## Driving it with browser tools

Preconditions:

- Doctor passes. Seed an onboarded Admin with `local.mjs seed "$VERIFY_RUN_DIR" admin verify-admin@example.test`. The Admin has no password. Sign in by setting the cookie from `local.mjs session "$VERIFY_RUN_DIR" verify-admin@example.test`. The Admin login form must refuse every password. For All students and read-only view checks, also seed a separate student with the `student` role. The Admin's own profile cannot serve as that fixture.

- After Admin login, require `/admin`. Click the student's card by its displayed email. Require `Viewing as admin — read only`, the correct email, and the saved schedule or the explicit no-saved-schedule message. Record weekly-schedule counts before and after opening. This view must not create a missing schedule. Require no check-off controls (`role=checkbox`). Test both the list link and the direct student URL.
- Open the workspace switcher and select the option whose link `href` is `/dashboard`. Require My student side. Use the same switcher to return to `/admin`. A standard student visiting `/admin` must return to their own workspace.
- Use Test controls as described above. Click `role=radio[name="Steady"]`, then `role=button[name="Generate sample"]`. Require `Review sample analytics`. Approve it through [This week](weekly-schedule.md). Repeat Improving and Slipping only when those branches are in scope. `Cancel sample` returns without approving a new snapshot.
- Click `role=button[name="Next Monday"]`, a later week-strip day whose button name contains `move to`, or fill `input[type="date"]` under `Move to a later date` and click `role=button[name="Move"]`. Require the shown Simulated date and the stored `accounts.simulated_date` to agree. Dates at or before the current date keep `Move` disabled. In T3, `preview_type` cannot fill the date input. Click it, press `Escape`, press `Shift+Tab` twice to reach the first segment, then press the digits in the displayed order, such as `mm/dd/yyyy`. Confirm the value with read-only DOM inspection. Require a second student's saved records and Admin read-only view to keep the real date.
- With a saved current schedule, click `role=button[name="Rebuild this week"]`. Require the displayed deletion scope and `Confirm rebuild`. Click `Cancel` first and confirm no records changed. Reopen and click `Confirm rebuild`. Require a new current weekly schedule after the app recreates it, with previous current check-ins removed. Require earlier weeks, approved snapshots, study settings, Simulated date, and the Admin Account to remain.
- For `Reset test data`, click its button, inspect the scope, then `Confirm reset`. Require no schedules, check-ins, or analytics snapshots for this Admin's student side. Study settings and the Admin Account remain. The date returns to real time.
- For `Reset everything`, click its button and the resulting `Confirm reset`. Require `/onboarding`, no Student or test history, and the same Admin Account and role. Inspect records to verify each retained and removed object. Never use these controls on someone else's workspace.

## Gotchas

- A seeded Admin is setup, not proof of authorization. The `make-admin` command still needs a fresh sign-in after promotion; a seeded Admin signs in with the Admin role from the start.
- Rebuild and reset use Postgres transactions.
- Sample generation is unavailable before onboarding. It creates candidate values; approval still requires both statements.
- Test controls can be collapsed. On desktop, `Generate sample` collapses the dock. Expand it again before the next control. Use snapshot names rather than coordinates. Resize the browser and exercise the overlay when responsive controls change.
- Direct Admin views of students use the real date. Simulated date affects only the Admin's own student side.
- Account deletion is unavailable for Admins. Use the disposable student fixture for that separate path. After `Reset everything`, the Admin's `/account` redirects to `/onboarding` until they onboard again.

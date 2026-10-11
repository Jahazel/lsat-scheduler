# Admin

An Admin views students' saved schedules without editing them. Their own student side supports Sample analytics snapshots, a forward-only Simulated date, and controlled resets.

## Sub-features

- `admin-students` lists students and opens read-only saved schedules.
- `admin-workspaces` switches All students and My student side.
- `admin-date` moves the Admin's own clock forward.
- `admin-sample` generates improving, steady, or slipping analytics for approval.
- `admin-resets` rebuilds this week or resets test history with confirmation.

## How to get to it (user POV)

- An Admin signs in and lands on `/admin`, the All students list.
- Open the workspace switcher with `All students` or `My student side`, then choose the other workspace option.
- Choose a student card on All students to open `/admin/students/<id>`. Use `← All students` to return.
- On the Admin's student side, expand Test controls. The button can read `Open test controls` or include `Expand test controls` and the current date. A narrow viewport uses an overlay instead of the desktop dock.

## Driving it with browser tools

Preconditions:

- Doctor passes. Create and onboard an Account through the UI. Promote only that disposable Account with the existing local command:

```bash
MONGODB_URI='mongodb://127.0.0.1:27117/lsat-scheduler?replicaSet=drillmap_verify' npm run make-admin -- verify-student@example.test
```

- This command uses database name `lsat-scheduler` explicitly. The separate port and scratch database isolate it. Sign out and back in to refresh the role in the session. Create a second, ordinary student Account for read-only view checks when needed.

- After Admin login, require `/admin`. Click the student's card by its displayed email. Require `Viewing as admin — read only`, the correct email, and the saved schedule or the explicit no-saved-schedule message. Record weekly-schedule counts before and after opening. This view must not create a missing schedule. Require no editable activity-status buttons or actual-minute inputs. Test both the list link and the direct student URL.
- Open the workspace switcher and select the option whose link `href` is `/dashboard`. Require My student side. Use the same switcher to return to `/admin`. A standard student visiting `/admin` must return to their own workspace.
- Open the Test controls button from the snapshot. Click `role=radio[name="Steady"]`, then `role=button[name="Generate sample"]`. Require `Review sample analytics`. Approve it through [This week](weekly-schedule.md). Repeat Improving and Slipping only when those branches are in scope. `Cancel sample` returns without approving a new snapshot.
- Click `role=button[name="Next Monday"]` or fill `input[type="date"]` under `Move to a later date` and click `role=button[name="Move"]`. Require the shown Simulated date and stored user's simulatedDate to agree. Dates at or before the current date cannot be submitted. Require a second student's saved records and Admin read-only view to keep the real date.
- With a saved current schedule, click `role=button[name="Rebuild this week"]`. Require the displayed deletion scope and `Confirm rebuild`. Click `Cancel` first and confirm no records changed. Reopen and click `Confirm rebuild`. Require a new current weekly schedule after the app recreates it, with previous current check-ins removed. Require earlier weeks, approved snapshots, study settings, Simulated date, and the Admin Account to remain.
- For `Reset test data`, click its button, inspect the scope, then `Confirm reset`. Require no schedules, check-ins, or analytics snapshots for this Admin's student side. Study settings and the Admin Account remain. The date returns to real time.
- For `Reset everything`, click its button and the resulting `Confirm reset`. Require `/onboarding`, no Student or test history, and the same Admin Account and role. Inspect records to verify each retained and removed object. Never use these controls on someone else's workspace.

## Gotchas

- Role promotion is setup, not proof of authorization. A fresh sign-in is required after promotion.
- Rebuild and reset use database transactions. The helper's replica set supports them. The README's plain local MongoDB server does not.
- Sample generation is unavailable before onboarding. It creates candidate values; approval still requires both statements.
- Test controls can be collapsed. Use snapshot names rather than coordinates. Resize the browser and exercise the overlay when responsive controls change.
- Direct Admin views of students use the real date. Simulated date affects only the Admin's own student side.
- Account deletion is unavailable for Admins. Use the disposable student fixture for that separate path.

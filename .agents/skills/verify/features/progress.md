# Progress

Progress shows finished-week completion summaries and lets a student open each saved past weekly schedule. Planned work stays fixed while activity check-ins can still be corrected. The `Planned` statistic includes all saved weeks, including the current week. Avg. done, Streak, Best week, and Your weeks use only finished weeks.

## Sub-features

- `progress-empty` explains that no finished weeks exist.
- `progress-summary` shows averages, streaks, planned hours, and finished-week links.
- `progress-detail` opens a past plan and returns to All weeks.
- `progress-deep-links` handles current-week, unknown-week, and legacy links.

## How to get to it (user POV)

- Click `Progress` in student navigation or visit `/progress`.
- Choose a week from `Your weeks` to open `/progress?week=<saved Monday date>`.
- Old `/dashboard?historyWeek=<saved Monday date>` bookmarks redirect to the Progress detail.
- A Progress link for the current week redirects to This week.

## Driving it with browser tools

Preconditions:

- Doctor passes. Complete onboarding. For finished-week proof, approve a Sample analytics snapshot and save a weekly schedule on an Admin's student side.

- Before a week finishes, click `role=link[name="Progress"]`. Require `No finished weeks yet.`. Capture the empty state.
- On the Admin's student side, check off one activity on This week. Record the saved weekStartDate from inspection. Use [Test controls](admin.md) and click `role=button[name="Next Monday"]`. Wait for the Simulated date to move forward. This makes the previous saved week finished without editing stored plan records.
- Open Progress from navigation and directly from `/progress`. Require a link whose `href` is `/progress?week=` followed by the saved Monday date. Require its done count and planned hours to match the stored schedule and activity check-ins.
- After creating the next current weekly schedule, reopen Progress. Require the `Planned` statistic to read `across 2 weeks` and include both saved schedules. Require completion statistics and Your weeks to use only the finished week.
- Click that week link. Require `Viewing a past week · <week> · N of M done` and `Your past plan`. All seven day sections show at once; there is no week or day switch. Compare each day's planned time, capacity, activities, and reasons with the earlier saved document. Click `role=link[name="← All weeks"]` to return to the overview.
- If correcting a past activity is in scope, check off or clear a row on `/progress?week=…` the same way as on This week. Reload, then require the overview's summary to update and the saved planned document to stay equal.
- Navigate to `/dashboard?historyWeek=` followed by the saved Monday date. Require the same Progress detail. Navigate to `/progress?week=` with the current Monday date and require `/dashboard`. An unknown past date falls back to the Progress overview.

## Gotchas

- The current week does not count as a finished week.
- The scheduling clock uses America/Chicago. An Admin's Simulated date applies only to their own student side.
- Past planned work is immutable, but the current implementation exposes editable activity check-ins in past plans. Do not assert that all past-plan controls are read-only.
- The sample must qualify for the relevant week. Advancing the date can require a new approved sample to create the next plan.

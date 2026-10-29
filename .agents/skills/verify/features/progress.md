# Progress

Progress lists the student's past weekly schedules as month cards and lets the student open each one. Past weeks are read-only: planned work and activity check-ins stay fixed. The current week and weeks with no weekly schedule have no row.

## Sub-features

- `progress-empty` explains that no past weeks exist and links to This week.
- `progress-list` shows one card per month of the week's Monday, newest first, with a row per past week: Monday-to-Sunday dates, a done bar, and `X of Y done`.
- `progress-detail` opens a past plan and returns to All weeks.
- `progress-deep-links` handles current-week, unknown-week, and legacy links.

## How to get to it (user POV)

- Click `Progress` in student navigation or visit `/progress`.
- Choose a week row in a month card to open `/progress?week=<saved Monday date>`.
- Old `/dashboard?historyWeek=<saved Monday date>` bookmarks redirect to the Progress detail.
- A Progress link for the current week redirects to This week.

## Driving it with browser tools

Preconditions:

- Doctor passes. Complete onboarding. For finished-week proof, approve a Sample analytics snapshot and save a weekly schedule on an Admin's student side.

- Before a week finishes, click `role=link[name="Progress"]`. Require `No past weeks yet.`, `Each week shows up here after it ends.`, and `role=link[name="Go to This week →"]` with `href` `/dashboard`. Capture the empty state.
- On the Admin's student side, check off one activity on This week. Record the saved weekStartDate from inspection. Use [Test controls](admin.md) and click `role=button[name="Next Monday"]`. Wait for the Simulated date to move forward. This makes the previous saved week finished without editing stored plan records.
- Open Progress from navigation and directly from `/progress`. Require a link whose `href` is `/progress?week=` followed by the saved Monday date. Require the row to sit in the card for the month of its Monday, read the Monday-to-Sunday dates such as `Oct 12 – 18`, and show `X of Y done` matching the stored schedule and activity check-ins. Require no Avg. done, Streak, Planned, or Best week tiles and no planned hours on the row. Capture the list at 1440, 768, and 390 px widths and compare with `docs/design/research/progress/states/list-*.png`.
- Create the next current weekly schedule. After `Next Monday`, This week opens the weekly upload, `Plan this week`. Click `Generate sample` in Test controls and approve it through [This week](weekly-schedule.md). When the first week's plan had a practice test, as with the baseline Saturday preference, the second statement reads `Use this sample as my latest analytics and last week's practice test.` Then reopen Progress. Require exactly one row: the finished week. The new current week has no row.
- Click that week link. Require `Viewing a past week · <week> · N of M done` and `Your past plan`. All seven day sections show at once; there is no week or day switch. Compare each day's planned time, capacity, activities, and reasons with the earlier saved document. Click `role=link[name="← All weeks"]` to return to the overview.
- On `/progress?week=…`, require no `role=checkbox`. Each activity row is a list item ending `, done` or `, not done`. Click rows and press Space and Enter; require no POST request, the same rows after reload, and equal `activity_check_ins` records. For the server refusal, keep a second session on This week, move the Simulated date with `Next Monday` in the first, then press a row in the stale tab: require HTTP 500 with server error `Only this week's check-ins can change` and no check-in change.
- Navigate to `/dashboard?historyWeek=` followed by the saved Monday date. Require the same Progress detail. Navigate to `/progress?week=` with the current Monday date and require `/dashboard`; without a current weekly schedule, `/dashboard` continues to `/dashboard/upload`. The navigate call can report the requested URL, so read the final URL after a wait. An unknown past date falls back to the Progress overview.

## Gotchas

- The current week does not count as a finished week.
- The scheduling clock uses America/Chicago. An Admin's Simulated date applies only to their own student side.
- A stale This week tab that saves after the week has ended shows the app's error page.
- The sample must qualify for the relevant week. Advancing the date can require a new approved sample to create the next plan.

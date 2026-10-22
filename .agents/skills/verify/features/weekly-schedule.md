# Analytics and This week

A student approves an analytics snapshot before DrillMap creates a saved weekly schedule. They check off each schedule activity, or clear the check, without changing the planned work.

## Sub-features

- `analytics-entry` reaches screenshot review during onboarding, or the weekly upload when a new plan needs analytics: "Plan next week" from Saturday, "Plan this week" from Monday to Friday when the week has no weekly schedule.
- `analytics-approval` edits candidate values and requires both confirmation statements.
- `schedule-save` creates one saved schedule per student and calendar week.
- `check-in` checks a line off and clears it. There is no Skip and no actual minutes.
- `pace` shows `N remaining`, `N of M done`, and On pace, `N behind`, or `N ahead` against the lines due so far.
- `schedule-reasons` shows week notes in the header and each day's reasons under its heading, such as `Not scheduled because this weekly schedule started Wednesday.` No capacity notice appears.

## How to get to it (user POV)

- Onboarding Step 3, `Add your 7Sage analytics`, uploads a screenshot. Its Step 4 review has its own controls, described in [Onboarding](study-settings.md). This file covers the This week and Admin sample review.
- Click `This week` in navigation or open `/dashboard`. With no weekly schedule and no upload that counts for the week, it redirects to `/dashboard/upload`. From Monday to Friday the heading is `Plan this week`, the lead is `Your plan starts today and runs to Sunday, <date>.`, the preview shows only today to Sunday, and the button is `Confirm and build this week`. The practice-test block appears only when last week's weekly schedule had a practice test.
- An Admin can open Test controls on their own student side, choose a sample direction, and click `Generate sample` to open the weekly upload at `Check what we read`. It is off, with `The weekly upload is closed this week. Reset test data, or move the simulated date to Saturday.`, from Monday to Friday once the week has a weekly schedule.
- A saved schedule shows all seven day cards. Each schedule activity is one `role=checkbox` row named by its label.

## Driving it with browser tools

Preconditions:

- Doctor passes. Complete onboarding. For the no-paid-service baseline, use the Admin fixture in [Admin](admin.md).

- For the sample path, click `role=button[name="Generate sample"]` in Test controls. Wait for `Check what we read`. Save the before records. Require the confirm button to stay locked before both confirmation statements are checked.
- Type `65` into `input[aria-label="Strengthen accuracy"]` if that row is present. Use the live snapshot's exact question-type label for another row otherwise. Changing a value clears approval. Test a `Remove <question type>` button, the Add-row select, and `Add` if those sub-features changed. The select is `role=combobox[name="Add a question type"]` for a sample and `Add a type the screenshot missed` for a screenshot. Capture the corrected rows.
- Click `role=checkbox[name="I reviewed and approved these sample values."]` and the second statement (`Use this sample as my latest analytics.`, or `... and last week's practice test.` when a practice test is asked for). Click `role=button[name="Confirm and build this week"]` on a weekday, or `Confirm and build next week` from Saturday. On a weekday, wait for `Your plan for this week`. Inspect records and require an approved analytics snapshot with `admin_sample` provenance, the saved current score, and one weekly schedule referencing it. Do not claim screenshot extraction passed.
- Reload `/dashboard` and require the weekly schedule ID and full saved document to stay equal. Require all seven day cards, the week notes, and no `over your` capacity text on any day, including the practice-test day.
- Choose a day with activities. Get an exact activity label from the snapshot. Click `role=checkbox[name="<activity label>"]` inside that day card. Require `aria-checked="true"`, the label crossed off, and the header count to drop by one. Wait for the save, reload, and require the row still checked and the activity check-in `completed`. Require the weekly schedule document to stay equal.
- Click the same row again. Require `aria-checked="false"` with no confirm step. Reload and require the activity check-in `not_started`.
- Keyboard: Tab to a row, press Space, then Enter. Require it checked, then cleared. Tab moves to the next row.
- Check off every row of one day and require `All done` in that day's header.
- For actual screenshot paths in the weekly upload, use the file inputs labelled `Logical Reasoning screenshot file`, `Reading Comprehension screenshot file`, and, when a practice test is asked for, `All 4 section screenshots file`. T3 preview tools cannot choose files. Use Playwright: `const chooser = page.waitForEvent("filechooser")`, click a drop zone, then `(await chooser).setFiles(path)` with a synthetic local image. The helper sets `SCREENSHOT_EXTRACTOR=fake`, which returns fixed LR rows and fixed RC passage rows (Law 58, Comparative 70, Science 64, Humanities 81, Art 77). Click `Read my screenshots`, then `Check the values`, and require `Check what we read`. For the failure path, relaunch the helper with `VERIFY_SCREENSHOT_EXTRACTOR=fake-failure` and require the visible read error, no new approved snapshot, and no new schedule. A real Anthropic extraction needs a separately authorized key. The screenshot checkbox names are `I reviewed these values and they match my screenshots.` and `These screenshots show my latest 7Sage analytics.` (or `These are my latest analytics and <this or last> week's practice test.`). Exercise both onboarding and the weekly upload when changing extraction. If the harness cannot set a file input, report this path as untested.

## Gotchas

- Analytics candidates do not become approved merely because they appear on screen. Both statements must be checked after the last edit.
- Snapshot approval and weekly schedules are persistent. Never inject records to bypass review for a proof.
- Near-test weeks, a Sunday practice-test review, and already passed days can alter the visible week. Use the saved reasons and actual dates rather than assuming all days have activities.
- A check-off shows at once; the save runs after. Wait for the save before reloading.
- Duplicate activity labels require a day-specific locator. Use the real snapshot to identify that card.
- Real Anthropic extraction and Google sign-in remain untested in the default local run. Fake-extractor upload is in scope.

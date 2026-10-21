# Analytics and This week

A student approves an analytics snapshot before DrillMap creates a saved weekly schedule. They check off each schedule activity, or clear the check, without changing the planned work.

## Sub-features

- `analytics-entry` reaches screenshot review during onboarding or on This week when a new plan needs analytics.
- `analytics-approval` edits candidate values and requires both confirmation statements.
- `schedule-save` creates one saved schedule per student and calendar week.
- `check-in` checks a line off and clears it. There is no Skip and no actual minutes.
- `pace` shows `N remaining`, `N of M done`, and On pace, `N behind`, or `N ahead` against the lines due so far.
- `schedule-reasons` shows week notes in the header and day reasons on rest and unscheduled days. No capacity notice appears.

## How to get to it (user POV)

- Onboarding Step 3, `Add your 7Sage analytics`, uploads a screenshot. Its Step 4 review has its own controls, described in [Onboarding](study-settings.md). This file covers the This week and Admin sample review.
- Click `This week` in navigation or open `/dashboard`. Without a fresh approved snapshot, the 7Sage student sees `Add your latest analytics snapshot`.
- An Admin can open Test controls on their own student side, choose a sample direction, and click `Generate sample` to reach the same review and approval workflow.
- A saved schedule shows all seven day cards. Each schedule activity is one `role=checkbox` row named by its label.

## Driving it with browser tools

Preconditions:

- Doctor passes. Complete onboarding. For the no-paid-service baseline, use the Admin fixture in [Admin](admin.md).

- For the sample path, click `role=button[name="Generate sample"]` in Test controls. Wait for `Review sample analytics`. Save the before records. Require `Confirm snapshot` to be disabled before both confirmation statements are checked.
- Type `65` into `input[aria-label="Strengthen accuracy"]` if that row is present. Use the live snapshot's exact question-type label for another row otherwise. Changing a value clears approval. Test a `Remove <question type>` button, the Add-row select, and `Add` if those sub-features changed. The select is `role=combobox[name="Add a question type"]` for a sample and `Add a type the screenshot missed` for a screenshot. Capture the corrected rows.
- Click `role=checkbox[name="I reviewed and approved these sample values."]` and `role=checkbox[name="Use this sample as my latest analytics."]`. Click `role=button[name="Confirm snapshot"]`. Wait for `Your plan for this week`. Inspect records and require an approved analytics snapshot with `admin_sample` provenance and one weekly schedule referencing it. Do not claim screenshot extraction passed.
- Reload `/dashboard` and require the weekly schedule ID and full saved document to stay equal. Require all seven day cards, the week notes, and no `over your` capacity text on any day, including the practice-test day.
- Choose a day with activities. Get an exact activity label from the snapshot. Click `role=checkbox[name="<activity label>"]` inside that day card. Require `aria-checked="true"`, the label crossed off, and the header count to drop by one. Wait for the save, reload, and require the row still checked and the activity check-in `completed`. Require the weekly schedule document to stay equal.
- Click the same row again. Require `aria-checked="false"` with no confirm step. Reload and require the activity check-in `not_started`.
- Keyboard: Tab to a row, press Space, then Enter. Require it checked, then cleared. Tab moves to the next row.
- Check off every row of one day and require `All done` in that day's header.
- For actual screenshot paths on This week, the file inputs are visually hidden under the visible labels `Choose your 7Sage Logical Reasoning screenshot` and `Choose your 7Sage Reading Comprehension screenshot`. T3 preview tools cannot choose files. Use Playwright: `const chooser = page.waitForEvent("filechooser")`, click a label, then `(await chooser).setFiles(path)` with a synthetic local image. The helper sets `SCREENSHOT_EXTRACTOR=fake`, so require the `Check the extracted analytics` heading and the review table with the fixed LR rows: Strengthen 68%, Necessary assumption 74%, Causal reasoning flagged top priority (Highest), Link assumption not flagged (Medium), and Conditional reasoning 81%. After the LR read only, Confirm snapshot stays disabled with `Add both screenshots before saving this snapshot.` The RC read adds `<type> passage accuracy` boxes for Law 58, Comparative 70, Science 64, Humanities 81, and Art 77, with `Goes first` on Law. For the failure path, relaunch the helper with `VERIFY_SCREENSHOT_EXTRACTOR=fake-failure` and require the visible `Couldn't read that screenshot` error, no new approved snapshot, and no new schedule. A real Anthropic extraction needs a separately authorized key. After extraction, the screenshot-specific checkbox names are `I reviewed these values and they match my screenshots.` and `These screenshots show my latest 7Sage analytics.`. Exercise both onboarding and This week entry points when changing extraction. If the harness cannot set a file input, report this path as untested.

## Gotchas

- Analytics candidates do not become approved merely because they appear on screen. Both statements must be checked after the last edit.
- Snapshot approval and weekly schedules are persistent. Never inject records to bypass review for a proof.
- Near-test weeks, a Sunday practice-test review, and already passed days can alter the visible week. Use the saved reasons and actual dates rather than assuming all days have activities.
- A check-off shows at once; the save runs after. Wait for the save before reloading.
- Duplicate activity labels require a day-specific locator. Use the real snapshot to identify that card.
- Real Anthropic extraction and Google sign-in remain untested in the default local run. Fake-extractor upload is in scope.
